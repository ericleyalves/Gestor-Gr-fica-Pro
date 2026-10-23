import DB from '../db.js';
import { fmtBRL, docNo } from '../utils.js';
import { esc } from '../utils.js';
import Files from '../files.js';
import QuotePDF from '../pdf.js';
import Payments from '../payments.js';

const COLUMNS = [
    { id: 'aguardando', title: 'Aguardando Arte', color: '#f59e0b', bg: '#FFFBEB' },
    { id: 'producao',   title: 'Em Produção',     color: '#6C2BFF', bg: '#F0EBFF' },
    { id: 'acabamento', title: 'Finalizado',      color: '#64748b', bg: '#F1F5F9' },
    { id: 'concluido',  title: 'Pronto / Enviado', color: '#10b981', bg: '#ECFDF5' }
];

const Kanban = {
    render: (container) => {
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
                            <input type="text" id="kanban-search" placeholder="Buscar pedido..." style="border-radius: var(--radius-sm); font-size: 13px;">
                        </div>
                    </div>
                </div>

                <!-- Kanban Board -->
                <div id="kanban-board" class="flex-1 flex gap-5 overflow-x-auto pb-6 scrollbar-hide min-h-[600px]">
                </div>
            </div>
        `;
        
        Kanban.renderBoard('');
        Kanban.initEvents(container);
    },

    renderBoard: (filter = '') => {
        const orders = DB.get('orders') || [];
        const board = document.getElementById('kanban-board');
        if (!board) return;
        
        const customers = Array.isArray(DB.get('customers')) ? DB.get('customers') : [];
        const products = DB.get('products') || [];
        const filterStr = String(filter || '').toLowerCase();
        // Pedidos cancelados não voltam para a fila de produção
        const filteredOrders = orders.filter(o => o.status !== 'Cancelado').filter(o =>
            String(o.id || '').toLowerCase().includes(filterStr) ||
            String(o.productName || '').toLowerCase().includes(filterStr) ||
            String(o.customerName || '').toLowerCase().includes(filterStr)
        );

        board.innerHTML = COLUMNS.map(col => {
            const colOrders = filteredOrders.filter(o => Kanban.getStatusId(o.status) === col.id);
            return `
            <div class="kanban-col flex-1 min-w-[290px] rounded-[24px] flex flex-col max-h-full border border-slate-200/50" 
                 style="background: #FAFBFF;"
                 data-column-id="${col.id}"
                 ondragover="event.preventDefault()"
                 ondrop="window.handleDrop(event, '${col.id}')">
                
                <!-- Column Header -->
                <div class="p-5 flex items-center justify-between border-b" style="border-color: var(--border);">
                    <div class="flex items-center gap-3">
                        <div class="w-3 h-3 rounded-full" style="background-color: ${col.color}"></div>
                        <h3 class="font-black text-slate-700 text-xs uppercase tracking-widest">${esc(col.title)}</h3>
                    </div>
                    <span class="bg-white border border-slate-200 px-2.5 py-1 rounded-lg text-[10px] font-black text-slate-500 shadow-sm">
                        ${colOrders.length}
                    </span>
                </div>

                <!-- Cards Container -->
                <div class="flex-1 overflow-y-auto p-4 space-y-3 kanban-cards-list">
                    ${colOrders.map(order => `
                        <div class="kanban-card" 
                             draggable="true" 
                             id="order-${order.id}"
                             data-order-id="${order.id}"
                             ondragstart="window.handleDragStart(event, '${order.id}')"
                             onclick="window.openOrderDetails('${order.id}')">
                            
                            <div class="flex justify-between items-start mb-3">
                                <span class="badge badge-purple" style="font-size: 11px;" title="${esc(order.id)}">Nº ${esc(docNo(order))}</span>
                                ${(() => {
                                    if (!order.dueDate) return `<span class="text-[10px] font-bold" style="color: var(--text-faint);">${order.date}</span>`;
                                    const today = new Date(); const t = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
                                    const done = Kanban.getStatusId(order.status) === 'concluido';
                                    const late = !done && order.dueDate < t, isToday = !done && order.dueDate === t;
                                    const [, mm, dd] = order.dueDate.split('-');
                                    const style = late ? 'background:#FEF2F2;color:#DC2626;' : isToday ? 'background:#FFFBEB;color:#D97706;' : 'background:#F1F5F9;color:#475569;';
                                    return `<span class="text-[10px] font-black px-2 py-0.5 rounded-full" style="${style}" title="Entrega prevista">
                                        ${late ? 'ATRASADO · ' : isToday ? 'HOJE · ' : 'ENTREGA '}${dd}/${mm}</span>`;
                                })()}
                            </div>
                            
                            <h4 class="text-[13px] font-semibold leading-snug mb-1" style="color: var(--text-main); display:-webkit-box; -webkit-line-clamp:2; -webkit-box-orient:vertical; overflow:hidden;" title="${esc(order.productName || '')}">${esc(order.productName || 'Produto Genérico')}</h4>
                            <p class="text-xs font-medium mb-2 flex items-center gap-1" style="color: var(--text-muted);"><span class="material-symbols-outlined" style="font-size:14px;">person</span>${esc(customers.find(c => String(c.id) === String(order.customerId))?.name || order.customerName || 'Cliente')}</p>
                            
                            <!-- Chosen Options -->
                            ${Array.isArray(order.options) && order.options.length > 0 ? `
                                <div class="flex flex-wrap gap-1 mb-4">
                                    ${order.options.map(opt => `
                                        <span class="text-[9px] px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 border border-slate-200 font-bold uppercase tracking-tight">
                                            ${opt}
                                        </span>
                                    `).join('')}
                                </div>
                            ` : ''}
                            
                            <!-- Rodapé: valor + pagamento / ações -->
                            <div class="pt-3 border-t space-y-2" style="border-color: var(--border);">
                                <div class="flex items-center justify-between gap-2">
                                    <p class="text-sm font-black" style="color: var(--text-main);">${fmtBRL(order.value)}</p>
                                    ${(() => { const b = Payments.badge(order); return `
                                    <button type="button" draggable="false" class="text-[10px] font-black px-2 py-0.5 rounded-full hover:opacity-80" style="${b.style}"
                                            onclick="event.stopPropagation(); window.openOrderPayments('${order.id}')" title="Ver / registrar pagamento">${b.label}</button>`; })()}
                                </div>
                                <div class="flex items-center gap-1">
                                    <button type="button" draggable="false" class="flex items-center gap-1 px-2 py-1 rounded-lg hover:bg-violet-50 transition-all" style="color: var(--text-muted);"
                                            onclick="event.stopPropagation(); window.printOrderPdf('${order.id}')" title="Gerar PDF do pedido">
                                        <span class="material-symbols-outlined" style="font-size:16px;">picture_as_pdf</span>
                                        <span class="text-[10px] font-black">PDF</span>
                                    </button>
                                    <button type="button" draggable="false" class="flex items-center gap-1 px-2 py-1 rounded-lg hover:bg-violet-50 transition-all" style="color: var(--text-muted);"
                                            onclick="event.stopPropagation(); window.printOrderSheet('${order.id}')" title="Ficha de produção (sem valores)">
                                        <span class="material-symbols-outlined" style="font-size:16px;">print</span>
                                        <span class="text-[10px] font-black">FICHA</span>
                                    </button>
                                    ${(() => {
                                        const n = Files.countForOrder(order, products);
                                        return `<button type="button" class="ml-auto flex items-center gap-1 px-2 py-1 rounded-lg transition-all hover:bg-violet-50 whitespace-nowrap" style="color: ${n ? 'var(--primary)' : 'var(--text-faint)'};"
                                                       draggable="false" onclick="event.stopPropagation(); window.openOrderFiles('${order.id}')" title="${n ? 'Ver, baixar ou adicionar arquivos' : 'Anexar arquivo do cliente'}">
                                                   <span class="material-symbols-outlined" style="font-size:16px;">${n ? 'folder_open' : 'attach_file'}</span>
                                                   <span class="text-[10px] font-black">${n ? `${n} ARQUIVO${n > 1 ? 'S' : ''}` : 'ANEXAR'}</span>
                                               </button>`;
                                    })()}
                                </div>
                            </div>
                        </div>
                    `).join('')}
                    
                    ${colOrders.length === 0 ? `
                        <div class="h-32 border-2 border-dashed rounded-3xl flex flex-col items-center justify-center text-slate-300 gap-2" style="border-color: var(--border);">
                            <span class="material-symbols-outlined text-3xl">inbox</span>
                            <p class="text-[10px] font-bold uppercase tracking-widest">Sem pedidos</p>
                        </div>
                    ` : ''}
                </div>
            </div>
        `;
        }).join('');
    },

    getStatusId: (status) => {
        if (!status) return 'aguardando';
        const s = String(status);
        if (s.includes('Aguardando Arte')) return 'aguardando';
        if (s.includes('Produção')) return 'producao';
        if (s.includes('Finalizado') || s.includes('Acabamento')) return 'acabamento';   // 'Acabamento' = nome antigo
        if (s.includes('Concluído') || s.includes('Pronto')) return 'concluido';
        return 'aguardando';
    },

    getStatusName: (id) => {
        const map = {
            aguardando: 'Aguardando Arte',
            producao:   'Produção',
            acabamento: 'Finalizado',
            concluido:  'Concluído'
        };
        return map[id] || 'Aguardando Arte';
    },

    initEvents: (container) => {
        const searchInput = container.querySelector('#kanban-search');
        if (searchInput) {
            searchInput.addEventListener('input', (e) => {
                Kanban.renderBoard(e.target.value.toLowerCase());
            });
        }

        if (!window._kanbanDragInitialized) {
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
                    import('../app.js').then(m => m.default.toast(`Pedido Nº ${docNo(orders[orderIdx])} movido para ${newStatus}`));
                    
                    // Re-render
                    Kanban.renderBoard(document.getElementById('kanban-search')?.value.toLowerCase() || '');
                }
            };

            window.printOrderSheet = (orderId) => {
                const order = (DB.get('orders') || []).find(o => String(o.id) === String(orderId));
                if (order) QuotePDF.productionSheet(order);
            };

            window.printOrderPdf = (orderId) => {
                const order = (DB.get('orders') || []).find(o => String(o.id) === String(orderId));
                if (!order) return;
                QuotePDF.fromOrder(order);
                import('../app.js').then(m => m.default.toast('Na janela que abrir, escolha "Salvar como PDF"', 'info'));
            };

            window.openOrderPayments = (orderId) => Payments.openModal(orderId,
                () => Kanban.renderBoard(document.getElementById('kanban-search')?.value.toLowerCase() || ''));

            window.openOrderFiles = (orderId) => {
                const order = (DB.get('orders') || []).find(o => String(o.id) === String(orderId));
                if (order) Files.openOrderModal(order, 'Arquivos do pedido', {
                    orderKey: 'orders',
                    onChange: () => Kanban.renderBoard(document.getElementById('kanban-search')?.value.toLowerCase() || '')
                });
            };

            window.openOrderDetails = (orderId) => {
                // Future implementation: Detailed order modal
                console.log('Opening details for:', orderId);
            };

            // Handle drag end visually
            document.addEventListener('dragend', (e) => {
                if (e.target && e.target.classList && e.target.classList.contains('kanban-card')) {
                    e.target.style.opacity = '1';
                }
            });
            window._kanbanDragInitialized = true;
        }
    }
};

export default Kanban;
