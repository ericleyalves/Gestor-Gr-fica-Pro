import DB from '../db.js';

const Customers = {
    render: (container) => {
        const customers = DB.get('customers') || [];
        
        container.innerHTML = `
            <div class="max-w-[1600px] mx-auto flex flex-col gap-8 pb-12 animate-in fade-in duration-500">
                <div class="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                    <div>
                        <h2 class="text-3xl font-black text-slate-800">Base de Clientes</h2>
                        <p class="text-slate-500 font-medium">Gerencie as informações de contato e histórico dos seus clientes.</p>
                    </div>
                    <button id="btn-add-customer" class="btn-primary flex items-center gap-2">
                        <span class="material-symbols-outlined text-[20px]">add</span>
                        Novo Cliente
                    </button>
                </div>

                <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    ${customers.map(c => `
                        <div class="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition-all group">
                            <div class="flex justify-between items-start mb-6">
                                <div class="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center text-primary font-black text-lg">
                                    ${c.name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase()}
                                </div>
                                <div class="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <button class="p-2 hover:bg-slate-100 rounded-lg transition-colors"><span class="material-symbols-outlined text-sm">edit</span></button>
                                    <button class="p-2 hover:bg-red-50 hover:text-red-500 rounded-lg transition-colors" onclick="window.deleteCustomer(${c.id})"><span class="material-symbols-outlined text-sm">delete</span></button>
                                </div>
                            </div>
                            <h3 class="text-lg font-black text-slate-800 leading-tight">${c.name}</h3>
                            <p class="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">${c.document || 'CPF/CNPJ não informado'}</p>
                            
                            <div class="mt-6 space-y-3">
                                <div class="flex items-center gap-3 text-sm text-slate-600 font-medium">
                                    <span class="material-symbols-outlined text-slate-400 text-[18px]">mail</span>
                                    <span>${c.email}</span>
                                </div>
                                <div class="flex items-center gap-3 text-sm text-slate-600 font-medium">
                                    <span class="material-symbols-outlined text-slate-400 text-[18px]">call</span>
                                    <span>${c.phone}</span>
                                </div>
                            </div>
                            
                            <div class="mt-8 pt-4 border-t border-slate-50 flex justify-between items-center">
                                <div class="flex flex-col">
                                    <span class="text-[10px] font-bold text-slate-400 uppercase">Último Pedido</span>
                                    <span class="text-xs font-bold text-slate-600">Adesivo Vinil...</span>
                                </div>
                                <button class="p-2 bg-slate-50 text-slate-400 hover:text-primary hover:bg-primary/5 rounded-xl transition-all">
                                    <span class="material-symbols-outlined">arrow_forward</span>
                                </button>
                            </div>
                        </div>
                    `).join('')}
                </div>
            </div>

            <!-- Add Customer Modal -->
            <div id="customer-modal" class="hidden fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
                <div class="bg-white w-full max-w-md rounded-3xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
                    <div class="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                        <h3 class="text-xl font-black text-slate-800">Novo Cliente</h3>
                        <button id="close-customer-modal-x" class="p-2 hover:bg-slate-200 rounded-xl transition-colors">
                            <span class="material-symbols-outlined">close</span>
                        </button>
                    </div>
                    <form id="form-customer" class="p-8 space-y-5">
                        <div class="space-y-2">
                            <label class="text-xs font-bold text-slate-500 uppercase">Nome Completo / Razão Social</label>
                            <input type="text" id="c-name" placeholder="Ex: João da Silva / Empresa LTDA" required>
                        </div>
                        <div class="space-y-2">
                            <label class="text-xs font-bold text-slate-500 uppercase">Documento (CPF/CNPJ)</label>
                            <input type="text" id="c-doc" placeholder="000.000.000-00">
                        </div>
                        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div class="space-y-2">
                                <label class="text-xs font-bold text-slate-500 uppercase">E-mail</label>
                                <input type="email" id="c-email" placeholder="cliente@email.com" required>
                            </div>
                            <div class="space-y-2">
                                <label class="text-xs font-bold text-slate-500 uppercase">Telefone</label>
                                <input type="text" id="c-phone" placeholder="(00) 00000-0000" required>
                            </div>
                        </div>
                        <div class="flex justify-end gap-3 pt-6">
                            <button type="button" id="close-customer-modal-btn" class="px-6 py-3 text-sm font-bold text-slate-500 hover:text-slate-700 transition-colors">Cancelar</button>
                            <button type="submit" class="btn-primary">Cadastrar Cliente</button>
                        </div>
                    </form>
                </div>
            </div>
        `;

        setTimeout(() => {
            const modal = document.getElementById('customer-modal');
            const btnAdd = document.getElementById('btn-add-customer');
            const btnCloseX = document.getElementById('close-customer-modal-x');
            const btnCloseBtn = document.getElementById('close-customer-modal-btn');

            const openModal = () => modal.classList.remove('hidden');
            const closeModal = () => modal.classList.add('hidden');

            if(btnAdd) btnAdd.onclick = openModal;
            if(btnCloseX) btnCloseX.onclick = closeModal;
            if(btnCloseBtn) btnCloseBtn.onclick = closeModal;

            document.getElementById('form-customer').addEventListener('submit', (e) => {
                e.preventDefault();
                const newCustomer = {
                    id: Date.now(),
                    name: document.getElementById('c-name').value,
                    document: document.getElementById('c-doc').value,
                    email: document.getElementById('c-email').value,
                    phone: document.getElementById('c-phone').value
                };
                const current = DB.get('customers') || [];
                current.push(newCustomer);
                DB.save('customers', current);
                closeModal();
                Customers.render(container);
            });
        }, 0);

        window.deleteCustomer = (id) => {
            if (confirm('Deseja excluir este cliente?')) {
                const current = DB.get('customers') || [];
                DB.save('customers', current.filter(c => c.id !== id));
                Customers.render(container);
            }
        };
    }
};

export default Customers;
