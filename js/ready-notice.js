/**
 * ready-notice.js — Aviso de "pedido pronto" pelo WhatsApp
 *
 * Quando o pedido vai para "Pronto p/ entrega" (Concluído), abre a mensagem já
 * escrita: nº do pedido, produto, onde retirar e, se faltar pagar, o saldo com
 * a chave Pix. Registra no pedido `readyNoticeAt` e uma linha no histórico.
 */
import DB from './db.js';
import { fmtBRL, docNo } from './utils.js';
import Payments from './payments.js';
import WaMessage, { waPhone } from './wa-message.js';

/** Funções compartilhadas pelos avisos ligados a um pedido. */
export const orderOf = (orderId) => (DB.get('orders') || []).find(o => String(o.id) === String(orderId));
export const customerOf = (o) => (DB.get('customers') || []).find(x => String(x.id) === String(o?.customerId));
export const phoneOf = (o) => waPhone(o?.phone) || waPhone(customerOf(o)?.phone);
export const firstName = (o) => String(customerOf(o)?.name || o?.customerName || '').trim().split(/\s+/)[0] || '';
export const shortProduct = (o, max = 90) => {
    const p = String(o?.productName || '').trim();
    return p.length > max ? `${p.slice(0, max - 3)}…` : p;
};
export const fmtWhen = (iso) => (iso ? new Date(iso).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' }) : '');

/** Grava um campo de data no pedido + linha no histórico. */
export const stampOrder = (orderId, field, text) => {
    const list = DB.get('orders') || [];
    const i = list.findIndex(o => String(o.id) === String(orderId));
    if (i === -1) return;
    const at = new Date().toISOString();
    list[i] = { ...list[i], [field]: at, history: [...(list[i].history || []), { at, text }] };
    DB.save('orders', list);
};

const ReadyNotice = {
    message: (o) => {
        const shop = DB.get('shop_profile') || {};
        const first = firstName(o), product = shortProduct(o);
        const bal = Payments.balance(o);
        const lines = [
            `Oi${first ? `, ${first}` : ''}! 🎉`,
            `Seu pedido Nº ${docNo(o)}${product ? ` (${product})` : ''} ficou pronto!`
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

    open: (orderId, { auto = false, onDone } = {}) => {
        const o = orderOf(orderId);
        if (!o) return;
        const when = fmtWhen(o.readyNoticeAt);
        WaMessage.open({
            title: `Avisar que o pedido Nº ${docNo(o)} ficou pronto`,
            subtitle: `${o.customerName || ''}${when ? ` · já avisado em ${when}` : ''}`,
            icon: 'notifications_active',
            message: ReadyNotice.message(o),
            phone: phoneOf(o),
            hint: 'Pode editar o texto antes de enviar. Endereço e Pix vêm de Configurações → Perfil da gráfica.',
            auto,
            onSent: () => { stampOrder(orderId, 'readyNoticeAt', 'Cliente avisado que o pedido ficou pronto (WhatsApp)'); onDone?.(); }
        });
    }
};

export default ReadyNotice;
