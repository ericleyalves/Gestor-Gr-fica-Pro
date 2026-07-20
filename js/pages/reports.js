import DB from '../db.js';
import App from '../app.js';
import { fmtBRL } from '../utils.js';

const Reports = {
    render: (container) => {
        const orders = DB.get('orders') || [];
        const quotes = DB.get('quotes') || [];
        const customers = DB.get('customers') || [];
        
        const faturamento = orders.filter(o => o.status !== 'Cancelado').reduce((acc, o) => acc + (parseFloat(o.value) || 0), 0);
        const ticketMedio = orders.length > 0 ? faturamento / orders.length : 0;
        
        const totalPropostas = quotes.length + orders.length;
        const conversao = totalPropostas > 0 ? (orders.length / totalPropostas) * 100 : 0;

        container.innerHTML = `
<div class="p-lg max-w-[1440px] mx-auto w-full flex flex-col gap-lg animate-fadeIn">
    <!-- Page Header Area -->
    <section class="flex flex-col md:flex-row md:items-end justify-between gap-md mb-6">
        <div>
            <h2 class="font-headline-xl text-headline-xl text-on-surface">Relatórios e Inteligência</h2>
            <p class="font-body-md text-body-md text-on-surface-variant">Analise o desempenho da sua gráfica em tempo real</p>
        </div>
        <div class="flex flex-wrap items-center gap-sm">
            <div class="flex items-center bg-white border border-outline-variant/40 rounded-lg px-md py-sm shadow-sm">
                <span class="material-symbols-outlined text-primary text-[20px] mr-sm">calendar_today</span>
                <select id="reports-date-filter" class="bg-transparent border-none focus:ring-0 font-label-md text-label-md text-on-surface-variant p-0 pr-sm cursor-pointer outline-none">
                    <option>Últimos 30 dias</option>
                    <option>Este Mês</option>
                    <option>Últimos 90 dias</option>
                    <option>Este Ano</option>
                    <option>Personalizado</option>
                </select>
            </div>
            <button id="btn-reports-export" class="flex items-center gap-sm bg-white border border-outline-variant/40 hover:border-primary/50 text-on-surface font-semibold px-md py-sm rounded-lg shadow-sm transition-all active:scale-95">
                <span class="material-symbols-outlined text-[20px]">file_download</span>
                <span class="font-label-md text-label-md">Exportar</span>
            </button>
            <button id="btn-reports-refresh" class="flex items-center gap-sm bg-primary-container text-white px-lg py-sm rounded-lg font-bold shadow-md hover:shadow-primary/30 transition-all active:scale-95">
                <span class="material-symbols-outlined text-[20px] refresh-icon">refresh</span>
                <span class="font-label-md text-label-md">Atualizar</span>
            </button>
        </div>
    </section>

    <!-- KPI Dashboard -->
    <section class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-md mb-8">
        <!-- Ticket Médio -->
        <div class="bg-white p-lg rounded-xl card-elevation flex flex-col gap-sm border border-outline-variant/10 transition-transform duration-300">
            <div class="flex items-center justify-between">
                <span class="font-label-md text-label-md text-on-surface-variant opacity-80">Ticket Médio</span>
                <div class="w-10 h-10 rounded-full bg-primary/5 flex items-center justify-center">
                    <span class="material-symbols-outlined text-primary">receipt_long</span>
                </div>
            </div>
            <div class="flex items-end justify-between">
                <p class="font-headline-lg text-headline-lg text-on-surface">${fmtBRL(ticketMedio)}</p>
                <div class="flex items-center text-green-600 bg-green-50 px-sm py-xs rounded text-[12px] font-bold">
                    <span class="material-symbols-outlined text-[14px] font-bold">trending_up</span>
                    <span>5.2%</span>
                </div>
            </div>
        </div>
        
        <!-- Taxa de Conversão -->
        <div class="bg-white p-lg rounded-xl card-elevation flex flex-col gap-sm border border-outline-variant/10 transition-transform duration-300">
            <div class="flex items-center justify-between">
                <span class="font-label-md text-label-md text-on-surface-variant opacity-80">Taxa de Conversão</span>
                <div class="w-10 h-10 rounded-full bg-secondary/5 flex items-center justify-center">
                    <span class="material-symbols-outlined text-secondary">ads_click</span>
                </div>
            </div>
            <div class="flex items-end justify-between">
                <p class="font-headline-lg text-headline-lg text-on-surface">${conversao.toFixed(1)}%</p>
                <div class="flex items-center text-error bg-error-container/30 px-sm py-xs rounded text-[12px] font-bold">
                    <span class="material-symbols-outlined text-[14px] font-bold">trending_down</span>
                    <span>2.1%</span>
                </div>
            </div>
        </div>
        
        <!-- Faturamento -->
        <div class="bg-white p-lg rounded-xl card-elevation flex flex-col gap-sm border border-outline-variant/10 transition-transform duration-300">
            <div class="flex items-center justify-between">
                <span class="font-label-md text-label-md text-on-surface-variant opacity-80">Faturamento</span>
                <div class="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center">
                    <span class="material-symbols-outlined text-green-600">payments</span>
                </div>
            </div>
            <div class="flex items-end justify-between">
                <p class="font-headline-lg text-headline-lg text-on-surface">${fmtBRL(faturamento)}</p>
                <div class="flex items-center text-green-600 bg-green-50 px-sm py-xs rounded text-[12px] font-bold">
                    <span class="material-symbols-outlined text-[14px] font-bold">trending_up</span>
                    <span>12%</span>
                </div>
            </div>
        </div>
        
        <!-- Novos Clientes -->
        <div class="bg-white p-lg rounded-xl card-elevation flex flex-col gap-sm border border-outline-variant/10 transition-transform duration-300">
            <div class="flex items-center justify-between">
                <span class="font-label-md text-label-md text-on-surface-variant opacity-80">Novos Clientes</span>
                <div class="w-10 h-10 rounded-full bg-orange-100 flex items-center justify-center">
                    <span class="material-symbols-outlined text-orange-600">person_add</span>
                </div>
            </div>
            <div class="flex items-end justify-between">
                <p class="font-headline-lg text-headline-lg text-on-surface">${customers.length}</p>
                <div class="flex items-center text-green-600 bg-green-50 px-sm py-xs rounded text-[12px] font-bold">
                    <span class="material-symbols-outlined text-[14px] font-bold">trending_up</span>
                    <span>8%</span>
                </div>
            </div>
        </div>
    </section>

    <!-- Performance Charts Section -->
    <section class="grid grid-cols-1 lg:grid-cols-3 gap-lg mb-8">
        <!-- Vendas por Período (Main Chart) -->
        <div class="lg:col-span-2 bg-white rounded-xl card-elevation p-lg border border-outline-variant/10 flex flex-col gap-lg transition-transform duration-300">
            <div class="flex items-center justify-between">
                <h3 class="font-headline-md text-headline-md text-on-surface">Vendas por Período</h3>
                <div class="flex gap-sm">
                    <span class="flex items-center gap-xs font-label-md text-label-md text-on-surface-variant"><span class="w-2 h-2 rounded-full bg-primary"></span> Atual</span>
                    <span class="flex items-center gap-xs font-label-md text-label-md text-on-surface-variant opacity-50"><span class="w-2 h-2 rounded-full bg-outline-variant"></span> Anterior</span>
                </div>
            </div>
            
            <!-- SVG Chart Mockup -->
            <div class="h-64 w-full relative flex items-end justify-between gap-xs group">
                <!-- Horizontal Grid Lines -->
                <div class="absolute inset-0 flex flex-col justify-between pointer-events-none opacity-10">
                    <div class="border-t border-on-surface w-full"></div>
                    <div class="border-t border-on-surface w-full"></div>
                    <div class="border-t border-on-surface w-full"></div>
                    <div class="border-t border-on-surface w-full"></div>
                </div>
                
                <!-- Bar Elements Mockup -->
                ${[
                    { h: 40, fill: 80, label: 'R$ 12k' },
                    { h: 55, fill: 70, label: 'R$ 18k' },
                    { h: 45, fill: 90, label: 'R$ 25k' },
                    { h: 70, fill: 85, label: 'R$ 38k' },
                    { h: 85, fill: 60, label: 'R$ 29k' },
                    { h: 95, fill: 95, label: 'R$ 48k' },
                    { h: 60, fill: 75, label: 'R$ 24k' },
                    { h: 80, fill: 80, label: 'R$ 34k' },
                    { h: 40, fill: 40, label: 'R$ 15k' }
                ].map(b => `
                <div class="flex-1 bg-primary/10 rounded-t-sm h-[${b.h}%] transition-all hover:bg-primary/30 relative group/bar cursor-pointer">
                    <div class="absolute inset-x-0 bottom-0 bg-primary h-[${b.fill}%] rounded-t-sm transition-all group-hover/bar:h-[${Math.min(100, b.fill + 5)}%]"></div>
                    <div class="opacity-0 group-hover/bar:opacity-100 absolute -top-8 left-1/2 -translate-x-1/2 bg-on-surface text-white text-[10px] px-sm py-xs rounded whitespace-nowrap z-10 transition-opacity">${b.label}</div>
                </div>`).join('')}
            </div>
            <div class="flex justify-between text-[10px] text-on-surface-variant font-bold uppercase tracking-wider opacity-60">
                <span>Seg</span><span>Ter</span><span>Qua</span><span>Qui</span><span>Sex</span><span>Sáb</span><span>Dom</span>
            </div>
        </div>
        
        <!-- Curva ABC de Produtos (Donut Chart) -->
        <div class="bg-white rounded-xl card-elevation p-lg border border-outline-variant/10 flex flex-col gap-lg transition-transform duration-300">
            <h3 class="font-headline-md text-headline-md text-on-surface">Curva ABC de Produtos</h3>
            <div class="flex-1 flex flex-col items-center justify-center relative">
                <!-- Custom CSS Donut -->
                <div class="w-48 h-48 rounded-full border-[20px] border-surface-container flex items-center justify-center relative hover:scale-105 transition-transform cursor-pointer" style="background: conic-gradient(#5400d6 0% 40%, #8a4cfc 40% 65%, #cebdff 65% 85%, #eaddff 85% 100%);">
                    <div class="absolute inset-0 m-1 rounded-full bg-white flex flex-col items-center justify-center">
                        <span class="font-headline-lg text-headline-lg text-on-surface">100%</span>
                        <span class="font-label-md text-label-md text-on-surface-variant opacity-60">Faturamento</span>
                    </div>
                </div>
            </div>
            
            <div class="grid grid-cols-2 gap-sm">
                <div class="flex items-center gap-xs">
                    <div class="w-3 h-3 rounded-full bg-primary"></div>
                    <span class="font-label-md text-label-md text-on-surface-variant">Banners (40%)</span>
                </div>
                <div class="flex items-center gap-xs">
                    <div class="w-3 h-3 rounded-full bg-secondary"></div>
                    <span class="font-label-md text-label-md text-on-surface-variant">Cartões (25%)</span>
                </div>
                <div class="flex items-center gap-xs">
                    <div class="w-3 h-3 rounded-full bg-primary-fixed-dim"></div>
                    <span class="font-label-md text-label-md text-on-surface-variant">Panfletos (20%)</span>
                </div>
                <div class="flex items-center gap-xs">
                    <div class="w-3 h-3 rounded-full bg-secondary-fixed"></div>
                    <span class="font-label-md text-label-md text-on-surface-variant">Outros (15%)</span>
                </div>
            </div>
        </div>
    </section>

    <!-- Bottom Section: Detailed Insights -->
    <section class="grid grid-cols-1 lg:grid-cols-2 gap-lg pb-xl">
        <!-- Ranking de Vendedores -->
        <div class="bg-white rounded-xl card-elevation border border-outline-variant/10 overflow-hidden transition-transform duration-300">
            <div class="p-lg border-b border-outline-variant/10 flex justify-between items-center">
                <h3 class="font-headline-md text-headline-md text-on-surface">Ranking de Vendedores</h3>
                <button id="btn-reports-view-sellers" class="text-primary font-bold text-label-md hover:underline transition-all">Ver todos</button>
            </div>
            <div class="overflow-x-auto">
                <table class="w-full text-left">
                    <thead class="bg-surface-container/50 text-on-surface-variant font-bold text-[11px] uppercase tracking-wider">
                        <tr>
                            <th class="px-lg py-md">Vendedor</th>
                            <th class="px-lg py-md">Volume</th>
                            <th class="px-lg py-md">Meta</th>
                            <th class="px-lg py-md text-right">Conversão</th>
                        </tr>
                    </thead>
                    <tbody class="divide-y divide-outline-variant/10">
                        <tr class="hover:bg-surface transition-colors cursor-pointer seller-row">
                            <td class="px-lg py-md flex items-center gap-sm">
                                <img alt="Vendedor 1" class="w-8 h-8 rounded-full object-cover" src="https://lh3.googleusercontent.com/aida-public/AB6AXuAOuo3k0Cu_Z8bKWbB8fu17s9xSofhOLmFdfGSC5-ayyu3TLVvUyfkBANX8w5kQcL0aM9TSTXsGQ7kXcoSL_L0II0AihbD_lVwB0fADdD410hddU0goB4k5s8J62pclhLUEoM9gRX59SFt7SCHfQ4Y6dpcqVaptUcARlAV1_jwrZJS5RKukHIl6_8A92vyYdqQ8cbU1MvGQMZM0wB8cQVgDaMcDbAevuyx9mNx2TN-Pq313fsYmNaW680TuKZPz0ojHyIO24wedBr8"/>
                                <span class="font-body-sm text-body-sm font-semibold">Ricardo Souza</span>
                            </td>
                            <td class="px-lg py-md font-label-md text-label-md text-on-surface-variant">R$ 48.200</td>
                            <td class="px-lg py-md">
                                <div class="w-24 h-1.5 bg-surface-container rounded-full overflow-hidden">
                                    <div class="bg-primary h-full w-[92%]"></div>
                                </div>
                            </td>
                            <td class="px-lg py-md text-right font-bold text-green-600">82%</td>
                        </tr>
                        <tr class="hover:bg-surface transition-colors cursor-pointer seller-row">
                            <td class="px-lg py-md flex items-center gap-sm">
                                <img alt="Vendedor 2" class="w-8 h-8 rounded-full object-cover" src="https://lh3.googleusercontent.com/aida-public/AB6AXuD3-jHh2VcvCAgM7V3c3u6dXNHkKVLPvDqmetfPGT_1YKEyV9F7bfTWw2O0vflVTDPLfPbauRORVv4N1vGS5YtPFbaC25wV8i_y47g8oZJTnmRdwJ5DUAtbBEulRsx6_6yC3DMObPRzetuzsqLeE3NtwuBssJ38Eqv44rBbleWiagUiw4YJogArI-aEATVtwyOnQBRZs_nnM3W9DYhc4wKtctIFtIwyRWXqHQtxTdheQINmL57w_AeFda0Sna9G1p2-UWZ-EZdL5I0"/>
                                <span class="font-body-sm text-body-sm font-semibold">Ana Oliveira</span>
                            </td>
                            <td class="px-lg py-md font-label-md text-label-md text-on-surface-variant">R$ 35.150</td>
                            <td class="px-lg py-md">
                                <div class="w-24 h-1.5 bg-surface-container rounded-full overflow-hidden">
                                    <div class="bg-primary h-full w-[75%]"></div>
                                </div>
                            </td>
                            <td class="px-lg py-md text-right font-bold text-green-600">76%</td>
                        </tr>
                        <tr class="hover:bg-surface transition-colors cursor-pointer seller-row">
                            <td class="px-lg py-md flex items-center gap-sm">
                                <img alt="Vendedor 3" class="w-8 h-8 rounded-full object-cover" src="https://lh3.googleusercontent.com/aida-public/AB6AXuBAhlQJWjGfTEzQf-CjJAOSdvbV5F83zsPUbD3sys6Zrc4enwEOxTXlaATdVFAjfS5MHSL3hBsiRTmEoKl6dbkFzUv4V6F7xI_tYj79cKhPus6U_0bYD2tQkLJLHZBfcmyysaTrSmT-cumJuqVgoJnbpXV-MrvTarns8Iecstjjlhc6rdvYBh9bXKe_ZYL1BM7QzAoHVJkNAEUUePrHNN9XuuoxC9h17pAGeWwoU_BVhxt3PBtDfWh31Hy1yTNrTrVchdTZQkeTIa8"/>
                                <span class="font-body-sm text-body-sm font-semibold">Marcos Dias</span>
                            </td>
                            <td class="px-lg py-md font-label-md text-label-md text-on-surface-variant">R$ 29.400</td>
                            <td class="px-lg py-md">
                                <div class="w-24 h-1.5 bg-surface-container rounded-full overflow-hidden">
                                    <div class="bg-primary h-full w-[60%]"></div>
                                </div>
                            </td>
                            <td class="px-lg py-md text-right font-bold text-secondary">64%</td>
                        </tr>
                    </tbody>
                </table>
            </div>
        </div>
        
        <!-- Performance por Canal -->
        <div class="bg-white rounded-xl card-elevation p-lg border border-outline-variant/10 flex flex-col gap-lg transition-transform duration-300">
            <h3 class="font-headline-md text-headline-md text-on-surface">Performance por Canal</h3>
            <div class="flex flex-col gap-md">
                <!-- WhatsApp -->
                <div class="flex flex-col gap-xs group">
                    <div class="flex justify-between items-center text-label-md font-semibold text-on-surface-variant uppercase tracking-wider">
                        <span class="flex items-center gap-xs"><span class="material-symbols-outlined text-green-500 text-[18px]">chat</span> WhatsApp</span>
                        <span>45%</span>
                    </div>
                    <div class="w-full h-3 bg-surface-container rounded-full overflow-hidden border border-outline-variant/20 p-[2px]">
                        <div class="bg-gradient-to-r from-green-400 to-green-600 h-full rounded-full transition-all duration-1000 group-hover:scale-y-110 origin-left" style="width: 45%"></div>
                    </div>
                </div>
                
                <!-- Balcão -->
                <div class="flex flex-col gap-xs group">
                    <div class="flex justify-between items-center text-label-md font-semibold text-on-surface-variant uppercase tracking-wider">
                        <span class="flex items-center gap-xs"><span class="material-symbols-outlined text-primary text-[18px]">storefront</span> Balcão</span>
                        <span>25%</span>
                    </div>
                    <div class="w-full h-3 bg-surface-container rounded-full overflow-hidden border border-outline-variant/20 p-[2px]">
                        <div class="bg-gradient-to-r from-primary to-secondary h-full rounded-full transition-all duration-1000 group-hover:scale-y-110 origin-left" style="width: 25%"></div>
                    </div>
                </div>
                
                <!-- Site -->
                <div class="flex flex-col gap-xs group">
                    <div class="flex justify-between items-center text-label-md font-semibold text-on-surface-variant uppercase tracking-wider">
                        <span class="flex items-center gap-xs"><span class="material-symbols-outlined text-secondary text-[18px]">language</span> Site</span>
                        <span>20%</span>
                    </div>
                    <div class="w-full h-3 bg-surface-container rounded-full overflow-hidden border border-outline-variant/20 p-[2px]">
                        <div class="bg-gradient-to-r from-secondary-container to-secondary h-full rounded-full transition-all duration-1000 group-hover:scale-y-110 origin-left" style="width: 20%"></div>
                    </div>
                </div>
                
                <!-- Indicações -->
                <div class="flex flex-col gap-xs group">
                    <div class="flex justify-between items-center text-label-md font-semibold text-on-surface-variant uppercase tracking-wider">
                        <span class="flex items-center gap-xs"><span class="material-symbols-outlined text-orange-500 text-[18px]">recommend</span> Indicações</span>
                        <span>10%</span>
                    </div>
                    <div class="w-full h-3 bg-surface-container rounded-full overflow-hidden border border-outline-variant/20 p-[2px]">
                        <div class="bg-gradient-to-r from-orange-400 to-orange-500 h-full rounded-full transition-all duration-1000 group-hover:scale-y-110 origin-left" style="width: 10%"></div>
                    </div>
                </div>
            </div>
            
            <div class="mt-auto pt-lg border-t border-outline-variant/10">
                <div class="bg-primary/5 p-md rounded-lg flex items-start gap-md hover:bg-primary/10 transition-colors cursor-pointer" id="ai-insight-box">
                    <span class="material-symbols-outlined text-primary">lightbulb</span>
                    <div>
                        <p class="font-label-md text-label-md font-bold text-primary uppercase">Insights de IA</p>
                        <p class="text-[12px] text-on-surface-variant mt-xs">O canal WhatsApp cresceu 15% em relação ao mês anterior. Considere automatizar orçamentos neste canal para aumentar a eficiência.</p>
                    </div>
                </div>
            </div>
        </div>
    </section>
</div>
        `;
        Reports.bindEvents();
    },

    bindEvents: () => {
            // Date Filter
            const dateFilter = document.getElementById('reports-date-filter');
            if (dateFilter) {
                dateFilter.addEventListener('change', (e) => {
                    App.toast(`Filtrando dados para: ${e.target.value}...`, 'info');
                });
            }

            // Export Button
            const exportBtn = document.getElementById('btn-reports-export');
            if (exportBtn) {
                exportBtn.addEventListener('click', () => {
                    App.toast('Gerando PDF do dashboard...', 'success');
                });
            }

            // Refresh Button
            const refreshBtn = document.getElementById('btn-reports-refresh');
            if (refreshBtn) {
                refreshBtn.addEventListener('click', () => {
                    const icon = refreshBtn.querySelector('.refresh-icon');
                    if (icon) {
                        icon.classList.add('animate-spin');
                        setTimeout(() => icon.classList.remove('animate-spin'), 1000);
                    }
                    App.toast('Sincronizando dados com o servidor...', 'info');
                });
            }

            // View Sellers
            const viewSellers = document.getElementById('btn-reports-view-sellers');
            if (viewSellers) {
                viewSellers.addEventListener('click', () => {
                    App.toast('Abrindo relatório detalhado de comissões...', 'info');
                });
            }

            // Individual Seller Rows
            document.querySelectorAll('.seller-row').forEach(row => {
                row.addEventListener('click', () => {
                    const name = row.querySelector('.font-semibold').innerText;
                    App.toast(`Abrindo perfil de vendas de ${name}...`, 'info');
                });
            });

            // AI Insight
            const aiBox = document.getElementById('ai-insight-box');
            if (aiBox) {
                aiBox.addEventListener('click', () => {
                    App.toast('Abrindo configurações de automação do WhatsApp...', 'success');
                });
            }

            // Hover elevation dos cards é feita via CSS (.card-elevation:hover em css/style.css)
    }
};

export default Reports;
