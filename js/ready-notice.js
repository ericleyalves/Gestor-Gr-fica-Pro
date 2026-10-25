/**
 * ready-notice.js — Aviso de "pedido pronto" pelo WhatsApp
 *
 * Quando o pedido vai para "Pronto p/ entrega" (Concluído), abre uma janela com
 * a mensagem já escrita: nº do pedido, produto, onde retirar e, se faltar
 * pagar, o saldo com a chave Pix. Você confere, edita se quiser e abre a
 * conversa. Nada é enviado sozinho.
 * Registra no pedido `readyNoticeAt` e uma linha no histórico.
 */
import DB from './db.js';
import { esc, fmtBRL, docNo } from './utils.js';
import Payments from './payments.js';

const app = () => import('./app.js').then(m => m.default);

/** Telefone só com dígitos e DDI 55 (formato do wa.me). */
const waPhone = (phone) => {
    let d = String(phone || '').replace(/\D/g, '').replace(/^0+/, '');
    if (d.length === 10 || d.length === 11) d = `55${d}`;
    return d.length >= 12 ? d : '';
};

const ReadyNotice = {
    getOrder: (orderId) => (DB.get('orders') || []).find(o => String(o.id) === String(orderId)),

    phoneOf: (o) => {
        const c = (DB.get('customers') || []).find(x => String(x.id) === String(o?.customerId));
        return waPhone(o?.phone) || waPhone(c?.phone);
    },

    message: (o) => {
        const shop = DB.get('shop_profile') || {};
        const c = (DB.get('customers') || []).find(x => String(x.id) === String(o.customerId));
        const first = String(c?.name || o.customerName || '').trim().split(/\s+/)[0] || '';
        const product = String(o.productName || '').trim();
        const bal = Payments.balance(o);
        const lines = [
            `Oi${first ? `, ${first}` : ''}! 🎉`,
            `Seu pedido Nº ${docNo(o)}${product ? ` (${product.length > 90 ? product.slice(0, 87) + '…' : product})` : ''} ficou pronto!`
        ];
        if (shop.address) lines.push('', `📍 Pode retirar aqui: ${shop.address}`);
        if (bal > 0.009) {
            lines.push('', `💰 Falta pagar: ${fmtBRL(bal)}`);
            if (shop.pixKey) lines.push(`Pix: ${shop.pixKey}`);
        }
        lines.push('', 'Se preferir que a gente entregue, é só me avisar. Obrigado pela preferência! 😊');
        if (shop.name) lines.push(`— ${shop.name}`);
        return lines.join('\n');
    },

    /** Marca que o cliente foi avisado (data + histórico). */
    markSent: (orderId) => {
        const list = DB.get('orders') || [];
        const i = list.findIndex(o => String(o.id) === String(orderId));
        if (i === -1) return;
        const at = new Date().toISOString();
        list[i] = { ...list[i], readyNoticeAt: at, history: [...(list[i].history || []), { at, text: 'Cliente avisado que o pedido ficou pronto (WhatsApp)' }] };
        DB.save('orders', list);
    },

    /**
     * Abre a janela do aviso.
     * @param {object} opts.auto  true quando abriu sozinha ao mover o card (mostra "Agora não")
     * @param {Function} opts.onDone  chamado depois de avisar (para redesenhar a tela)
     */
    open: (orderId, { auto = false, onDone } = {}) => {
        const o = ReadyNotice.getOrder(orderId);
        if (!o) return;
        const phone = ReadyNotice.phoneOf(o);
        document.getElementById('ggp-ready-modal')?.remove();
        const el = document.createElement('div');
        el.id = 'ggp-ready-modal';
        el.className = 'fixed inset-0 z-[135] flex items-center justify-center p-4';
        el.style.cssText = 'background:rgba(10,10,20,0.5); backdrop-filter:blur(8px);';
        const when = o.readyNoticeAt ? new Date(o.readyNoticeAt).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' }) : '';
        el.innerHTML = `
            <div class="w-full max-w-lg rounded-2xl bg-white shadow-2xl flex flex-col max-h-[90vh]">
                <div class="flex items-center justify-between px-6 py-4 border-b" style="border-color:var(--border);">
                    <div class="flex items-center gap-3">
                        <div class="w-10 h-10 rounded-xl flex items-center justify-center" style="background:#DCF8C6; color:#075E54;"><span class="material-symbols-outlined">notifications_active</span></div>
                        <div>
                            <h3 class="text-lg font-black" style="color:var(--text-main);">Avisar que o pedido Nº ${esc(docNo(o))} ficou pronto</h3>
                            <p class="text-xs" style="color:var(--text-faint);">${esc(o.customerName || '')}${when ? ` · já avisado em ${esc(when)}` : ''}</p>
                        </div>
                    </div>
                    <button type="button" data-close class="w-8 h-8 flex items-center justify-center rounded-full hover:bg-slate-100" style="color:var(--text-faint);">
                        <span class="material-symbols-outlined" style="font-size:18px;">close</span></button>
                </div>
                <div class="p-5 space-y-3 overflow-y-auto">
                    ${phone ? '' : `<p class="text-xs p-3 rounded-xl" style="background:#FEF3C7; color:#92400E;">Este pedido não tem WhatsApp válido. Copie a mensagem e envie por onde preferir, ou cadastre o telefone do cliente.</p>`}
                    <textarea id="rn-msg" spellcheck="false" class="w-full resize-none" style="min-height:220px; background:#DCF8C6; border:0; border-radius:12px; padding:14px 16px; font-size:14px; line-height:1.5; color:#111;"></textarea>
                    <p class="text-[11px]" style="color:var(--text-faint);">Pode editar o texto antes de enviar. Endereço e Pix vêm de Configurações → Perfil da gráfica.</p>
                </div>
                <div class="flex flex-wrap justify-end gap-2 px-6 py-4 border-t" style="border-color:var(--border);">
                    <button type="button" data-close class="btn-ghost">${auto ? 'Agora não' : 'Fechar'}</button>
                    <button type="button" id="rn-copy" class="btn-ghost"><span class="material-symbols-outlined" style="font-size:18px;">content_copy</span> Copiar</button>
                    ${phone ? `<a id="rn-wa" target="_blank" rel="noopener" class="btn-primary" style="background:#25D366;">
                        <span class="material-symbols-outlined" style="font-size:18px;">chat</span> Abrir WhatsApp</a>` : ''}
                </div>
            </div>`;

        const ta = el.querySelector('#rn-msg');
        ta.value = ReadyNotice.message(o);
        const wa = el.querySelector('#rn-wa');
        const updWa = () => { if (wa) wa.href = `https://wa.me/${phone}?text=${encodeURIComponent(ta.value)}`; };
        updWa(); ta.addEventListener('input', updWa);

        const close = () => { el.remove(); document.removeEventListener('keydown', onKey); };
        const onKey = (e) => { if (e.key === 'Escape') close(); };
        document.addEventListener('keydown', onKey);
        const done = async (msg) => {
            ReadyNotice.markSent(orderId);
            (await app()).toast(msg, 'success');
            close();
            onDone?.();
        };
        el.addEventListener('click', (e) => { if (e.target === el || e.target.closest('[data-close]')) close(); });
        wa?.addEventListener('click', () => done('WhatsApp aberto com o aviso — é só enviar'));
        el.querySelector('#rn-copy').addEventListener('click', async () => {
            try { await navigator.clipboard.writeText(ta.value); } catch { ta.select(); document.execCommand('copy'); }
            done('Mensagem copiada! Cole na conversa do cliente.');
        });
        document.body.appendChild(el);
    }
};

export default ReadyNotice;
