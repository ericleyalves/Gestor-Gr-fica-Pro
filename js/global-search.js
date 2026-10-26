/**
 * global-search.js — Busca do topo ("Buscar no sistema…")
 *
 * Procura enquanto você digita em pedidos, orçamentos, clientes e produtos:
 * nº, nome do cliente (do pedido ou do cadastro), produto, telefone e CPF/CNPJ.
 * Sem acento e sem maiúsculas ("lisboa" acha "Arte & Técnica Lisboa").
 * Enter abre o 1º resultado; ↑ ↓ escolhem; Esc fecha.
 */
import DB from './db.js';
import { esc, fmtBRL, docNo } from './utils.js';

const app = () => import('./app.js').then(m => m.default);
const norm = (t) => String(t ?? '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
const digits = (t) => String(t ?? '').replace(/\D/g, '');
const MAX_PER_GROUP = 6;

const GlobalSearch = {
    /** Resultados agrupados para o termo. */
    find: (term) => {
        const t = norm(term).trim();
        if (t.length < 2) return [];
        const d = digits(term);
        const words = t.split(/\s+/).filter(Boolean);
        const hit = (...fields) => {
            const text = norm(fields.join(' '));
            const textDigits = digits(fields.join(' '));
            return words.every(w => text.includes(w)) || (d.length >= 3 && textDigits.includes(d));
        };
        const customers = DB.get('customers') || [];
        const custName = (x) => customers.find(c => String(c.id) === String(x.customerId))?.name || '';
        const noOf = (x) => [docNo(x), x.number, String(x.number || '').padStart(3, '0')].join(' ');

        const orders = (DB.get('orders') || [])
            .filter(o => hit(noOf(o), o.customerName, custName(o), o.productName, o.phone, o.status))
            .sort((a, b) => (Number(b.number) || 0) - (Number(a.number) || 0))
            .map(o => ({ kind: 'order', id: o.id, icon: 'receipt_long', title: `Pedido Nº ${docNo(o)} · ${custName(o) || o.customerName || 'Cliente'}`,
                sub: `${o.productName || ''} · ${fmtBRL(o.value)} · ${o.status || ''}` }));
        const quotes = (DB.get('quotes') || []).filter(q => q.status === 'Aberto')
            .filter(q => hit(noOf(q), q.customerName, custName(q), q.productName, q.phone))
            .map(q => ({ kind: 'quote', id: q.id, icon: 'request_quote', title: `Orçamento Nº ${docNo(q)} · ${custName(q) || q.customerName || 'Cliente'}`,
                sub: `${q.productName || ''} · ${fmtBRL(q.value)}` }));
        const custs = customers.filter(c => hit(c.name, c.phone, c.document, c.email))
            .map(c => ({ kind: 'customer', id: c.id, icon: 'person', title: c.name || 'Cliente', sub: [c.phone, c.document].filter(Boolean).join(' · ') }));
        const prods = (DB.get('products') || []).filter(p => hit(p.name, p.ref, p.category))
            .map(p => ({ kind: 'product', id: p.id, icon: 'inventory_2', title: p.name || 'Produto', sub: [p.category, p.ref].filter(Boolean).join(' · ') }));

        return [['Pedidos', orders], ['Orçamentos abertos', quotes], ['Clientes', custs], ['Produtos', prods]]
            .filter(([, list]) => list.length)
            .map(([label, list]) => ({ label, total: list.length, items: list.slice(0, MAX_PER_GROUP) }));
    },

    /** Abre o resultado escolhido. */
    open: async (kind, id) => {
        const App = await app();
        if (kind === 'order') {
            (await import('./order-details.js')).default.open(id, () => App.loadPage(App.currentPage));
        } else if (kind === 'quote') {
            const { default: Quotes } = await import('./pages/quotes.js');
            Quotes.pendingQuoteOpen = id;
            App.navigateTo('orcamentos');
        } else if (kind === 'customer') {
            (await import('./customer-history.js')).default.open(id);
        } else if (kind === 'product') {
            App.navigateTo('produtos');
            setTimeout(() => window.editProduct?.(id), 400);
        }
    },

    /** Liga a busca ao campo do topo. */
    bind: (input) => {
        if (!input) return;
        const wrap = input.parentElement;
        wrap.style.position = 'relative';
        const box = document.createElement('div');
        box.id = 'global-search-results';
        box.className = 'hidden absolute left-0 top-full mt-2 w-[420px] max-w-[90vw] bg-white rounded-xl shadow-2xl border overflow-y-auto z-[90]';
        box.style.cssText = 'border-color:var(--border); max-height:70vh; z-index:200;';
        input.setAttribute('autocomplete', 'off');   // sem a lista de sugestões do navegador por cima
        wrap.appendChild(box);
        let active = -1, timer = null;

        const rows = () => [...box.querySelectorAll('[data-kind]')];
        const highlight = (i) => {
            const r = rows(); if (!r.length) return;
            active = (i + r.length) % r.length;
            r.forEach((el, k) => { el.style.background = k === active ? 'var(--primary-light, #F0EBFF)' : ''; });
            r[active].scrollIntoView({ block: 'nearest' });
        };
        const close = () => { box.classList.add('hidden'); active = -1; };
        const render = () => {
            const groups = GlobalSearch.find(input.value);
            active = -1;
            if (input.value.trim().length < 2) return close();
            box.innerHTML = groups.length ? groups.map(g => `
                <div class="px-4 pt-3 pb-1 text-[10px] font-black uppercase tracking-wider" style="color:var(--text-faint);">${esc(g.label)} · ${g.total}</div>
                ${g.items.map(it => `
                <button type="button" data-kind="${it.kind}" data-id="${esc(it.id)}" class="w-full text-left flex items-center gap-3 px-4 py-2 hover:bg-slate-50">
                    <span class="material-symbols-outlined flex-shrink-0" style="font-size:18px; color:var(--primary); position:static; transform:none; left:auto; top:auto;">${it.icon}</span>
                    <span class="min-w-0">
                        <span class="block text-sm font-semibold truncate" style="color:var(--text-main);">${esc(it.title)}</span>
                        <span class="block text-xs truncate" style="color:var(--text-muted);">${esc(it.sub)}</span>
                    </span>
                </button>`).join('')}
                ${g.total > g.items.length ? `<p class="px-4 pb-1 text-[11px]" style="color:var(--text-faint);">+ ${g.total - g.items.length} outro(s) — digite mais para filtrar</p>` : ''}`).join('')
                : `<p class="px-4 py-4 text-sm" style="color:var(--text-faint);">Nada encontrado para "${esc(input.value.trim())}".</p>`;
            box.classList.remove('hidden');
        };

        input.addEventListener('input', () => { clearTimeout(timer); timer = setTimeout(render, 120); });
        input.addEventListener('focus', () => { if (input.value.trim().length >= 2) render(); });
        input.addEventListener('keydown', (e) => {
            if (e.key === 'ArrowDown') { e.preventDefault(); if (box.classList.contains('hidden')) render(); highlight(active + 1); }
            else if (e.key === 'ArrowUp') { e.preventDefault(); highlight(active - 1); }
            else if (e.key === 'Enter') {
                const r = rows()[active >= 0 ? active : 0];
                if (r) { e.preventDefault(); close(); input.blur(); GlobalSearch.open(r.dataset.kind, r.dataset.id); }
            } else if (e.key === 'Escape') { close(); input.blur(); }
        });
        box.addEventListener('mousedown', (e) => e.preventDefault());   // não perde o foco antes do clique
        box.addEventListener('click', (e) => {
            const r = e.target.closest('[data-kind]');
            if (!r) return;
            close(); input.blur();
            GlobalSearch.open(r.dataset.kind, r.dataset.id);
        });
        document.addEventListener('click', (e) => { if (!wrap.contains(e.target)) close(); });
    }
};

export default GlobalSearch;
