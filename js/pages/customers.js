import DB from '../db.js';

const Customers = {
    render: (container) => {
        const customers = DB.get('customers') || [];
        
        container.innerHTML = `
            <div class="max-w-[1400px] mx-auto flex flex-col gap-6 page-enter">
                
                <!-- Page Header -->
                <div class="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                    <div>
                        <h2 class="page-title">Base de Clientes 👥</h2>
                        <p class="text-sm mt-1" style="color:var(--text-muted);">Gerencie informações de contato e o histórico comercial da sua gráfica.</p>
                    </div>
                    <button id="btn-add-customer" class="btn-primary">
                        <span class="material-symbols-outlined" style="font-size:18px;">person_add</span>
                        Novo Cliente
                    </button>
                </div>

                <!-- KPI Row -->
                <div class="grid grid-cols-2 lg:grid-cols-4 gap-4">
                    ${Customers.kpi('Total de Clientes', customers.length, 'groups', '#6C2BFF', '#F0EBFF')}
                    ${Customers.kpi('Novos (Mês)', 4, 'new_releases', '#10B981', '#ECFDF5')}
                    ${Customers.kpi('Ativos', customers.length, 'check_circle', '#2563EB', '#EFF6FF')}
                    ${Customers.kpi('Ticket Médio', 'R$ 450', 'payments', '#D97706', '#FFFBEB')}
                </div>

                <!-- Search & Layout -->
                <div class="action-bar">
                    <div class="search-input-wrap">
                        <span class="material-symbols-outlined">search</span>
                        <input type="text" id="customer-search" placeholder="Buscar por nome, CPF/CNPJ, e-mail ou telefone...">
                    </div>
                </div>

                <!-- Grid of Cards -->
                <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                    ${customers.length === 0 
                        ? `<div class="col-span-full data-table">
                               <div class="empty-state">
                                   <div class="empty-state-icon"><span class="material-symbols-outlined">person_search</span></div>
                                   <h3>Nenhum cliente cadastrado</h3>
                                   <p>Sua base está vazia. Adicione um cliente para começar a gerar pedidos.</p>
                                   <button class="btn-primary" id="btn-add-customer-empty">Cadastrar primeiro cliente</button>
                               </div>
                           </div>`
                        : customers.map(c => `
                            <div class="section-card group hover:shadow-3 transition-all duration-300">
                                <div class="flex justify-between items-start mb-5">
                                    <div class="w-12 h-12 rounded-[16px] flex items-center justify-center font-black text-lg" style="background:var(--primary-light); color:var(--primary);">
                                        ${c.name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase()}
                                    </div>
                                    <div class="flex gap-1 opacity-0 group-hover:opacity-100 transition-all">
                                        <button class="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-slate-100 text-slate-400" onclick="window.editCustomer(${c.id})">
                                            <span class="material-symbols-outlined" style="font-size:18px;">edit</span>
                                        </button>
                                        <button class="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-red-50 hover:text-red-500 text-slate-300" onclick="window.deleteCustomer(${c.id})">
                                            <span class="material-symbols-outlined" style="font-size:18px;">delete</span>
                                        </button>
                                    </div>
                                </div>
                                <h3 class="text-base font-black truncate" style="color:var(--text-main);">${c.name}</h3>
                                <p class="text-[10px] font-bold uppercase tracking-wider mt-1" style="color:var(--text-faint);">${c.document || 'Sem Documento'}</p>
                                
                                <div class="mt-5 space-y-2.5">
                                    <div class="flex items-center gap-2.5 text-xs font-semibold" style="color:var(--text-muted);">
                                        <span class="material-symbols-outlined" style="font-size:18px; color:var(--text-faint);">mail</span>
                                        <span class="truncate">${c.email}</span>
                                    </div>
                                    <div class="flex items-center gap-2.5 text-xs font-semibold" style="color:var(--text-muted);">
                                        <span class="material-symbols-outlined" style="font-size:18px; color:var(--text-faint);">call</span>
                                        <span>${c.phone}</span>
                                    </div>
                                </div>
                                
                                <div class="mt-6 pt-4 border-t flex justify-between items-center" style="border-color:var(--border);">
                                    <div>
                                        <p class="text-[10px] font-bold uppercase" style="color:var(--text-faint);">Última Compra</p>
                                        <p class="text-xs font-bold" style="color:var(--text-sub);">Há 2 dias</p>
                                    </div>
                                    <button class="w-8 h-8 flex items-center justify-center rounded-xl bg-slate-50 text-slate-400 hover:text-primary hover:bg-primary-light transition-all">
                                        <span class="material-symbols-outlined">arrow_forward</span>
                                    </button>
                                </div>
                            </div>
                        `).join('')
                    }
                </div>
            </div>

            <!-- CUSTOMER MODAL -->
            <div id="customer-modal" class="hidden fixed inset-0 z-[100] flex items-center justify-center p-4" style="background:rgba(10,10,20,0.5); backdrop-filter:blur(8px);">
                <div class="confirm-card" style="max-width: 440px; text-align: left; padding: 0; overflow: hidden;">
                    <div class="px-6 py-4 border-b flex justify-between items-center" style="border-color:var(--border);">
                        <h3 class="text-lg font-black" style="color:var(--text-main);">Novo Cliente</h3>
                        <button id="close-customer-modal" class="w-8 h-8 flex items-center justify-center rounded-full text-slate-400 hover:bg-slate-100">
                            <span class="material-symbols-outlined">close</span>
                        </button>
                    </div>
                    <form id="form-customer" class="p-6 space-y-4">
                        <div>
                            <label>Nome Completo / Razão Social</label>
                            <input type="text" id="c-name" placeholder="Ex: João da Silva" required>
                        </div>
                        <div>
                            <label>Documento (CPF/CNPJ)</label>
                            <input type="text" id="c-doc" placeholder="000.000.000-00">
                        </div>
                        <div class="grid grid-cols-2 gap-4">
                            <div>
                                <label>E-mail</label>
                                <input type="email" id="c-email" placeholder="cliente@email.com" required>
                            </div>
                            <div>
                                <label>WhatsApp</label>
                                <input type="text" id="c-phone" placeholder="(00) 00000-0000" required>
                            </div>
                        </div>
                        <div class="flex justify-end gap-3 pt-4">
                            <button type="button" id="btn-cancel-customer" class="btn-ghost">Cancelar</button>
                            <button type="submit" class="btn-primary">Salvar Cliente</button>
                        </div>
                    </form>
                </div>
            </div>
        `;

        Customers.initEvents(container);
    },

    kpi: (label, value, icon, color, bg) => `
        <div class="kpi-card">
            <div class="flex justify-between items-start gap-3">
                <div class="w-11 h-11 rounded-[14px] flex items-center justify-center" style="background:${bg}; color:${color};">
                    <span class="material-symbols-outlined" style="font-size:22px;">${icon}</span>
                </div>
                <div class="flex flex-col items-end flex-1 min-w-0">
                    <span class="label-caps text-right">${label}</span>
                    <span class="text-2xl font-black mt-1" style="color:var(--text-main);">${value}</span>
                </div>
            </div>
        </div>
    `,

    initEvents: (container) => {
        const modal = document.getElementById('customer-modal');
        const btnAdd = document.getElementById('btn-add-customer');
        const btnAddEmpty = document.getElementById('btn-add-customer-empty');
        const btnClose = document.getElementById('close-customer-modal');
        const btnCancel = document.getElementById('btn-cancel-customer');
        const form = document.getElementById('form-customer');
        
        let editingId = null;

        const openModal = (id = null) => {
            editingId = id;
            form.reset();
            if (id) {
                const customers = DB.get('customers') || [];
                const c = customers.find(item => item.id === id);
                if (c) {
                    document.getElementById('c-name').value = c.name;
                    document.getElementById('c-doc').value = c.document || '';
                    document.getElementById('c-email').value = c.email;
                    document.getElementById('c-phone').value = c.phone;
                }
            }
            modal.classList.remove('hidden');
        };

        const closeModal = () => modal.classList.add('hidden');

        if (btnAdd) btnAdd.onclick = () => openModal();
        if (btnAddEmpty) btnAddEmpty.onclick = () => openModal();
        if (btnClose) btnClose.onclick = closeModal;
        if (btnCancel) btnCancel.onclick = closeModal;

        window.editCustomer = (id) => openModal(id);
        
        window.deleteCustomer = (id) => {
            import('../app.js').then(m => {
                m.default.confirm({
                    title: 'Excluir Cliente?',
                    message: 'Isso removerá o cliente da base, mas não afetará orçamentos antigos.',
                    type: 'danger',
                    onConfirm: () => {
                        const current = DB.get('customers') || [];
                        DB.save('customers', current.filter(c => c.id !== id));
                        m.default.toast('Cliente removido');
                        Customers.render(container);
                    }
                });
            });
        };

        form.onsubmit = (e) => {
            e.preventDefault();
            const customers = DB.get('customers') || [];
            const data = {
                id: editingId || Date.now(),
                name: document.getElementById('c-name').value,
                document: document.getElementById('c-doc').value,
                email: document.getElementById('c-email').value,
                phone: document.getElementById('c-phone').value
            };

            if (editingId) {
                const idx = customers.findIndex(c => c.id === editingId);
                customers[idx] = data;
            } else {
                customers.unshift(data);
            }

            DB.save('customers', customers);
            import('../app.js').then(m => m.default.toast('Cliente salvo!'));
            closeModal();
            Customers.render(container);
        };
    }
};

export default Customers;
