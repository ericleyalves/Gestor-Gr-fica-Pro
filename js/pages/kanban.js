import DB from '../db.js';

const Kanban = {
    render: (container) => {
        const orders = DB.get('orders') || [];
        
        // Define columns
        const columns = [
            { id: 'aguardando', title: 'Aguardando Arte', color: '#f59e0b' },
            { id: 'aprovacao', title: 'Aguardando Aprovação', color: '#6366f1' },
            { id: 'producao', title: 'Em Produção', color: '#8b5cf6' },
            { id: 'acabamento', title: 'Acabamento', color: '#64748b' },
            { id: 'concluido', title: 'Pronto / Enviado', color: '#10b981' }
        ];

        // Group orders by status
        const getStatusId = (status) => {
            if (status.includes('Aguardando Arte')) return 'aguardando';
            if (status.includes('Produção')) return 'producao';
            if (status.includes('Concluído')) return 'concluido';
            return 'aguardando'; // Default
        };

        container.innerHTML = `
            <div class="max-w-[1600px] mx-auto h-full flex flex-col gap-6 animate-in fade-in duration-500">
                <div class="flex justify-between items-center">
                    <div>
                        <h2 class="text-3xl font-black text-slate-800">Fluxo de Produção</h2>
                        <p class="text-slate-500 font-medium">Acompanhe e gerencie o status de cada pedido em tempo real.</p>
                    </div>
                    <div class="flex items-center gap-2">
                        <button class="p-2 bg-white border border-slate-200 rounded-xl text-slate-400 hover:text-primary transition-all shadow-sm">
                            <span class="material-symbols-outlined">filter_list</span>
                        </button>
                    </div>
                </div>

                <div class="flex-1 flex gap-6 overflow-x-auto pb-6 scrollbar-hide min-h-[600px]">
                    ${columns.map(col => `
                        <div class="flex-shrink-0 w-[320px] bg-slate-100/50 rounded-[24px] flex flex-col max-h-full border border-slate-200/50">
                            <div class="p-5 flex items-center justify-between">
                                <div class="flex items-center gap-3">
                                    <div class="w-2.5 h-2.5 rounded-full" style="background-color: ${col.color}"></div>
                                    <h3 class="font-black text-slate-700 text-xs uppercase tracking-widest">${col.title}</h3>
                                </div>
                                <span class="bg-white border border-slate-200 px-2.5 py-1 rounded-lg text-[10px] font-black text-slate-500 shadow-sm">
                                    ${orders.filter(o => getStatusId(o.status) === col.id).length}
                                </span>
                            </div>
                            
                            <div class="flex-1 overflow-y-auto p-4 space-y-4">
                                ${orders.filter(o => getStatusId(o.status) === col.id).map(order => `
                                    <div class="bg-white p-5 rounded-2xl shadow-sm border border-slate-200 hover:border-primary hover:shadow-md transition-all cursor-pointer group">
                                        <div class="flex justify-between items-start mb-3">
                                            <span class="text-[10px] font-black text-primary bg-primary/5 px-2 py-0.5 rounded-lg">${order.id}</span>
                                            <span class="text-[10px] text-slate-400 font-bold">${order.date}</span>
                                        </div>
                                        <h4 class="text-sm font-black text-slate-800 mb-1 group-hover:text-primary transition-colors">${order.productName}</h4>
                                        <p class="text-xs text-slate-500 font-medium mb-5">${DB.get('customers').find(c => c.id === order.customerId)?.name || 'Cliente'}</p>
                                        
                                        <div class="flex justify-between items-center pt-4 border-t border-slate-50">
                                            <div class="flex -space-x-2">
                                                <div class="w-7 h-7 rounded-lg bg-indigo-50 border-2 border-white flex items-center justify-center text-[10px] font-black text-indigo-500">OP</div>
                                            </div>
                                            <div class="flex items-center gap-1.5 text-slate-400 group-hover:text-primary transition-colors">
                                                <span class="material-symbols-outlined text-[18px]">attach_file</span>
                                                <span class="text-[10px] font-black">PDF</span>
                                            </div>
                                        </div>
                                    </div>
                                `).join('')}
                                
                                ${orders.filter(o => getStatusId(o.status) === col.id).length === 0 ? `
                                    <div class="h-32 border-2 border-dashed border-slate-200 rounded-3xl flex flex-col items-center justify-center text-slate-300 gap-2">
                                        <span class="material-symbols-outlined text-3xl">inbox</span>
                                        <p class="text-[10px] font-bold uppercase tracking-widest">Sem pedidos</p>
                                    </div>
                                ` : ''}
                            </div>
                        </div>
                    `).join('')}
                </div>
            </div>
        `;
    }
};

export default Kanban;
