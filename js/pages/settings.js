import DB from '../db.js';

const Settings = {
    currentTab: 'profile',

    render: (container) => {
        const profile = DB.get('shop_profile') || {
            name: 'Gráfica Rápida Express',
            cnpj: '00.000.000/0001-00',
            phone: '(11) 99999-9999',
            email: 'contato@graficaexpress.com.br',
            instagram: '@graficaexpress',
            address: 'Av. Paulista, 1000 - Bela Vista, São Paulo - SP, 01310-100',
            terms: 'Validade da proposta: 15 dias.\nInício da produção mediante aprovação final da arte e pagamento de 50% de sinal.\nVariação de cor de até 10% é considerada normal no processo gráfico.',
            paymentConditions: 'Pix, Cartão de Crédito (até 3x), Boleto (30 dias)',
            defaultDeadline: '5',
            logo: 'https://lh3.googleusercontent.com/aida/ADBb0ui65qfAGwXdOKB_CG6WGheoe2hjv3KWmUZJi_Q_4PW8OSQy4ahhI1nIJY0UdS6ycQSU5Jrfy4izPSJEbQwQfLoZz4zbzTk8l_ph-I5kCLHwiHVPcNhUYFg30EwXr97CQTquM74CnZK5KAZ6X28BFKlhlmdswYsdYxAxf1qoFwjbvkkFI0cBo4V2-fVoEVMcycwm9KkRXRy65DQteTcFaNhJqkWIpU1_YdjcfRjygnjZxg-l9M1igyg_MmI'
        };

        const users = DB.get('app_users') || [];

        container.innerHTML = `
            <div class="max-w-6xl mx-auto flex flex-col gap-8 pb-12 animate-in fade-in duration-500">
                
                <!-- Header -->
                <div class="flex flex-col md:flex-row justify-between items-end gap-4">
                    <div>
                        <h2 class="text-3xl font-black text-slate-800">Configurações</h2>
                        <p class="text-slate-500 font-medium">Gerencie os dados da sua empresa e acessos da equipe.</p>
                    </div>
                    <div class="flex gap-2 p-1 bg-slate-100 rounded-xl">
                        <button class="px-4 py-2 rounded-lg text-xs font-black transition-all ${Settings.currentTab === 'profile' ? 'bg-white text-primary shadow-sm' : 'text-slate-500 hover:text-slate-700'}" onclick="window.setSettingsTab('profile')">PERFIL DA GRÁFICA</button>
                        <button class="px-4 py-2 rounded-lg text-xs font-black transition-all ${Settings.currentTab === 'users' ? 'bg-white text-primary shadow-sm' : 'text-slate-500 hover:text-slate-700'}" onclick="window.setSettingsTab('users')">EQUIPE E ACESSOS</button>
                    </div>
                </div>

                ${Settings.currentTab === 'profile' ? `
                    <!-- PROFILE TAB (BENTO STYLE) -->
                    <div class="grid grid-cols-1 lg:grid-cols-12 gap-6">
                        <!-- Left Column -->
                        <div class="lg:col-span-4 flex flex-col gap-6">
                            <!-- Logo Card -->
                            <div class="bg-white rounded-3xl p-8 shadow-sm border border-slate-200 flex flex-col items-center text-center relative overflow-hidden group">
                                <h3 class="text-lg font-black w-full text-left mb-6 text-slate-800">Identidade Visual</h3>
                                <div class="relative mb-6">
                                    <div class="w-32 h-32 rounded-full border-4 border-white shadow-xl overflow-hidden bg-slate-50 flex items-center justify-center">
                                        <img id="profile-logo-preview" alt="Logo" class="w-full h-full object-cover" src="${profile.logo}">
                                    </div>
                                    <button class="absolute bottom-0 right-0 w-10 h-10 bg-primary text-white rounded-full flex items-center justify-center shadow-lg hover:scale-110 transition-transform border-4 border-white">
                                        <span class="material-symbols-outlined text-[20px]">add_photo_alternate</span>
                                    </button>
                                </div>
                                <div class="w-full text-left">
                                    <p class="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">Cores da Marca</p>
                                    <div class="flex gap-3">
                                        <div class="w-10 h-10 rounded-full bg-primary shadow-sm ring-2 ring-offset-2 ring-primary"></div>
                                        <div class="w-10 h-10 rounded-full bg-indigo-400 shadow-sm"></div>
                                        <div class="w-10 h-10 rounded-full bg-slate-800 shadow-sm"></div>
                                        <div class="w-10 h-10 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-400">
                                            <span class="material-symbols-outlined text-[18px]">edit</span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                            
                            <!-- Success Card -->
                            <div class="bg-indigo-50/50 rounded-3xl p-6 border border-indigo-100/50">
                                <div class="flex items-start gap-4">
                                    <span class="material-symbols-outlined text-primary mt-1">info</span>
                                    <div>
                                        <h4 class="text-sm font-bold text-slate-800">Dica de Sucesso</h4>
                                        <p class="text-xs text-slate-600 mt-1 leading-relaxed">Sua logo e cores primárias serão utilizadas em todos os orçamentos e faturas enviadas aos clientes. Mantenha-os atualizados para transmitir profissionalismo.</p>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <!-- Right Column: Forms -->
                        <div class="lg:col-span-8 flex flex-col gap-6">
                            <!-- Company Details -->
                            <div class="bg-white rounded-3xl p-8 shadow-sm border border-slate-200">
                                <h3 class="text-lg font-black mb-6 flex items-center gap-2 text-slate-800">
                                    <span class="material-symbols-outlined text-primary">storefront</span>
                                    Dados Cadastrais
                                </h3>
                                <form id="form-shop-profile" class="grid grid-cols-1 md:grid-cols-2 gap-5">
                                    <div class="col-span-1 md:col-span-2">
                                        <label class="text-xs font-black text-slate-400 uppercase mb-1 block">Nome da Gráfica</label>
                                        <input type="text" name="name" value="${profile.name}" class="w-full">
                                    </div>
                                    <div>
                                        <label class="text-xs font-black text-slate-400 uppercase mb-1 block">CNPJ</label>
                                        <input type="text" name="cnpj" value="${profile.cnpj}" class="w-full">
                                    </div>
                                    <div>
                                        <label class="text-xs font-black text-slate-400 uppercase mb-1 block">WhatsApp</label>
                                        <input type="text" name="phone" value="${profile.phone}" class="w-full">
                                    </div>
                                    <div>
                                        <label class="text-xs font-black text-slate-400 uppercase mb-1 block">E-mail de Contato</label>
                                        <input type="email" name="email" value="${profile.email}" class="w-full">
                                    </div>
                                    <div>
                                        <label class="text-xs font-black text-slate-400 uppercase mb-1 block">Instagram</label>
                                        <input type="text" name="instagram" value="${profile.instagram}" class="w-full">
                                    </div>
                                    <div class="col-span-1 md:col-span-2">
                                        <label class="text-xs font-black text-slate-400 uppercase mb-1 block">Endereço Completo</label>
                                        <input type="text" name="address" value="${profile.address}" class="w-full">
                                    </div>

                                    <div class="col-span-1 md:col-span-2 pt-6 mt-6 border-t border-dashed border-slate-200">
                                        <h3 class="text-lg font-black mb-6 flex items-center gap-2 text-slate-800">
                                            <span class="material-symbols-outlined text-primary">request_quote</span>
                                            Dados para Orçamento
                                        </h3>
                                        <div class="space-y-5">
                                            <div>
                                                <label class="text-xs font-black text-slate-400 uppercase mb-1 block">Termos & Condições Padrão</label>
                                                <textarea name="terms" class="w-full h-32 resize-none">${profile.terms}</textarea>
                                            </div>
                                            <div class="grid grid-cols-1 md:grid-cols-2 gap-5">
                                                <div>
                                                    <label class="text-xs font-black text-slate-400 uppercase mb-1 block">Condições de Pagamento</label>
                                                    <input type="text" name="paymentConditions" value="${profile.paymentConditions}" class="w-full">
                                                </div>
                                                <div>
                                                    <label class="text-xs font-black text-slate-400 uppercase mb-1 block">Prazo Padrão (Dias Úteis)</label>
                                                    <input type="number" name="defaultDeadline" value="${profile.defaultDeadline}" class="w-full">
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    <div class="col-span-1 md:col-span-2 pt-8 flex justify-end">
                                        <button type="submit" class="btn-primary px-12 py-3 rounded-2xl shadow-lg shadow-indigo-200">
                                            Salvar Alterações
                                            <span class="material-symbols-outlined">check_circle</span>
                                        </button>
                                    </div>
                                </form>
                            </div>
                        </div>
                    </div>
                ` : `
                    <!-- USERS TAB -->
                    <div class="grid grid-cols-1 lg:grid-cols-3 gap-8">
                        <div class="lg:col-span-2 section-card">
                            <div class="section-header">
                                <div class="section-icon"><span class="material-symbols-outlined">manage_accounts</span></div>
                                <h4 class="section-title">Equipe e Acessos</h4>
                            </div>
                            <div class="space-y-3 mt-6">
                                ${users.map(u => `
                                    <div class="flex items-center justify-between p-4 rounded-2xl border border-slate-100 bg-slate-50/50">
                                        <div class="flex items-center gap-4">
                                            <div class="w-12 h-12 rounded-full flex items-center justify-center text-white font-black text-sm" style="background:linear-gradient(135deg,var(--primary),#4B1FD1);">
                                                ${u.name.substring(0,2).toUpperCase()}
                                            </div>
                                            <div>
                                                <p class="text-sm font-black text-slate-800">${u.name}</p>
                                                <p class="text-xs font-bold text-slate-400">${u.email}</p>
                                            </div>
                                        </div>
                                        <div class="flex items-center gap-4">
                                            <span class="badge ${u.role === 'admin' ? 'badge-purple' : 'badge-green'}">${u.role === 'admin' ? 'Admin' : 'Vendedor'}</span>
                                            ${u.id !== '1' ? `<button onclick="window.deleteUser('${u.id}')" class="text-slate-300 hover:text-red-500 transition-colors"><span class="material-symbols-outlined">delete</span></button>` : ''}
                                        </div>
                                    </div>
                                `).join('')}
                            </div>
                        </div>

                        <div class="section-card bg-slate-50/50">
                            <div class="section-header">
                                <div class="section-icon"><span class="material-symbols-outlined">person_add</span></div>
                                <h4 class="section-title">Convidar Membro</h4>
                            </div>
                            <form id="form-new-user" class="space-y-4 mt-6">
                                <div>
                                    <label class="text-xs font-black text-slate-400 uppercase mb-1 block">Nome Completo</label>
                                    <input type="text" id="u-name" required placeholder="Ex: João Silva">
                                </div>
                                <div>
                                    <label class="text-xs font-black text-slate-400 uppercase mb-1 block">E-mail</label>
                                    <input type="email" id="u-email" required placeholder="joao@grafica.com">
                                </div>
                                <div>
                                    <label class="text-xs font-black text-slate-400 uppercase mb-1 block">Senha</label>
                                    <input type="text" id="u-pass" required placeholder="••••••">
                                </div>
                                <div>
                                    <label class="text-xs font-black text-slate-400 uppercase mb-1 block">Acesso</label>
                                    <select id="u-role">
                                        <option value="user">Vendedor</option>
                                        <option value="admin">Admin</option>
                                    </select>
                                </div>
                                <button type="submit" class="btn-primary w-full py-3 mt-4">Criar Acesso</button>
                            </form>
                        </div>
                    </div>
                `}
            </div>
        `;

        Settings.initEvents(container);
    },

    initEvents: (container) => {
        // Tab switching
        window.setSettingsTab = (tab) => {
            Settings.currentTab = tab;
            Settings.render(container);
        };

        // Profile Form
        const formProfile = document.getElementById('form-shop-profile');
        if (formProfile) {
            formProfile.onsubmit = (e) => {
                e.preventDefault();
                const formData = new FormData(formProfile);
                const data = Object.fromEntries(formData.entries());
                
                // Keep the existing logo link for now
                const currentProfile = DB.get('shop_profile') || {};
                const updatedProfile = { ...currentProfile, ...data };
                
                DB.save('shop_profile', updatedProfile);
                import('../app.js').then(m => m.default.toast('Configurações da gráfica salvas!', 'success'));
            };
        }

        // New User Form
        const formUser = document.getElementById('form-new-user');
        if (formUser) {
            formUser.onsubmit = (e) => {
                e.preventDefault();
                const users = DB.get('app_users') || [];
                const newUser = {
                    id: Math.random().toString(36).substr(2, 9),
                    name: document.getElementById('u-name').value,
                    email: document.getElementById('u-email').value,
                    pass: document.getElementById('u-pass').value,
                    role: document.getElementById('u-role').value
                };
                users.push(newUser);
                DB.save('app_users', users);
                import('../app.js').then(m => m.default.toast('Novo membro adicionado!'));
                Settings.render(container);
            };
        }

        // Delete User
        window.deleteUser = (id) => {
            import('../app.js').then(m => {
                m.default.confirm({
                    title: 'Remover Membro?',
                    message: 'Este usuário não poderá mais acessar o painel.',
                    type: 'danger',
                    onConfirm: () => {
                        let users = DB.get('app_users') || [];
                        users = users.filter(u => u.id !== id);
                        DB.save('app_users', users);
                        Settings.render(container);
                    }
                });
            });
        };
    }
};

export default Settings;
