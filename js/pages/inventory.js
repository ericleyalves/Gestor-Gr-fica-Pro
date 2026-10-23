/**
 * inventory.js — Estoque de materiais (chapas, acrílico, tintas, embalagens…)
 * Entrada (compra), saída/ajuste, mínimo com alerta e histórico de movimentos.
 * A baixa automática pelos pedidos fica em stock.js.
 */
import DB from '../db.js';
import App from '../app.js';
import { esc, fmtBRL, isoDate } from '../utils.js';
import Stock, { MAT_CATEGORIES, UNITS } from '../stock.js';
import { METHODS } from '../payments.js';

const num = (v) => (Math.round((Number(v) || 0) * 1000) / 1000).toLocaleString('pt-BR', { maximumFractionDigits: 3 });

const Inventory = {
    filter: 'todos',
    search: '',

    render: (container) => {
        Inventory.container = container;
        const mats = (DB.get('materials') || []).slice().sort((a, b) => String(a.name).localeCompare(String(b.name), 'pt-BR'));
        const low = mats.filter(Stock.isLow);
        const value = mats.reduce((n, m) => n + Math.max(0, Number(m.stock) || 0) * (Number(m.cost) || 0), 0);
        const term = Inventory.search.trim().toLowerCase();
        const list = mats.filter(m =>
            (Inventory.filter === 'todos' || (Inventory.filter === 'baixo' ? Stock.isLow(m) : m.category === Inventory.filter)) &&
            (!term || `${m.name} ${m.category} ${m.supplier || ''}`.toLowerCase().includes(term)));
        const usedBy = (id) => (DB.get('products') || []).filter(p => (p.materials || []).some(u => u.materialId === id)).length;

        container.innerHTML = `
<div class="max-w-[1400px] mx-auto flex flex-col gap-6 pb-16 page-enter">
    <div class="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
            <h2 class="page-title">Estoque de Materiais 📦</h2>
            <p class="text-sm mt-1" style="color:var(--text-muted);">Chapas, acrílico, tintas e insumos. A baixa é automática quando o pedido entra em produção.</p>
        </div>
        <button id="inv-new" class="btn-primary"><span class="material-symbols-outlined" style="font-size:18px;">add</span> Novo material</button>
    </div>

    <div class="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div class="bg-white rounded-2xl p-5 border border-slate-200/70 shadow-sm"><p class="label-caps">Materiais</p><p class="text-2xl font-black mt-1">${mats.length}</p></div>
        <div class="bg-white rounded-2xl p-5 border shadow-sm" style="border-color:${low.length ? '#FCA5A5' : 'rgb(226 232 240 / .7)'};">
            <p class="label-caps">Abaixo do mínimo</p><p class="text-2xl font-black mt-1" style="color:${low.length ? '#DC2626' : 'var(--text-main)'};">${low.length}</p>
            ${low.length ? `<p class="text-xs mt-1 truncate" style="color:#DC2626;">${low.slice(0, 3).map(m => esc(m.name)).join(', ')}${low.length > 3 ? '…' : ''}</p>` : ''}
        </div>
        <div class="bg-white rounded-2xl p-5 border border-slate-200/70 shadow-sm"><p class="label-caps">Valor em estoque</p><p class="text-2xl font-black mt-1">${fmtBRL(value)}</p><p class="text-xs" style="color:var(--text-faint);">pelo custo cadastrado</p></div>
    </div>

    <div class="bg-white rounded-2xl border border-slate-200/70 shadow-sm overflow-hidden">
        <div class="p-4 border-b flex flex-wrap gap-2 items-center justify-between" style="border-color:var(--border);">
            <div class="flex flex-wrap gap-2">
                ${[['todos', 'Todos'], ['baixo', `⚠ Baixo (${low.length})`], ...MAT_CATEGORIES.filter(c => mats.some(m => m.category === c)).map(c => [c, c])].map(([id, l]) => `
                    <button type="button" data-inv-filter="${esc(id)}" class="px-3 py-1.5 rounded-lg text-xs font-bold border ${Inventory.filter === id ? 'bg-primary text-white border-transparent' : 'bg-white text-slate-600 border-slate-200'}">${esc(l)}</button>`).join('')}
            </div>
            <div class="search-input-wrap" style="width:240px;"><span class="material-symbols-outlined">search</span><input id="inv-search" type="text" placeholder="Buscar material…" value="${esc(Inventory.search)}"></div>
        </div>
        ${!mats.length ? `
            <div class="empty-state">
                <div class="empty-state-icon"><span class="material-symbols-outlined">inventory</span></div>
                <h3>Nenhum material cadastrado</h3>
                <p>Cadastre suas chapas de MDF, acrílico, tintas e embalagens para controlar o estoque.</p>
                <button class="btn-primary" id="inv-new-empty">Cadastrar material</button>
            </div>` : `
        <div class="overflow-x-auto">
            <table class="w-full text-left text-sm">
                <thead><tr class="text-[11px] uppercase tracking-wider" style="color:var(--text-faint); background:#FAFBFF;">
                    <th class="px-5 py-3">Material</th><th class="px-5 py-3">Estoque</th><th class="px-5 py-3 text-right">Custo</th>
                    <th class="px-5 py-3">Fornecedor / local</th><th class="px-5 py-3 text-center">Ações</th>
                </tr></thead>
                <tbody>
                ${list.map(m => {
                    const isLow = Stock.isLow(m);
                    const pct = Number(m.minQty) > 0 ? Math.min(100, (Number(m.stock) / (Number(m.minQty) * 3)) * 100) : 100;
                    const n = usedBy(m.id);
                    return `
                    <tr class="border-t" style="border-color:#F1F0F7;">
                        <td class="px-5 py-3">
                            <p class="font-bold" style="color:var(--text-main);">${esc(m.name)}</p>
                            <p class="text-xs" style="color:var(--text-faint);">${esc(m.category || '')}${m.width && m.height ? ` · ${num(m.width)}×${num(m.height)} cm` : ''}${n ? ` · usado em ${n} produto(s)` : ''}</p>
                        </td>
                        <td class="px-5 py-3" style="min-width:190px;">
                            <p class="font-black" style="color:${Number(m.stock) < 0 ? '#DC2626' : isLow ? '#DC2626' : 'var(--text-main)'};">${num(m.stock)} <span class="text-xs font-semibold" style="color:var(--text-faint);">${esc(m.unit)}</span>
                                ${isLow ? `<span class="ml-1 text-[10px] font-black px-1.5 py-0.5 rounded" style="background:#FEF2F2;color:#DC2626;">REPOR</span>` : ''}</p>
                            <div class="h-1.5 rounded-full bg-slate-100 mt-1.5"><div class="h-1.5 rounded-full" style="width:${Math.max(3, pct)}%; background:${isLow ? '#EF4444' : '#10B981'};"></div></div>
                            ${Number(m.minQty) > 0 ? `<p class="text-[10px] mt-0.5" style="color:var(--text-faint);">mínimo ${num(m.minQty)} ${esc(m.unit)}</p>` : ''}
                        </td>
                        <td class="px-5 py-3 text-right whitespace-nowrap">${m.cost ? `${fmtBRL(m.cost)}<span class="text-xs" style="color:var(--text-faint);">/${esc(m.unit)}</span>` : '—'}</td>
                        <td class="px-5 py-3 text-xs" style="color:var(--text-muted);">${esc([m.supplier, m.location].filter(Boolean).join(' · ') || '—')}</td>
                        <td class="px-5 py-3 text-center whitespace-nowrap">
                            <button data-inv-move="in" data-id="${esc(m.id)}" class="px-2.5 py-1.5 rounded-lg text-xs font-black" style="background:#ECFDF5;color:#059669;" title="Entrada / compra">+ Entrada</button>
                            <button data-inv-move="out" data-id="${esc(m.id)}" class="px-2.5 py-1.5 rounded-lg text-xs font-black" style="background:#FEF2F2;color:#DC2626;" title="Saída / ajuste / perda">− Saída</button>
                            <button data-inv-hist="${esc(m.id)}" class="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400" title="Histórico"><span class="material-symbols-outlined" style="font-size:18px;">history</span></button>
                            <button data-inv-edit="${esc(m.id)}" class="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-primary" title="Editar"><span class="material-symbols-outlined" style="font-size:18px;">edit</span></button>
                        </td>
                    </tr>`;
                }).join('') || `<tr><td colspan="5" class="px-5 py-10 text-center italic" style="color:var(--text-faint);">Nenhum material neste filtro.</td></tr>`}
                </tbody>
            </table>
        </div>`}
    </div>
    <p class="text-xs" style="color:var(--text-faint);">💡 No cadastro de cada produto, em <b>Materiais usados</b>, informe quanto ele consome por unidade (ex.: Chaveiro → 0,02 chapa de acrílico). Ao mover o pedido para "Produção", o sistema desconta sozinho; se o pedido for cancelado, devolve.</p>
</div>`;
        Inventory.bind(container);
    },

    modal: (html) => {
        document.getElementById('ggp-inv-modal')?.remove();
        const el = document.createElement('div');
        el.id = 'ggp-inv-modal';
        el.className = 'fixed inset-0 z-[120] flex items-center justify-center p-4';
        el.style.cssText = 'background:rgba(10,10,20,0.5); backdrop-filter:blur(8px);';
        el.innerHTML = html;
        el.addEventListener('click', (e) => { if (e.target === el || e.target.closest('[data-close]')) el.remove(); });
        document.body.appendChild(el);
        return el;
    },

    header: (title, color = 'var(--text-main)') => `
        <div class="px-6 py-4 border-b flex items-center justify-between" style="border-color:var(--border);">
            <h3 class="text-lg font-black" style="color:${color};">${title}</h3>
            <button type="button" data-close class="w-8 h-8 flex items-center justify-center rounded-full hover:bg-slate-100" style="color:var(--text-faint);"><span class="material-symbols-outlined" style="font-size:18px;">close</span></button>
        </div>`,

    /** Cadastro/edição de material. */
    openForm: (existing) => {
        const m = existing || { unit: 'chapa', category: MAT_CATEGORIES[0], stock: 0, minQty: 0 };
        const el = Inventory.modal(`
            <form class="w-full max-w-lg rounded-2xl bg-white shadow-2xl max-h-[94vh] overflow-y-auto">
                ${Inventory.header(existing ? 'Editar material' : 'Novo material')}
                <div class="px-6 py-5 space-y-4">
                    <div><label>Nome</label><input id="im-name" required value="${esc(m.name || '')}" placeholder="Ex: Chapa MDF 3mm 60x90 / Acrílico cristal 2mm"></div>
                    <div class="grid grid-cols-2 gap-3">
                        <div><label>Categoria</label><select id="im-cat">${[...new Set([...MAT_CATEGORIES, m.category])].map(c => `<option ${c === m.category ? 'selected' : ''}>${esc(c)}</option>`).join('')}</select></div>
                        <div><label>Unidade</label><select id="im-unit">${[...new Set([...UNITS, m.unit])].map(u => `<option ${u === m.unit ? 'selected' : ''}>${esc(u)}</option>`).join('')}</select></div>
                    </div>
                    <div class="grid grid-cols-3 gap-3">
                        <div><label>${existing ? 'Estoque atual' : 'Estoque inicial'}</label><input id="im-stock" type="number" step="0.001" value="${Number(m.stock) || 0}" ${existing ? 'disabled title="Use Entrada/Saída para mudar o estoque"' : ''}></div>
                        <div><label>Mínimo</label><input id="im-min" type="number" step="0.001" min="0" value="${Number(m.minQty) || 0}"></div>
                        <div><label>Custo / unid. (R$)</label><input id="im-cost" type="number" step="0.01" min="0" value="${m.cost ? Number(m.cost).toFixed(2) : ''}"></div>
                    </div>
                    <div id="im-dims" class="grid grid-cols-3 gap-3">
                        <div><label>Largura chapa (cm)</label><input id="im-w" type="number" step="any" min="0" value="${m.width || ''}" placeholder="Ex: 275"></div>
                        <div><label>Altura chapa (cm)</label><input id="im-h" type="number" step="any" min="0" value="${m.height || ''}" placeholder="Ex: 185"></div>
                        <div><label>Espessura (mm)</label><input id="im-t" type="number" step="any" min="0" value="${m.thickness || ''}" placeholder="Ex: 3"></div>
                    </div>
                    <p class="text-[11px] -mt-2" style="color:var(--text-faint);">Medidas usadas pela Calculadora laser (só para chapas/folhas).</p>
                    <div class="grid grid-cols-2 gap-3">
                        <div><label>Fornecedor</label><input id="im-sup" value="${esc(m.supplier || '')}" placeholder="Opcional"></div>
                        <div><label>Local</label><input id="im-loc" value="${esc(m.location || '')}" placeholder="Ex: Prateleira 2"></div>
                    </div>
                </div>
                <div class="px-6 py-4 border-t flex justify-between gap-2" style="border-color:var(--border);">
                    ${existing ? `<button type="button" id="im-del" class="btn-ghost" style="color:#DC2626;">Excluir</button>` : '<span></span>'}
                    <div class="flex gap-2"><button type="button" data-close class="btn-ghost">Cancelar</button><button type="submit" class="btn-primary">Salvar</button></div>
                </div>
            </form>`);
        el.querySelector('#im-name').focus();
        el.querySelector('#im-del')?.addEventListener('click', () => {
            const n = (DB.get('products') || []).filter(p => (p.materials || []).some(u => u.materialId === existing.id)).length;
            App.confirm({
                title: 'Excluir material?', type: 'danger', confirmLabel: 'Excluir',
                message: `"${existing.name}" será apagado${n ? ` e deixará de ser descontado em ${n} produto(s)` : ''}.`,
                onConfirm: () => {
                    DB.save('materials', (DB.get('materials') || []).filter(x => x.id !== existing.id));
                    el.remove(); App.toast('Material excluído', 'info'); Inventory.render(Inventory.container);
                }
            });
        });
        el.querySelector('form').addEventListener('submit', (e) => {
            e.preventDefault();
            const list = DB.get('materials') || [];
            const rec = {
                ...(existing || { id: `MAT-${Date.now().toString(36).toUpperCase()}`, moves: [] }),
                name: el.querySelector('#im-name').value.trim(),
                category: el.querySelector('#im-cat').value,
                unit: el.querySelector('#im-unit').value,
                minQty: Number(el.querySelector('#im-min').value) || 0,
                cost: Number(el.querySelector('#im-cost').value) || 0,
                supplier: el.querySelector('#im-sup').value.trim(),
                width: Number(el.querySelector('#im-w').value) || 0,
                height: Number(el.querySelector('#im-h').value) || 0,
                thickness: Number(el.querySelector('#im-t').value) || 0,
                location: el.querySelector('#im-loc').value.trim()
            };
            if (!existing) {
                rec.stock = Number(el.querySelector('#im-stock').value) || 0;
                if (rec.stock) rec.moves = [{ at: new Date().toISOString(), qty: rec.stock, reason: 'Estoque inicial' }];
            }
            const i = list.findIndex(x => x.id === rec.id);
            if (i === -1) list.push(rec); else list[i] = rec;
            DB.save('materials', list);
            el.remove(); App.toast('Material salvo'); Inventory.render(Inventory.container);
        });
    },

    /** Entrada (compra) ou saída (ajuste/perda). Entrada pode lançar a despesa no Financeiro. */
    openMove: (id, dir) => {
        const m = (DB.get('materials') || []).find(x => x.id === id);
        if (!m) return;
        const isIn = dir === 'in';
        const el = Inventory.modal(`
            <form class="w-full max-w-md rounded-2xl bg-white shadow-2xl max-h-[94vh] overflow-y-auto">
                ${Inventory.header(`${isIn ? 'Entrada' : 'Saída'} · ${esc(m.name)}`, isIn ? '#059669' : '#DC2626')}
                <div class="px-6 py-5 space-y-4">
                    <p class="text-sm" style="color:var(--text-muted);">Estoque atual: <b>${num(m.stock)} ${esc(m.unit)}</b></p>
                    <div class="grid grid-cols-2 gap-3">
                        <div><label>Quantidade (${esc(m.unit)})</label><input id="mv-qty" type="number" step="0.001" min="0.001" required inputmode="decimal"></div>
                        <div><label>Motivo</label><select id="mv-reason">${(isIn ? ['Compra', 'Devolução', 'Ajuste de inventário'] : ['Uso avulso', 'Perda / erro de corte', 'Ajuste de inventário', 'Amostra']).map(r => `<option>${r}</option>`).join('')}</select></div>
                    </div>
                    ${isIn ? `
                    <div class="grid grid-cols-2 gap-3">
                        <div><label>Custo / unid. (R$)</label><input id="mv-cost" type="number" step="0.01" min="0" value="${m.cost ? Number(m.cost).toFixed(2) : ''}"></div>
                        <div><label>Total da compra</label><p id="mv-total" class="font-black text-lg pt-2">—</p></div>
                    </div>
                    <label class="flex items-center gap-2 cursor-pointer !mb-0"><input type="checkbox" id="mv-expense" checked class="w-4 h-4"> <span class="text-sm font-semibold">Lançar como despesa no Financeiro</span></label>
                    <div id="mv-exp-wrap" class="grid grid-cols-2 gap-3">
                        <div><label>Pago com</label><select id="mv-method">${METHODS.map(x => `<option>${x}</option>`).join('')}</select></div>
                        <div><label>Situação</label><select id="mv-paid"><option value="1">Já paga</option><option value="0">A pagar</option></select></div>
                    </div>` : ''}
                </div>
                <div class="px-6 py-4 border-t flex justify-end gap-2" style="border-color:var(--border);">
                    <button type="button" data-close class="btn-ghost">Cancelar</button>
                    <button type="submit" class="btn-primary" style="background:${isIn ? '#059669' : '#DC2626'};">Confirmar</button>
                </div>
            </form>`);
        const qtyEl = el.querySelector('#mv-qty'), costEl = el.querySelector('#mv-cost');
        const syncTotal = () => { if (costEl) el.querySelector('#mv-total').textContent = fmtBRL((Number(qtyEl.value) || 0) * (Number(costEl.value) || 0)); };
        qtyEl.addEventListener('input', syncTotal); costEl?.addEventListener('input', syncTotal);
        el.querySelector('#mv-expense')?.addEventListener('change', (e) => { el.querySelector('#mv-exp-wrap').style.display = e.target.checked ? '' : 'none'; });
        qtyEl.focus();
        el.querySelector('form').addEventListener('submit', (e) => {
            e.preventDefault();
            const qty = Math.round((Number(qtyEl.value) || 0) * 1000) / 1000;
            if (!(qty > 0)) return App.toast('Informe a quantidade', 'error');
            const reason = el.querySelector('#mv-reason').value;
            const list = DB.get('materials') || [];
            const mat = list.find(x => x.id === id);
            const delta = isIn ? qty : -qty;
            mat.stock = Math.round(((Number(mat.stock) || 0) + delta) * 1000) / 1000;
            if (isIn && Number(costEl.value) > 0) mat.cost = Number(costEl.value);
            mat.moves = [...(mat.moves || []), { at: new Date().toISOString(), qty: delta, reason }].slice(-300);
            DB.save('materials', list);

            if (isIn && el.querySelector('#mv-expense').checked && Number(costEl.value) > 0) {
                const paid = el.querySelector('#mv-paid').value === '1';
                const today = isoDate(new Date());
                const tx = DB.get('transactions') || [];
                tx.unshift({
                    id: `TX-${Date.now().toString(36).toUpperCase()}`, type: 'out',
                    description: `${reason}: ${num(qty)} ${mat.unit} de ${mat.name}`,
                    amount: Math.round(qty * Number(costEl.value) * 100) / 100,
                    category: /MDF|Acrílico/i.test(mat.category) ? 'Material (MDF/Acrílico)' : 'Insumos (tinta, cola, embalagem)',
                    method: el.querySelector('#mv-method').value, paid, date: paid ? today : '', dueDate: today,
                    createdAt: new Date().toISOString()
                });
                DB.save('transactions', tx);
            }
            el.remove();
            App.toast(`${isIn ? 'Entrada' : 'Saída'} registrada: ${num(qty)} ${mat.unit}`);
            Inventory.render(Inventory.container);
        });
    },

    openHistory: (id) => {
        const m = (DB.get('materials') || []).find(x => x.id === id);
        if (!m) return;
        const moves = [...(m.moves || [])].reverse();
        Inventory.modal(`
            <div class="w-full max-w-lg rounded-2xl bg-white shadow-2xl max-h-[88vh] flex flex-col">
                ${Inventory.header(`Histórico · ${esc(m.name)}`)}
                <div class="overflow-y-auto px-6 py-4 space-y-1.5">
                    ${moves.length ? moves.map(v => `
                        <div class="flex items-center justify-between gap-3 py-1.5 border-b" style="border-color:#F1F0F7;">
                            <div class="min-w-0"><p class="text-sm truncate">${esc(v.reason)}</p>
                                <p class="text-[11px]" style="color:var(--text-faint);">${new Date(v.at).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', year: '2-digit', hour: '2-digit', minute: '2-digit' })}</p></div>
                            <b class="whitespace-nowrap" style="color:${v.qty >= 0 ? '#059669' : '#DC2626'};">${v.qty >= 0 ? '+' : ''}${num(v.qty)} ${esc(m.unit)}</b>
                        </div>`).join('') : '<p class="text-sm italic py-6 text-center" style="color:var(--text-faint);">Sem movimentos.</p>'}
                </div>
            </div>`);
    },

    bind: (container) => {
        container.querySelector('#inv-new')?.addEventListener('click', () => Inventory.openForm());
        container.querySelector('#inv-new-empty')?.addEventListener('click', () => Inventory.openForm());
        container.querySelectorAll('[data-inv-filter]').forEach(b => b.addEventListener('click', () => { Inventory.filter = b.dataset.invFilter; Inventory.render(container); }));
        let t;
        container.querySelector('#inv-search')?.addEventListener('input', (e) => {
            clearTimeout(t);
            t = setTimeout(() => {
                Inventory.search = e.target.value; Inventory.render(container);
                const s = container.querySelector('#inv-search'); s.focus(); s.setSelectionRange(s.value.length, s.value.length);
            }, 250);
        });
        container.querySelector('table')?.addEventListener('click', (e) => {
            const mv = e.target.closest('[data-inv-move]');
            const ed = e.target.closest('[data-inv-edit]');
            const hi = e.target.closest('[data-inv-hist]');
            if (mv) Inventory.openMove(mv.dataset.id, mv.dataset.invMove);
            else if (ed) Inventory.openForm((DB.get('materials') || []).find(x => x.id === ed.dataset.invEdit));
            else if (hi) Inventory.openHistory(hi.dataset.invHist);
        });
    }
};

export default Inventory;
