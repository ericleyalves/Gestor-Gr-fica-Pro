/**
 * customer-history.js — Ficha do cliente
 * Total comprado, ticket médio, quanto deve, última compra, pedidos, orçamentos
 * abertos e produtos que mais compra. Atalhos: novo orçamento e "pedir de novo".
 */
import DB from './db.js';
import { esc, fmtBRL, docNo } from './utils.js';
import Payments from './payments.js';
import OrderDetails from './order-details.js';
import Approval from './approval.js';

const fmtD = (iso) => { const [y, m, d] = String(iso || '').split('-'); return d ? `${d}/${m}/${y}` : '—'; };
const app = () => import('./app.js').then(m => m.default);

/** Pedidos/orçamentos do cliente: pelo cadastro ou, nos antigos sem vínculo, pelo nome. */
const belongs = (c) => (x) => String(x.customerId) === String(c.id)
    || (!x.customerId && String(x.customerName || '').trim().toLowerCase() === String(c.name || '').trim().toLowerCase());

const CustomerHistory = {
    /** Abre a tela de orçamento já com o cliente (e itens, se for "pedir de novo"). */
    startQuote: async (customer, items = null) => {
        const { default: Quotes } = await import('./pages/quotes.js');
        Quotes.pendingPrefill = { customer, items };
        document.getElementById('ggp-cust-modal')?.remove();
        (await app()).navigateTo('orcamentos');
    },

    open: (customerId) => {
        document.getElementById('ggp-cust-modal')?.remove();
        const c = (DB.get('customers') || []).find(x => String(x.id) === String(customerId));
        if (!c) return;

        const el = document.createElement('div');
        el.id = 'ggp-cust-modal';
        el.className = 'fixed inset-0 z-[105] flex items-center justify-center p-4';
        el.style.cssText = 'background:rgba(10,10,20,0.5); backdrop-filter:blur(8px);';

        const render = () => {
            const all = (DB.get('orders') || []).filter(belongs(c));
            const orders = all.filter(o => o.status !== 'Cancelado').sort((a, b) => String(b.date).localeCompare(String(a.date)) || (b.number || 0) - (a.number || 0));
            const canceled = all.length - orders.length;
            const quotes = (DB.get('quotes') || []).filter(belongs(c)).filter(q => q.status === 'Aberto');
            const total = orders.reduce((n, o) => n + (Number(o.value) || 0), 0);
            const owed = orders.reduce((n, o) => n + Payments.balance(o), 0);
            const first = orders.length ? orders[orders.length - 1].date : null;
            const last = orders.length ? orders[0].date : null;
            const daysSince = last ? Math.round((new Date().setHours(12, 0, 0, 0) - new Date(`${last}T12:00:00`)) / 86400000) : null;

            const prod = new Map();
            orders.forEach(o => (o.items || []).forEach(i => {
                const k = String(i.name || '').trim(); if (!k) return;
                const cur = prod.get(k) || { name: k, qty: 0, total: 0, times: 0 };
                cur.qty += Number(i.quantity) || 1; cur.total += Number(i.price) || 0; cur.times++;
                prod.set(k, cur);
            }));
            const topProducts = [...prod.values()].sort((a, b) => b.total - a.total).slice(0, 5);
            const initials = String(c.name || '?').split(/\s+/).filter(Boolean).slice(0, 2).map(w => w[0]).join('').toUpperCase();
            const kpi = (l, v, color = 'var(--text-main)', sub = '') => `
                <div class="bg-white rounded-xl border p-3" style="border-color:var(--border);">
                    <p class="label-caps">${l}</p><p class="text-lg font-black mt-0.5" style="color:${color};">${v}</p>${sub ? `<p class="text-[11px]" style="color:var(--text-faint);">${sub}</p>` : ''}
                </div>`;

            el.innerHTML = `
            <div class="w-full max-w-4xl rounded-2xl bg-white shadow-2xl flex flex-col max-h-[92vh]">
                <div class="px-6 py-5 border-b flex items-start gap-4" style="border-color:var(--border);">
                    <div class="w-14 h-14 rounded-2xl flex items-center justify-center font-black text-xl flex-shrink-0" style="background:var(--primary-light); color:var(--primary);">${esc(initials)}</div>
                    <div class="flex-1 min-w-0">
                        <h3 class="text-xl font-black truncate" style="color:var(--text-main);">${esc(c.name)}</h3>
                        <div class="flex flex-wrap gap-x-4 gap-y-0.5 text-xs mt-1" style="color:var(--text-muted);">
                            ${c.phone ? `<span>📞 ${esc(c.phone)}</span>` : ''}${c.email ? `<span>✉️ ${esc(c.email)}</span>` : ''}
                            ${c.document ? `<span>🪪 ${esc(c.document)}</span>` : ''}${c.address ? `<span>📍 ${esc(c.address)}</span>` : ''}
                        </div>
                    </div>
                    <button type="button" data-close class="w-8 h-8 flex items-center justify-center rounded-full hover:bg-slate-100 flex-shrink-0" style="color:var(--text-faint);"><span class="material-symbols-outlined" style="font-size:18px;">close</span></button>
                </div>

                <div class="overflow-y-auto px-6 py-5 space-y-5" style="background:var(--bg-main);">
                    <div class="grid grid-cols-2 md:grid-cols-5 gap-3">
                        ${kpi('Total comprado', fmtBRL(total), 'var(--primary)', `${orders.length} pedido(s)`)}
                        ${kpi('Ticket médio', fmtBRL(orders.length ? total / orders.length : 0))}
                        ${kpi('Está devendo', owed > 0.009 ? fmtBRL(owed) : 'Nada', owed > 0.009 ? '#B45309' : '#059669')}
                        ${kpi('Última compra', last ? fmtD(last) : '—', 'var(--text-main)', daysSince == null ? '' : daysSince <= 0 ? 'hoje' : `há ${daysSince} dia(s)`)}
                        ${kpi('Cliente desde', first ? fmtD(first) : '—', 'var(--text-main)', canceled ? `${canceled} cancelado(s)` : '')}
                    </div>

                    ${quotes.length ? `
                    <div class="bg-white rounded-xl border" style="border-color:var(--border);">
                        <p class="px-4 py-2.5 border-b label-caps" style="border-color:var(--border); color:#B45309;">Orçamentos em aberto (${quotes.length})</p>
                        ${quotes.map(q => `
                            <div class="px-4 py-2.5 border-b last:border-0 flex items-center gap-3 text-sm" style="border-color:#F1F0F7;">
                                <b style="color:var(--primary);">Nº ${esc(docNo(q))}</b><span class="text-xs" style="color:var(--text-faint);">${fmtD(q.date)}</span>
                                <span class="flex-1 truncate" style="color:var(--text-muted);">${esc(q.productName || '')}</span>
                                ${Approval.badge(q)}<b>${fmtBRL(q.value)}</b>
                                <button type="button" data-open-quote="${esc(q.id)}" class="text-xs font-bold px-2 py-1 rounded-lg hover:bg-violet-50" style="color:var(--primary);">Abrir</button>
                            </div>`).join('')}
                    </div>` : ''}

                    <div class="grid grid-cols-1 lg:grid-cols-3 gap-5">
                        <div class="lg:col-span-2 bg-white rounded-xl border overflow-hidden" style="border-color:var(--border);">
                            <p class="px-4 py-2.5 border-b label-caps" style="border-color:var(--border);">Pedidos</p>
                            ${orders.length ? orders.slice(0, 50).map(o => { const b = Payments.badge(o); return `
                                <div class="px-4 py-3 border-b last:border-0 flex items-center gap-3 hover:bg-slate-50 cursor-pointer" style="border-color:#F1F0F7;" data-order="${esc(o.id)}">
                                    <div class="w-16 flex-shrink-0"><p class="text-xs font-black" style="color:var(--primary);">Nº ${esc(docNo(o))}</p><p class="text-[11px]" style="color:var(--text-faint);">${fmtD(o.date)}</p></div>
                                    <div class="flex-1 min-w-0"><p class="text-sm font-semibold truncate">${esc(o.productName || '')}</p><p class="text-[11px]" style="color:var(--text-muted);">${esc(o.status || '')}</p></div>
                                    <div class="text-right flex-shrink-0"><p class="text-sm font-bold">${fmtBRL(o.value)}</p><span class="text-[9px] font-black px-1.5 py-0.5 rounded-full" style="${b.style}">${b.label}</span></div>
                                    <button type="button" data-repeat="${esc(o.id)}" class="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-violet-50 flex-shrink-0" style="color:var(--text-faint);" title="Pedir de novo (cria orçamento igual)">
                                        <span class="material-symbols-outlined" style="font-size:18px;">replay</span></button>
                                </div>`; }).join('') : `<p class="text-sm italic text-center py-8" style="color:var(--text-faint);">Ainda não comprou.</p>`}
                        </div>
                        <div class="bg-white rounded-xl border p-4" style="border-color:var(--border);">
                            <p class="label-caps mb-3">O que mais compra</p>
                            ${topProducts.length ? topProducts.map(p => `
                                <div class="mb-3">
                                    <p class="text-sm font-semibold truncate">${esc(p.name)}</p>
                                    <p class="text-[11px]" style="color:var(--text-muted);">${p.qty.toLocaleString('pt-BR')} un · ${p.times}x · ${fmtBRL(p.total)}</p>
                                    <div class="h-1.5 rounded-full bg-slate-100 mt-1"><div class="h-1.5 rounded-full" style="width:${Math.max(4, p.total / topProducts[0].total * 100)}%; background:var(--primary);"></div></div>
                                </div>`).join('') : `<p class="text-xs italic" style="color:var(--text-faint);">Sem compras ainda.</p>`}
                        </div>
                    </div>
                </div>

                <div class="px-6 py-4 border-t flex flex-wrap gap-2" style="border-color:var(--border);">
                    <button type="button" data-act="quote" class="btn-primary !py-2 !px-4 text-xs"><span class="material-symbols-outlined" style="font-size:17px;">add</span> Novo orçamento</button>
                    <button type="button" data-act="edit" class="btn-ghost !py-2 !px-4 text-xs"><span class="material-symbols-outlined" style="font-size:17px;">edit</span> Editar cadastro</button>
                </div>
            </div>`;
        };

        const close = () => { el.remove(); document.removeEventListener('keydown', onKey); };
        const onKey = (e) => { if (e.key === 'Escape' && !document.getElementById('ggp-order-modal')) close(); };
        document.addEventListener('keydown', onKey);
        el.addEventListener('click', async (e) => {
            if (e.target === el || e.target.closest('[data-close]')) return close();
            const rep = e.target.closest('[data-repeat]');
            if (rep) {
                const o = (DB.get('orders') || []).find(x => x.id === rep.dataset.repeat);
                return CustomerHistory.startQuote(c, o?.items || []);
            }
            const ord = e.target.closest('[data-order]');
            if (ord) return OrderDetails.open(ord.dataset.order, render);
            const q = e.target.closest('[data-open-quote]');
            if (q) {
                const { default: Quotes } = await import('./pages/quotes.js');
                Quotes.pendingQuoteOpen = q.dataset.openQuote;
                close();
                return (await app()).navigateTo('orcamentos');
            }
            const act = e.target.closest('[data-act]')?.dataset.act;
            if (act === 'quote') CustomerHistory.startQuote(c);
            else if (act === 'edit') { close(); window.editCustomer?.(c.id); }
        });
        render();
        document.body.appendChild(el);
    }
};

export default CustomerHistory;
