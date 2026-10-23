import DB from '../db.js';
import { fmtBRL } from '../utils.js';
import { esc } from '../utils.js';
import QuotePDF from '../pdf.js';
import Payments from '../payments.js';

const isCanceled = (o) => o.status === 'Cancelado';
const isDone = (o) => /Conclu|Pronto|Entregue/i.test(String(o.status || ''));

const FILTERS = [
    { id: 'ativos',     label: 'Em andamento', test: (o) => !isCanceled(o) && !isDone(o) },
    { id: 'concluidos', label: 'Concluídos',   test: (o) => !isCanceled(o) && isDone(o) },
    { id: 'cancelados', label: 'Cancelados',   test: isCanceled },
    { id: 'todos',      label: 'Todos',        test: () => true }
];

const Sales = {
    filter: 'ativos',

    render: (container) => {
        const allOrders = DB.get('orders') || [];
        const customers = DB.get('customers') || [];
        const current = FILTERS.find(f => f.id === Sales.filter) || FILTERS[0];
        const orders = allOrders.filter(current.test);
        const badge = (o) => isCanceled(o) ? ['bg-red-50 text-red-600', 'bg-red-500']
                           : isDone(o)     ? ['bg-emerald-50 text-emerald-600', 'bg-emerald-500']
                           :                 ['bg-indigo-50 text-indigo-600', 'bg-indigo-500 animate-pulse'];

        container.innerHTML = `
            <div class="max-w-[1600px] mx-auto flex flex-col gap-8 pb-12 animate-in fade-in duration-500">
                <div class="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                    <div>
                        <h2 class="text-3xl font-black text-slate-800">Vendas e Pedidos</h2>
                        <p class="text-slate-500 font-medium">Gerencie suas vendas concluídas e pedidos em andamento.</p>
                    </div>
                    <button id="btn-sales-new-sale" class="btn-primary flex items-center gap-2">
                        <span class="material-symbols-outlined text-[20px]">add</span>
                        Nova Venda
                    </button>
                </div>

                <!-- Abas de status -->
                <div class="flex flex-wrap gap-2">
                    ${FILTERS.map(f => {
                        const n = allOrders.filter(f.test).length;
                        const on = f.id === current.id;
                        return `<button type="button" data-sales-filter="${f.id}" class="px-4 py-2 rounded-xl text-sm font-bold transition-all border ${on ? 'bg-primary text-white border-transparent shadow-sm' : 'bg-white text-slate-600 border-slate-200 hover:border-primary hover:text-primary'}">
                            ${f.label} <span class="ml-1 text-xs ${on ? 'opacity-80' : 'text-slate-400'}">${n}</span>
                        </button>`;
                    }).join('')}
                </div>

                ${orders.length === 0 ? `
                <div class="bg-white rounded-2xl border border-slate-200 shadow-sm p-12 flex flex-col items-center justify-center text-center">
                    <div class="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mb-4 text-slate-300">
                        <span class="material-symbols-outlined text-[32px]">receipt_long</span>
                    </div>
                    <h3 class="text-lg font-bold text-slate-800 mb-1">${allOrders.length ? `Nenhum pedido em "${current.label}"` : 'Nenhuma venda realizada'}</h3>
                    <p class="text-sm text-slate-500 max-w-sm mb-6">${allOrders.length ? 'Escolha outra aba para ver os demais pedidos.' : 'Você ainda não gerou nenhum pedido. Crie um novo orçamento para começar a registrar suas vendas.'}</p>
                </div>
                ` : `
                <div class="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                    <div class="overflow-x-auto">
                        <table class="w-full text-left border-collapse">
                            <thead>
                                <tr class="bg-slate-50/50 text-slate-500 text-xs font-bold uppercase tracking-wider border-b border-slate-100">
                                    <th class="px-6 py-4">Data / ID</th>
                                    <th class="px-6 py-4">Cliente</th>
                                    <th class="px-6 py-4">Produto</th>
                                    <th class="px-6 py-4 text-right">Valor</th>
                                    <th class="px-6 py-4 text-center">Status</th>
                                    <th class="px-6 py-4 text-center">Ações</th>
                                </tr>
                            </thead>
                            <tbody class="divide-y divide-slate-50">
                                ${orders.map(order => `
                                    <tr class="hover:bg-slate-50/80 transition-colors group ${isCanceled(order) ? 'opacity-60' : ''}">
                                        <td class="px-6 py-4">
                                            <p class="text-sm font-bold text-primary">${order.id}</p>
                                            <p class="text-[10px] text-slate-400 font-bold">${order.date}</p>
                                        </td>
                                        <td class="px-6 py-4">
                                            <p class="text-sm font-bold text-slate-700">${esc(customers.find(c => c.id === order.customerId)?.name || order.customerName || 'Cliente sem cadastro')}</p>
                                        </td>
                                        <td class="px-6 py-4">
                                            <p class="text-sm text-slate-500 font-medium">${esc(order.productName)}</p>
                                        </td>
                                        <td class="px-6 py-4 text-right font-black text-slate-800">
                                            ${fmtBRL(order.value)}
                                            ${isCanceled(order) ? '' : (() => { const b = Payments.badge(order); return `<div class="mt-1"><button type="button" onclick="window.orderPayments('${order.id}')" class="text-[10px] font-black px-2 py-0.5 rounded-full hover:opacity-80" style="${b.style}" title="Ver / registrar pagamento">${b.label}</button></div>`; })()}
                                        </td>
                                        <td class="px-6 py-4 text-center">
                                            <span class="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-black uppercase ${badge(order)[0]}">
                                                <div class="w-1.5 h-1.5 rounded-full ${badge(order)[1]}"></div>
                                                ${esc(order.status)}
                                            </span>
                                        </td>
                                        <td class="px-6 py-4 text-center">
                                            <div class="flex justify-center gap-1">
                                                <button onclick="window.printOrder('${order.id}')" class="p-2 hover:bg-indigo-50 hover:text-indigo-600 rounded-lg transition-all text-slate-400" title="PDF do Pedido (para o cliente)">
                                                    <span class="material-symbols-outlined text-[18px]">picture_as_pdf</span>
                                                </button>
                                                ${isCanceled(order) ? '' : `<button onclick="window.orderPayments('${order.id}')" class="p-2 hover:bg-emerald-50 hover:text-emerald-600 rounded-lg transition-all text-slate-400" title="Registrar pagamento">
                                                    <span class="material-symbols-outlined text-[18px]">payments</span>
                                                </button>`}
                                                <button onclick="window.printSheet('${order.id}')" class="p-2 hover:bg-slate-100 rounded-lg transition-all text-slate-400" title="Ficha de produção (sem valores)">
                                                    <span class="material-symbols-outlined text-[18px]">print</span>
                                                </button>
                                                <button onclick="window.viewOrder('${order.id}')" class="p-2 hover:bg-slate-100 rounded-lg transition-all text-slate-400" title="Ver Detalhes">
                                                    <span class="material-symbols-outlined text-[18px]">visibility</span>
                                                </button>
                                                ${isCanceled(order) ? `
                                                <button onclick="window.restoreOrder('${order.id}')" class="p-2 hover:bg-emerald-50 hover:text-emerald-600 rounded-lg transition-all text-slate-400" title="Reativar pedido">
                                                    <span class="material-symbols-outlined text-[18px]">restore</span>
                                                </button>
                                                <button onclick="window.deleteOrder('${order.id}')" class="p-2 hover:bg-red-50 hover:text-red-600 rounded-lg transition-all text-slate-400" title="Excluir definitivamente">
                                                    <span class="material-symbols-outlined text-[18px]">delete_forever</span>
                                                </button>` : `
                                                <button onclick="window.cancelOrder('${order.id}')" class="p-2 hover:bg-red-50 hover:text-red-600 rounded-lg transition-all text-slate-400" title="Cancelar Pedido">
                                                    <span class="material-symbols-outlined text-[18px]">cancel</span>
                                                </button>`}
                                            </div>
                                        </td>
                                    </tr>
                                `).join('')}
                            </tbody>
                        </table>
                    </div>
                </div>
                `}
            </div>
        `;

        // Ativa os eventos
        setTimeout(() => {
            container.querySelectorAll('[data-sales-filter]').forEach(b => b.addEventListener('click', () => {
                Sales.filter = b.dataset.salesFilter;
                Sales.render(container);
            }));

            const btn = document.getElementById('btn-sales-new-sale');
            if (btn) btn.onclick = () => import('../app.js').then(m => m.default.navigateTo('orcamentos'));

            // Handlers Globais
            window.viewOrder = (id) => {
                const orders = DB.get('orders') || [];
                const order = orders.find(o => o.id === id);
                if (!order) return;

                import('../app.js').then(m => {
                    const optionsHtml = (order.options || []).map(opt => `<span class="badge badge-purple m-1">${esc(opt)}</span>`).join('');
                    m.default.confirm({
                        title: `Detalhes do Pedido ${order.id}`,
                        message: `
                            <div class="text-left space-y-4">
                                <div class="p-4 rounded-xl bg-slate-50 border border-slate-200">
                                    <p class="text-[10px] uppercase font-black text-slate-400 mb-1">Cliente</p>
                                    <p class="text-sm font-bold text-slate-800">${esc(order.customerName)}</p>
                                </div>
                                <div class="p-4 rounded-xl bg-slate-50 border border-slate-200">
                                    <p class="text-[10px] uppercase font-black text-slate-400 mb-1">Produto e Configuração</p>
                                    <p class="text-sm font-bold text-slate-800 mb-2">${esc(order.productName)}</p>
                                    <div class="flex flex-wrap -m-1">
                                        ${optionsHtml || '<p class="text-xs italic text-slate-400">Sem variações</p>'}
                                    </div>
                                </div>
                                <div class="grid grid-cols-2 gap-4">
                                    <div class="p-4 rounded-xl bg-slate-50 border border-slate-200">
                                        <p class="text-[10px] uppercase font-black text-slate-400 mb-1">Valor Total</p>
                                        <p class="text-lg font-black text-primary">${fmtBRL(order.value)}</p>
                                    </div>
                                    <div class="p-4 rounded-xl bg-slate-50 border border-slate-200">
                                        <p class="text-[10px] uppercase font-black text-slate-400 mb-1">Status Atual</p>
                                        <p class="text-sm font-bold text-indigo-600">${esc(order.status)}</p>
                                    </div>
                                </div>
                            </div>
                        `,
                        type: 'info',
                        confirmLabel: 'Fechar'
                    });
                });
            };

            window.printOrder = (id) => {
                const orders = DB.get('orders') || [];
                const order = orders.find(o => o.id === id);
                if (!order) return;
                
                QuotePDF.fromOrder(order);
                import('../app.js').then(m => m.default.toast('Na janela que abrir, escolha "Salvar como PDF"', 'info'));
            };

            window.cancelOrder = (id) => {
                import('../app.js').then(m => {
                    m.default.confirm({
                        title: 'Cancelar Pedido?',
                        message: `Cancelar o pedido ${id}? Ele sai da produção e não conta mais na receita. Depois você pode reativá-lo na aba "Cancelados".`,
                        type: 'danger',
                        confirmLabel: 'Sim, Cancelar',
                        onConfirm: () => {
                            const orders = DB.get('orders') || [];
                            const orderIdx = orders.findIndex(o => o.id === id);
                            if (orderIdx !== -1) {
                                orders[orderIdx].previousStatus = orders[orderIdx].status;   // para poder reativar
                                orders[orderIdx].status = 'Cancelado';
                                DB.save('orders', orders);
                                m.default.toast('Pedido cancelado com sucesso.', 'info');
                                Sales.render(container);
                            }
                        }
                    });
                });
            };
        window.printSheet = (id) => {
                const o = (DB.get('orders') || []).find(x => x.id === id);
                if (o) QuotePDF.productionSheet(o);
            };

            window.orderPayments = (id) => Payments.openModal(id, () => Sales.render(container));

            window.restoreOrder = (id) => {
                const orders = DB.get('orders') || [];
                const o = orders.find(x => x.id === id);
                if (!o) return;
                o.status = o.previousStatus && o.previousStatus !== 'Cancelado' ? o.previousStatus : 'Aguardando Arte';
                delete o.previousStatus;
                DB.save('orders', orders);
                import('../app.js').then(m => m.default.toast(`Pedido ${id} reativado (${o.status}).`, 'success'));
                Sales.render(container);
            };

            window.deleteOrder = (id) => {
                import('../app.js').then(m => {
                    m.default.confirm({
                        title: 'Excluir pedido definitivamente?',
                        message: `O pedido ${id} será apagado de vez, inclusive da nuvem. Isso não pode ser desfeito.`,
                        type: 'danger',
                        confirmLabel: 'Excluir',
                        onConfirm: () => {
                            const gone = (DB.get('orders') || []).find(o => o.id === id);
                            DB.save('orders', (DB.get('orders') || []).filter(o => o.id !== id));
                            DB.removeFiles((gone?.files || []).map(f => f.path));   // arquivos do cliente deste pedido
                            m.default.toast('Pedido excluído.', 'info');
                            Sales.render(container);
                        }
                    });
                });
            };
        }, 0);
    }
};

export default Sales;
