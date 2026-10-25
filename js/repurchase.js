/**
 * repurchase.js — Clientes para recompra
 *
 * Lista quem já comprou e está sem comprar há X dias (padrão 60), com os
 * melhores clientes primeiro. Para cada um: WhatsApp com mensagem pronta
 * (citando o que ele mais compra) e "Novo orçamento" já com o cliente.
 * Quem tem pedido em andamento não entra. O contato fica registrado no
 * cadastro do cliente (`repurchaseContactAt`) e some da lista por 30 dias.
 */
import DB from './db.js';
import { esc, fmtBRL } from './utils.js';
import WaMessage, { waPhone } from './wa-message.js';

export const PERIODS = [30, 60, 90, 180];
const SNOOZE_DAYS = 30;   // depois de chamar, some da lista por 30 dias

const fmtD = (iso) => { const [y, m, d] = String(iso || '').slice(0, 10).split('-'); return d ? `${d}/${m}/${y}` : '—'; };
const daysSince = (iso) => {
    if (!iso) return Infinity;
    const d = new Date(`${String(iso).slice(0, 10)}T12:00:00`);
    const t = new Date(); t.setHours(12, 0, 0, 0);
    return Math.max(0, Math.round((t - d) / 86400000));
};
/** Pedidos do cliente: pelo cadastro ou, nos antigos sem vínculo, pelo nome. */
const belongs = (c) => (x) => String(x.customerId) === String(c.id)
    || (!x.customerId && String(x.customerName || '').trim().toLowerCase() === String(c.name || '').trim().toLowerCase());
const inProgress = (o) => !/Entregue|Cancelado/.test(String(o.status || ''));

const Repurchase = {
    days: 60,

    /** Resumo de compras de cada cliente. */
    stats: () => {
        const orders = (DB.get('orders') || []).filter(o => o.status !== 'Cancelado');
        return (DB.get('customers') || []).map(c => {
            const mine = orders.filter(belongs(c));
            const last = mine.map(o => String(o.date || '')).filter(Boolean).sort().pop() || '';
            const total = mine.reduce((n, o) => n + (Number(o.value) || 0), 0);
            const byItem = {};
            mine.forEach(o => (o.items?.length ? o.items : [{ name: o.productName, quantity: 1 }]).forEach(i => {
                const k = String(i.name || '').trim(); if (k) byItem[k] = (byItem[k] || 0) + (Number(i.quantity) || 1);
            }));
            const top = Object.entries(byItem).sort((a, b) => b[1] - a[1])[0]?.[0] || '';
            return { c, orders: mine.length, last, idle: daysSince(last), total, top, busy: mine.some(inProgress) };
        });
    },

    /** Clientes que entram na lista para o período escolhido. */
    list: (days = Repurchase.days) => Repurchase.stats()
        .filter(s => s.orders > 0 && !s.busy && s.idle >= days && daysSince(s.c.repurchaseContactAt) >= SNOOZE_DAYS)
        .sort((a, b) => b.total - a.total || b.orders - a.orders),

    count: (days = Repurchase.days) => Repurchase.list(days).length,

    message: (s) => {
        const shop = DB.get('shop_profile') || {};
        const name = String(s.c.name || '').trim();
        // Empresa (CNPJ ou nome tipo "Loja…") → nome completo; pessoa → primeiro nome
        const isCompany = String(s.c.document || '').replace(/\D/g, '').length === 14
            || /^(loja|ateli|empresa|mercad|comercial|distribuidora|papelaria|bazar|boutique|restaurante|bar |pousada|hotel|cl[ií]nica|sal[aã]o)/i.test(name);
        const first = isCompany ? name : (name.split(/\s+/)[0] || '');
        const what = s.top ? (s.top.length > 60 ? `${s.top.slice(0, 57)}…` : s.top) : '';
        return [
            `Oi${first ? `, ${first}` : ''}! Tudo bem? 😊`,
            `Faz um tempinho que você ${what ? `pediu *${what}*` : 'fez um pedido'} com a gente.`,
            '',
            'Está precisando repor ou tem algum projeto novo? Esta semana consigo te atender rapidinho e mando o orçamento na hora.',
            shop.name ? `\n— ${shop.name}` : ''
        ].join('\n').trim();
    },

    markContacted: (customerId) => {
        const list = DB.get('customers') || [];
        const i = list.findIndex(c => String(c.id) === String(customerId));
        if (i === -1) return;
        list[i] = { ...list[i], repurchaseContactAt: new Date().toISOString() };
        DB.save('customers', list);
    },

    /** Janela com a lista. onChange = redesenhar a tela de clientes. */
    open: (onChange) => {
        document.getElementById('ggp-repurchase-modal')?.remove();
        const el = document.createElement('div');
        el.id = 'ggp-repurchase-modal';
        el.className = 'fixed inset-0 z-[110] flex items-center justify-center p-4';
        el.style.cssText = 'background:rgba(10,10,20,0.5); backdrop-filter:blur(8px);';

        const render = () => {
            const rows = Repurchase.list();
            el.innerHTML = `
            <div class="w-full max-w-3xl rounded-2xl bg-white shadow-2xl flex flex-col max-h-[88vh]">
                <div class="flex items-center justify-between gap-3 px-6 py-4 border-b" style="border-color:var(--border);">
                    <div>
                        <h3 class="text-lg font-black" style="color:var(--text-main);">Clientes para recompra</h3>
                        <p class="text-xs" style="color:var(--text-faint);">Já compraram, estão sem pedido em andamento e não compram há ${Repurchase.days}+ dias. Melhores clientes primeiro.</p>
                    </div>
                    <div class="flex items-center gap-2">
                        <select id="rp-days" class="!w-auto text-sm font-semibold">${PERIODS.map(d => `<option value="${d}" ${d === Repurchase.days ? 'selected' : ''}>${d}+ dias</option>`).join('')}</select>
                        <button type="button" data-close class="w-8 h-8 flex items-center justify-center rounded-full hover:bg-slate-100" style="color:var(--text-faint);">
                            <span class="material-symbols-outlined" style="font-size:18px;">close</span></button>
                    </div>
                </div>
                <div class="overflow-y-auto p-4 space-y-2" style="background:var(--bg-main);">
                    ${rows.length ? rows.map(s => `
                    <div class="flex items-center gap-4 p-4 rounded-xl border bg-white" style="border-color:var(--border);" data-cust="${esc(s.c.id)}">
                        <div class="flex-1 min-w-0">
                            <p class="text-sm font-bold truncate" style="color:var(--text-main);">${esc(s.c.name || 'Sem nome')}</p>
                            <p class="text-xs" style="color:#B45309;">Última compra ${fmtD(s.last)} · há ${s.idle} dias</p>
                            <p class="text-xs truncate" style="color:var(--text-muted);">${s.orders} pedido(s)${s.top ? ` · mais compra: ${esc(s.top)}` : ''}</p>
                        </div>
                        <div class="text-right flex-shrink-0">
                            <p class="text-base font-black" style="color:var(--text-main);">${fmtBRL(s.total)}</p>
                            <p class="text-[10px] uppercase font-bold" style="color:var(--text-faint);">total comprado</p>
                        </div>
                        <div class="flex gap-1 flex-shrink-0">
                            <button type="button" data-act="wa" class="w-9 h-9 flex items-center justify-center rounded-lg hover:bg-[#25D366]/20 text-[#075E54] ${waPhone(s.c.phone) ? 'bg-[#25D366]/15' : 'opacity-60'}" title="${waPhone(s.c.phone) ? 'Chamar no WhatsApp' : 'Sem WhatsApp — copiar mensagem'}">
                                <span class="material-symbols-outlined" style="font-size:18px;">chat</span></button>
                            <button type="button" data-act="quote" class="w-9 h-9 flex items-center justify-center rounded-lg hover:bg-violet-50" style="color:var(--primary);" title="Novo orçamento para este cliente">
                                <span class="material-symbols-outlined" style="font-size:18px;">request_quote</span></button>
                        </div>
                    </div>`).join('') : `
                    <div class="text-center py-10">
                        <span class="material-symbols-outlined text-4xl text-slate-300">celebration</span>
                        <p class="text-sm font-bold mt-2" style="color:var(--text-muted);">Ninguém parado há ${Repurchase.days}+ dias</p>
                        <p class="text-xs mt-1" style="color:var(--text-faint);">Quem você já chamou some da lista por ${SNOOZE_DAYS} dias. Tente um período menor.</p>
                    </div>`}
                </div>
            </div>`;
        };

        const close = () => { el.remove(); document.removeEventListener('keydown', onKey); };
        const onKey = (e) => { if (e.key === 'Escape' && !document.getElementById('ggp-wa-modal')) close(); };
        document.addEventListener('keydown', onKey);
        el.addEventListener('change', (e) => { if (e.target.id === 'rp-days') { Repurchase.days = Number(e.target.value); render(); onChange?.(); } });
        el.addEventListener('click', async (e) => {
            if (e.target === el || e.target.closest('[data-close]')) return close();
            const btn = e.target.closest('[data-act]');
            if (!btn) return;
            const s = Repurchase.stats().find(x => String(x.c.id) === btn.closest('[data-cust]').dataset.cust);
            if (!s) return;
            if (btn.dataset.act === 'wa') {
                WaMessage.open({
                    title: 'Chamar para recompra',
                    subtitle: `${s.c.name || ''} · última compra há ${s.idle} dias`,
                    icon: 'replay',
                    message: Repurchase.message(s),
                    phone: s.c.phone,
                    hint: 'Depois de chamar, o cliente sai desta lista por 30 dias.',
                    onSent: () => { Repurchase.markContacted(s.c.id); render(); onChange?.(); }
                });
            } else if (btn.dataset.act === 'quote') {
                close();
                const { default: CustomerHistory } = await import('./customer-history.js');
                CustomerHistory.startQuote(s.c);
            }
        });
        render();
        document.body.appendChild(el);
    }
};

export default Repurchase;
