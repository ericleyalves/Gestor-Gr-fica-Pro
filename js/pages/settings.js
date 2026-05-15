import DB from '../db.js';

const Settings = {
    render: (container) => {
        let users = DB.get('app_users') || [];
        // Se vazio, forçamos os padrões pra a interface não quebrar se for aberto antes do login (impossível, mas por precaução)
        if (users.length === 0) {
            users = [
                { id: '1', email: 'admin@graficapro.com.br', pass: '123456', name: 'Administrador', role: 'admin' },
                { id: '2', email: 'natan.lf@gmail.com', pass: '123', name: 'Natan', role: 'user' }
            ];
            DB.save('app_users', users);
        }

        container.innerHTML = `
            <div class="max-w-[1000px] mx-auto flex flex-col gap-6 page-enter">
                <div>
                    <h2 class="page-title">Configurações & Acessos</h2>
                    <p class="text-sm mt-1" style="color:var(--text-muted);">Gerencie as preferências da sua gráfica e os usuários autorizados a acessar o painel.</p>
                </div>

                <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    
                    <!-- MENU ESQUERDO -->
                    <div class="flex flex-col gap-2">
                        <button class="settings-tab active" data-tab="users">
                            <span class="material-symbols-outlined">group_add</span>
                            Usuários e Acessos
                        </button>
                        <button class="settings-tab" data-tab="general" style="opacity:0.5; cursor:not-allowed;">
                            <span class="material-symbols-outlined">storefront</span>
                            Perfil da Gráfica (Em Breve)
                        </button>
                        <button class="settings-tab" data-tab="billing" style="opacity:0.5; cursor:not-allowed;">
                            <span class="material-symbols-outlined">credit_card</span>
                            Assinatura (Em Breve)
                        </button>
                    </div>

                    <!-- CONTEÚDO DIREITO -->
                    <div class="lg:col-span-2 space-y-6">
                        
                        <!-- Lista de Usuários -->
                        <div class="section-card">
                            <div class="section-header">
                                <div class="section-icon"><span class="material-symbols-outlined">manage_accounts</span></div>
                                <div>
                                    <h4 class="section-title">Equipe Cadastrada</h4>
                                    <p class="text-xs mt-0.5" style="color:var(--text-faint);">Pessoas que têm acesso ao sistema no momento.</p>
                                </div>
                            </div>
                            
                            <div class="flex flex-col gap-3 mt-4" id="users-list">
                                ${users.map(u => `
                                    <div class="flex items-center justify-between p-3 rounded-[12px] border" style="border-color:var(--border); background:var(--surface-raised);">
                                        <div class="flex items-center gap-3">
                                            <div class="w-10 h-10 rounded-full flex items-center justify-center text-white font-black text-sm" style="background:linear-gradient(135deg,var(--primary),#4B1FD1);">
                                                ${u.name.substring(0,2).toUpperCase()}
                                            </div>
                                            <div>
                                                <p class="text-sm font-bold" style="color:var(--text-main);">${u.name}</p>
                                                <p class="text-xs font-semibold" style="color:var(--text-faint);">${u.email}</p>
                                            </div>
                                        </div>
                                        <div class="flex items-center gap-4">
                                            <span class="badge ${u.role === 'admin' ? 'badge-purple' : 'badge-green'}">${u.role === 'admin' ? 'Admin' : 'Vendedor'}</span>
                                            ${u.id !== '1' ? `
                                                <button class="w-8 h-8 flex items-center justify-center rounded-[10px] transition-all" style="color:var(--text-faint);" onmouseover="this.style.background='#FEF2F2';this.style.color='#EF4444'" onmouseout="this.style.background='transparent';this.style.color='var(--text-faint)'" onclick="window.deleteUser('${u.id}')">
                                                    <span class="material-symbols-outlined" style="font-size:18px;">delete</span>
                                                </button>
                                            ` : `<div class="w-8"></div>`}
                                        </div>
                                    </div>
                                `).join('')}
                            </div>
                        </div>

                        <!-- Novo Usuário -->
                        <div class="section-card" style="background: #FAFBFF;">
                            <div class="section-header">
                                <div class="section-icon"><span class="material-symbols-outlined">person_add</span></div>
                                <h4 class="section-title">Convidar Novo Usuário</h4>
                            </div>
                            
                            <form id="form-new-user" class="mt-4 space-y-4">
                                <div>
                                    <label>Nome Completo</label>
                                    <input type="text" id="u-name" required placeholder="Ex: João da Silva">
                                </div>
                                <div class="grid grid-cols-2 gap-4">
                                    <div>
                                        <label>E-mail de Acesso</label>
                                        <input type="email" id="u-email" required placeholder="vendedor@grafica.com">
                                    </div>
                                    <div>
                                        <label>Senha Provisória</label>
                                        <input type="text" id="u-pass" required placeholder="Mínimo 6 caracteres">
                                    </div>
                                </div>
                                <div>
                                    <label>Nível de Acesso</label>
                                    <select id="u-role">
                                        <option value="user">Vendedor (Padrão)</option>
                                        <option value="admin">Administrador (Acesso Total)</option>
                                    </select>
                                </div>
                                
                                <div class="pt-2">
                                    <button type="submit" class="btn-primary w-full">
                                        <span class="material-symbols-outlined" style="font-size:18px;">send</span>
                                        Criar Usuário
                                    </button>
                                </div>
                            </form>
                        </div>

                    </div>
                </div>
            </div>
            
            <style>
                .settings-tab {
                    display: flex;
                    align-items: center;
                    gap: 12px;
                    width: 100%;
                    padding: 12px 16px;
                    border-radius: var(--radius-md);
                    font-size: 14px;
                    font-weight: 700;
                    color: var(--text-muted);
                    background: transparent;
                    border: none;
                    text-align: left;
                    transition: var(--transition);
                }
                .settings-tab.active {
                    background: var(--primary-light);
                    color: var(--primary);
                }
            </style>
        `;

        Settings.initEvents(container);
    },

    initEvents: (container) => {
        const form = document.getElementById('form-new-user');
        
        window.deleteUser = (id) => {
            import('../app.js').then(m => {
                m.default.confirm({
                    title: 'Remover Usuário?',
                    message: 'Tem certeza que deseja bloquear o acesso deste usuário ao sistema?',
                    type: 'danger',
                    onConfirm: () => {
                        let users = DB.get('app_users') || [];
                        users = users.filter(u => u.id !== id);
                        DB.save('app_users', users);
                        m.default.toast('Acesso revogado com sucesso!');
                        Settings.render(container);
                    }
                });
            });
        };

        if(form) {
            form.onsubmit = (e) => {
                e.preventDefault();
                const users = DB.get('app_users') || [];
                const email = document.getElementById('u-email').value.trim();
                
                if (users.find(u => u.email === email)) {
                    import('../app.js').then(m => m.default.toast('Este e-mail já está cadastrado!', 'warning'));
                    return;
                }

                const newUser = {
                    id: crypto.randomUUID(),
                    name: document.getElementById('u-name').value.trim(),
                    email: email,
                    pass: document.getElementById('u-pass').value.trim(),
                    role: document.getElementById('u-role').value
                };

                users.push(newUser);
                DB.save('app_users', users);
                
                import('../app.js').then(m => m.default.toast('Usuário criado com sucesso!'));
                Settings.render(container);
            };
        }
    }
};

export default Settings;
