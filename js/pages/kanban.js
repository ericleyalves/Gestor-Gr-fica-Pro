import DB from '../db.js';

const Kanban = {
    render: (container) => {
        const orders = DB.get('orders') || [];
        
        // Define columns
        const columns = [
            { id: 'aguardando', title: 'Aguardando Arte', color: '#f59e0b', bg: '#FFFBEB' },
            { id: 'producao',   title: 'Em Produção',     color: '#6C2BFF', bg: '#F0EBFF' },
            { id: 'acabamento', title: 'Acabamento',      color: '#64748b', bg: '#F1F5F9' },
            { id: 'concluido',  title: 'Pronto / Enviado', color: '#10b981', bg: '#ECFDF5' }
        ];

        const fmtBRL = (v) => parseFloat(v || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

        container.innerHTML = `
            <div class="max-w-[1600px] mx-auto h-full flex flex-col gap-6 page-enter">
                <div class="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                    <div>
                        <h2 class="page-title">Fluxo de Produção 🛠️</h2>
                        <p class="text-sm mt-1" style="color:var(--text-muted);">Gerencie o status de produção de cada pedido arrastando os cards.</p>
                    </div>
                    <div class="flex items-center gap-2">
                        <div class="search-input-wrap" style="width: 240px;">
                            <span class="material-symbols-outlined">search</span>
                            <input type="text" placeholder="Buscar pedido..." style="border-radius: var(--radius-sm); font-size: 13px;">
                        </div>
                    </div>
                </div>

                <!-- Kanban Board -->
                <div class="flex-1 flex gap-5 overflow-x-auto pb-6 scrollbar-hide min-h-[600px]">
                    ${columns.map(col => `
                        <div class="kanban-col flex-shrink-0 w-[320px] rounded-[24px] flex flex-col max-h-full border border-slate-200/50" 
                             style="background: #FAFBFF;"
                             data-column-id="${col.id}"
                             ondragover="event.preventDefault()"
                             ondrop="window.handleDrop(event, '${col.id}')">
                            
                            <!-- Column Header -->
                            <div class="p-5 flex items-center justify-between border-b" style="border-color: var(--border);">
                                <div class="flex items-center gap-3">
                                    <div class="w-3 h-3 rounded-full" style="background-color: ${col.color}"></div>
                                    <h3 class="font-black text-slate-700 text-xs uppercase tracking-widest">${col.title}</h3>
                                </div>
                                <span class="bg-white border border-slate-200 px-2.5 py-1 rounded-lg text-[10px] font-black text-slate-500 shadow-sm">
                                    ${orders.filter(o => Kanban.getStatusId(o.status) === col.id).length}
                                </span>
                            </div>
                            
                            <!-- Cards Container -->
                            <div class="flex-1 overflow-y-auto p-4 space-y-3 kanban-cards-list">
                                ${orders.filter(o => Kanban.getStatusId(o.status) === col.id).map(order => `
                                    <div class="kanban-card" 
                                         draggable="true" 
                                         id="order-${order.id}"
                                         data-order-id="${order.id}"
                                         ondragstart="window.handleDragStart(event, '${order.id}')"
                                         onclick="window.openOrderDetails('${order.id}')">
                                        
                                        <div class="flex justify-between items-start mb-3">
                                            <span class="badge badge-purple" style="font-size: 10px;">${order.id}</span>
                                            <span class="text-[10px] font-bold" style="color: var(--text-faint);">${order.date}</span>
                                        </div>
                                        
                                        <h4 class="text-sm font-black mb-1" style="color: var(--text-main);">${order.productName}</h4>
                                        <p class="text-xs font-semibold mb-4" style="color: var(--text-muted);">${DB.get('customers')?.find(c => c.id === order.customerId)?.name || order.customerName || 'Cliente'}</p>
                                        
                                        <div class="flex justify-between items-center pt-3 border-t" style="border-color: var(--border);">
                                            <p class="text-xs font-black" style="color: var(--text-main);">${fmtBRL(order.value)}</p>
                                            <div class="flex items-center gap-1.5" style="color: var(--text-faint);">
                                                <span class="material-symbols-outlined" style="font-size:16px;">attach_file</span>
                                                <span class="text-[10px] font-bold">ARQUIVO</span>
                                            </div>
                                        </div>
                                    </div>
                                `).join('')}
                                
                                ${orders.filter(o => Kanban.getStatusId(o.status) === col.id).length === 0 ? `
                                    <div class="h-32 border-2 border-dashed rounded-3xl flex flex-col items-center justify-center text-slate-300 gap-2" style="border-color: var(--border);">
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

        Kanban.initEvents(container);
    },

    getStatusId: (status) => {
        if (!status) return 'aguardando';
        if (status.includes('Aguardando Arte')) return 'aguardando';
        if (status.includes('Produção')) return 'producao';
        if (status.includes('Acabamento')) return 'acabamento';
        if (status.includes('Concluído') || status.includes('Pronto')) return 'concluido';
        return 'aguardando';
    },

    getStatusName: (id) => {
        const map = {
            aguardando: 'Aguardando Arte',
            producao:   'Produção',
            acabamento: 'Acabamento',
            concluido:  'Concluído'
        };
        return map[id] || 'Aguardando Arte';
    },

    initEvents: (container) => {
        window.handleDragStart = (e, orderId) => {
            e.dataTransfer.setData('orderId', orderId);
            e.currentTarget.style.opacity = '0.5';
        };

        window.handleDrop = (e, columnId) => {
            e.preventDefault();
            const orderId = e.dataTransfer.getData('orderId');
            const card = document.getElementById(`order-${orderId}`);
            if (card) card.style.opacity = '1';

            // Update DB
            const orders = DB.get('orders') || [];
            const orderIdx = orders.findIndex(o => o.id === orderId);
            if (orderIdx !== -1) {
                const newStatus = Kanban.getStatusName(columnId);
                if (orders[orderIdx].status === newStatus) return; // No change
                
                orders[orderIdx].status = newStatus;
                DB.save('orders', orders);
                
                // Toast
                import('../app.js').then(m => m.default.toast(`Pedido ${orderId} movido para ${newStatus}`));
                
                // Re-render
                Kanban.render(container);
            }
        };

        window.openOrderDetails = (orderId) => {
            // Future implementation: Detailed order modal
            console.log('Opening details for:', orderId);
        };

        // Handle drag end visually
        document.addEventListener('dragend', (e) => {
            if (e.target.classList.contains('kanban-card')) {
                e.target.style.opacity = '1';
            }
        });
    }
};

export default Kanban;
