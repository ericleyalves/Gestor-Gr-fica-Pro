import DB from './db.js';
import { assignNumbers } from './utils.js';

const App = {
    currentPage: 'dashboard',

    init: async () => {
        App.bindEvents();
        App.bindMoneyFormat();
        await App.checkLogin();

        // Link de "Esqueceu a senha?" abre o sistema já logado: leva direto à troca de senha
        DB.client()?.auth.onAuthStateChange((event) => {
            if (event === 'PASSWORD_RECOVERY') {
                App.toast('Defina sua nova senha em Configurações > Equipe e Acessos.', 'info');
                import('./pages/settings.js').then(m => { m.default.currentTab = 'users'; App.navigateTo('configuracoes'); });
            }
        });

        // Status da sincronização (aviso só quando falhar)
        window.addEventListener('db_status', (e) => {
            if (!e.detail.ok) App.toast(`Sem conexão com a nuvem. ${e.detail.pending} alteração(ões) aguardando envio.`, 'error');
        });
    },

    /**
     * Campos de dinheiro (input number com step 0.01) sempre com 2 casas: 2,5 → 2,50.
     * Formata ao sair do campo e quando a tela/modal preenche o valor.
     */
    bindMoneyFormat: () => {
        const SEL = 'input[type="number"][step="0.01"]';
        const fmt = (el) => {
            if (el === document.activeElement || el.value === '') return;
            const v = parseFloat(el.value);
            if (!isNaN(v) && el.value !== v.toFixed(2)) el.value = v.toFixed(2);
        };
        document.addEventListener('focusout', (e) => { if (e.target.matches?.(SEL)) fmt(e.target); });
        // Valores colocados por código (abrir produto, carregar orçamento…): formata logo depois
        let pending = false;
        new MutationObserver(() => {
            if (pending) return;
            pending = true;
            requestAnimationFrame(() => { pending = false; document.querySelectorAll(SEL).forEach(fmt); });
        }).observe(document.body, { childList: true, subtree: true, attributes: true, attributeFilter: ['class'] });
    },

    /** Sincroniza em segundo plano e redesenha a tela atual se algo mudou. */
    /** Garante número sequencial (001, 002…) em pedidos e orçamentos antigos. */
    ensureNumbers: () => {
        let any = false;
        ['orders', 'quotes'].forEach(key => {
            const { list, changed } = assignNumbers(DB.get(key) || []);
            if (changed) { DB.save(key, list); any = true; }
        });
        return any;
    },

    sync: async () => {
        try {
            const changed = (await DB.syncFromCloud()) | App.ensureNumbers();
            if (changed) App.loadPage(App.currentPage);
        } catch (e) { console.error('Falha na sincronização:', e); }
    },

    bindEvents: () => {
        // Login form
        const loginForm = document.getElementById('login-form');
        if (loginForm) loginForm.addEventListener('submit', (e) => { e.preventDefault(); App.login(); });

        // Esqueceu a senha
        const forgot = document.getElementById('forgot-password');
        if (forgot) forgot.addEventListener('click', async (e) => {
            e.preventDefault();
            const email = document.getElementById('email').value.trim();
            if (!email) return App.toast('Digite seu e-mail no campo acima primeiro.', 'info');
            if (!DB.ready()) return App.toast('Sem conexão com o servidor.', 'error');
            const { error } = await DB.resetPassword(email);
            App.toast(error ? 'Não foi possível enviar o e-mail de recuperação.' : 'Enviamos um link de recuperação para seu e-mail.', error ? 'error' : 'success');
        });

        // Desktop nav links
        document.querySelectorAll('#sidebar-nav .nav-link').forEach(link => {
            link.addEventListener('click', (e) => {
                e.preventDefault();
                App.navigateTo(link.getAttribute('data-target'));
            });
        });

        // Mobile overlay links
        document.querySelectorAll('#mobile-menu .nav-link').forEach(link => {
            link.addEventListener('click', (e) => {
                e.preventDefault();
                document.getElementById('mobile-menu').classList.add('hidden');
                App.navigateTo(link.getAttribute('data-target'));
            });
        });

        // Mobile bottom nav
        document.querySelectorAll('nav .mobile-nav-link[data-target]').forEach(link => {
            link.addEventListener('click', (e) => {
                e.preventDefault();
                App.navigateTo(link.getAttribute('data-target'));
            });
        });

        // Mobile menu open
        ['btn-mobile-menu', 'btn-mobile-menu-bottom'].forEach(id => {
            const btn = document.getElementById(id);
            if (btn) btn.addEventListener('click', () => document.getElementById('mobile-menu').classList.remove('hidden'));
        });

        // Mobile menu close
        const closeMobile = document.getElementById('close-mobile-menu');
        if (closeMobile) closeMobile.addEventListener('click', () => document.getElementById('mobile-menu').classList.add('hidden'));

        // Logout (sidebar profile)
        const profileBtn = document.getElementById('user-profile-btn');
        if (profileBtn) {
            profileBtn.addEventListener('click', () => {
                App.confirm({
                    title: 'Sair do Sistema?',
                    message: 'Deseja realmente encerrar sua sessão atual?',
                    type: 'warning',
                    confirmLabel: 'Sim, sair',
                    onConfirm: App.logout
                });
            });
        }

        // Logout mobile
        const logoutMobile = document.getElementById('logout-mobile');
        if (logoutMobile) {
            logoutMobile.addEventListener('click', () => {
                document.getElementById('mobile-menu').classList.add('hidden');
                App.confirm({
                    title: 'Sair do Sistema?',
                    message: 'Deseja realmente encerrar sua sessão?',
                    type: 'warning',
                    confirmLabel: 'Sim, sair',
                    onConfirm: App.logout
                });
            });
        }

        // Keyboard: Escape to close modals
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                document.querySelectorAll('[id$="-modal"]:not(.hidden), #custom-confirm-modal:not(.hidden)').forEach(m => {
                    m.classList.add('hidden');
                });
            }
        });

        // Global search
        const globalSearch = document.getElementById('global-search-input');
        if (globalSearch) {
            globalSearch.addEventListener('keypress', (e) => {
                if (e.key === 'Enter' && globalSearch.value.trim() !== '') {
                    App.toast(`Buscando por: "${globalSearch.value.trim()}"... (Em desenvolvimento)`, 'info');
                    // In a real app, you would route to a search results page or filter data here.
                }
            });
        }
    },

    checkLogin: async () => {
        // Atualizou a página já logado? Entra na hora e confere o acesso em segundo plano.
        const cached = DB.get('user');
        const storedEmail = DB.storedSessionEmail();
        if (cached?.email && storedEmail === String(cached.email).toLowerCase()) {
            App.enter(cached);
            App.verifyAccess(cached);
            return;
        }

        const authUser = await DB.currentUser();
        if (!authUser) return App.showLogin();

        // Confere se o e-mail continua liberado na equipe (se estiver offline, usa o último perfil salvo)
        const { member, error } = await DB.getMembership(authUser.email).catch(err => ({ error: err }));
        if (error && cached?.email === authUser.email) {
            App.enter(cached);
        } else if (member) {
            App.enter({ email: member.email, name: member.name || authUser.email.split('@')[0], role: member.role });
        } else {
            await DB.signOut();
            App.showLogin();
            if (!error) App.toast('Seu acesso foi removido. Fale com o administrador.', 'error');
        }
    },

    /** Confere sessão e permissão sem bloquear a tela. Só tira do sistema se tiver certeza. */
    verifyAccess: async (cached) => {
        const authUser = await DB.currentUser();
        if (authUser === undefined) return;                     // sem resposta (offline/lento): segue com o cache
        if (authUser === null) {                                // sessão realmente expirou
            localStorage.removeItem('ggp_user');
            App.showLogin();
            return App.toast('Sua sessão expirou. Entre novamente.', 'info');
        }
        const { member, error } = await DB.getMembership(authUser.email).catch(err => ({ error: err }));
        if (error) return;                                      // erro de rede: mantém
        if (!member) {
            await DB.signOut();
            App.showLogin();
            return App.toast('Seu acesso foi removido. Fale com o administrador.', 'error');
        }
        const fresh = { email: member.email, name: member.name || authUser.email.split('@')[0], role: member.role };
        if (JSON.stringify(fresh) !== JSON.stringify(cached)) { DB.save('user', fresh); App.updateProfileUI(fresh); }
    },

    enter: (user) => {
        DB.save('user', user);
        App.updateProfileUI(user);
        App.showApp();
        App.sync();
    },

    updateProfileUI: (user) => {
        const profileName = document.getElementById('user-profile-name');
        const profileEmail = document.getElementById('user-profile-email');
        const profileInitials = document.getElementById('user-profile-initials');

        if (profileName) profileName.innerText = user.name || 'Usuário';
        if (profileEmail) profileEmail.innerText = user.email || '';
        if (profileInitials && user.name) profileInitials.innerText = user.name.substring(0, 2).toUpperCase();
    },

    login: async () => {
        const email = document.getElementById('email').value.trim().toLowerCase();
        const password = document.getElementById('password').value;
        const btn = document.querySelector('#login-form button[type="submit"]');

        if (!DB.ready()) return App.toast('Sem conexão com o servidor. Verifique a internet.', 'error');

        btn.disabled = true;
        try {
            const { data, error } = await DB.signIn(email, password);
            if (error) {
                const msg = /confirm/i.test(error.message) ? 'Confirme seu e-mail antes de entrar (veja sua caixa de entrada).'
                          : /fetch|network/i.test(error.message) ? 'Sem conexão com o servidor.'
                          : 'E-mail ou senha incorretos!';
                return App.toast(msg, 'error');
            }
            const { member, error: mErr } = await DB.getMembership(data.user.email);
            if (mErr) { await DB.signOut(); return App.toast('Erro ao verificar acesso. Rode o script supabase-setup.sql.', 'error'); }
            if (!member) { await DB.signOut(); return App.toast('Login válido, mas este e-mail não está liberado na equipe.', 'error'); }

            document.getElementById('password').value = '';
            App.enter({ email: member.email, name: member.name || email.split('@')[0], role: member.role });
        } finally {
            btn.disabled = false;
        }
    },

    logout: async () => {
        await DB.signOut();
        App.showLogin();
    },

    showLogin: () => {
        document.getElementById('boot-splash')?.remove();
        document.getElementById('login-page').classList.remove('hidden');
        document.getElementById('app-shell').classList.add('hidden');
    },

    showApp: () => {
        document.getElementById('boot-splash')?.remove();
        document.getElementById('login-page').classList.add('hidden');
        document.getElementById('app-shell').classList.remove('hidden');
        // Fix mobile margin
        const wrapper = document.getElementById('main-wrapper');
        if (window.innerWidth < 768) {
            wrapper.style.marginLeft = '0';
        }
        let last = null;
        try { last = sessionStorage.getItem('ggp__page'); } catch {}
        const valid = last && document.querySelector(`#sidebar-nav .nav-link[data-target="${CSS.escape(last)}"]`);
        App.navigateTo(valid ? last : 'dashboard');
    },

    navigateTo: (page) => {
        App.currentPage = page;
        try { sessionStorage.setItem('ggp__page', page); } catch {}   // volta para a mesma tela ao atualizar
        // Update sidebar active state
        document.querySelectorAll('#sidebar-nav .nav-link').forEach(link => {
            link.classList.toggle('active', link.getAttribute('data-target') === page);
        });
        // Update mobile bottom nav
        document.querySelectorAll('nav .mobile-nav-link[data-target]').forEach(link => {
            link.classList.toggle('active', link.getAttribute('data-target') === page);
        });
        App.loadPage(page);
    },

    loadPage: async (page) => {
        const container = document.getElementById('main-content');
        // Skeleton loader
        container.innerHTML = `
            <div class="max-w-[1400px] mx-auto space-y-6">
                <div class="h-8 w-48 rounded-xl animate-pulse" style="background:#ECE7FF;"></div>
                <div class="grid grid-cols-2 lg:grid-cols-4 gap-5">
                    ${[1,2,3,4].map(() => `<div class="h-24 rounded-[16px] animate-pulse" style="background:#ECE7FF;"></div>`).join('')}
                </div>
                <div class="h-64 rounded-[16px] animate-pulse" style="background:#ECE7FF;"></div>
            </div>
        `;
        try {
            const moduleLoaders = {
                dashboard: () => import('./pages/dashboard.js'),
                produtos: () => import('./pages/products.js'),
                clientes: () => import('./pages/customers.js'),
                producao: () => import('./pages/kanban.js'),
                vendas: () => import('./pages/sales.js'),
                orcamentos: () => import('./pages/quotes.js'),
                financeiro: () => import('./pages/finance.js'),
                estoque: () => import('./pages/inventory.js'),
                relatorios: () => import('./pages/reports.js'),
                configuracoes: () => import('./pages/settings.js'),
            };
            const loader = moduleLoaders[page];
            if (!loader) {
                container.innerHTML = `<div class="empty-state"><div class="empty-state-icon"><span class="material-symbols-outlined">construction</span></div><h3>Página não encontrada</h3><p>Esta seção não foi localizada no sistema.</p></div>`;
                return;
            }
            const module = await loader();
            if (module && module.default) {
                module.default.render(container);
            }
        } catch (error) {
            console.error('Error loading page:', error);
            container.innerHTML = `
                <div class="empty-state">
                    <div class="empty-state-icon" style="background:#FEF2F2; color:#DC2626;">
                        <span class="material-symbols-outlined">error</span>
                    </div>
                    <h3>Erro ao carregar</h3>
                    <p>Não foi possível carregar esta página. Tente novamente.</p>
                    <button class="btn-primary" onclick="location.reload()">Recarregar</button>
                </div>
            `;
        }
    },

    /**
     * App.confirm({ title, message, type, confirmLabel, onConfirm })
     * type: 'danger' | 'warning' | 'success' | 'info'
     */
    confirm: ({ title, message, type = 'danger', confirmLabel = 'Confirmar', onConfirm }) => {
        const modal   = document.getElementById('custom-confirm-modal');
        const iconWrap = document.getElementById('confirm-icon-wrap');
        const icon    = document.getElementById('confirm-icon');
        const titleEl = document.getElementById('confirm-title');
        const msgEl   = document.getElementById('confirm-message');
        const btnYes  = document.getElementById('confirm-yes');
        const btnNo   = document.getElementById('confirm-cancel');

        const styles = {
            danger:  { bg: '#FEF2F2', color: '#DC2626', icon: 'warning',       btn: 'linear-gradient(135deg,#ef4444,#dc2626)', shadow: 'rgba(239,68,68,0.3)' },
            warning: { bg: '#FFFBEB', color: '#D97706', icon: 'info',           btn: 'linear-gradient(135deg,#F59E0B,#D97706)', shadow: 'rgba(245,158,11,0.3)' },
            success: { bg: '#ECFDF5', color: '#059669', icon: 'check_circle',   btn: 'linear-gradient(135deg,#10B981,#059669)', shadow: 'rgba(16,185,129,0.3)' },
            info:    { bg: '#EFF6FF', color: '#2563EB', icon: 'info',           btn: 'linear-gradient(135deg,#6C2BFF,#4B1FD1)', shadow: 'rgba(108,43,255,0.3)' },
        };
        const s = styles[type] || styles.danger;

        iconWrap.style.background = s.bg;
        icon.style.color = s.color;
        icon.innerText = s.icon;
        titleEl.innerText = title;
        msgEl.innerHTML = message;
        btnYes.innerText = confirmLabel;
        btnYes.style.background = s.btn;
        btnYes.style.color = 'white';
        btnYes.style.boxShadow = `0 4px 14px -4px ${s.shadow}`;

        modal.classList.remove('hidden');

        const close = () => modal.classList.add('hidden');
        btnNo.onclick = close;
        btnYes.onclick = () => {
            onConfirm();
            close();
        };
    },

    toast: (message, type = 'success') => {
        let container = document.getElementById('toast-container');
        if (!container) {
            container = document.createElement('div');
            container.id = 'toast-container';
            document.body.appendChild(container);
        }

        const toast = document.createElement('div');
        toast.className = `toast toast-${type}`;
        
        const icons = {
            success: 'check_circle',
            error: 'error',
            info: 'info'
        };

        toast.innerHTML = `
            <div class="toast-icon">
                <span class="material-symbols-outlined" style="font-size:20px;">${icons[type] || 'info'}</span>
            </div>
            <div class="toast-message"></div>
        `;
        toast.querySelector('.toast-message').textContent = message;

        container.appendChild(toast);

        setTimeout(() => {
            toast.classList.add('hiding');
            setTimeout(() => toast.remove(), 300);
        }, 3000);
    }
};

document.addEventListener('DOMContentLoaded', App.init);
export default App;
