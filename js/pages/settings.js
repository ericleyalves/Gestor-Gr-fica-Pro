import DB from '../db.js';
import { esc } from '../utils.js';
import Files from '../files.js';

const Settings = {
    currentTab: 'profile',

    render: (container) => {
        const DEFAULT_PROFILE = {
            name: '', cnpj: '', phone: '', email: '', instagram: '', address: '',
            terms: 'Validade da proposta: 15 dias.\nInício da produção mediante aprovação final da arte e pagamento de 50% de sinal.\nVariação de cor de até 10% é considerada normal no processo gráfico.',
            paymentConditions: 'Pix, Cartão de Crédito (até 3x)',
            pixKey: '', validityDays: '15', defaultDeadline: '5',
            logo: '', brandColor: '#6C2BFF', brandColor2: ''
        };
        const profile = { ...DEFAULT_PROFILE, ...(DB.get('shop_profile') || {}) };

        const me = DB.get('user') || {};
        const isAdmin = me.role === 'admin';

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
                                    <div id="logo-drop" class="w-36 h-36 rounded-3xl border-4 border-white shadow-xl overflow-hidden bg-slate-50 flex items-center justify-center p-3 cursor-pointer" title="Clique ou arraste sua logo">
                                        ${profile.logo
                                            ? `<img id="profile-logo-preview" alt="Logo" class="w-full h-full object-contain" src="${esc(profile.logo)}">`
                                            : `<span id="profile-logo-preview" class="material-symbols-outlined text-5xl text-slate-300">add_photo_alternate</span>`}
                                    </div>
                                    <button type="button" id="btn-logo-upload" class="absolute -bottom-2 -right-2 w-10 h-10 bg-primary text-white rounded-full flex items-center justify-center shadow-lg hover:scale-110 transition-transform border-4 border-white" title="Enviar logo">
                                        <span class="material-symbols-outlined text-[20px]">upload</span>
                                    </button>
                                    <input type="file" id="logo-file" accept="image/png,image/jpeg,image/webp" class="hidden">
                                </div>
                                <div class="w-full flex justify-center gap-2 -mt-2 mb-5">
                                    ${profile.logo ? `<button type="button" id="btn-logo-remove" class="text-[11px] font-bold text-slate-400 hover:text-red-500">Remover logo</button>` : `<p class="text-[11px] text-slate-400">PNG com fundo transparente fica melhor no PDF</p>`}
                                </div>
                                <div class="w-full text-left">
                                    ${[['brandColor', 'Cor principal', profile.brandColor || '#6C2BFF'], ['brandColor2', 'Cor de destaque', profile.brandColor2 || '']].map(([key, title, val]) => `
                                    <p class="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 mt-4 first:mt-0">${title}</p>
                                    <div class="flex gap-2 flex-wrap items-center" data-swatches="${key}">
                                        ${['#6C2BFF', '#00A3E0', '#EC0C7C', '#E11D48', '#EA580C', '#059669', '#111827'].map(c => `
                                            <button type="button" data-color="${c}" class="w-8 h-8 rounded-full shadow-sm transition-all ${val.toLowerCase() === c.toLowerCase() ? 'ring-2 ring-offset-2 ring-slate-400' : ''}" style="background:${c}" title="${c}"></button>`).join('')}
                                        <label class="w-8 h-8 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-400 cursor-pointer !mb-0 relative overflow-hidden" title="Escolher outra cor">
                                            <span class="material-symbols-outlined text-[16px]">colorize</span>
                                            <input type="color" data-custom="${key}" value="${esc(val || '#EC0C7C')}" class="absolute inset-0 opacity-0 cursor-pointer">
                                        </label>
                                        <span data-label="${key}" class="text-xs font-bold text-slate-500 ml-1">${esc(val || 'igual à principal')}</span>
                                    </div>`).join('')}
                                    ${profile.logo ? `
                                    <button type="button" id="btn-detect-colors" class="mt-4 w-full btn-ghost !py-2 text-xs justify-center">
                                        <span class="material-symbols-outlined !text-sm">auto_awesome</span>
                                        Pegar cores da minha logo
                                    </button>` : ''}
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
                                        <input type="text" name="name" value="${esc(profile.name)}" placeholder="Ex: Gráfica Arteflix" class="w-full">
                                    </div>
                                    <div>
                                        <label class="text-xs font-black text-slate-400 uppercase mb-1 block">CNPJ</label>
                                        <input type="text" name="cnpj" value="${esc(profile.cnpj)}" class="w-full">
                                    </div>
                                    <div>
                                        <label class="text-xs font-black text-slate-400 uppercase mb-1 block">WhatsApp</label>
                                        <input type="text" name="phone" value="${esc(profile.phone)}" class="w-full">
                                    </div>
                                    <div>
                                        <label class="text-xs font-black text-slate-400 uppercase mb-1 block">E-mail de Contato</label>
                                        <input type="email" name="email" value="${esc(profile.email)}" class="w-full">
                                    </div>
                                    <div>
                                        <label class="text-xs font-black text-slate-400 uppercase mb-1 block">Instagram</label>
                                        <input type="text" name="instagram" value="${esc(profile.instagram)}" class="w-full">
                                    </div>
                                    <div class="col-span-1 md:col-span-2">
                                        <label class="text-xs font-black text-slate-400 uppercase mb-1 block">Endereço Completo</label>
                                        <input type="text" name="address" value="${esc(profile.address)}" class="w-full">
                                    </div>

                                    <div class="col-span-1 md:col-span-2 pt-6 mt-6 border-t border-dashed border-slate-200">
                                        <h3 class="text-lg font-black mb-6 flex items-center gap-2 text-slate-800">
                                            <span class="material-symbols-outlined text-primary">request_quote</span>
                                            Dados para Orçamento
                                        </h3>
                                        <div class="space-y-5">
                                            <div>
                                                <label class="text-xs font-black text-slate-400 uppercase mb-1 block">Termos & Condições Padrão</label>
                                                <textarea name="terms" class="w-full h-32 resize-none">${esc(profile.terms)}</textarea>
                                            </div>
                                            <div class="grid grid-cols-1 md:grid-cols-2 gap-5">
                                                <div>
                                                    <label class="text-xs font-black text-slate-400 uppercase mb-1 block">Condições de Pagamento</label>
                                                    <input type="text" name="paymentConditions" value="${esc(profile.paymentConditions)}" class="w-full">
                                                </div>
                                                <div>
                                                    <label class="text-xs font-black text-slate-400 uppercase mb-1 block">Prazo Padrão (Dias Úteis)</label>
                                                    <input type="number" name="defaultDeadline" value="${esc(profile.defaultDeadline)}" min="1" class="w-full">
                                                </div>
                                                <div>
                                                    <label class="text-xs font-black text-slate-400 uppercase mb-1 block">Chave Pix (aparece no PDF)</label>
                                                    <input type="text" name="pixKey" value="${esc(profile.pixKey)}" placeholder="CNPJ, e-mail, telefone ou aleatória" class="w-full">
                                                </div>
                                                <div>
                                                    <label class="text-xs font-black text-slate-400 uppercase mb-1 block">Validade do Orçamento (dias)</label>
                                                    <input type="number" name="validityDays" value="${esc(profile.validityDays)}" min="1" class="w-full">
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
                            <div id="team-list" class="space-y-3 mt-6">
                                <p class="text-sm text-slate-400 italic">Carregando equipe...</p>
                            </div>
                        </div>

                        <div class="flex flex-col gap-8">
                            ${isAdmin ? `
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
                                        <label class="text-xs font-black text-slate-400 uppercase mb-1 block">Senha inicial (mín. 8)</label>
                                        <input type="password" id="u-pass" minlength="8" autocomplete="new-password" placeholder="Deixe vazio se a conta já existe">
                                    </div>
                                    <div>
                                        <label class="text-xs font-black text-slate-400 uppercase mb-1 block">Acesso</label>
                                        <select id="u-role">
                                            <option value="user">Vendedor</option>
                                            <option value="admin">Admin</option>
                                        </select>
                                    </div>
                                    <button type="submit" class="btn-primary w-full py-3 mt-4">Liberar Acesso</button>
                                    <p class="text-[11px] text-slate-400">O membro recebe um e-mail para confirmar a conta antes do primeiro login.</p>
                                </form>
                            </div>` : ''}

                            <div class="section-card">
                                <div class="section-header">
                                    <div class="section-icon"><span class="material-symbols-outlined">key</span></div>
                                    <h4 class="section-title">Alterar Minha Senha</h4>
                                </div>
                                <form id="form-change-pass" class="space-y-4 mt-6">
                                    <div>
                                        <label class="text-xs font-black text-slate-400 uppercase mb-1 block">Nova senha (mín. 8)</label>
                                        <input type="password" id="new-pass" minlength="8" required autocomplete="new-password">
                                    </div>
                                    <div>
                                        <label class="text-xs font-black text-slate-400 uppercase mb-1 block">Repita a nova senha</label>
                                        <input type="password" id="new-pass2" minlength="8" required autocomplete="new-password">
                                    </div>
                                    <button type="submit" class="btn-primary w-full py-3">Salvar Nova Senha</button>
                                </form>
                            </div>
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

        // ---- Identidade visual (logo + cor) — salvam na hora, sem precisar do botão Salvar ----
        const toastMsg = (msg, type) => import('../app.js').then(m => m.default.toast(msg, type));
        const saveProfilePatch = (patch) => DB.save('shop_profile', { ...(DB.get('shop_profile') || {}), ...patch });

        const logoFile = document.getElementById('logo-file');
        const uploadLogo = async (file) => {
            if (!file) return;
            const preview = document.getElementById('logo-drop');
            const old = (DB.get('shop_profile') || {}).logo;
            preview.innerHTML = `<span class="material-symbols-outlined animate-spin text-4xl text-primary">progress_activity</span>`;
            try {
                // Lado maior 800px: nítido no PDF e leve. PNG/WEBP mantêm a transparência.
                const blob = await Files.resizeImage(file, 800);
                const url = await DB.uploadImage('brand', blob);
                saveProfilePatch({ logo: url });
                if (old && old !== url) DB.removeImage(old);
                // Se a cor ainda é a padrão do sistema, já aplica a paleta da logo
                const cur = DB.get('shop_profile') || {};
                const isDefault = !cur.brandColor || cur.brandColor.toLowerCase() === '#6c2bff';
                let applied = '';
                if (isDefault) {
                    try {
                        const [c1, c2] = await Files.dominantColors(url);
                        if (c1) { saveProfilePatch({ brandColor: c1, brandColor2: c2 || c1 }); applied = ' Cores da marca aplicadas.'; }
                    } catch (e) { console.warn('Não foi possível ler as cores da logo:', e); }
                }
                toastMsg('Logo atualizada!' + applied);
            } catch (e) {
                console.error(e);
                toastMsg('Falha ao enviar a logo: ' + (e.message || 'erro na nuvem'), 'error');
            }
            Settings.render(container);
        };
        const drop = document.getElementById('logo-drop');
        document.getElementById('btn-logo-upload')?.addEventListener('click', () => logoFile.click());
        drop?.addEventListener('click', () => logoFile.click());
        drop?.addEventListener('dragover', (e) => e.preventDefault());
        drop?.addEventListener('drop', (e) => { e.preventDefault(); uploadLogo(e.dataTransfer.files[0]); });
        logoFile?.addEventListener('change', () => { uploadLogo(logoFile.files[0]); logoFile.value = ''; });
        document.getElementById('btn-logo-remove')?.addEventListener('click', () => {
            const old = (DB.get('shop_profile') || {}).logo;
            saveProfilePatch({ logo: '' });
            if (old) DB.removeImage(old);
            Settings.render(container);
        });

        /** key: 'brandColor' (principal) | 'brandColor2' (destaque) */
        const setBrandColor = (key, c, silent) => {
            saveProfilePatch({ [key]: c });
            document.querySelectorAll(`[data-swatches="${key}"] [data-color]`).forEach(b => {
                const on = b.dataset.color.toLowerCase() === c.toLowerCase();
                ['ring-2', 'ring-offset-2', 'ring-slate-400'].forEach(k => b.classList.toggle(k, on));
            });
            const lbl = document.querySelector(`[data-label="${key}"]`);
            if (lbl) lbl.textContent = c;
            if (!silent) toastMsg('Cor salva');
        };
        document.querySelectorAll('[data-swatches]').forEach(group => {
            const key = group.dataset.swatches;
            group.querySelectorAll('[data-color]').forEach(b => b.addEventListener('click', () => setBrandColor(key, b.dataset.color)));
            group.querySelector('[data-custom]')?.addEventListener('change', (e) => setBrandColor(key, e.target.value));
        });

        document.getElementById('btn-detect-colors')?.addEventListener('click', async () => {
            try {
                const [c1, c2] = await Files.dominantColors((DB.get('shop_profile') || {}).logo);
                if (!c1) return toastMsg('Não encontrei cores marcantes na logo.', 'error');
                setBrandColor('brandColor', c1, true);
                setBrandColor('brandColor2', c2 || c1, true);
                toastMsg(`Cores aplicadas: ${c1}${c2 ? ' + ' + c2 : ''}`);
            } catch (e) {
                console.error(e);
                toastMsg('Não foi possível ler as cores da logo.', 'error');
            }
        });

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

        if (Settings.currentTab === 'users') Settings.loadTeam(container);

        const toast = (msg, type) => import('../app.js').then(m => m.default.toast(msg, type));

        // Liberar novo membro (somente admin; o banco também bloqueia via RLS)
        const formUser = document.getElementById('form-new-user');
        if (formUser) {
            formUser.onsubmit = async (e) => {
                e.preventDefault();
                const btn = formUser.querySelector('button[type="submit"]');
                btn.disabled = true;
                const { error, partial } = await DB.addMember({
                    name: document.getElementById('u-name').value.trim(),
                    email: document.getElementById('u-email').value,
                    password: document.getElementById('u-pass').value,
                    role: document.getElementById('u-role').value
                });
                btn.disabled = false;
                if (error) {
                    toast(partial ? `Acesso liberado, mas a conta não foi criada: ${error.message}` : 'Não foi possível liberar o acesso (apenas admins podem).', 'error');
                } else {
                    toast('Acesso liberado! Peça para o membro confirmar o e-mail.');
                    formUser.reset();
                }
                Settings.loadTeam(container);
            };
        }

        // Trocar a própria senha
        const formPass = document.getElementById('form-change-pass');
        if (formPass) {
            formPass.onsubmit = async (e) => {
                e.preventDefault();
                const p1 = document.getElementById('new-pass').value;
                const p2 = document.getElementById('new-pass2').value;
                if (p1 !== p2) return toast('As senhas não conferem.', 'error');
                const { error } = await DB.changePassword(p1);
                if (error) return toast(`Erro ao alterar senha: ${error.message}`, 'error');
                formPass.reset();
                toast('Senha alterada com sucesso!');
            };
        }

        // Remover membro
        window.deleteUser = (email) => {
            import('../app.js').then(m => {
                m.default.confirm({
                    title: 'Remover Membro?',
                    message: 'Este usuário não poderá mais acessar o painel.',
                    type: 'danger',
                    onConfirm: async () => {
                        const { error } = await DB.removeMember(email);
                        m.default.toast(error ? 'Não foi possível remover.' : 'Membro removido.', error ? 'error' : 'success');
                        Settings.loadTeam(container);
                    }
                });
            });
        };
    },

    loadTeam: async (container) => {
        const list = container.querySelector('#team-list');
        if (!list) return;
        const me = DB.get('user') || {};
        if (!DB.ready()) { list.innerHTML = '<p class="text-sm text-red-500">Sem conexão com o servidor.</p>'; return; }
        const { data, error } = await DB.listTeam();
        if (error) { list.innerHTML = '<p class="text-sm text-red-500">Não foi possível carregar a equipe.</p>'; return; }
        list.innerHTML = data.map(u => `
            <div class="flex items-center justify-between p-4 rounded-2xl border border-slate-100 bg-slate-50/50">
                <div class="flex items-center gap-4">
                    <div class="w-12 h-12 rounded-full flex items-center justify-center text-white font-black text-sm" style="background:linear-gradient(135deg,var(--primary),#4B1FD1);">
                        ${esc((u.name || u.email).substring(0, 2).toUpperCase())}
                    </div>
                    <div>
                        <p class="text-sm font-black text-slate-800">${esc(u.name || '—')}</p>
                        <p class="text-xs font-bold text-slate-400">${esc(u.email)}</p>
                    </div>
                </div>
                <div class="flex items-center gap-4">
                    <span class="badge ${u.role === 'admin' ? 'badge-purple' : 'badge-green'}">${u.role === 'admin' ? 'Admin' : 'Vendedor'}</span>
                    ${me.role === 'admin' && u.email !== me.email ? `<button data-email="${esc(u.email)}" class="btn-del-member text-slate-300 hover:text-red-500 transition-colors"><span class="material-symbols-outlined">delete</span></button>` : ''}
                </div>
            </div>
        `).join('') || '<p class="text-sm text-slate-400 italic">Nenhum membro.</p>';
        list.querySelectorAll('.btn-del-member').forEach(b => b.onclick = () => window.deleteUser(b.dataset.email));
    }
};

export default Settings;
