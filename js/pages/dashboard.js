import DB from '../db.js';

const Dashboard = {
    render: (container) => {
        const orders   = DB.get('orders')    || [];
        const quotes   = DB.get('quotes')    || [];
        const products = DB.get('products')  || [];
        const customers= DB.get('customers') || [];

        // Calculate real KPIs
        const todaySales = orders
            .filter(o => o.date === new Date().toISOString().split('T')[0])
            .reduce((sum, o) => sum + parseFloat(o.value || 0), 0);

        const totalRevenue = orders.reduce((sum, o) => sum + parseFloat(o.value || 0), 0);
        const openQuotes   = quotes.filter(q => q.status === 'Aberto').length;
        const inProduction = orders.filter(o => o.status === 'Produção').length;

        const fmtBRL = (val) => val.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

        container.innerHTML = `
            <div class="max-w-[1400px] mx-auto flex flex-col gap-6 page-enter">

                <!-- Page Header -->
                <div class="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                    <div>
                        <h2 class="page-title">Bom dia, Administrador 👋</h2>
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
                                <span class="badge badge-green">Crescimento +12%</span>
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
                    ${orders.length === 0
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
                                       ${orders.slice(0, 6).map(order => `
                                           <tr style="border-bottom:1px solid #F8F6FF; transition:background 0.15s;" onmouseover="this.style.background='#FAFBFF'" onmouseout="this.style.background=''">
                                               <td class="px-5 py-3.5">
                                                   <p class="text-sm font-bold" style="color:var(--primary);">${order.id}</p>
                                                   <p class="text-xs" style="color:var(--text-faint);">${order.date}</p>
                                               </td>
                                               <td class="px-5 py-3.5 text-sm font-medium" style="color:var(--text-sub);">${(DB.get('customers') || []).find(c => c.id === order.customerId)?.name || order.customerName || '—'}</td>
                                               <td class="px-5 py-3.5 text-sm" style="color:var(--text-muted);">${order.productName || '—'}</td>
                                               <td class="px-5 py-3.5 text-right text-sm font-bold" style="color:var(--text-main);">${fmtBRL(parseFloat(order.value || 0))}</td>
                                               <td class="px-5 py-3.5 text-center">
                                                   <span class="badge badge-purple">${order.status}</span>
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
            Dashboard.initCharts(orders);
        }, 100);
    },

    initCharts: (orders) => {
        const ctxRev = document.getElementById('chart-revenue')?.getContext('2d');
        const ctxCat = document.getElementById('chart-categories')?.getContext('2d');

        if (ctxRev) {
            // Mock data for last 6 months (in a real app we would calculate this)
            const months = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun'];
            const salesData = [12500, 15000, 11000, 18500, 22000, 25000];

            new Chart(ctxRev, {
                type: 'line',
                data: {
                    labels: months,
                    datasets: [{
                        label: 'Faturamento (R$)',
                        data: salesData,
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
                    plugins: { legend: { display: false } },
                    scales: {
                        y: { beginAtZero: true, grid: { display: false } },
                        x: { grid: { display: false } }
                    }
                }
            });
        }

        if (ctxCat) {
            // Group sales by category
            const categories = {};
            orders.forEach(o => {
                const cat = o.category || 'Outros';
                categories[cat] = (categories[cat] || 0) + 1;
            });

            const labels = Object.keys(categories).length > 0 ? Object.keys(categories) : ['Cartões', 'Banners', 'Adesivos'];
            const data = Object.values(categories).length > 0 ? Object.values(categories) : [45, 25, 30];

            new Chart(ctxCat, {
                type: 'doughnut',
                data: {
                    labels: labels,
                    datasets: [{
                        data: data,
                        backgroundColor: ['#6C2BFF', '#10B981', '#F59E0B', '#3B82F6', '#EF4444'],
                        borderWidth: 0
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    cutout: '70%',
                    plugins: {
                        legend: { position: 'bottom', labels: { usePointStyle: true, padding: 20 } }
                    }
                }
            });
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
