/**
 * reports.js — Relatórios com dados reais
 * Vendas por mês, produtos e clientes que mais vendem, categorias, formas de
 * pagamento, conversão de orçamentos, lucro bruto, pontualidade das entregas
 * e "Anúncios e origem dos clientes" (custo por venda e retorno de cada anúncio).
 */
import DB from '../db.js';
import App from '../app.js';
import { fmtBRL, esc, isoDate, docNo } from '../utils.js';
import Payments from '../payments.js';
import LeadSources, { NO_SOURCE } from '../lead-sources.js';

const AD_CATEGORY = 'Marketing/Anúncios';
const AD_GENERAL = 'Anúncios em geral (sem separar)';

const PERIODS = [
    { id: 'mes', label: 'Este mês' }, { id: 'mes-passado', label: 'Mês passado' },
    { id: '90d', label: 'Últimos 90 dias' }, { id: 'ano', label: 'Este ano' }, { id: 'tudo', label: 'Tudo' }
];
const COLORS = ['#6C2BFF', '#10B981', '#F59E0B', '#3B82F6', '#EF4444', '#EC4899', '#14B8A6', '#64748B'];
const round = (v) => Math.round((Number(v) || 0) * 100) / 100;
const pct = (v) => `${(Math.round(v * 10) / 10).toLocaleString('pt-BR')}%`;

const Reports = {
    period: 'mes',
    charts: [],

    range: () => {
        const now = new Date(), y = now.getFullYear(), m = now.getMonth();
        switch (Reports.period) {
            case 'mes':         return [isoDate(new Date(y, m, 1)), isoDate(new Date(y, m + 1, 0))];
            case 'mes-passado': return [isoDate(new Date(y, m - 1, 1)), isoDate(new Date(y, m, 0))];
            case '90d':         return [isoDate(new Date(y, m, now.getDate() - 89)), isoDate(now)];
            case 'ano':         return [`${y}-01-01`, `${y}-12-31`];
            default:            return ['0000-01-01', '9999-12-31'];
        }
    },

    render: (container) => {
        Reports.container = container;
        const [from, to] = Reports.range();
        const inRange = (d) => d >= from && d <= to;
        const products = DB.get('products') || [];
        const customers = DB.get('customers') || [];
        const allOrders = (DB.get('orders') || []).filter(o => o.status !== 'Cancelado');
        const orders = allOrders.filter(o => inRange(String(o.date || '')));
        const quotes = (DB.get('quotes') || []).filter(q => inRange(String(q.date || '')));
        const custName = (o) => customers.find(c => String(c.id) === String(o.customerId))?.name || o.customerName || 'Sem nome';

        // KPIs
        const revenue = round(orders.reduce((n, o) => n + (Number(o.value) || 0), 0));
        const ticket = orders.length ? revenue / orders.length : 0;
        const cost = round(orders.reduce((n, o) => n + (o.items || []).reduce((s, i) => {
            const p = products.find(x => String(x.id) === String(i.productId));
            const uc = i.unitCost != null ? Number(i.unitCost) : (p ? Number(p.cost) || 0 : 0);
            return s + uc * (Number(i.quantity) || 1);
        }, 0), 0));
        const gross = round(revenue - cost);
        const converted = quotes.filter(q => q.status === 'Convertido').length;
        const conversion = quotes.length ? (converted / quotes.length) * 100 : 0;
        const activeClients = new Set(orders.map(custName)).size;
        const delivered = orders.filter(o => o.deliveredAt && o.dueDate);
        const onTime = delivered.filter(o => o.deliveredAt <= o.dueDate).length;
        const today = isoDate(new Date());
        const lateNow = allOrders.filter(o => o.dueDate && o.dueDate < today && !/Conclu|Pronto|Entregue/.test(o.status || '')).length;

        // Produtos
        const byProduct = new Map();
        orders.forEach(o => (o.items?.length ? o.items : [{ name: o.productName, quantity: 1, price: o.value }]).forEach(i => {
            const key = String(i.name || 'Item').trim();
            const cur = byProduct.get(key) || { name: key, qty: 0, revenue: 0, orders: 0, category: i.category || '' };
            cur.qty += Number(i.quantity) || 1; cur.revenue += Number(i.price) || 0; cur.orders += 1;
            byProduct.set(key, cur);
        }));
        const topProducts = [...byProduct.values()].sort((a, b) => b.revenue - a.revenue).slice(0, 10);

        // Clientes
        const byClient = new Map();
        orders.forEach(o => {
            const key = custName(o);
            const cur = byClient.get(key) || { name: key, revenue: 0, orders: 0, last: '', open: 0 };
            cur.revenue += Number(o.value) || 0; cur.orders += 1;
            if (String(o.date) > cur.last) cur.last = String(o.date);
            byClient.set(key, cur);
        });
        allOrders.forEach(o => { const c = byClient.get(custName(o)); if (c) c.open += Payments.balance(o); });
        const topClients = [...byClient.values()].sort((a, b) => b.revenue - a.revenue).slice(0, 10);

        // Categorias e formas de pagamento
        const byCat = {};
        orders.forEach(o => (o.items || []).forEach(i => { const c = i.category || 'Outros'; byCat[c] = (byCat[c] || 0) + (Number(i.price) || 0); }));
        const byMethod = {};
        allOrders.forEach(o => (o.payments || []).filter(p => inRange(String(p.date || ''))).forEach(p => {
            const k = p.method || 'Não informado'; byMethod[k] = (byMethod[k] || 0) + (Number(p.amount) || 0);
        }));

        const ads = Reports.adsBySource(quotes, orders, inRange);

        const fmtD = (iso) => { const [y, m, d] = String(iso || '').split('-'); return d ? `${d}/${m}/${y}` : '—'; };
        const periodLabel = PERIODS.find(p => p.id === Reports.period).label.toLowerCase();
        const kpi = (label, value, sub, color = 'var(--text-main)') => `
            <div class="bg-white rounded-2xl p-5 border border-slate-200/70 shadow-sm">
                <p class="label-caps">${label}</p>
                <p class="text-2xl font-black mt-1.5" style="color:${color};">${value}</p>
                <p class="text-xs mt-1" style="color:var(--text-muted);">${sub}</p>
            </div>`;
        const bar = (v, max, color) => `<div class="h-1.5 rounded-full bg-slate-100 mt-1"><div class="h-1.5 rounded-full" style="width:${max ? Math.max(2, v / max * 100) : 0}%; background:${color};"></div></div>`;
        const card = (title, body, extra = '') => `<div class="bg-white rounded-2xl p-6 border border-slate-200/70 shadow-sm ${extra}"><h3 class="section-heading mb-4">${title}</h3>${body}</div>`;
        const empty = `<p class="text-sm italic py-6 text-center" style="color:var(--text-faint);">Sem dados no período.</p>`;

        container.innerHTML = `
<div class="max-w-[1440px] mx-auto flex flex-col gap-6 pb-16 page-enter">
    <div class="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
            <h2 class="page-title">Relatórios 📊</h2>
            <p class="text-sm mt-1" style="color:var(--text-muted);">Como a gráfica está indo — ${periodLabel}.</p>
        </div>
        <div class="flex gap-2">
            <select id="rep-period" class="!w-auto font-semibold">${PERIODS.map(p => `<option value="${p.id}" ${p.id === Reports.period ? 'selected' : ''}>${p.label}</option>`).join('')}</select>
            <button id="rep-export" class="btn-ghost"><span class="material-symbols-outlined" style="font-size:18px;">download</span> Exportar pedidos</button>
        </div>
    </div>

    <div class="grid grid-cols-2 lg:grid-cols-6 gap-4">
        ${kpi('Faturamento', fmtBRL(revenue), `${orders.length} pedido(s)`, 'var(--primary)')}
        ${kpi('Ticket médio', fmtBRL(ticket), 'por pedido')}
        ${kpi('Lucro bruto', fmtBRL(gross), revenue ? `margem ${pct(gross / revenue * 100)} · sem despesas` : 'vendas − custo', gross >= 0 ? '#059669' : '#DC2626')}
        ${kpi('Conversão', pct(conversion), `${converted} de ${quotes.length} orçamento(s) viraram pedido`)}
        ${kpi('Clientes', activeClients, 'compraram no período')}
        ${kpi('Entregas no prazo', delivered.length ? pct(onTime / delivered.length * 100) : '—', `${lateNow} atrasado(s) agora`, lateNow ? '#DC2626' : 'var(--text-main)')}
    </div>

    ${card('Vendas por mês <span class="text-xs font-normal" style="color:var(--text-faint);">(últimos 12 meses)</span>', '<div class="h-[280px]"><canvas id="rep-months"></canvas></div>')}

    <div class="grid grid-cols-1 xl:grid-cols-2 gap-6">
        ${card('Produtos que mais vendem', topProducts.length ? `
            <div class="space-y-3">${topProducts.map((p, i) => `
                <div>
                    <div class="flex items-baseline justify-between gap-3 text-sm">
                        <span class="truncate"><b class="mr-1" style="color:var(--text-faint);">${i + 1}.</b>${esc(p.name)}</span>
                        <span class="whitespace-nowrap"><b>${fmtBRL(p.revenue)}</b> <span class="text-xs" style="color:var(--text-faint);">· ${p.qty.toLocaleString('pt-BR')} un</span></span>
                    </div>${bar(p.revenue, topProducts[0].revenue, '#6C2BFF')}
                </div>`).join('')}</div>` : empty)}

        ${card('Melhores clientes', topClients.length ? `
            <div class="overflow-x-auto"><table class="w-full text-sm">
                <thead><tr class="text-[11px] uppercase tracking-wider text-left" style="color:var(--text-faint);"><th class="pb-2">Cliente</th><th class="pb-2 text-right">Pedidos</th><th class="pb-2 text-right">Total</th><th class="pb-2 text-right">Última</th><th class="pb-2 text-right">Deve</th></tr></thead>
                <tbody>${topClients.map(c => `
                    <tr class="border-t" style="border-color:#F1F0F7;">
                        <td class="py-2 font-semibold truncate max-w-[180px]">${esc(c.name)}</td>
                        <td class="py-2 text-right">${c.orders}</td>
                        <td class="py-2 text-right font-bold">${fmtBRL(c.revenue)}</td>
                        <td class="py-2 text-right text-xs" style="color:var(--text-muted);">${fmtD(c.last)}</td>
                        <td class="py-2 text-right font-bold" style="color:${c.open > 0.009 ? '#B45309' : 'var(--text-faint)'};">${c.open > 0.009 ? fmtBRL(c.open) : '—'}</td>
                    </tr>`).join('')}</tbody>
            </table></div>` : empty)}
    </div>

    ${card('Anúncios e origem dos clientes <span class="text-xs font-normal" style="color:var(--text-faint);">(de onde vieram os orçamentos e as vendas)</span>', Reports.adsHtml(ads, kpi, empty))}

    <div class="grid grid-cols-1 xl:grid-cols-2 gap-6">
        ${card('Vendas por categoria', Object.keys(byCat).length ? '<div class="h-[260px]"><canvas id="rep-cats"></canvas></div>' : empty)}
        ${card('Recebimentos por forma de pagamento', Object.keys(byMethod).length ? '<div class="h-[260px]"><canvas id="rep-methods"></canvas></div>' : empty)}
    </div>
</div>`;

        Reports.drawCharts(allOrders, byCat, byMethod);
        container.querySelector('#rep-period').addEventListener('change', (e) => { Reports.period = e.target.value; Reports.render(container); });
        container.querySelector('#rep-export').addEventListener('click', () => Reports.exportCsv(orders, custName));
    },

    /**
     * Agrupa orçamentos, pedidos e gasto com anúncio por origem (campo leadSource).
     * Contatos = orçamentos do período + pedidos feitos sem orçamento.
     * Gasto   = despesas pagas de "Marketing/Anúncios" no período, pelo anúncio escolhido.
     */
    adsBySource: (quotes, orders, inRange) => {
        const key = (x) => String(x?.leadSource || '').trim() || NO_SOURCE;
        const map = new Map();
        const row = (k) => {
            if (!map.has(k)) map.set(k, { name: k, contacts: 0, sales: 0, revenue: 0, spend: 0, isAd: LeadSources.isAd(k) || k === AD_GENERAL });
            return map.get(k);
        };
        const fromQuote = new Set(quotes.map(q => q.orderId).filter(Boolean));
        quotes.forEach(q => { row(key(q)).contacts++; });
        orders.forEach(o => {
            const r = row(key(o));
            r.sales++; r.revenue += Number(o.value) || 0;
            if (!fromQuote.has(o.id)) r.contacts++;
        });
        (DB.get('transactions') || [])
            .filter(t => t.type === 'out' && t.paid && t.category === AD_CATEGORY && inRange(String(t.date || '')))
            .forEach(t => { row(String(t.leadSource || '').trim() || AD_GENERAL).spend += Number(t.amount) || 0; });

        const rows = [...map.values()].map(r => ({ ...r, revenue: round(r.revenue), spend: round(r.spend) }));
        const order = (r) => (r.name === NO_SOURCE ? 2 : r.isAd ? 0 : 1);
        rows.sort((a, b) => order(a) - order(b) || b.revenue - a.revenue || b.contacts - a.contacts);

        const adRows = rows.filter(r => r.isAd);
        const spend = round(adRows.reduce((n, r) => n + r.spend, 0));
        const revenue = round(adRows.reduce((n, r) => n + r.revenue, 0));
        const sales = adRows.reduce((n, r) => n + r.sales, 0);
        const tagged = rows.filter(r => r.name !== NO_SOURCE).reduce((n, r) => n + r.contacts + r.sales, 0);
        return { rows, spend, revenue, sales, tagged };
    },

    adsHtml: (ads, kpi, empty) => {
        if (!ads.rows.length) return empty;
        const roas = (rev, sp) => (sp > 0 ? `${(rev / sp).toLocaleString('pt-BR', { maximumFractionDigits: 1 })}x` : '—');
        const cps = (sp, n) => (sp > 0 && n > 0 ? fmtBRL(sp / n) : '—');
        const close = (r) => (r.contacts > 0 ? pct(Math.min(100, r.sales / r.contacts * 100)) : '—');
        const good = ads.spend > 0 && ads.revenue / ads.spend >= 3;
        return `
            ${!ads.tagged ? `<p class="text-sm mb-4 p-3 rounded-xl" style="background:#FEF3C7; color:#92400E;">
                Ainda não há orçamentos com <b>Origem do cliente</b>. Escolha a origem ao montar cada orçamento,
                e lance o gasto dos anúncios em Financeiro → Nova despesa → <b>Marketing/Anúncios</b>.</p>` : ''}
            <div class="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-5">
                ${kpi('Gasto com anúncios', fmtBRL(ads.spend), 'despesas de Marketing/Anúncios pagas')}
                ${kpi('Vendas de anúncios', fmtBRL(ads.revenue), `${ads.sales} pedido(s) vindos de anúncio`, 'var(--primary)')}
                ${kpi('Retorno (ROAS)', roas(ads.revenue, ads.spend), 'faturamento ÷ gasto', ads.spend ? (good ? '#059669' : '#B45309') : 'var(--text-main)')}
                ${kpi('Custo por venda', cps(ads.spend, ads.sales), 'gasto ÷ pedidos de anúncio')}
            </div>
            <div class="overflow-x-auto"><table class="w-full text-sm">
                <thead><tr class="text-[11px] uppercase tracking-wider text-left" style="color:var(--text-faint);">
                    <th class="pb-2">Origem</th><th class="pb-2 text-right">Contatos</th><th class="pb-2 text-right">Vendas</th>
                    <th class="pb-2 text-right">Fechamento</th><th class="pb-2 text-right">Faturamento</th><th class="pb-2 text-right">Gasto</th>
                    <th class="pb-2 text-right">Custo/venda</th><th class="pb-2 text-right">Retorno</th></tr></thead>
                <tbody>${ads.rows.map(r => `
                    <tr class="border-t" style="border-color:#F1F0F7;">
                        <td class="py-2 font-semibold">${r.isAd ? '<span class="material-symbols-outlined align-middle mr-1" style="font-size:16px; color:var(--primary);">campaign</span>' : ''}${esc(r.name)}</td>
                        <td class="py-2 text-right">${r.contacts || '—'}</td>
                        <td class="py-2 text-right">${r.sales || '—'}</td>
                        <td class="py-2 text-right">${close(r)}</td>
                        <td class="py-2 text-right font-bold">${r.revenue ? fmtBRL(r.revenue) : '—'}</td>
                        <td class="py-2 text-right">${r.spend ? fmtBRL(r.spend) : '—'}</td>
                        <td class="py-2 text-right">${r.isAd ? cps(r.spend, r.sales) : '—'}</td>
                        <td class="py-2 text-right font-bold" style="color:${r.spend && r.revenue / r.spend >= 3 ? '#059669' : 'var(--text-main)'};">${r.isAd ? roas(r.revenue, r.spend) : '—'}</td>
                    </tr>`).join('')}</tbody>
            </table></div>
            <p class="text-xs mt-3" style="color:var(--text-faint);">Retorno = faturamento ÷ gasto (3x ou mais fica verde). Gasto lançado sem escolher o anúncio aparece em "${esc(AD_GENERAL)}".</p>`;
    },

    drawCharts: (allOrders, byCat, byMethod) => {
        Reports.charts.forEach(c => c.destroy());
        Reports.charts = [];
        if (typeof Chart === 'undefined') return;

        const now = new Date();
        const months = Array.from({ length: 12 }, (_, i) => {
            const d = new Date(now.getFullYear(), now.getMonth() - 11 + i, 1);
            return { key: isoDate(d).slice(0, 7), label: d.toLocaleDateString('pt-BR', { month: 'short' }).replace('.', ''), total: 0, count: 0 };
        });
        allOrders.forEach(o => { const m = months.find(x => x.key === String(o.date || '').slice(0, 7)); if (m) { m.total += Number(o.value) || 0; m.count++; } });
        const el = (id) => document.getElementById(id)?.getContext('2d');

        if (el('rep-months')) Reports.charts.push(new Chart(el('rep-months'), {
            data: { labels: months.map(m => m.label), datasets: [
                { type: 'bar', label: 'Faturamento', data: months.map(m => round(m.total)), backgroundColor: '#6C2BFF', borderRadius: 6, yAxisID: 'y', maxBarThickness: 38 },
                { type: 'line', label: 'Pedidos', data: months.map(m => m.count), borderColor: '#F59E0B', backgroundColor: '#F59E0B', tension: .35, yAxisID: 'y1', pointRadius: 3 }
            ] },
            options: {
                responsive: true, maintainAspectRatio: false,
                plugins: { legend: { position: 'bottom', labels: { usePointStyle: true } },
                    tooltip: { callbacks: { label: (c) => c.dataset.label === 'Pedidos' ? `${c.parsed.y} pedido(s)` : fmtBRL(c.parsed.y) } } },
                scales: {
                    y: { beginAtZero: true, grid: { color: '#F1F0F7' }, ticks: { callback: (v) => fmtBRL(v).replace(',00', '') } },
                    y1: { beginAtZero: true, position: 'right', grid: { display: false }, ticks: { precision: 0 } },
                    x: { grid: { display: false } }
                }
            }
        }));

        const doughnut = (id, obj) => {
            const ctx = el(id); if (!ctx) return;
            const entries = Object.entries(obj).sort((a, b) => b[1] - a[1]);
            Reports.charts.push(new Chart(ctx, {
                type: 'doughnut',
                data: { labels: entries.map(e => e[0]), datasets: [{ data: entries.map(e => round(e[1])), backgroundColor: COLORS, borderWidth: 0 }] },
                options: { responsive: true, maintainAspectRatio: false, cutout: '65%',
                    plugins: { legend: { position: 'right', labels: { usePointStyle: true, padding: 14 } },
                        tooltip: { callbacks: { label: (c) => `${c.label}: ${fmtBRL(c.parsed)}` } } } }
            }));
        };
        doughnut('rep-cats', byCat);
        doughnut('rep-methods', byMethod);
    },

    exportCsv: (orders, custName) => {
        const cell = (v) => `"${String(v ?? '').replace(/"/g, '""')}"`;
        const money = (v) => (Number(v) || 0).toFixed(2).replace('.', ',');
        const fmtD = (iso) => { const [y, m, d] = String(iso || '').split('-'); return d ? `${d}/${m}/${y}` : ''; };
        const lines = [['Nº', 'Data', 'Cliente', 'Origem', 'Produtos', 'Status', 'Valor', 'Recebido', 'Falta', 'Entrega prevista', 'Entregue em'].map(cell).join(';')]
            .concat(orders.map(o => [docNo(o), fmtD(o.date), custName(o), o.leadSource || NO_SOURCE, o.productName, o.status, money(o.value),
                money(Payments.paid(o)), money(Payments.balance(o)), fmtD(o.dueDate), fmtD(o.deliveredAt)].map(cell).join(';')));
        const a = document.createElement('a');
        a.href = URL.createObjectURL(new Blob(['﻿' + lines.join('\r\n')], { type: 'text/csv;charset=utf-8' }));
        a.download = `pedidos-${Reports.period}-${isoDate(new Date())}.csv`;
        document.body.appendChild(a); a.click(); a.remove();
        App.toast('Planilha de pedidos exportada (abre no Excel)');
    }
};

export default Reports;
