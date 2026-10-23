import DB from '../db.js';
import { esc } from '../utils.js';

const Dashboard = {
    render: (container) => {
        const orders   = DB.get('orders')    || [];
        const quotes   = DB.get('quotes')    || [];
        const products = DB.get('products')  || [];
        const customers= DB.get('customers') || [];

        // KPIs reais — pedidos cancelados não contam como receita (igual Financeiro/Relatórios)
        const activeOrders = orders.filter(o => o.status !== 'Cancelado');
        const sumValue = (list) => list.reduce((sum, o) => sum + (parseFloat(o.value) || 0), 0);

        const totalRevenue = sumValue(activeOrders);
        const openQuotes   = quotes.filter(q => q.status === 'Aberto').length;
        // "Em produção" = tudo que está no fluxo e ainda não foi concluído (Aguardando Arte, Produção, Acabamento)
        const isDone = (st) => /Conclu|Pronto|Entregue/i.test(String(st || ''));
        const inProduction = activeOrders.filter(o => !isDone(o.status)).length;

        const user = DB.get('user') || {};
        const hour = new Date().getHours();
        const greeting = hour < 12 ? 'Bom dia' : hour < 18 ? 'Boa tarde' : 'Boa noite';
        const firstName = String(user.name || 'Administrador').split(' ')[0];

        const fmtBRL = (val) => val.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

        container.innerHTML = `
            <div class="max-w-[1400px] mx-auto flex flex-col gap-6 page-enter">

                <!-- Page Header -->
                <div class="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                    <div>
                        <h2 class="page-title">${greeting}, ${esc(firstName)} 👋</h2>
                        <p class="text-sm mt-1" style="color:var(--text-muted);">Aqui está o resumo da sua gráfica hoje.</p>
                    </div>
                    <button id="btn-dashboard-new-order" class="btn-primary">
                        <span class="material-symbols-outlined" style="font-size:18px;">add</span>
                        Novo Orçamento
                    </button>
                </div>

                <!-- KPI Grid -->
                <div class="grid grid-cols-2 lg:grid-cols-4 gap-4">
                    ${Dashboard.kpi('Receita Total', fmtBRL(totalRevenue), 'payments', '#059669', '#ECFDF5', totalRevenue === 0 ? 'Sem vendas ainda' : 'Acumulado')}
                    ${Dashboard.kpi('Orçamentos Abertos', openQuotes, 'description', '#D97706', '#FFFBEB', openQuotes === 0 ? 'Nenhum pendente' : 'Aguardando resposta')}
                    ${Dashboard.kpi('Em Produção', inProduction, 'precision_manufacturing', '#6C2BFF', '#F0EBFF', inProduction === 0 ? 'Fila vazia' : 'pedidos ativos')}
                    ${Dashboard.kpi('Clientes', customers.length, 'groups', '#2563EB', '#EFF6FF', `${products.length} produtos cadastrados`)}
                </div>

                <!-- Charts Row -->
                <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    <div class="section-card lg:col-span-2">
                        <div class="flex justify-between items-center mb-6">
                            <h3 class="section-heading">Faturamento Mensal</h3>
                            <div class="flex gap-2">
                                <span id="revenue-growth" class="badge badge-green hidden"></span>
                            </div>
                        </div>
                        <div class="h-[300px]">
                            <canvas id="chart-revenue"></canvas>
                        </div>
                    </div>
                    <div class="section-card">
                        <h3 class="section-heading mb-6">Mix de Produtos</h3>
                        <div class="h-[300px] flex items-center justify-center">
                            <canvas id="chart-categories"></canvas>
                        </div>
                    </div>
                </div>

                <!-- Orders table or empty state -->
                <div class="data-table">
                    <div class="flex justify-between items-center px-5 py-4 border-b" style="border-color:var(--border);">
                        <h3 class="section-heading">Últimos Pedidos em Produção</h3>
                        <button class="text-sm font-semibold" style="color:var(--primary);" onclick="window._app && window._app.navigateTo('producao')">Ver tudo →</button>
                    </div>
                    ${activeOrders.length === 0
                        ? `<div class="empty-state">
                               <div class="empty-state-icon"><span class="material-symbols-outlined">shopping_bag</span></div>
                               <h3>Nenhum pedido ainda</h3>
                               <p>Converta um orçamento em venda para ver os pedidos aqui.</p>
                               <button class="btn-primary" id="btn-dash-empty-quote">Criar primeiro orçamento</button>
                           </div>`
                        : `<div class="overflow-x-auto">
                               <table class="w-full text-left border-collapse">
                                   <thead>
                                       <tr style="background:#FAFBFF; border-bottom:1px solid var(--border);">
                                           <th class="px-5 py-3" style="font-size:11px;font-weight:700;color:var(--text-faint);text-transform:uppercase;letter-spacing:0.08em;">ID / Data</th>
                                           <th class="px-5 py-3" style="font-size:11px;font-weight:700;color:var(--text-faint);text-transform:uppercase;letter-spacing:0.08em;">Cliente</th>
                                           <th class="px-5 py-3" style="font-size:11px;font-weight:700;color:var(--text-faint);text-transform:uppercase;letter-spacing:0.08em;">Produto</th>
                                           <th class="px-5 py-3 text-right" style="font-size:11px;font-weight:700;color:var(--text-faint);text-transform:uppercase;letter-spacing:0.08em;">Valor</th>
                                           <th class="px-5 py-3 text-center" style="font-size:11px;font-weight:700;color:var(--text-faint);text-transform:uppercase;letter-spacing:0.08em;">Status</th>
                                       </tr>
                                   </thead>
                                   <tbody>
                                       ${activeOrders.slice(0, 6).map(order => `
                                           <tr style="border-bottom:1px solid #F8F6FF; transition:background 0.15s;" onmouseover="this.style.background='#FAFBFF'" onmouseout="this.style.background=''">
                                               <td class="px-5 py-3.5">
                                                   <p class="text-sm font-bold" style="color:var(--primary);">${order.id}</p>
                                                   <p class="text-xs" style="color:var(--text-faint);">${order.date}</p>
                                               </td>
                                               <td class="px-5 py-3.5 text-sm font-medium" style="color:var(--text-sub);">${esc((DB.get('customers') || []).find(c => c.id === order.customerId)?.name || order.customerName || '—')}</td>
                                               <td class="px-5 py-3.5 text-sm" style="color:var(--text-muted);">${esc(order.productName || '—')}</td>
                                               <td class="px-5 py-3.5 text-right text-sm font-bold" style="color:var(--text-main);">${fmtBRL(parseFloat(order.value || 0))}</td>
                                               <td class="px-5 py-3.5 text-center">
                                                   <span class="badge badge-purple">${esc(order.status)}</span>
                                               </td>
                                           </tr>
                                       `).join('')}
                                   </tbody>
                               </table>
                           </div>`
                    }
                </div>

                <!-- Quick Stats Row -->
                <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div class="section-card flex items-center gap-4">
                        <div class="w-12 h-12 rounded-[14px] flex items-center justify-center flex-shrink-0" style="background:#F0EBFF; color:#6C2BFF;">
                            <span class="material-symbols-outlined">inventory_2</span>
                        </div>
                        <div>
                            <p class="label-caps">Produtos Cadastrados</p>
                            <p class="text-2xl font-black" style="color:var(--text-main);">${products.length}</p>
                        </div>
                    </div>
                    <div class="section-card flex items-center gap-4">
                        <div class="w-12 h-12 rounded-[14px] flex items-center justify-center flex-shrink-0" style="background:#ECFDF5; color:#059669;">
                            <span class="material-symbols-outlined">groups</span>
                        </div>
                        <div>
                            <p class="label-caps">Clientes na Base</p>
                            <p class="text-2xl font-black" style="color:var(--text-main);">${customers.length}</p>
                        </div>
                    </div>
                    <div class="section-card flex items-center gap-4">
                        <div class="w-12 h-12 rounded-[14px] flex items-center justify-center flex-shrink-0" style="background:#FFF7ED; color:#D97706;">
                            <span class="material-symbols-outlined">pending_actions</span>
                        </div>
                        <div>
                            <p class="label-caps">Orçamentos Abertos</p>
                            <p class="text-2xl font-black" style="color:var(--text-main);">${openQuotes}</p>
                        </div>
                    </div>
                </div>
            </div>
        `;

        // Events
        const btnNew = document.getElementById('btn-dashboard-new-order');
        if (btnNew) btnNew.onclick = () => import('../app.js').then(m => m.default.navigateTo('orcamentos'));

        const btnEmpty = document.getElementById('btn-dash-empty-quote');
        if (btnEmpty) btnEmpty.onclick = () => import('../app.js').then(m => m.default.navigateTo('orcamentos'));

        // Initialize Charts
        setTimeout(() => {
            Dashboard.initCharts(activeOrders);
        }, 100);
    },

    /** orders: só pedidos ativos (sem cancelados). */
    initCharts: (orders) => {
        const ctxRev = document.getElementById('chart-revenue')?.getContext('2d');
        const ctxCat = document.getElementById('chart-categories')?.getContext('2d');
        const fmtBRL = (v) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

        if (ctxRev) {
            // Últimos 6 meses (inclui o atual), somando o valor dos pedidos pela data
            const now = new Date();
            const months = [];
            for (let i = 5; i >= 0; i--) {
                const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
                months.push({
                    key: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`,
                    label: d.toLocaleDateString('pt-BR', { month: 'short' }).replace('.', '').replace(/^./, c => c.toUpperCase()),
                    total: 0
                });
            }
            const byKey = new Map(months.map(m => [m.key, m]));
            orders.forEach(o => {
                const m = byKey.get(String(o.date || '').slice(0, 7));
                if (m) m.total += parseFloat(o.value) || 0;
            });

            // Selo: mês atual x mês anterior (só aparece se houver base de comparação)
            const cur = months[5].total, prev = months[4].total;
            const badge = document.getElementById('revenue-growth');
            if (badge && prev > 0) {
                const pct = Math.round(((cur - prev) / prev) * 100);
                badge.textContent = `${pct >= 0 ? 'Crescimento +' : 'Queda '}${pct}% vs mês anterior`;
                badge.className = `badge ${pct >= 0 ? 'badge-green' : 'badge-orange'}`;
            }

            new Chart(ctxRev, {
                type: 'line',
                data: {
                    labels: months.map(m => m.label),
                    datasets: [{
                        label: 'Faturamento (R$)',
                        data: months.map(m => Math.round(m.total * 100) / 100),
                        borderColor: '#6C2BFF',
                        backgroundColor: 'rgba(108, 43, 255, 0.1)',
                        fill: true,
                        tension: 0.4,
                        borderWidth: 3,
                        pointRadius: 4,
                        pointBackgroundColor: '#6C2BFF'
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        legend: { display: false },
                        tooltip: { callbacks: { label: (c) => fmtBRL(c.parsed.y) } }
                    },
                    scales: {
                        y: { beginAtZero: true, grid: { display: false }, ticks: { callback: (v) => fmtBRL(v).replace(',00', '') } },
                        x: { grid: { display: false } }
                    }
                }
            });
        }

        if (ctxCat) {
            // Mix por categoria dos ITENS vendidos, pesado pelo valor (R$)
            const categories = {};
            orders.forEach(o => {
                const items = Array.isArray(o.items) && o.items.length ? o.items : [{ category: 'Outros', price: o.value }];
                items.forEach(i => {
                    const cat = String(i.category || 'Outros').trim() || 'Outros';
                    categories[cat] = (categories[cat] || 0) + (parseFloat(i.price) || 0);
                });
            });
            const entries = Object.entries(categories).filter(([, v]) => v > 0).sort((a, b) => b[1] - a[1]);

            if (!entries.length) {
                ctxCat.canvas.parentElement.innerHTML =
                    `<p class="text-sm text-center" style="color:var(--text-faint);">Sem vendas para mostrar ainda.</p>`;
            } else {
                new Chart(ctxCat, {
                    type: 'doughnut',
                    data: {
                        labels: entries.map(e => e[0]),
                        datasets: [{
                            data: entries.map(e => Math.round(e[1] * 100) / 100),
                            backgroundColor: ['#6C2BFF', '#10B981', '#F59E0B', '#3B82F6', '#EF4444', '#EC4899', '#14B8A6', '#64748B'],
                            borderWidth: 0
                        }]
                    },
                    options: {
                        responsive: true,
                        maintainAspectRatio: false,
                        cutout: '70%',
                        plugins: {
                            legend: { position: 'bottom', labels: { usePointStyle: true, padding: 20 } },
                            tooltip: { callbacks: { label: (c) => `${c.label}: ${fmtBRL(c.parsed)}` } }
                        }
                    }
                });
            }
        }
    },

    kpi: (label, value, icon, color, bgColor, sub) => `
        <div class="kpi-card">
            <div class="flex justify-between items-start gap-3">
                <div class="w-11 h-11 rounded-[14px] flex items-center justify-center flex-shrink-0" style="background:${bgColor}; color:${color};">
                    <span class="material-symbols-outlined" style="font-size:22px;">${icon}</span>
                </div>
                <div class="flex flex-col items-end flex-1 min-w-0">
                    <span class="label-caps text-right leading-tight">${label}</span>
                    <span class="text-2xl font-black mt-1" style="color:var(--text-main); letter-spacing:-0.03em;">${value}</span>
                    <span class="text-xs font-semibold mt-1" style="color:var(--text-faint);">${sub}</span>
                </div>
            </div>
        </div>
    `
};

export default Dashboard;
