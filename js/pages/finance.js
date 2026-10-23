/**
 * finance.js — Financeiro com dados reais
 *
 * Entradas  = recebimentos registrados nos pedidos (order.payments) + entradas avulsas.
 * Saídas    = despesas lançadas (tabela "transactions", type 'out').
 * A receber = saldo em aberto dos pedidos.   A pagar = despesas pendentes.
 * Lucro bruto das vendas = vendas do período − custo dos produtos vendidos.
 */
import DB from '../db.js';
import App from '../app.js';
import { fmtBRL, esc, isoDate } from '../utils.js';
import Payments, { METHODS } from '../payments.js';

const OUT_CATEGORIES = ['Material (MDF/Acrílico)', 'Insumos (tinta, cola, embalagem)', 'Energia', 'Aluguel', 'Internet/Telefone',
    'Frete/Correios', 'Marketing/Anúncios', 'Taxas (cartão/marketplace)', 'Manutenção/Equipamentos', 'Impostos (DAS/MEI)',
    'Retirada (pró-labore)', 'Outros'];
const IN_CATEGORIES = ['Venda balcão', 'Serviço', 'Venda marketplace', 'Outros'];

const PERIODS = [
    { id: 'mes', label: 'Este mês' },
    { id: 'mes-passado', label: 'Mês passado' },
    { id: '30d', label: 'Últimos 30 dias' },
    { id: 'ano', label: 'Este ano' },
    { id: 'tudo', label: 'Tudo' }
];

const round = (v) => Math.round((Number(v) || 0) * 100) / 100;
const isDone = (o) => /Conclu|Pronto|Entregue/i.test(String(o?.status || ''));
const fmtD = (iso) => { const [y, m, d] = String(iso || '').split('-'); return d ? `${d}/${m}/${y}` : ''; };

const Finance = {
    period: 'mes',
    filterType: 'todos',
    search: '',
    chart: null,

    /** [início, fim] (AAAA-MM-DD, inclusivo) do período escolhido. */
    range: () => {
        const now = new Date();
        const y = now.getFullYear(), m = now.getMonth();
        switch (Finance.period) {
            case 'mes':         return [isoDate(new Date(y, m, 1)), isoDate(new Date(y, m + 1, 0))];
            case 'mes-passado': return [isoDate(new Date(y, m - 1, 1)), isoDate(new Date(y, m, 0))];
            case '30d':         return [isoDate(new Date(y, m, now.getDate() - 29)), isoDate(now)];
            case 'ano':         return [`${y}-01-01`, `${y}-12-31`];
            default:            return ['0000-01-01', '9999-12-31'];
        }
    },

    /** Todas as movimentações (pedidos + lançamentos), já normalizadas. */
    movements: () => {
        const orders = (DB.get('orders') || []).filter(o => o.status !== 'Cancelado');
        const customers = DB.get('customers') || [];
        const custName = (o) => customers.find(c => String(c.id) === String(o.customerId))?.name || o.customerName || 'Cliente';
        const list = [];

        orders.forEach(o => {
            const pays = Array.isArray(o.payments) ? o.payments
                : (isDone(o) ? [{ id: `legacy-${o.id}`, date: o.date, amount: o.value, method: 'Não informado' }] : []);
            pays.forEach(p => list.push({
                id: p.id, source: 'order', orderId: o.id, type: 'in', paid: true,
                date: p.date, amount: round(p.amount), method: p.method || '',
                category: 'Venda (pedido)', description: `${o.id} · ${custName(o)}`
            }));
        });

        (DB.get('transactions') || []).forEach(t => list.push({
            ...t, source: 'manual', amount: round(t.amount),
            date: t.paid ? (t.date || t.dueDate) : (t.dueDate || t.date)
        }));
        return list.sort((a, b) => String(b.date).localeCompare(String(a.date)));
    },

    render: (container) => {
        Finance.container = container;
        const [from, to] = Finance.range();
        const inRange = (d) => d >= from && d <= to;
        const all = Finance.movements();
        const paidInRange = all.filter(m => m.paid && inRange(m.date));

        const entradas = round(paidInRange.filter(m => m.type === 'in').reduce((n, m) => n + m.amount, 0));
        const saidas = round(paidInRange.filter(m => m.type === 'out').reduce((n, m) => n + m.amount, 0));
        const saldo = round(entradas - saidas);

        const orders = (DB.get('orders') || []).filter(o => o.status !== 'Cancelado');
        const open = orders.filter(o => Payments.balance(o) > 0.009);
        const aReceber = round(open.reduce((n, o) => n + Payments.balance(o), 0));
        const pendOut = all.filter(m => m.type === 'out' && !m.paid);
        const aPagar = round(pendOut.reduce((n, m) => n + m.amount, 0));
        const today = isoDate(new Date());
        const lateOut = pendOut.filter(m => m.date < today).length;

        // Vendas do período (pela data do pedido) e custo dos produtos vendidos
        const products = DB.get('products') || [];
        const salesInRange = orders.filter(o => inRange(o.date));
        const vendas = round(salesInRange.reduce((n, o) => n + (Number(o.value) || 0), 0));
        const custo = round(salesInRange.reduce((n, o) => n + (o.items || []).reduce((s, i) => {
            const p = products.find(x => String(x.id) === String(i.productId));
            const unitCost = i.unitCost != null ? Number(i.unitCost) : (p ? Number(p.cost) || 0 : 0);
            return s + unitCost * (Number(i.quantity) || 1);
        }, 0), 0));
        const lucroBruto = round(vendas - custo);
        const resultado = round(lucroBruto - saidas);
        const margem = vendas > 0 ? (resultado / vendas) * 100 : 0;

        // Tabela
        const term = Finance.search.trim().toLowerCase();
        const rows = all.filter(m => (Finance.period === 'tudo' || inRange(m.date)) &&
            (Finance.filterType === 'todos' || (Finance.filterType === 'pendentes' ? !m.paid : m.type === Finance.filterType)) &&
            (!term || `${m.description} ${m.category} ${m.method}`.toLowerCase().includes(term)));

        const periodLabel = PERIODS.find(p => p.id === Finance.period)?.label;
        const kpi = (label, value, color, sub, icon) => `
            <div class="bg-white rounded-2xl p-5 border border-slate-200/70 shadow-sm">
                <p class="text-xs font-bold uppercase tracking-wider flex items-center gap-1.5" style="color:var(--text-faint);">
                    <span class="material-symbols-outlined" style="font-size:16px;">${icon}</span>${label}</p>
                <p class="text-2xl font-black mt-2" style="color:${color};">${value}</p>
                <p class="text-xs mt-1" style="color:var(--text-muted);">${sub}</p>
            </div>`;

        container.innerHTML = `
<div class="max-w-[1440px] mx-auto flex flex-col gap-6 pb-16 page-enter">
    <div class="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
        <div>
            <h2 class="page-title">Financeiro 💰</h2>
            <p class="text-sm mt-1" style="color:var(--text-muted);">Recebimentos dos pedidos, despesas e resultado da gráfica.</p>
        </div>
        <div class="flex flex-wrap gap-2">
            <select id="fin-period" class="!w-auto font-semibold">${PERIODS.map(p => `<option value="${p.id}" ${p.id === Finance.period ? 'selected' : ''}>${p.label}</option>`).join('')}</select>
            <button id="fin-new-out" class="btn-primary" style="background:#DC2626;"><span class="material-symbols-outlined" style="font-size:18px;">remove_circle</span> Nova despesa</button>
            <button id="fin-new-in" class="btn-primary" style="background:#059669;"><span class="material-symbols-outlined" style="font-size:18px;">add_circle</span> Nova entrada</button>
            <button id="fin-export" class="btn-ghost"><span class="material-symbols-outlined" style="font-size:18px;">download</span> Exportar</button>
        </div>
    </div>

    <div class="grid grid-cols-2 lg:grid-cols-5 gap-4">
        ${kpi('Entradas', fmtBRL(entradas), '#059669', `recebido · ${periodLabel.toLowerCase()}`, 'south_west')}
        ${kpi('Saídas', fmtBRL(saidas), '#DC2626', `despesas pagas · ${periodLabel.toLowerCase()}`, 'north_east')}
        ${kpi('Saldo do caixa', fmtBRL(saldo), saldo >= 0 ? 'var(--text-main)' : '#DC2626', 'entradas − saídas', 'account_balance_wallet')}
        ${kpi('A receber', fmtBRL(aReceber), '#B45309', `${open.length} pedido(s) em aberto`, 'schedule')}
        ${kpi('A pagar', fmtBRL(aPagar), lateOut ? '#DC2626' : 'var(--text-main)', `${pendOut.length} despesa(s)${lateOut ? ` · ${lateOut} vencida(s)` : ''}`, 'event_busy')}
    </div>

    <div class="grid grid-cols-1 xl:grid-cols-3 gap-6">
        <div class="xl:col-span-2 bg-white rounded-2xl p-6 border border-slate-200/70 shadow-sm">
            <div class="flex items-center justify-between mb-4">
                <h3 class="section-heading">Fluxo de caixa</h3>
                <div class="flex gap-4 text-xs font-semibold" style="color:var(--text-muted);">
                    <span class="flex items-center gap-1.5"><i class="w-3 h-3 rounded-full inline-block" style="background:#10B981"></i>Entradas</span>
                    <span class="flex items-center gap-1.5"><i class="w-3 h-3 rounded-full inline-block" style="background:#EF4444"></i>Saídas</span>
                </div>
            </div>
            <div class="h-[260px]"><canvas id="fin-chart"></canvas></div>
        </div>

        <div class="bg-white rounded-2xl p-6 border border-slate-200/70 shadow-sm">
            <h3 class="section-heading mb-1">Resultado das vendas</h3>
            <p class="text-xs mb-4" style="color:var(--text-faint);">Pedidos feitos em: ${periodLabel.toLowerCase()}</p>
            <div class="space-y-2.5 text-sm">
                <div class="flex justify-between"><span style="color:var(--text-muted);">Vendas (${salesInRange.length})</span><b>${fmtBRL(vendas)}</b></div>
                <div class="flex justify-between"><span style="color:var(--text-muted);">− Custo dos produtos</span><span style="color:#DC2626;">${fmtBRL(custo)}</span></div>
                <div class="flex justify-between border-t pt-2" style="border-color:var(--border);"><span style="color:var(--text-muted);">= Lucro bruto</span><b>${fmtBRL(lucroBruto)}</b></div>
                <div class="flex justify-between"><span style="color:var(--text-muted);">− Despesas pagas</span><span style="color:#DC2626;">${fmtBRL(saidas)}</span></div>
                <div class="flex justify-between items-end border-t pt-3" style="border-color:var(--border);">
                    <span class="font-bold">Resultado</span>
                    <span class="text-xl font-black" style="color:${resultado >= 0 ? '#059669' : '#DC2626'};">${fmtBRL(resultado)}</span>
                </div>
                <p class="text-xs text-right" style="color:var(--text-faint);">Margem: ${margem.toLocaleString('pt-BR', { maximumFractionDigits: 1 })}%</p>
            </div>
            <div id="fin-cats" class="mt-5 pt-4 border-t space-y-2" style="border-color:var(--border);"></div>
        </div>
    </div>

    <div class="bg-white rounded-2xl border border-slate-200/70 shadow-sm overflow-hidden">
        <div class="p-5 border-b flex flex-col md:flex-row justify-between gap-3" style="border-color:var(--border);">
            <h3 class="section-heading">Movimentações</h3>
            <div class="flex flex-wrap gap-2 items-center">
                ${[['todos', 'Todas'], ['in', 'Entradas'], ['out', 'Saídas'], ['pendentes', 'A pagar']].map(([id, l]) => `
                    <button type="button" data-fin-type="${id}" class="px-3 py-1.5 rounded-lg text-xs font-bold border ${Finance.filterType === id ? 'bg-primary text-white border-transparent' : 'bg-white text-slate-600 border-slate-200'}">${l}</button>`).join('')}
                <div class="search-input-wrap" style="width:220px;">
                    <span class="material-symbols-outlined">search</span>
                    <input type="text" id="fin-search" placeholder="Buscar…" value="${esc(Finance.search)}">
                </div>
            </div>
        </div>
        <div class="overflow-x-auto">
            <table class="w-full text-left text-sm">
                <thead><tr class="text-[11px] uppercase tracking-wider" style="color:var(--text-faint); background:#FAFBFF;">
                    <th class="px-5 py-3">Data</th><th class="px-5 py-3">Descrição</th><th class="px-5 py-3">Categoria</th>
                    <th class="px-5 py-3">Forma</th><th class="px-5 py-3 text-right">Valor</th><th class="px-5 py-3 text-center">Ações</th>
                </tr></thead>
                <tbody>
                    ${rows.length ? rows.slice(0, 300).map(m => `
                    <tr class="border-t" style="border-color:#F1F0F7;">
                        <td class="px-5 py-3 whitespace-nowrap" style="color:var(--text-muted);">${fmtD(m.date)}${!m.paid ? `<div class="text-[10px] font-black ${m.date < today ? 'text-red-600' : 'text-amber-600'}">${m.date < today ? 'VENCIDA' : 'A PAGAR'}</div>` : ''}</td>
                        <td class="px-5 py-3 font-semibold" style="color:var(--text-main);">${esc(m.description)}</td>
                        <td class="px-5 py-3"><span class="text-[11px] font-bold px-2 py-0.5 rounded-md" style="background:${m.type === 'in' ? '#ECFDF5' : '#FEF2F2'}; color:${m.type === 'in' ? '#059669' : '#DC2626'};">${esc(m.category)}</span></td>
                        <td class="px-5 py-3 text-xs" style="color:var(--text-muted);">${esc(m.method || '—')}</td>
                        <td class="px-5 py-3 text-right font-black whitespace-nowrap" style="color:${m.type === 'in' ? '#059669' : '#DC2626'};">${m.type === 'in' ? '+' : '−'} ${fmtBRL(m.amount)}</td>
                        <td class="px-5 py-3 text-center whitespace-nowrap">
                            ${m.source === 'manual' ? `
                                ${!m.paid ? `<button data-fin-pay="${esc(m.id)}" class="p-1.5 rounded-lg hover:bg-emerald-50 text-emerald-600" title="Marcar como paga"><span class="material-symbols-outlined" style="font-size:18px;">check_circle</span></button>` : ''}
                                <button data-fin-edit="${esc(m.id)}" class="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-primary" title="Editar"><span class="material-symbols-outlined" style="font-size:18px;">edit</span></button>
                                <button data-fin-del="${esc(m.id)}" class="p-1.5 rounded-lg hover:bg-red-50 text-slate-400 hover:text-red-500" title="Excluir"><span class="material-symbols-outlined" style="font-size:18px;">delete</span></button>`
                            : `<button data-fin-order="${esc(m.orderId)}" class="p-1.5 rounded-lg hover:bg-violet-50 text-slate-400 hover:text-primary" title="Ver pagamentos do pedido"><span class="material-symbols-outlined" style="font-size:18px;">receipt_long</span></button>`}
                        </td>
                    </tr>`).join('') : `<tr><td colspan="6" class="px-5 py-10 text-center italic" style="color:var(--text-faint);">Nenhuma movimentação neste filtro.</td></tr>`}
                </tbody>
            </table>
        </div>
    </div>
</div>`;

        Finance.drawChart(all.filter(m => m.paid), from, to);
        Finance.drawCategories(paidInRange.filter(m => m.type === 'out'));
        Finance.bindEvents(container);
    },

    drawChart: (paid, from, to) => {
        const canvas = document.getElementById('fin-chart');
        if (!canvas || typeof Chart === 'undefined') return;
        Finance.chart?.destroy();

        // Até ~62 dias: barras por dia. Acima: por mês.
        const start = from === '0000-01-01' ? (paid.map(m => m.date).sort()[0] || isoDate(new Date())) : from;
        const end = to === '9999-12-31' ? isoDate(new Date()) : to;
        const days = Math.round((new Date(`${end}T12:00:00`) - new Date(`${start}T12:00:00`)) / 86400000) + 1;
        const byMonth = days > 62;
        const keys = [];
        const d = new Date(`${start}T12:00:00`);
        const last = new Date(`${end}T12:00:00`);
        while (d <= last && keys.length < 400) {
            const k = byMonth ? isoDate(d).slice(0, 7) : isoDate(d);
            if (!keys.includes(k)) keys.push(k);
            if (byMonth) d.setMonth(d.getMonth() + 1, 1); else d.setDate(d.getDate() + 1);
        }
        const sum = (type) => keys.map(k => round(paid.filter(m => m.type === type && String(m.date).startsWith(k)).reduce((n, m) => n + m.amount, 0)));
        const labels = keys.map(k => byMonth
            ? new Date(`${k}-01T12:00:00`).toLocaleDateString('pt-BR', { month: 'short', year: '2-digit' }).replace(' de ', '/').replace('.', '')
            : `${k.slice(8, 10)}/${k.slice(5, 7)}`);

        Finance.chart = new Chart(canvas.getContext('2d'), {
            type: 'bar',
            data: { labels, datasets: [
                { label: 'Entradas', data: sum('in'), backgroundColor: '#10B981', borderRadius: 4, maxBarThickness: 22 },
                { label: 'Saídas', data: sum('out'), backgroundColor: '#EF4444', borderRadius: 4, maxBarThickness: 22 }
            ] },
            options: {
                responsive: true, maintainAspectRatio: false,
                plugins: { legend: { display: false }, tooltip: { callbacks: { label: (c) => `${c.dataset.label}: ${fmtBRL(c.parsed.y)}` } } },
                scales: { y: { beginAtZero: true, grid: { color: '#F1F0F7' }, ticks: { callback: (v) => fmtBRL(v).replace(',00', '') } }, x: { grid: { display: false } } }
            }
        });
    },

    drawCategories: (outs) => {
        const el = document.getElementById('fin-cats');
        if (!el) return;
        const total = outs.reduce((n, m) => n + m.amount, 0);
        const byCat = {};
        outs.forEach(m => { byCat[m.category] = (byCat[m.category] || 0) + m.amount; });
        const entries = Object.entries(byCat).sort((a, b) => b[1] - a[1]);
        el.innerHTML = !entries.length ? `<p class="text-xs italic" style="color:var(--text-faint);">Nenhuma despesa paga no período.</p>`
            : `<p class="label-caps mb-1">Despesas por categoria</p>` + entries.map(([c, v]) => `
                <div>
                    <div class="flex justify-between text-xs mb-1"><span style="color:var(--text-muted);">${esc(c)}</span><b>${fmtBRL(v)}</b></div>
                    <div class="h-1.5 rounded-full bg-slate-100"><div class="h-1.5 rounded-full" style="width:${(v / total * 100).toFixed(1)}%; background:#EF4444;"></div></div>
                </div>`).join('');
    },

    /** Janela de lançamento (nova despesa/entrada ou edição). */
    openForm: (type, existing = null) => {
        document.getElementById('ggp-fin-modal')?.remove();
        const t = existing || { type, paid: true, date: isoDate(new Date()), method: 'Pix', category: type === 'out' ? OUT_CATEGORIES[0] : IN_CATEGORIES[0] };
        const isOut = t.type === 'out';
        const cats = isOut ? OUT_CATEGORIES : IN_CATEGORIES;
        const el = document.createElement('div');
        el.id = 'ggp-fin-modal';
        el.className = 'fixed inset-0 z-[120] flex items-center justify-center p-4';
        el.style.cssText = 'background:rgba(10,10,20,0.5); backdrop-filter:blur(8px);';
        el.innerHTML = `
            <form class="w-full max-w-md rounded-2xl bg-white shadow-2xl max-h-[94vh] overflow-y-auto">
                <div class="px-6 py-4 border-b flex items-center justify-between" style="border-color:var(--border);">
                    <h3 class="text-lg font-black" style="color:${isOut ? '#DC2626' : '#059669'};">${existing ? 'Editar' : 'Nova'} ${isOut ? 'despesa' : 'entrada'}</h3>
                    <button type="button" data-close class="w-8 h-8 flex items-center justify-center rounded-full hover:bg-slate-100" style="color:var(--text-faint);"><span class="material-symbols-outlined" style="font-size:18px;">close</span></button>
                </div>
                <div class="px-6 py-5 space-y-4">
                    <div><label>Descrição</label><input id="ft-desc" required placeholder="${isOut ? 'Ex: Chapa MDF 3mm (10 un)' : 'Ex: Venda balcão — chaveiros'}" value="${esc(t.description || '')}"></div>
                    <div class="grid grid-cols-2 gap-3">
                        <div><label>Valor (R$)</label><input id="ft-amount" type="number" step="0.01" min="0.01" required inputmode="decimal" value="${t.amount ? Number(t.amount).toFixed(2) : ''}"></div>
                        <div><label>Categoria</label><select id="ft-cat">${[...new Set([...cats, t.category])].map(c => `<option ${c === t.category ? 'selected' : ''}>${esc(c)}</option>`).join('')}</select></div>
                    </div>
                    <div class="grid grid-cols-2 gap-3">
                        <div><label>Forma</label><select id="ft-method">${METHODS.map(m => `<option ${m === t.method ? 'selected' : ''}>${m}</option>`).join('')}</select></div>
                        <div><label>${isOut ? 'Situação' : 'Recebido em'}</label>
                            ${isOut ? `<select id="ft-paid"><option value="1" ${t.paid ? 'selected' : ''}>Já paga</option><option value="0" ${!t.paid ? 'selected' : ''}>A pagar</option></select>`
                                    : `<input id="ft-date-in" type="date" value="${esc(t.date || '')}">`}
                        </div>
                    </div>
                    ${isOut ? `
                    <div class="grid grid-cols-2 gap-3">
                        <div id="ft-date-wrap"><label>Pago em</label><input id="ft-date" type="date" value="${esc(t.date || isoDate(new Date()))}"></div>
                        <div id="ft-due-wrap"><label>Vencimento</label><input id="ft-due" type="date" value="${esc(t.dueDate || t.date || isoDate(new Date()))}"></div>
                    </div>` : ''}
                </div>
                <div class="px-6 py-4 border-t flex justify-end gap-2" style="border-color:var(--border);">
                    <button type="button" data-close class="btn-ghost">Cancelar</button>
                    <button type="submit" class="btn-primary" style="background:${isOut ? '#DC2626' : '#059669'};">Salvar</button>
                </div>
            </form>`;

        const paidSel = el.querySelector('#ft-paid');
        const syncPaid = () => {
            if (!paidSel) return;
            const paid = paidSel.value === '1';
            el.querySelector('#ft-date-wrap').style.opacity = paid ? '1' : '.4';
            el.querySelector('#ft-date').disabled = !paid;
        };
        paidSel?.addEventListener('change', syncPaid);
        syncPaid();

        const close = () => el.remove();
        el.addEventListener('click', (e) => { if (e.target === el || e.target.closest('[data-close]')) close(); });
        el.querySelector('form').addEventListener('submit', (e) => {
            e.preventDefault();
            const amount = round(el.querySelector('#ft-amount').value);
            if (!(amount > 0)) return App.toast('Informe o valor', 'error');
            const paid = isOut ? paidSel.value === '1' : true;
            const rec = {
                id: existing?.id || `TX-${Date.now().toString(36).toUpperCase()}`,
                type: t.type,
                description: el.querySelector('#ft-desc').value.trim(),
                amount,
                category: el.querySelector('#ft-cat').value,
                method: el.querySelector('#ft-method').value,
                paid,
                date: isOut ? (paid ? el.querySelector('#ft-date').value : '') : (el.querySelector('#ft-date-in').value || isoDate(new Date())),
                dueDate: isOut ? el.querySelector('#ft-due').value : '',
                createdAt: existing?.createdAt || new Date().toISOString()
            };
            const list = DB.get('transactions') || [];
            const i = list.findIndex(x => x.id === rec.id);
            if (i === -1) list.unshift(rec); else list[i] = rec;
            DB.save('transactions', list);
            App.toast(`${isOut ? 'Despesa' : 'Entrada'} salva`);
            close();
            Finance.render(Finance.container);
        });
        document.body.appendChild(el);
        el.querySelector('#ft-desc').focus();
    },

    exportCsv: () => {
        const [from, to] = Finance.range();
        const rows = Finance.movements().filter(m => Finance.period === 'tudo' || (m.date >= from && m.date <= to));
        const num = (v) => Number(v).toFixed(2).replace('.', ',');
        const cell = (v) => `"${String(v ?? '').replace(/"/g, '""')}"`;
        const lines = [['Data', 'Tipo', 'Descrição', 'Categoria', 'Forma', 'Situação', 'Valor'].map(cell).join(';')]
            .concat(rows.map(m => [fmtD(m.date), m.type === 'in' ? 'Entrada' : 'Saída', m.description, m.category, m.method,
                m.paid ? 'Pago' : 'Pendente', (m.type === 'in' ? '' : '-') + num(m.amount)].map(cell).join(';')));
        const blob = new Blob(['﻿' + lines.join('\r\n')], { type: 'text/csv;charset=utf-8' });   // BOM: Excel abre com acentos
        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = `financeiro-${Finance.period}-${isoDate(new Date())}.csv`;
        document.body.appendChild(a); a.click(); a.remove();
        setTimeout(() => URL.revokeObjectURL(a.href), 2000);
        App.toast('Planilha exportada (abre no Excel)');
    },

    bindEvents: (container) => {
        container.querySelector('#fin-period')?.addEventListener('change', (e) => { Finance.period = e.target.value; Finance.render(container); });
        container.querySelector('#fin-new-out')?.addEventListener('click', () => Finance.openForm('out'));
        container.querySelector('#fin-new-in')?.addEventListener('click', () => Finance.openForm('in'));
        container.querySelector('#fin-export')?.addEventListener('click', Finance.exportCsv);
        container.querySelectorAll('[data-fin-type]').forEach(b => b.addEventListener('click', () => { Finance.filterType = b.dataset.finType; Finance.render(container); }));

        let t;
        container.querySelector('#fin-search')?.addEventListener('input', (e) => {
            clearTimeout(t);
            t = setTimeout(() => {
                Finance.search = e.target.value;
                Finance.render(container);
                const s = container.querySelector('#fin-search');
                s.focus(); s.setSelectionRange(s.value.length, s.value.length);
            }, 250);
        });

        container.querySelector('table')?.addEventListener('click', (e) => {
            const list = DB.get('transactions') || [];
            const find = (id) => list.find(x => x.id === id);
            const edit = e.target.closest('[data-fin-edit]');
            const del = e.target.closest('[data-fin-del]');
            const pay = e.target.closest('[data-fin-pay]');
            const ord = e.target.closest('[data-fin-order]');
            if (edit) Finance.openForm(null, find(edit.dataset.finEdit));
            else if (pay) {
                const x = find(pay.dataset.finPay);
                if (x) { x.paid = true; x.date = isoDate(new Date()); DB.save('transactions', list); App.toast('Despesa marcada como paga'); Finance.render(container); }
            } else if (del) {
                const x = find(del.dataset.finDel);
                App.confirm({
                    title: 'Excluir lançamento?', message: `"${x?.description || ''}" será apagado.`, type: 'danger', confirmLabel: 'Excluir',
                    onConfirm: () => { DB.save('transactions', list.filter(y => y.id !== del.dataset.finDel)); App.toast('Lançamento excluído', 'info'); Finance.render(container); }
                });
            } else if (ord) Payments.openModal(ord.dataset.finOrder, () => Finance.render(container));
        });
    }
};

export default Finance;
