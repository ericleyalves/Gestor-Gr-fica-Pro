import DB from '../db.js';
import { esc, bindCepLookup } from '../utils.js';

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
                <div id="customers-grid" class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                    ${customers.length === 0 
                        ? `<div class="col-span-full data-table">
                               <div class="empty-state">
                                   <div class="empty-state-icon"><span class="material-symbols-outlined">person_search</span></div>
                                   <h3>Nenhum cliente cadastrado</h3>
                                   <p>Sua base está vazia. Adicione um cliente para começar a gerar pedidos.</p>
                                   <button class="btn-primary" id="btn-add-customer-empty">Cadastrar primeiro cliente</button>
                               </div>
                           </div>`
                        : customers.map(c => Customers.renderCard(c)).join('')
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
                            <input type="text" id="c-name" placeholder="Ex: João da Silva">
                        </div>
                        <div class="grid grid-cols-2 gap-4">
                            <div>
                                <label>Documento (CPF/CNPJ)</label>
                                <input type="text" id="c-doc" placeholder="000.000.000-00">
                            </div>
                            <div>
                                <label>Data de Nascimento</label>
                                <input type="date" id="c-birth">
                            </div>
                        </div>
                        <div class="grid grid-cols-2 gap-4">
                            <div>
                                <label>E-mail</label>
                                <input type="email" id="c-email" placeholder="cliente@email.com">
                            </div>
                            <div>
                                <label>WhatsApp</label>
                                <input type="text" id="c-phone" placeholder="(00) 00000-0000">
                            </div>
                        </div>
                        <div class="grid gap-4" style="grid-template-columns: 140px 1fr;">
                            <div>
                                <label>CEP</label>
                                <input type="text" id="c-cep" placeholder="00000-000" inputmode="numeric" maxlength="9">
                            </div>
                            <div>
                                <label>Endereço</label>
                                <input type="text" id="c-address" placeholder="Rua, nº - Bairro, Cidade/UF">
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

    renderCard: (c) => `
        <div class="section-card group hover:shadow-3 transition-all duration-300 cursor-pointer" onclick="window.openCustomerHistory('${c.id}')" title="Ver histórico do cliente">
            <div class="flex justify-between items-start mb-5">
                <div class="w-12 h-12 rounded-[16px] flex items-center justify-center font-black text-lg" style="background:var(--primary-light); color:var(--primary);">
                    ${esc(c.name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase())}
                </div>
                <div class="flex gap-1 opacity-0 group-hover:opacity-100 transition-all">
                    <button class="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-slate-100 text-slate-400" onclick="event.stopPropagation(); window.editCustomer('${c.id}')">
                        <span class="material-symbols-outlined" style="font-size:18px;">edit</span>
                    </button>
                    <button class="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-red-50 hover:text-red-500 text-slate-300" onclick="event.stopPropagation(); window.deleteCustomer('${c.id}')">
                        <span class="material-symbols-outlined" style="font-size:18px;">delete</span>
                    </button>
                </div>
            </div>
            <h3 class="text-base font-black truncate" style="color:var(--text-main);">${esc(c.name)}</h3>
            <p class="text-[10px] font-bold uppercase tracking-wider mt-1" style="color:var(--text-faint);">${esc(c.document || 'Sem Documento')}</p>
            
            <div class="mt-5 space-y-2.5">
                <div class="flex items-center gap-2.5 text-xs font-semibold" style="color:var(--text-muted);">
                    <span class="material-symbols-outlined" style="font-size:18px; color:var(--text-faint);">mail</span>
                    <span class="truncate">${esc(c.email || 'Sem e-mail')}</span>
                </div>
                <div class="flex items-center gap-2.5 text-xs font-semibold" style="color:var(--text-muted);">
                    <span class="material-symbols-outlined" style="font-size:18px; color:var(--text-faint);">call</span>
                    <span>${esc(c.phone || 'Sem telefone')}</span>
                </div>
                ${c.address ? `
                <div class="flex items-start gap-2.5 text-xs font-semibold" style="color:var(--text-muted);">
                    <span class="material-symbols-outlined" style="font-size:18px; color:var(--text-faint);">location_on</span>
                    <span class="line-clamp-2">${esc(c.address)}</span>
                </div>` : ''}
            </div>
            
            <div class="mt-6 pt-4 border-t flex justify-between items-center" style="border-color:var(--border);">
                <div>
                    <p class="text-[10px] font-bold uppercase" style="color:var(--text-faint);">Última Compra</p>
                    <p class="text-xs font-bold" style="color:var(--text-sub);">${(() => {
                        // Pedido mais recente (não cancelado) deste cliente
                        const last = (DB.get('orders') || [])
                            .filter(o => o.status !== 'Cancelado' && (String(o.customerId) === String(c.id) || (!o.customerId && o.customerName === c.name)))
                            .map(o => String(o.date || '')).filter(Boolean).sort().pop();
                        if (!last) return 'Nenhuma ainda';
                        const days = Math.round((new Date().setHours(12, 0, 0, 0) - new Date(`${last}T12:00:00`)) / 86400000);
                        return days <= 0 ? 'Hoje' : days === 1 ? 'Ontem' : `Há ${days} dias`;
                    })()}</p>
                </div>
                <button class="w-8 h-8 flex items-center justify-center rounded-xl bg-slate-50 text-slate-400 hover:text-primary hover:bg-primary-light transition-all">
                    <span class="material-symbols-outlined">arrow_forward</span>
                </button>
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
        bindCepLookup(document.getElementById('c-cep'), document.getElementById('c-address'));
        const searchInput = document.getElementById('customer-search');
        
        let editingId = null;

        if (searchInput) {
            searchInput.addEventListener('input', (e) => {
                const term = e.target.value.toLowerCase();
                const grid = document.getElementById('customers-grid');
                if (grid) {
                    const customers = DB.get('customers') || [];
                    const filtered = customers.filter(c => 
                        c.name.toLowerCase().includes(term) || 
                        (c.document && c.document.toLowerCase().includes(term)) ||
                        (c.email && c.email.toLowerCase().includes(term)) ||
                        (c.phone && c.phone.toLowerCase().includes(term))
                    );
                    
                    if (filtered.length === 0) {
                        grid.innerHTML = `<div class="col-span-full py-8 text-center text-outline italic">Nenhum cliente encontrado.</div>`;
                    } else {
                        grid.innerHTML = filtered.map(c => Customers.renderCard(c)).join('');
                    }
                }
            });
        }

        const openModal = (id = null) => {
            editingId = id;
            form.reset();
            if (id) {
                const customers = DB.get('customers') || [];
                const c = customers.find(item => item.id === id);
                if (c) {
                    document.getElementById('c-name').value = c.name;
                    document.getElementById('c-doc').value = c.document || '';
                    document.getElementById('c-birth').value = c.birth || '';
                    document.getElementById('c-email').value = c.email || '';
                    document.getElementById('c-phone').value = c.phone || '';
                    document.getElementById('c-cep').value = c.cep || '';
                    document.getElementById('c-address').value = c.address || '';
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
        window.openCustomerHistory = (id) => import('../customer-history.js').then(m => m.default.open(id));
        
        window.deleteCustomer = (id) => {
            import('../app.js').then(m => {
                const quotes = DB.get('quotes') || [];
                const orders = DB.get('orders') || [];
                const customers = DB.get('customers') || [];
                const cust = customers.find(c => String(c.id) === String(id));
                
                // Pedidos e orçamentos guardam uma cópia do nome/telefone: excluir não apaga o histórico
                const same = (x) => String(x.customerId) === String(id);
                const nOrders = orders.filter(same).length;
                const nQuotes = quotes.filter(same).length;
                const used = nOrders + nQuotes;

                m.default.confirm({
                    title: `Excluir ${cust?.name ? `"${cust.name}"` : 'cliente'}?`,
                    message: used
                        ? `Este cliente aparece em ${nOrders} pedido(s) e ${nQuotes} orçamento(s). Eles continuam no histórico com o nome dele; só o cadastro será removido.`
                        : 'O cadastro será removido definitivamente da base.',
                    type: 'danger',
                    confirmLabel: 'Excluir Cliente',
                    onConfirm: () => {
                        // Garante que o histórico tenha o nome/telefone antes de apagar o cadastro
                        if (cust && used) {
                            const fill = (list) => list.map(x => same(x)
                                ? { ...x, customerName: x.customerName || cust.name, phone: x.phone || cust.phone || '' } : x);
                            DB.save('orders', fill(orders));
                            DB.save('quotes', fill(quotes));
                        }
                        DB.save('customers', customers.filter(c => String(c.id) !== String(id)));
                        m.default.toast('Cliente excluído');
                        Customers.render(container);
                    }
                });
            });
        };

        form.onsubmit = (e) => {
            e.preventDefault();
            const customers = DB.get('customers') || [];
            const data = {
                id: editingId || crypto.randomUUID(),
                name: document.getElementById('c-name').value || 'Cliente sem nome',
                document: document.getElementById('c-doc').value,
                birth: document.getElementById('c-birth').value,
                email: document.getElementById('c-email').value,
                phone: document.getElementById('c-phone').value,
                cep: document.getElementById('c-cep').value,
                address: document.getElementById('c-address').value.trim()
            };

            if (editingId) {
                const idx = customers.findIndex(c => c.id === editingId);
                if (idx !== -1) customers[idx] = { ...customers[idx], ...data };
                else customers.unshift(data);
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
