/**
 * laser-calc.js — Calculadora de preço para corte/gravação a laser
 *
 * Custo unitário = material (chapa ÷ peças por chapa) + máquina (minutos × R$/hora)
 *                  + extras (argola, embalagem, UV…) + preparo do lote rateado.
 * Preço sugerido = custo ÷ (1 − margem − taxas)  → a margem é sobre o PREÇO de venda.
 * Os parâmetros padrão ficam em shop_profile.laser (Configurações).
 */
import DB from './db.js';
import { esc, fmtBRL } from './utils.js';

const DEFAULTS = {
    sheetW: 275, sheetH: 185, sheetPrice: 100,   // chapa MDF da Arteflix
    bedW: 140, bedH: 100,                         // mesa da laser (cm)
    hourCost: 50,                                 // energia + depreciação + mão de obra
    gap: 3, waste: 10,                            // espaçamento entre peças (mm) e perda (%)
    setupMin: 10, margin: 50, fees: 0
};

const round = (v) => Math.round((Number(v) || 0) * 100) / 100;
const fitCount = (W, H, w, h, gapCm) => {
    if (!(w > 0 && h > 0)) return 0;
    const n = (A, a) => Math.max(0, Math.floor((A + gapCm) / (a + gapCm)));
    return Math.max(n(W, w) * n(H, h), n(W, h) * n(H, w));   // testa a peça deitada e em pé
};

const LaserCalc = {
    defaults: () => ({ ...DEFAULTS, ...((DB.get('shop_profile') || {}).laser || {}) }),

    /**
     * @param {object} opts { initial (product.calc), onApply({ unitCost, price, calc, materialUse }) }
     */
    open: (opts = {}) => {
        document.getElementById('ggp-laser-modal')?.remove();
        const d = LaserCalc.defaults();
        const c = { pieceW: 5, pieceH: 5, minutes: 1, extras: 0, qty: 100, materialId: '', ...d, ...(opts.initial || {}) };
        const mats = (DB.get('materials') || []).filter(m => /chapa|folha|m²/.test(m.unit || ''));

        const el = document.createElement('div');
        el.id = 'ggp-laser-modal';
        el.className = 'fixed inset-0 z-[130] flex items-center justify-center p-4';
        el.style.cssText = 'background:rgba(10,10,20,0.5); backdrop-filter:blur(8px);';
        const f = (id, label, val, step = '0.01', suffix = '') => `
            <div><label>${label}</label><div class="relative">
                <input id="lc-${id}" type="number" step="${step}" min="0" value="${val}" inputmode="decimal" class="${suffix ? 'pr-12' : ''}">
                ${suffix ? `<span class="absolute right-3 top-1/2 -translate-y-1/2 text-xs" style="color:var(--text-faint);">${suffix}</span>` : ''}
            </div></div>`;
        el.innerHTML = `
            <div class="w-full max-w-4xl rounded-2xl bg-white shadow-2xl flex flex-col max-h-[94vh]">
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
                            <p class="label-caps mb-2" style="color:var(--primary);">1. Material (chapa)</p>
                            ${mats.length ? `<div class="mb-3"><label>Usar material do Estoque</label><select id="lc-mat">
                                <option value="">— digitar medidas e preço —</option>
                                ${mats.map(m => `<option value="${esc(m.id)}" ${m.id === c.materialId ? 'selected' : ''}>${esc(m.name)} · ${fmtBRL(m.cost)}/${esc(m.unit)}</option>`).join('')}
                            </select></div>` : ''}
                            <div class="grid grid-cols-3 gap-3">
                                ${f('sheetW', 'Largura chapa', c.sheetW, '0.1', 'cm')}
                                ${f('sheetH', 'Altura chapa', c.sheetH, '0.1', 'cm')}
                                ${f('sheetPrice', 'Preço da chapa', c.sheetPrice, '0.01', 'R$')}
                            </div>
                            <p class="text-[11px] mt-1.5" style="color:var(--text-faint);">Mesa da laser: ${d.bedW}×${d.bedH} cm — chapas maiores são cortadas em partes antes.</p>
                        </div>
                        <div>
                            <p class="label-caps mb-2" style="color:var(--primary);">2. Peça</p>
                            <div class="grid grid-cols-4 gap-3">
                                ${f('pieceW', 'Largura', c.pieceW, '0.1', 'cm')}
                                ${f('pieceH', 'Altura', c.pieceH, '0.1', 'cm')}
                                ${f('gap', 'Espaço', c.gap, '1', 'mm')}
                                ${f('waste', 'Perda', c.waste, '1', '%')}
                            </div>
                        </div>
                        <div>
                            <p class="label-caps mb-2" style="color:var(--primary);">3. Máquina e extras (por peça)</p>
                            <div class="grid grid-cols-3 gap-3">
                                ${f('minutes', 'Tempo corte+grav.', c.minutes, '0.1', 'min')}
                                ${f('hourCost', 'Custo da hora', c.hourCost, '0.01', 'R$/h')}
                                ${f('extras', 'Extras (argola, UV…)', c.extras, '0.01', 'R$')}
                            </div>
                        </div>
                        <div>
                            <p class="label-caps mb-2" style="color:var(--primary);">4. Lote e margem</p>
                            <div class="grid grid-cols-4 gap-3">
                                ${f('qty', 'Quantidade', c.qty, '1', 'un')}
                                ${f('setupMin', 'Preparo do lote', c.setupMin, '1', 'min')}
                                ${f('margin', 'Margem', c.margin, '1', '%')}
                                ${f('fees', 'Taxas', c.fees, '0.1', '%')}
                            </div>
                            <p class="text-[11px] mt-1.5" style="color:var(--text-faint);">Margem = lucro sobre o preço de venda. Taxas = cartão/marketplace (ex.: Shopee, TikTok).</p>
                        </div>
                    </div>
                    <div class="lg:col-span-2 px-6 py-5 border-t lg:border-t-0 lg:border-l" style="border-color:var(--border); background:var(--bg-main);">
                        <div id="lc-result"></div>
                    </div>
                </div>
                <div class="px-6 py-4 border-t flex flex-wrap items-center justify-between gap-2" style="border-color:var(--border);">
                    <button type="button" id="lc-save-defaults" class="text-xs font-semibold" style="color:var(--primary);">Salvar chapa, hora, espaço e margem como padrão</button>
                    <div class="flex gap-2">
                        <button type="button" data-close class="btn-ghost">${opts.onApply ? 'Cancelar' : 'Fechar'}</button>
                        ${opts.onApply ? `<button type="button" id="lc-apply" class="btn-primary"><span class="material-symbols-outlined" style="font-size:18px;">check_circle</span> Usar no produto</button>` : ''}
                    </div>
                </div>
            </div>`;

        const val = (id) => Number(String(el.querySelector(`#lc-${id}`)?.value || '0').replace(',', '.')) || 0;
        let last = null;

        const compute = () => {
            const W = val('sheetW'), H = val('sheetH'), price = val('sheetPrice');
            const w = val('pieceW'), h = val('pieceH'), gapCm = val('gap') / 10;
            const perSheetRaw = fitCount(W, H, w, h, gapCm);
            const perSheet = Math.max(0, Math.floor(perSheetRaw * (1 - val('waste') / 100)));
            const material = perSheet ? price / perSheet : 0;
            const machine = val('minutes') * val('hourCost') / 60;
            const qty = Math.max(1, Math.round(val('qty')));
            const setup = val('setupMin') * val('hourCost') / 60 / qty;
            const extras = val('extras');
            const unitCost = round(material + machine + extras + setup);
            const keep = 1 - val('margin') / 100 - val('fees') / 100;
            const priceUnit = keep > 0.01 ? round(unitCost / keep) : 0;
            const sheets = perSheet ? Math.ceil(qty / perSheet) : 0;
            last = {
                unitCost, price: priceUnit, perSheet, sheets,
                calc: { pieceW: w, pieceH: h, gap: val('gap'), waste: val('waste'), minutes: val('minutes'), hourCost: val('hourCost'),
                        extras, qty, setupMin: val('setupMin'), margin: val('margin'), fees: val('fees'),
                        sheetW: W, sheetH: H, sheetPrice: price, materialId: el.querySelector('#lc-mat')?.value || '' },
                materialUse: perSheet ? Math.round((1 / perSheet) * 10000) / 10000 : 0
            };
            const line = (k, v, strong) => `<div class="flex justify-between text-sm ${strong ? 'font-black pt-2 border-t' : ''}" style="border-color:var(--border);"><span style="color:${strong ? 'var(--text-main)' : 'var(--text-muted)'};">${k}</span><span>${v}</span></div>`;
            el.querySelector('#lc-result').innerHTML = !perSheet ? `
                <p class="text-sm font-bold" style="color:#DC2626;">A peça não cabe na chapa. Confira as medidas.</p>` : `
                <p class="label-caps mb-3">Resultado por peça</p>
                <div class="space-y-1.5">
                    ${line(`Material <span class="text-xs">(${perSheet} peças/chapa)</span>`, fmtBRL(material))}
                    ${line('Máquina', fmtBRL(machine))}
                    ${line('Extras', fmtBRL(extras))}
                    ${line(`Preparo rateado <span class="text-xs">(${qty} un)</span>`, fmtBRL(setup))}
                    ${line('Custo unitário', fmtBRL(unitCost), true)}
                </div>
                <div class="mt-5 rounded-2xl p-4 text-white" style="background:linear-gradient(120deg, var(--primary), #8B5CF6);">
                    <p class="text-[11px] font-bold uppercase tracking-wider opacity-80">Preço sugerido</p>
                    <p class="text-3xl font-black">${priceUnit ? fmtBRL(priceUnit) : '—'}</p>
                    <p class="text-xs opacity-90">por unidade · lucro ${fmtBRL(priceUnit * val('margin') / 100)}</p>
                </div>
                <div class="mt-4 space-y-1.5">
                    ${line(`Lote de ${qty} un`, `<b>${fmtBRL(priceUnit * qty)}</b>`)}
                    ${line('Custo do lote', fmtBRL(unitCost * qty))}
                    ${line('Lucro do lote', `<b style="color:#059669;">${fmtBRL((priceUnit - unitCost) * qty - priceUnit * qty * val('fees') / 100)}</b>`)}
                    ${line('Chapas necessárias', `${sheets} chapa(s)`)}
                    ${line('Tempo de máquina', `${Math.round(val('minutes') * qty + val('setupMin'))} min`)}
                </div>
                ${keep <= 0.01 ? '<p class="text-xs mt-3 font-bold" style="color:#DC2626;">Margem + taxas não podem somar 100% ou mais.</p>' : ''}`;
        };

        el.querySelector('#lc-mat')?.addEventListener('change', (e) => {
            const m = mats.find(x => x.id === e.target.value);
            if (m && Number(m.cost) > 0) el.querySelector('#lc-sheetPrice').value = Number(m.cost).toFixed(2);
            compute();
        });
        el.addEventListener('input', compute);
        el.addEventListener('click', (e) => { if (e.target === el || e.target.closest('[data-close]')) el.remove(); });
        el.querySelector('#lc-save-defaults').addEventListener('click', () => {
            const laser = { ...d, sheetW: val('sheetW'), sheetH: val('sheetH'), sheetPrice: val('sheetPrice'), hourCost: val('hourCost'),
                            gap: val('gap'), waste: val('waste'), setupMin: val('setupMin'), margin: val('margin'), fees: val('fees') };
            DB.save('shop_profile', { ...(DB.get('shop_profile') || {}), laser });
            import('./app.js').then(m => m.default.toast('Padrões da calculadora salvos'));
        });
        el.querySelector('#lc-apply')?.addEventListener('click', () => {
            if (!last?.perSheet) return;
            opts.onApply(last);
            el.remove();
        });
        document.body.appendChild(el);
        compute();
    }
};

export default LaserCalc;
