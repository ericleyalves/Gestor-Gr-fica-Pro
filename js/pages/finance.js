import DB from '../db.js';
import App from '../app.js';
import { fmtBRL } from '../utils.js';

const Finance = {
    render: (container) => {
        const orders = DB.get('orders') || [];
        const customers = DB.get('customers') || [];
        
        const activeOrders = orders.filter(o => o.status !== 'Cancelado');
        const faturamento = activeOrders.reduce((acc, o) => acc + (parseFloat(o.value) || 0), 0);
        const lucro = faturamento * 0.35; // 35% estimated profit margin

        const pendingOrders = activeOrders.filter(o => o.status !== 'Concluído' && !o.status?.includes('Pronto'));
        const aReceber = pendingOrders.reduce((acc, o) => acc + (parseFloat(o.value) || 0), 0);
        const aReceberCount = pendingOrders.length;
        
        container.innerHTML = `
<div class="w-full max-w-[1440px] mx-auto flex flex-col xl:flex-row gap-8 pb-24 md:pb-10 animate-fadeIn">
    <!-- Center Canvas -->
    <div class="flex-1 space-y-6">
        <!-- Page Header & Global Actions -->
        <div class="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
                <h2 class="text-headline-lg md:text-headline-xl font-headline-lg md:font-headline-xl text-on-surface">Visão Geral Financeira</h2>
                <p class="text-body-sm font-body-sm text-on-surface-variant mt-1">Acompanhamento em tempo real das finanças da gráfica.</p>
            </div>
            <div class="flex gap-3 w-full sm:w-auto">
                <button id="btn-finance-filters" class="flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 py-2 bg-surface-container-high hover:bg-surface-variant text-on-surface rounded-lg transition-colors shadow-sm text-body-sm font-body-sm font-semibold border border-outline-variant/30">
                    <span class="material-symbols-outlined text-sm">filter_list</span>
                    Filtros
                </button>
                <button id="btn-finance-new" class="flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 py-2 bg-gradient-to-r from-primary to-secondary hover:opacity-90 text-on-primary rounded-lg transition-opacity shadow-[0px_10px_30px_rgba(109,40,255,0.08)] text-body-sm font-body-sm font-semibold">
                    <span class="material-symbols-outlined text-sm">add</span>
                    Nova Movimentação
                </button>
            </div>
        </div>

        <!-- KPI Bento Grid -->
        <div class="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
            <!-- Faturamento -->
            <div class="col-span-2 md:col-span-1 lg:col-span-2 bg-surface-container-lowest rounded-xl p-5 shadow-[0px_4px_20px_rgba(109,40,255,0.04)] border border-outline-variant/10 relative overflow-hidden group">
                <div class="absolute -right-4 -top-4 w-24 h-24 bg-primary/5 rounded-full blur-2xl group-hover:bg-primary/10 transition-colors"></div>
                <p class="text-label-md font-label-md text-on-surface-variant flex items-center gap-1"><span class="material-symbols-outlined text-[16px]">trending_up</span> Faturamento (Mês)</p>
                <h3 class="text-headline-lg font-headline-lg text-on-surface mt-2">${fmtBRL(faturamento)}</h3>
                <div class="flex items-center justify-between mt-3">
                    <span class="inline-flex items-center px-2 py-0.5 rounded-full bg-emerald-100/50 text-emerald-700 text-label-md font-label-md">
                        <span class="material-symbols-outlined text-[14px] mr-1">arrow_upward</span> 12%
                    </span>
                    <!-- Fake mini chart -->
                    <div class="flex items-end gap-1 h-8 opacity-70">
                        <div class="w-1.5 bg-primary/40 h-3 rounded-t-sm"></div>
                        <div class="w-1.5 bg-primary/60 h-5 rounded-t-sm"></div>
                        <div class="w-1.5 bg-primary/80 h-4 rounded-t-sm"></div>
                        <div class="w-1.5 bg-primary h-7 rounded-t-sm"></div>
                        <div class="w-1.5 bg-secondary h-8 rounded-t-sm"></div>
                    </div>
                </div>
            </div>

            <!-- Lucro -->
            <div class="col-span-2 md:col-span-1 lg:col-span-2 bg-surface-container-lowest rounded-xl p-5 shadow-[0px_4px_20px_rgba(109,40,255,0.04)] border border-outline-variant/10">
                <p class="text-label-md font-label-md text-on-surface-variant flex items-center gap-1"><span class="material-symbols-outlined text-[16px]">savings</span> Lucro Líquido</p>
                <h3 class="text-headline-lg font-headline-lg text-primary mt-2">${fmtBRL(lucro)}</h3>
                <div class="flex items-center justify-between mt-3">
                    <span class="inline-flex items-center px-2 py-0.5 rounded-full bg-emerald-100/50 text-emerald-700 text-label-md font-label-md">
                        <span class="material-symbols-outlined text-[14px] mr-1">arrow_upward</span> 5%
                    </span>
                    <div class="flex items-end gap-1 h-8 opacity-70">
                        <div class="w-1.5 bg-secondary/40 h-4 rounded-t-sm"></div>
                        <div class="w-1.5 bg-secondary/60 h-3 rounded-t-sm"></div>
                        <div class="w-1.5 bg-secondary/80 h-6 rounded-t-sm"></div>
                        <div class="w-1.5 bg-secondary h-5 rounded-t-sm"></div>
                        <div class="w-1.5 bg-primary h-7 rounded-t-sm"></div>
                    </div>
                </div>
            </div>

            <!-- Receber/Pagar Compact -->
            <div class="col-span-1 bg-surface-container-lowest rounded-xl p-4 shadow-[0px_4px_20px_rgba(109,40,255,0.04)] border border-outline-variant/10 flex flex-col justify-between">
                <p class="text-label-md font-label-md text-on-surface-variant">A Receber</p>
                <h3 class="text-headline-md font-headline-md text-emerald-600 mt-1">${fmtBRL(aReceber)}</h3>
                <p class="text-[10px] text-on-surface-variant mt-2">${aReceberCount} pendentes</p>
            </div>
            
            <div class="col-span-1 bg-surface-container-lowest rounded-xl p-4 shadow-[0px_4px_20px_rgba(109,40,255,0.04)] border border-outline-variant/10 flex flex-col justify-between">
                <p class="text-label-md font-label-md text-on-surface-variant">A Pagar</p>
                <h3 class="text-headline-md font-headline-md text-error mt-1">R$ 4.220</h3>
                <p class="text-[10px] text-on-surface-variant mt-2">8 pendentes</p>
            </div>
        </div>

        <!-- Charts & Table Area -->
        <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <!-- Cashflow Chart Placeholder -->
            <div class="lg:col-span-2 bg-surface-container-lowest rounded-xl p-6 shadow-[0px_4px_20px_rgba(109,40,255,0.04)] border border-outline-variant/10 flex flex-col">
                <div class="flex justify-between items-center mb-6">
                    <h3 class="text-headline-md font-headline-md text-on-surface">Fluxo de Caixa</h3>
                    <select class="bg-surface-container-high border-none rounded-lg text-body-sm font-body-sm py-1.5 px-3 focus:ring-primary">
                        <option>Últimos 30 dias</option>
                        <option>Este Mês</option>
                        <option>Ano Atual</option>
                    </select>
                </div>
                <div class="flex-1 min-h-[240px] bg-surface-container-high/20 rounded-lg border border-dashed border-outline-variant/30 flex items-center justify-center relative overflow-hidden">
                    <!-- Abstract Chart Representation -->
                    <div class="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-primary/10 to-transparent"></div>
                    <div class="w-full h-full flex items-end justify-between px-4 pb-2 pt-8 gap-2">
                        <!-- Bars -->
                        <div class="w-full bg-emerald-400/80 rounded-t-sm" style="height: 60%"></div>
                        <div class="w-full bg-error/70 rounded-t-sm" style="height: 30%"></div>
                        <div class="w-full bg-emerald-400/80 rounded-t-sm" style="height: 80%"></div>
                        <div class="w-full bg-error/70 rounded-t-sm" style="height: 40%"></div>
                        <div class="w-full bg-emerald-400/80 rounded-t-sm" style="height: 50%"></div>
                        <div class="w-full bg-error/70 rounded-t-sm" style="height: 20%"></div>
                        <div class="w-full bg-emerald-400/80 rounded-t-sm" style="height: 90%"></div>
                        <div class="w-full bg-error/70 rounded-t-sm" style="height: 50%"></div>
                    </div>
                </div>
                <div class="flex justify-center gap-6 mt-4">
                    <div class="flex items-center gap-2"><div class="w-3 h-3 rounded-full bg-emerald-400"></div><span class="text-label-md text-on-surface-variant">Entradas</span></div>
                    <div class="flex items-center gap-2"><div class="w-3 h-3 rounded-full bg-error/70"></div><span class="text-label-md text-on-surface-variant">Saídas</span></div>
                </div>
            </div>

            <!-- Daily Cash Widget -->
            <div class="lg:col-span-1 bg-gradient-to-br from-surface-container-lowest to-surface-container-low rounded-xl p-6 shadow-[0px_4px_20px_rgba(109,40,255,0.04)] border border-outline-variant/10 flex flex-col justify-between">
                <div>
                    <div class="flex justify-between items-start mb-4">
                        <h3 class="text-headline-md font-headline-md text-on-surface flex items-center gap-2">
                            <span class="material-symbols-outlined text-primary">point_of_sale</span> Caixa Diário
                        </h3>
                        <span class="px-2 py-1 bg-emerald-100 text-emerald-700 text-[10px] font-bold rounded-md uppercase tracking-wide">Aberto</span>
                    </div>
                    <p class="text-body-sm font-body-sm text-on-surface-variant">Saldo Atual</p>
                    <h2 class="text-headline-xl font-headline-xl text-on-surface mt-1">R$ 2.450,50</h2>
                    
                    <div class="mt-6 space-y-3">
                        <div class="flex justify-between text-body-sm font-body-sm">
                            <span class="text-on-surface-variant">Fundo de Troco</span>
                            <span class="text-on-surface font-medium">R$ 500,00</span>
                        </div>
                        <div class="flex justify-between text-body-sm font-body-sm">
                            <span class="text-on-surface-variant">Vendas Dinheiro</span>
                            <span class="text-emerald-600 font-medium">+ R$ 1.950,50</span>
                        </div>
                        <div class="flex justify-between text-body-sm font-body-sm">
                            <span class="text-on-surface-variant">Sangrias</span>
                            <span class="text-error font-medium">- R$ 0,00</span>
                        </div>
                    </div>
                </div>
                
                <div class="mt-6 flex gap-2">
                    <button id="btn-finance-sangria" class="flex-1 py-2 bg-surface-container-high hover:bg-surface-variant text-on-surface rounded-lg text-label-md font-label-md font-semibold transition-colors border border-outline-variant/30">Sangria</button>
                    <button id="btn-finance-close-register" class="flex-1 py-2 bg-primary/10 hover:bg-primary/20 text-primary rounded-lg text-label-md font-label-md font-semibold transition-colors">Fechar Caixa</button>
                </div>
            </div>
        </div>

        <!-- Transactions Table -->
        <div class="bg-surface-container-lowest rounded-xl shadow-[0px_4px_20px_rgba(109,40,255,0.04)] border border-outline-variant/10 overflow-hidden">
            <div class="p-6 border-b border-outline-variant/10 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <h3 class="text-headline-md font-headline-md text-on-surface">Últimas Movimentações</h3>
                <div class="flex items-center gap-2">
                    <div class="relative">
                        <span class="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant text-sm">search</span>
                        <input class="pl-9 pr-4 py-1.5 bg-surface-container-high border-none rounded-lg text-body-sm font-body-sm focus:ring-primary w-full sm:w-48" placeholder="Buscar..." type="text"/>
                    </div>
                </div>
            </div>
            
            <div class="overflow-x-auto">
                <table class="w-full text-left border-collapse">
                    <thead>
                        <tr class="bg-surface-container/50 border-b border-outline-variant/20 text-label-md font-label-md text-on-surface-variant">
                            <th class="p-4 font-medium">Data</th>
                            <th class="p-4 font-medium">Descrição</th>
                            <th class="p-4 font-medium">Categoria</th>
                            <th class="p-4 font-medium text-right">Valor</th>
                            <th class="p-4 font-medium text-center">Status</th>
                            <th class="p-4 font-medium text-center">Ações</th>
                        </tr>
                    </thead>
                    <tbody class="text-body-sm font-body-sm text-on-surface">
                        ${orders.length === 0 ? `
                        <tr>
                            <td colspan="6" class="p-8 text-center text-on-surface-variant italic">Nenhuma movimentação registrada.</td>
                        </tr>
                        ` : orders.slice(0, 10).map(o => `
                        <tr class="border-b border-outline-variant/10 hover:bg-surface-container-lowest transition-colors group">
                            <td class="p-4">${o.date}</td>
                            <td class="p-4">
                                <div class="font-medium">${o.id} - ${o.productName}</div>
                                <div class="text-xs text-on-surface-variant">${customers.find(c => c.id === o.customerId)?.name || o.customerName || 'Cliente'}</div>
                            </td>
                            <td class="p-4"><span class="px-2 py-1 bg-primary/10 text-primary rounded text-[10px] font-semibold">Venda</span></td>
                            <td class="p-4 text-right text-emerald-600 font-semibold">+ ${fmtBRL(o.value)}</td>
                            <td class="p-4 text-center"><span class="inline-flex items-center px-2 py-0.5 rounded-full bg-${o.status === 'Concluído' ? 'emerald' : 'amber'}-100/50 text-${o.status === 'Concluído' ? 'emerald' : 'amber'}-700 text-[11px] font-bold">${o.status === 'Concluído' ? 'PAGO' : 'PENDENTE'}</span></td>
                            <td class="p-4 text-center">
                                <button class="btn-finance-table-action text-on-surface-variant hover:text-primary transition-colors p-1"><span class="material-symbols-outlined text-sm">more_vert</span></button>
                            </td>
                        </tr>
                        `).join('')}
                    </tbody>
                </table>
            </div>
            
            <div class="p-4 border-t border-outline-variant/10 text-center">
                <button id="btn-finance-view-all" class="text-body-sm font-body-sm text-primary hover:text-secondary font-semibold transition-colors">Ver todas as movimentações</button>
            </div>
        </div>
    </div>

    <!-- Right Fixed Sidebar (Contextual) -->
    <aside class="w-full xl:w-[320px] bg-surface-container/30 border border-outline-variant/20 rounded-xl p-6 space-y-6">
        <h3 class="text-headline-md font-headline-md text-on-surface border-b border-outline-variant/20 pb-3">Resumo de Hoje</h3>
        <div class="space-y-4">
            <div class="flex items-center justify-between p-3 bg-surface-container-lowest rounded-lg shadow-sm border border-outline-variant/10">
                <div class="flex items-center gap-3">
                    <div class="w-8 h-8 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center">
                        <span class="material-symbols-outlined text-sm">arrow_downward</span>
                    </div>
                    <span class="text-body-sm font-body-sm text-on-surface">Entradas</span>
                </div>
                <span class="text-body-md font-body-md font-semibold text-emerald-600">${fmtBRL(faturamento)}</span>
            </div>
            
            <div class="flex items-center justify-between p-3 bg-surface-container-lowest rounded-lg shadow-sm border border-outline-variant/10">
                <div class="flex items-center gap-3">
                    <div class="w-8 h-8 rounded-full bg-red-100 text-red-600 flex items-center justify-center">
                        <span class="material-symbols-outlined text-sm">arrow_upward</span>
                    </div>
                    <span class="text-body-sm font-body-sm text-on-surface">Saídas</span>
                </div>
                <span class="text-body-md font-body-md font-semibold text-error">R$ 0,00</span>
            </div>
        </div>
        
        <h3 class="text-headline-md font-headline-md text-on-surface border-b border-outline-variant/20 pb-3 pt-4">Ações Rápidas</h3>
        <div class="grid grid-cols-2 gap-3">
            <button id="btn-finance-quick-in" class="flex flex-col items-center justify-center p-4 bg-surface-container-lowest hover:bg-primary/5 border border-outline-variant/20 rounded-xl transition-colors group">
                <span class="material-symbols-outlined text-primary mb-2 group-hover:scale-110 transition-transform">add_circle</span>
                <span class="text-label-md font-label-md text-on-surface text-center">Nova Entrada</span>
            </button>
            <button id="btn-finance-quick-out" class="flex flex-col items-center justify-center p-4 bg-surface-container-lowest hover:bg-error/5 border border-outline-variant/20 rounded-xl transition-colors group">
                <span class="material-symbols-outlined text-error mb-2 group-hover:scale-110 transition-transform">remove_circle</span>
                <span class="text-label-md font-label-md text-on-surface text-center">Nova Despesa</span>
            </button>
            <button id="btn-finance-quick-charge" class="flex flex-col items-center justify-center p-4 bg-surface-container-lowest hover:bg-surface-variant border border-outline-variant/20 rounded-xl transition-colors group">
                <span class="material-symbols-outlined text-on-surface-variant mb-2 group-hover:scale-110 transition-transform">receipt_long</span>
                <span class="text-label-md font-label-md text-on-surface text-center">Emitir Cobrança</span>
            </button>
            <button id="btn-finance-quick-export" class="flex flex-col items-center justify-center p-4 bg-surface-container-lowest hover:bg-surface-variant border border-outline-variant/20 rounded-xl transition-colors group">
                <span class="material-symbols-outlined text-on-surface-variant mb-2 group-hover:scale-110 transition-transform">download</span>
                <span class="text-label-md font-label-md text-on-surface text-center">Exportar</span>
            </button>
        </div>
    </aside>
</div>
        `;
        Finance.bindEvents();
    },

    bindEvents: () => {
        const bind = (id, message, type = 'info') => {
            const btn = document.getElementById(id);
            if (btn) btn.addEventListener('click', () => App.toast(message, type));
        };

        bind('btn-finance-filters', 'Abrindo painel de filtros...', 'info');
        bind('btn-finance-new', 'Iniciando nova movimentação...', 'success');
        bind('btn-finance-sangria', 'Registrando sangria do caixa...', 'warning');

        const btnCloseRegister = document.getElementById('btn-finance-close-register');
        if (btnCloseRegister) {
            btnCloseRegister.addEventListener('click', () => {
                App.confirm({
                    title: 'Fechar Caixa',
                    message: 'Deseja realmente fechar o caixa do dia atual? O saldo será consolidado.',
                    type: 'warning',
                    confirmLabel: 'Sim, fechar caixa',
                    onConfirm: () => App.toast('Caixa fechado com sucesso!', 'success')
                });
            });
        }

        bind('btn-finance-view-all', 'Carregando extrato completo...', 'info');
        bind('btn-finance-quick-in', 'Abrindo lançamento de entrada...', 'success');
        bind('btn-finance-quick-out', 'Abrindo lançamento de despesa...', 'error');
        bind('btn-finance-quick-charge', 'Gerando link de cobrança...', 'info');
        bind('btn-finance-quick-export', 'Exportando relatório em PDF/Excel...', 'success');

        document.querySelectorAll('.btn-finance-table-action').forEach(btn => {
            btn.addEventListener('click', () => {
                App.toast('Abrindo detalhes da transação...', 'info');
            });
        });
    }
};

export default Finance;
