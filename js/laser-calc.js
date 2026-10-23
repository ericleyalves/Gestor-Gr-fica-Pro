/**
 * laser-calc.js — Calculadora de preço para corte/gravação a laser
 *
 * Custo unitário = material (chapa ÷ peças por chapa) + máquina (minutos × R$/hora)
 *                  + extras (argola, embalagem, UV…) + preparo do lote rateado.
 * Preço sugerido = custo × (1 + margem) ÷ (1 − taxas)   → margem = markup sobre o custo
 *   (mesma lógica da calculadora do site Rotina Criativa: Atacado 30%, Padrão 120%, Varejo 200%).
 *
 * Chapas salvas = materiais do Estoque que têm largura/altura (tipo, tamanho e valor num lugar só).
 * Os parâmetros padrão ficam em shop_profile.laser.
 */
import DB from './db.js';
import { esc, fmtBRL } from './utils.js';

const DEFAULTS = {
    sheetW: 275, sheetH: 185, sheetPrice: 100,   // chapa MDF da Arteflix
    bedW: 140, bedH: 100,                         // mesa da laser (cm)
    hourCost: 50,                                 // energia + depreciação + mão de obra
    gap: 3, waste: 10,                            // espaçamento entre peças (mm) e perda (%)
    setupMin: 10, margin: 120, fees: 0
};
const PRESETS = [['Atacado', 30], ['Padrão', 120], ['Varejo', 200]];

const round = (v) => Math.round((Number(v) || 0) * 100) / 100;
const num = (v) => (Math.round((Number(v) || 0) * 100) / 100).toLocaleString('pt-BR');
const fitCount = (W, H, w, h, gapCm) => {
    if (!(w > 0 && h > 0)) return 0;
    const n = (A, a) => Math.max(0, Math.floor((A + gapCm) / (a + gapCm)));
    return Math.max(n(W, w) * n(H, h), n(W, h) * n(H, w));   // testa a peça deitada e em pé
};
const sheetsOf = () => (DB.get('materials') || []).filter(m => Number(m.width) > 0 && Number(m.height) > 0)
    .sort((a, b) => String(a.name).localeCompare(String(b.name), 'pt-BR'));

const LaserCalc = {
    defaults: () => ({ ...DEFAULTS, ...((DB.get('shop_profile') || {}).laser || {}) }),

    /**
     * @param {object} opts { initial (product.calc), onApply({ unitCost, price, calc, materialUse }) }
     */
    open: (opts = {}) => {
        document.getElementById('ggp-laser-modal')?.remove();
        const d = LaserCalc.defaults();
        const c = { pieceW: 5, pieceH: 5, minutes: 1, extras: 0, qty: 100, materialId: '', ...d, ...(opts.initial || {}) };
        let materialId = c.materialId || '';

        const el = document.createElement('div');
        el.id = 'ggp-laser-modal';
        el.className = 'fixed inset-0 z-[130] flex items-center justify-center p-4';
        el.style.cssText = 'background:rgba(10,10,20,0.5); backdrop-filter:blur(8px);';
        const f = (id, label, val, step = 'any', suffix = '') => `
            <div><label>${label}</label><div class="relative">
                <input id="lc-${id}" type="number" step="${step}" min="0" value="${val}" inputmode="decimal" class="${suffix ? 'pr-12' : ''}">
                ${suffix ? `<span class="absolute right-3 top-1/2 -translate-y-1/2 text-xs" style="color:var(--text-faint);">${suffix}</span>` : ''}
            </div></div>`;
        el.innerHTML = `
            <div class="w-full max-w-5xl rounded-2xl bg-white shadow-2xl flex flex-col max-h-[94vh]">
                <div class="px-6 py-4 border-b flex items-center justify-between" style="border-color:var(--border);">
                    <div class="flex items-center gap-3">
                        <div class="w-10 h-10 rounded-xl flex items-center justify-center" style="background:var(--primary-light); color:var(--primary);"><span class="material-symbols-outlined">calculate</span></div>
                        <div><h3 class="text-lg font-black" style="color:var(--text-main);">Calculadora de preço — laser</h3>
                        <p class="text-xs" style="color:var(--text-faint);">Material + tempo de máquina + extras → preço com a sua margem.</p></div>
                    </div>
                    <button type="button" data-close class="w-8 h-8 flex items-center justify-center rounded-full hover:bg-slate-100" style="color:var(--text-faint);"><span class="material-symbols-outlined" style="font-size:18px;">close</span></button>
                </div>
                <div class="overflow-y-auto grid grid-cols-1 lg:grid-cols-5 gap-0">
                    <div class="lg:col-span-3 px-6 py-5 space-y-5">
                        <div>
                            <div class="flex items-center justify-between mb-2">
                                <p class="label-caps" style="color:var(--primary);">1. Chapa / material</p>
                                <button type="button" id="lc-save-sheet" class="text-xs font-bold" style="color:var(--primary);">+ Salvar esta chapa</button>
                            </div>
                            <div id="lc-sheets" class="flex flex-wrap gap-2 mb-3"></div>
                            <div id="lc-save-row" class="hidden mb-3 flex gap-2">
                                <input id="lc-sheet-name" placeholder="Nome (ex.: MDF cru 3mm, Acrílico cristal 2mm)" class="flex-1 !py-2 text-sm">
                                <button type="button" id="lc-sheet-ok" class="btn-primary !py-2 !px-3 text-xs">Salvar</button>
                            </div>
                            <div class="grid grid-cols-3 gap-3">
                                ${f('sheetW', 'Largura', c.sheetW, 'any', 'cm')}
                                ${f('sheetH', 'Altura', c.sheetH, 'any', 'cm')}
                                ${f('sheetPrice', 'Preço da chapa', Number(c.sheetPrice).toFixed(2), '0.01', 'R$')}
                            </div>
                            <p id="lc-m2" class="text-[11px] mt-1.5" style="color:var(--text-faint);"></p>
                        </div>
                        <div>
                            <p class="label-caps mb-2" style="color:var(--primary);">2. Peça</p>
                            <div class="grid grid-cols-4 gap-3">
                                ${f('pieceW', 'Largura', c.pieceW, 'any', 'cm')}
                                ${f('pieceH', 'Altura', c.pieceH, 'any', 'cm')}
                                ${f('gap', 'Espaço', c.gap, 'any', 'mm')}
                                ${f('waste', 'Perda', c.waste, 'any', '%')}
                            </div>
                        </div>
                        <div>
                            <p class="label-caps mb-2" style="color:var(--primary);">3. Máquina e extras (por peça)</p>
                            <div class="grid grid-cols-3 gap-3">
                                ${f('minutes', 'Tempo corte+grav.', c.minutes, 'any', 'min')}
                                ${f('hourCost', 'Hora máquina', Number(c.hourCost).toFixed(2), '0.01', 'R$/h')}
                                ${f('extras', 'Extras (argola, UV…)', Number(c.extras).toFixed(2), '0.01', 'R$')}
                            </div>
                            <p class="text-[11px] mt-1.5" style="color:var(--text-faint);">O tempo de cada peça aparece no LightBurn antes de enviar o trabalho.</p>
                        </div>
                        <div>
                            <p class="label-caps mb-2" style="color:var(--primary);">4. Lote e margem</p>
                            <div class="grid grid-cols-4 gap-3">
                                ${f('qty', 'Quantidade', c.qty, '1', 'un')}
                                ${f('setupMin', 'Preparo do lote', c.setupMin, 'any', 'min')}
                                ${f('margin', 'Margem', c.margin, 'any', '%')}
                                ${f('fees', 'Taxas', c.fees, 'any', '%')}
                            </div>
                            <div class="flex flex-wrap gap-2 mt-2">
                                ${PRESETS.map(([l, v]) => `<button type="button" data-margin="${v}" class="px-3 py-1.5 rounded-xl border text-xs font-bold">${l} (${v}%)</button>`).join('')}
                            </div>
                            <p class="text-[11px] mt-1.5" style="color:var(--text-faint);">Margem sobre o custo (custo × (1 + margem)). Taxas = cartão/marketplace (Shopee, TikTok…).</p>
                        </div>
                    </div>
                    <div class="lg:col-span-2 px-6 py-5 border-t lg:border-t-0 lg:border-l" style="border-color:var(--border); background:var(--bg-main);">
                        <div id="lc-result"></div>
                    </div>
                </div>
                <div class="px-6 py-4 border-t flex flex-wrap items-center justify-between gap-2" style="border-color:var(--border);">
                    <button type="button" id="lc-save-defaults" class="text-xs font-semibold" style="color:var(--primary);">Salvar hora máquina, espaço, perda e margem como padrão</button>
                    <div class="flex gap-2">
                        <button type="button" data-close class="btn-ghost">${opts.onApply ? 'Cancelar' : 'Fechar'}</button>
                        ${opts.onApply ? `<button type="button" id="lc-apply" class="btn-primary"><span class="material-symbols-outlined" style="font-size:18px;">check_circle</span> Usar no produto</button>` : ''}
                    </div>
                </div>
            </div>`;

        const $ = (s) => el.querySelector(s);
        const val = (id) => Number(String($(`#lc-${id}`)?.value || '0').replace(',', '.')) || 0;
        let last = null;

        const renderSheets = () => {
            const sheets = sheetsOf();
            $('#lc-sheets').innerHTML = sheets.length ? sheets.map(m => {
                const on = m.id === materialId;
                return `<button type="button" data-sheet="${esc(m.id)}" class="px-3 py-2 rounded-xl border text-xs font-bold text-left transition-all"
                    style="${on ? 'background:var(--primary);color:#fff;border-color:var(--primary);' : 'border-color:var(--border);color:var(--text-main);'}">
                    ${esc(m.name)}<span class="block font-semibold" style="opacity:.75;">${num(m.width)}×${num(m.height)} cm · ${fmtBRL(m.cost)}</span></button>`;
            }).join('') : `<p class="text-xs" style="color:var(--text-faint);">Nenhuma chapa salva ainda. Preencha as medidas e o preço e clique em <b>+ Salvar esta chapa</b> — ela fica no Estoque para usar sempre.</p>`;
        };

        const compute = () => {
            const W = val('sheetW'), H = val('sheetH'), price = val('sheetPrice');
            const w = val('pieceW'), h = val('pieceH'), gapCm = val('gap') / 10;
            const perSheetRaw = fitCount(W, H, w, h, gapCm);
            const perSheet = Math.max(0, Math.floor(perSheetRaw * (1 - val('waste') / 100)));
            const usage = W * H > 0 ? (perSheet * w * h) / (W * H) * 100 : 0;
            const m2 = W * H > 0 ? price / (W * H / 10000) : 0;
            $('#lc-m2').innerHTML = `Custo por m²: <b>${fmtBRL(m2)}</b>`;
            const material = perSheet ? price / perSheet : 0;
            const machine = val('minutes') * val('hourCost') / 60;
            const qty = Math.max(1, Math.round(val('qty')));
            const setup = val('setupMin') * val('hourCost') / 60 / qty;
            const extras = val('extras');
            const unitCost = round(material + machine + extras + setup);
            const feeKeep = 1 - val('fees') / 100;
            const priceUnit = feeKeep > 0.01 ? round(unitCost * (1 + val('margin') / 100) / feeKeep) : 0;
            const profitUnit = priceUnit * feeKeep - unitCost;
            const sheets = perSheet ? Math.ceil(qty / perSheet) : 0;
            el.querySelectorAll('[data-margin]').forEach(b => {
                const on = Number(b.dataset.margin) === val('margin');
                b.style.background = on ? 'var(--primary)' : ''; b.style.color = on ? '#fff' : ''; b.style.borderColor = on ? 'var(--primary)' : 'var(--border)';
            });
            last = {
                unitCost, price: priceUnit, perSheet, sheets,
                calc: { pieceW: w, pieceH: h, gap: val('gap'), waste: val('waste'), minutes: val('minutes'), hourCost: val('hourCost'),
                        extras, qty, setupMin: val('setupMin'), margin: val('margin'), fees: val('fees'),
                        sheetW: W, sheetH: H, sheetPrice: price, materialId },
                materialUse: perSheet ? Math.round((1 / perSheet) * 10000) / 10000 : 0
            };
            const line = (k, v, strong) => `<div class="flex justify-between text-sm ${strong ? 'font-black pt-2 border-t' : ''}" style="border-color:var(--border);"><span style="color:${strong ? 'var(--text-main)' : 'var(--text-muted)'};">${k}</span><span>${v}</span></div>`;
            $('#lc-result').innerHTML = !perSheet ? `
                <p class="text-sm font-bold" style="color:#DC2626;">A peça não cabe na chapa. Confira as medidas.</p>` : `
                <div class="grid grid-cols-3 gap-2 mb-4 text-center">
                    <div class="rounded-xl bg-white border p-2" style="border-color:var(--border);"><p class="label-caps">Peças/chapa</p><p class="font-black">${perSheet}</p></div>
                    <div class="rounded-xl bg-white border p-2" style="border-color:var(--border);"><p class="label-caps">Chapas</p><p class="font-black">${sheets}</p></div>
                    <div class="rounded-xl bg-white border p-2" style="border-color:var(--border);"><p class="label-caps">Aproveit.</p><p class="font-black">${num(usage)}%</p></div>
                </div>
                <p class="label-caps mb-2">Custo por peça</p>
                <div class="space-y-1.5">
                    ${line('Material', fmtBRL(material))}
                    ${line('Máquina', fmtBRL(machine))}
                    ${line('Extras', fmtBRL(extras))}
                    ${line(`Preparo rateado <span class="text-xs">(${qty} un)</span>`, fmtBRL(setup))}
                    ${line('Custo unitário', fmtBRL(unitCost), true)}
                </div>
                <div class="mt-5 rounded-2xl p-4 text-white" style="background:linear-gradient(120deg, var(--primary), #8B5CF6);">
                    <p class="text-[11px] font-bold uppercase tracking-wider opacity-80">Venda unitária sugerida</p>
                    <p class="text-3xl font-black">${priceUnit ? fmtBRL(priceUnit) : '—'}</p>
                    <p class="text-xs opacity-90">lucro ${fmtBRL(profitUnit)} por peça</p>
                </div>
                <div class="mt-4 space-y-1.5">
                    ${line(`Lote de ${qty} un`, `<b>${fmtBRL(priceUnit * qty)}</b>`)}
                    ${line('Custo do lote', fmtBRL(unitCost * qty))}
                    ${line('Lucro do lote', `<b style="color:#059669;">+ ${fmtBRL(profitUnit * qty)}</b>`)}
                    ${line('Tempo total de máquina', `${num(val('minutes') * qty + val('setupMin'))} min`)}
                </div>`;
        };

        const pickSheet = (id) => {
            const m = sheetsOf().find(x => x.id === id);
            if (!m) return;
            materialId = m.id;
            $('#lc-sheetW').value = m.width; $('#lc-sheetH').value = m.height;
            $('#lc-sheetPrice').value = (Number(m.cost) || 0).toFixed(2);
            renderSheets(); compute();
        };

        el.addEventListener('input', (e) => {
            // mexeu nas medidas/preço da chapa: deixa de ser a chapa salva selecionada
            if (['lc-sheetW', 'lc-sheetH', 'lc-sheetPrice'].includes(e.target.id) && materialId) { materialId = ''; renderSheets(); }
            compute();
        });
        el.addEventListener('click', (e) => {
            if (e.target === el || e.target.closest('[data-close]')) return el.remove();
            const s = e.target.closest('[data-sheet]'); if (s) return pickSheet(s.dataset.sheet);
            const mg = e.target.closest('[data-margin]'); if (mg) { $('#lc-margin').value = mg.dataset.margin; compute(); }
        });
        $('#lc-save-sheet').addEventListener('click', () => { $('#lc-save-row').classList.toggle('hidden'); $('#lc-sheet-name').focus(); });
        const saveSheet = () => {
            const name = $('#lc-sheet-name').value.trim();
            if (!name) return $('#lc-sheet-name').focus();
            if (!(val('sheetW') > 0 && val('sheetH') > 0)) return import('./app.js').then(m => m.default.toast('Preencha largura e altura da chapa', 'error'));
            const list = DB.get('materials') || [];
            const rec = {
                id: `MAT-${Date.now().toString(36).toUpperCase()}`, name,
                category: /acr[ií]l/i.test(name) ? 'Acrílico' : /mdf/i.test(name) ? 'Chapas MDF' : 'Outros',
                unit: 'chapa', stock: 0, minQty: 0, cost: val('sheetPrice'),
                width: val('sheetW'), height: val('sheetH'), moves: []
            };
            list.push(rec);
            DB.save('materials', list);
            materialId = rec.id;
            $('#lc-save-row').classList.add('hidden'); $('#lc-sheet-name').value = '';
            renderSheets();
            import('./app.js').then(m => m.default.toast(`Chapa "${name}" salva no Estoque`));
        };
        $('#lc-sheet-ok').addEventListener('click', saveSheet);
        $('#lc-sheet-name').addEventListener('keydown', (e) => { if (e.key === 'Enter') { e.preventDefault(); saveSheet(); } });
        $('#lc-save-defaults').addEventListener('click', () => {
            const laser = { ...d, sheetW: val('sheetW'), sheetH: val('sheetH'), sheetPrice: val('sheetPrice'), hourCost: val('hourCost'),
                            gap: val('gap'), waste: val('waste'), setupMin: val('setupMin'), margin: val('margin'), fees: val('fees') };
            DB.save('shop_profile', { ...(DB.get('shop_profile') || {}), laser });
            import('./app.js').then(m => m.default.toast('Padrões da calculadora salvos'));
        });
        $('#lc-apply')?.addEventListener('click', () => {
            if (!last?.perSheet) return;
            opts.onApply(last);
            el.remove();
        });
        document.body.appendChild(el);
        renderSheets();
        if (materialId && sheetsOf().some(m => m.id === materialId)) pickSheet(materialId); else compute();
    }
};

export default LaserCalc;
