/**
 * today.js — Painel "Hoje" do início
 *
 * Junta as ações do dia que geram dinheiro, cada uma com o botão que resolve:
 *  - Pedidos prontos sem aviso ao cliente   → Avisar (WhatsApp)
 *  - Orçamentos parados há 2+ dias          → Cobrar (WhatsApp)
 *  - Pedidos prontos/entregues com saldo    → Cobrar saldo (WhatsApp, com Pix)
 *  - Clientes para recompra                 → abre a lista de recompra
 * (Atrasados e entregas do dia continuam no quadro "Entregas" logo abaixo.)
 */
import DB from './db.js';
import { esc, fmtBRL, docNo } from './utils.js';
import Payments from './payments.js';
import FollowUp from './followup.js';
import ReadyNotice, { phoneOf, firstName } from './ready-notice.js';
import Repurchase from './repurchase.js';
import WaMessage from './wa-message.js';
import Pix from './pix.js';

const MAX = 5;
const isReady = (o) => /Conclu|Pronto/.test(String(o.status || ''));
const app = () => import('./app.js').then(m => m.default);

const Today = {
    data: () => {
        const orders = (DB.get('orders') || []).filter(o => o.status !== 'Cancelado');
        const quotes = DB.get('quotes') || [];
        return {
            notify: orders.filter(o => isReady(o) && !o.readyNoticeAt),
            stale: quotes.filter(FollowUp.isStale).sort((a, b) => FollowUp.idleDays(b) - FollowUp.idleDays(a)),
            owed: orders.filter(o => (isReady(o) || o.status === 'Entregue') && Payments.balance(o) > 0.009)
                .sort((a, b) => Payments.balance(b) - Payments.balance(a)),
            rebuy: Repurchase.count()
        };
    },

    chargeMessage: (o) => {
        const shop = DB.get('shop_profile') || {};
        const first = firstName(o);
        return [
            `Oi${first ? `, ${first}` : ''}! Tudo bem? 😊`,
            `Passando para lembrar do saldo do pedido Nº ${docNo(o)}: ${fmtBRL(Payments.balance(o))}.`,
            Pix.messageLines(Payments.balance(o), `PED${docNo(o)}`).length ? `\n${Pix.messageLines(Payments.balance(o), `PED${docNo(o)}`).join('\n')}` : '',
            '\nQualquer dúvida, é só me chamar. Obrigado!',
            shop.name ? `— ${shop.name}` : ''
        ].filter(Boolean).join('\n');
    },

    html: () => {
        const d = Today.data();
        const total = d.notify.length + d.stale.length + d.owed.length + (d.rebuy ? 1 : 0);
        const owedSum = d.owed.reduce((n, o) => n + Payments.balance(o), 0);
        const btn = (act, id, label, icon) => `
            <button type="button" data-today="${act}" data-id="${esc(id)}" class="flex-shrink-0 flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[11px] font-black" style="background:#DCF8C6; color:#075E54;">
                <span class="material-symbols-outlined" style="font-size:15px;">${icon}</span>${label}</button>`;
        const row = (title, sub, button) => `
            <div class="flex items-center gap-3 py-2 border-b last:border-0" style="border-color:#F1F0F7;">
                <div class="flex-1 min-w-0">
                    <p class="text-sm font-semibold truncate" style="color:var(--text-main);">${title}</p>
                    <p class="text-xs truncate" style="color:var(--text-muted);">${sub}</p>
                </div>${button}
            </div>`;
        const col = (icon, color, title, list, rowFn, extra = '') => `
            <div>
                <p class="label-caps mb-1 flex items-center gap-1.5"><span class="material-symbols-outlined" style="font-size:16px; color:${color};">${icon}</span>${title} <span class="font-black" style="color:${color};">${list.length}</span></p>
                ${list.length ? list.slice(0, MAX).map(rowFn).join('') + (list.length > MAX ? `<p class="text-xs pt-2" style="color:var(--text-faint);">+ ${list.length - MAX} outro(s)</p>` : '')
                    : `<p class="text-xs py-3" style="color:var(--text-faint);">Nada aqui. ✓</p>`}${extra}
            </div>`;

        return `
        <div class="section-card" id="today-panel">
            <div class="flex flex-wrap items-center justify-between gap-3 mb-3">
                <h3 class="section-heading flex items-center gap-2"><span class="material-symbols-outlined" style="color:var(--primary);">today</span> Hoje</h3>
                <span class="text-xs font-bold px-2.5 py-1 rounded-full" style="${total ? 'background:#FEF3C7;color:#B45309;' : 'background:#ECFDF5;color:#059669;'}">
                    ${total ? `${total} coisa(s) para fazer` : 'Tudo em dia ✅'}</span>
            </div>
            <div class="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-x-6 gap-y-4">
                ${col('notifications_active', '#059669', 'Avisar que está pronto', d.notify, o =>
                    row(esc(o.customerName || 'Cliente'), `Nº ${esc(docNo(o))} · ${esc(o.productName || '')}`, btn('notify', o.id, 'Avisar', 'chat')))}
                ${col('schedule', '#B45309', 'Orçamentos para cobrar', d.stale, q =>
                    row(esc(q.customerName || 'Cliente'), `${fmtBRL(q.value)} · parado há ${FollowUp.idleDays(q)} dia(s)`,
                        FollowUp.hasPhone(q) ? btn('quote', q.id, 'Cobrar', 'chat') : ''))}
                ${col('payments', '#DC2626', 'Saldo a receber', d.owed, o =>
                    row(esc(o.customerName || 'Cliente'), `Nº ${esc(docNo(o))} · falta <b>${fmtBRL(Payments.balance(o))}</b> · ${esc(o.status || '')}`, btn('owed', o.id, 'Cobrar', 'chat')),
                    d.owed.length ? `<p class="text-xs pt-2 font-bold" style="color:#DC2626;">Total: ${fmtBRL(owedSum)}</p>` : '')}
                <div>
                    <p class="label-caps mb-1 flex items-center gap-1.5"><span class="material-symbols-outlined" style="font-size:16px; color:#6C2BFF;">replay</span>Recompra <span class="font-black" style="color:#6C2BFF;">${d.rebuy}</span></p>
                    ${d.rebuy ? `
                    <p class="text-xs py-2" style="color:var(--text-muted);">${d.rebuy} cliente(s) sem comprar há ${Repurchase.days}+ dias.</p>
                    <button type="button" data-today="rebuy" class="btn-ghost !py-1.5 !px-3 text-xs"><span class="material-symbols-outlined" style="font-size:16px;">replay</span> Ver lista</button>`
                    : `<p class="text-xs py-3" style="color:var(--text-faint);">Nada aqui. ✓</p>`}
                </div>
            </div>
        </div>`;
    },

    bind: (container, rerender) => {
        container.querySelector('#today-panel')?.addEventListener('click', async (e) => {
            const b = e.target.closest('[data-today]');
            if (!b) return;
            const id = b.dataset.id;
            if (b.dataset.today === 'notify') ReadyNotice.open(id, { onDone: rerender });
            else if (b.dataset.today === 'quote') {
                if (FollowUp.send(id)) { (await app()).toast('WhatsApp aberto com a mensagem pronta — é só enviar', 'success'); rerender(); }
            } else if (b.dataset.today === 'owed') {
                const o = (DB.get('orders') || []).find(x => String(x.id) === String(id));
                if (!o) return;
                WaMessage.open({
                    title: `Cobrar saldo do pedido Nº ${docNo(o)}`, subtitle: `${o.customerName || ''} · falta ${fmtBRL(Payments.balance(o))}`,
                    icon: 'payments', message: Today.chargeMessage(o), phone: phoneOf(o),
                    hint: 'Quando o cliente pagar, registre em Pagamentos do pedido para sair desta lista.'
                });
            } else if (b.dataset.today === 'rebuy') Repurchase.open(rerender);
        });
    }
};

export default Today;
