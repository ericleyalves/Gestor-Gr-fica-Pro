import DB from './db.js';

const App = {
    init: () => {
        App.bindEvents();
        App.checkLogin();
    },

    bindEvents: () => {
        // Login form
        const loginForm = document.getElementById('login-form');
        if (loginForm) loginForm.addEventListener('submit', (e) => { e.preventDefault(); App.login(); });

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
    },

    checkLogin: () => {
        const user = DB.get('user');
        user ? App.showApp() : App.showLogin();
    },

    login: () => {
        const email = document.getElementById('email').value;
        const password = document.getElementById('password').value;
        if (email && password) {
            DB.save('user', { email, name: 'Administrador' });
            App.showApp();
        }
    },

    logout: () => {
        localStorage.removeItem('ggp_user');
        App.showLogin();
    },

    showLogin: () => {
        document.getElementById('login-page').classList.remove('hidden');
        document.getElementById('app-shell').classList.add('hidden');
    },

    showApp: () => {
        document.getElementById('login-page').classList.add('hidden');
        document.getElementById('app-shell').classList.remove('hidden');
        // Fix mobile margin
        const wrapper = document.getElementById('main-wrapper');
        if (window.innerWidth < 768) {
            wrapper.style.marginLeft = '0';
        }
        App.navigateTo('dashboard');
    },

    navigateTo: (page) => {
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
            const modules = {
                dashboard: './pages/dashboard.js',
                produtos: './pages/products.js',
                clientes: './pages/customers.js',
                producao: './pages/kanban.js',
                vendas: './pages/sales.js',
                orcamentos: './pages/quotes.js',
                financeiro: './pages/finance.js',
                estoque: './pages/inventory.js',
                relatorios: './pages/reports.js',
                configuracoes: './pages/settings.js',
            };
            const path = modules[page];
            if (!path) {
                container.innerHTML = `<div class="empty-state"><div class="empty-state-icon"><span class="material-symbols-outlined">construction</span></div><h3>Página não encontrada</h3><p>Esta seção não foi localizada no sistema.</p></div>`;
                return;
            }
            const module = await import(path);
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
        msgEl.innerText = message;
        btnYes.innerText = confirmLabel;
        btnYes.style.background = s.btn;
        btnYes.style.color = 'white';
        btnYes.style.boxShadow = `0 4px 14px -4px ${s.shadow}`;

        modal.classList.remove('hidden');

        const close = () => modal.classList.add('hidden');
        btnNo.onclick = close;
        btnYes.onclick = () => { onConfirm && onConfirm(); close(); };
    }
};

document.addEventListener('DOMContentLoaded', App.init);
export default App;
