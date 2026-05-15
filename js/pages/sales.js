import DB from '../db.js';

const Sales = {
    render: (container) => {
        const orders = DB.get('orders') || [];
        
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
                                    <tr class="hover:bg-slate-50/80 transition-colors group">
                                        <td class="px-6 py-4">
                                            <p class="text-sm font-bold text-primary">${order.id}</p>
                                            <p class="text-[10px] text-slate-400 font-bold">${order.date}</p>
                                        </td>
                                        <td class="px-6 py-4">
                                            <p class="text-sm font-bold text-slate-700">${DB.get('customers').find(c => c.id === order.customerId)?.name || order.customerName || 'Cliente sem cadastro'}</p>
                                        </td>
                                        <td class="px-6 py-4">
                                            <p class="text-sm text-slate-500 font-medium">${order.productName}</p>
                                        </td>
                                        <td class="px-6 py-4 text-right font-black text-slate-800">
                                            R$ ${order.value.toFixed(2)}
                                        </td>
                                        <td class="px-6 py-4 text-center">
                                            <span class="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-black uppercase ${order.status === 'Concluído' ? 'bg-emerald-50 text-emerald-600' : 'bg-indigo-50 text-indigo-600'}">
                                                <div class="w-1.5 h-1.5 rounded-full ${order.status === 'Concluído' ? 'bg-emerald-500' : 'bg-indigo-500 animate-pulse'}"></div>
                                                ${order.status}
                                            </span>
                                        </td>
                                        <td class="px-6 py-4 text-center">
                                            <div class="flex justify-center gap-1">
                                                <button onclick="window.printOrder('${order.id}')" class="p-2 hover:bg-indigo-50 hover:text-indigo-600 rounded-lg transition-all text-slate-400" title="Imprimir Comprovante">
                                                    <span class="material-symbols-outlined text-[18px]">print</span>
                                                </button>
                                                <button onclick="window.viewOrder('${order.id}')" class="p-2 hover:bg-slate-100 rounded-lg transition-all text-slate-400" title="Ver Detalhes">
                                                    <span class="material-symbols-outlined text-[18px]">visibility</span>
                                                </button>
                                                <button onclick="window.cancelOrder('${order.id}')" class="p-2 hover:bg-red-50 hover:text-red-600 rounded-lg transition-all text-slate-400" title="Cancelar Pedido">
                                                    <span class="material-symbols-outlined text-[18px]">cancel</span>
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                `).join('')}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        `;

        // Ativa os eventos
        setTimeout(() => {
            const btn = document.getElementById('btn-sales-new-sale');
            if (btn) btn.onclick = () => import('../app.js').then(m => m.default.navigateTo('orcamentos'));

            // Handlers Globais
            window.viewOrder = (id) => {
                const orders = DB.get('orders') || [];
                const order = orders.find(o => o.id === id);
                if (!order) return;

                import('../app.js').then(m => {
                    const optionsHtml = (order.options || []).map(opt => `<span class="badge badge-purple m-1">${opt}</span>`).join('');
                    m.default.confirm({
                        title: `Detalhes do Pedido ${order.id}`,
                        message: `
                            <div class="text-left space-y-4">
                                <div class="p-4 rounded-xl bg-slate-50 border border-slate-200">
                                    <p class="text-[10px] uppercase font-black text-slate-400 mb-1">Cliente</p>
                                    <p class="text-sm font-bold text-slate-800">${order.customerName}</p>
                                </div>
                                <div class="p-4 rounded-xl bg-slate-50 border border-slate-200">
                                    <p class="text-[10px] uppercase font-black text-slate-400 mb-1">Produto e Configuração</p>
                                    <p class="text-sm font-bold text-slate-800 mb-2">${order.productName}</p>
                                    <div class="flex flex-wrap -m-1">
                                        ${optionsHtml || '<p class="text-xs italic text-slate-400">Sem variações</p>'}
                                    </div>
                                </div>
                                <div class="grid grid-cols-2 gap-4">
                                    <div class="p-4 rounded-xl bg-slate-50 border border-slate-200">
                                        <p class="text-[10px] uppercase font-black text-slate-400 mb-1">Valor Total</p>
                                        <p class="text-lg font-black text-primary">R$ ${order.value.toFixed(2)}</p>
                                    </div>
                                    <div class="p-4 rounded-xl bg-slate-50 border border-slate-200">
                                        <p class="text-[10px] uppercase font-black text-slate-400 mb-1">Status Atual</p>
                                        <p class="text-sm font-bold text-indigo-600">${order.status}</p>
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
                
                // Simula impressão abrindo o WhatsApp formatado ou preparando print
                import('./quotes.js').then(m => {
                    // Podemos reusar a lógica de formatar mensagem para imprimir algo limpo
                    window.print(); 
                });
            };

            window.cancelOrder = (id) => {
                import('../app.js').then(m => {
                    m.default.confirm({
                        title: 'Cancelar Pedido?',
                        message: `Tem certeza que deseja cancelar o pedido ${id}? Esta ação não pode ser desfeita.`,
                        type: 'danger',
                        confirmLabel: 'Sim, Cancelar',
                        onConfirm: () => {
                            const orders = DB.get('orders') || [];
                            const orderIdx = orders.findIndex(o => o.id === id);
                            if (orderIdx !== -1) {
                                orders[orderIdx].status = 'Cancelado';
                                DB.save('orders', orders);
                                m.default.toast('Pedido cancelado com sucesso.', 'info');
                                Sales.render(container);
                            }
                        }
                    });
                });
            };
        }, 0);
    }
};

export default Sales;
