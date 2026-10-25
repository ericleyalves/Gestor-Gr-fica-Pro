/**
 * followup.js — Cobrança de orçamentos parados
 *
 * Orçamento "Aberto" sem resposta há STALE_DAYS dias ou mais = parado.
 * O botão abre o WhatsApp do cliente já com a mensagem escrita (não envia
 * sozinho) e registra a data da cobrança em `lastFollowUp` / `followUps`.
 */
import DB from './db.js';
import { fmtBRL, docNo, isoDate } from './utils.js';

export const STALE_DAYS = 2;

const daysSince = (iso) => {
    if (!iso) return 0;
    const d = new Date(`${String(iso).slice(0, 10)}T12:00:00`);
    if (isNaN(d)) return 0;
    const today = new Date(); today.setHours(12, 0, 0, 0);
    return Math.max(0, Math.round((today - d) / 86400000));
};

/** Telefone só com dígitos e DDI 55 (formato do wa.me). */
const waPhone = (phone) => {
    let d = String(phone || '').replace(/\D/g, '').replace(/^0+/, '');
    if (d.length === 10 || d.length === 11) d = `55${d}`;
    return d.length >= 12 ? d : '';
};

const FollowUp = {
    /** Dias desde o último contato (cobrança ou data do orçamento). */
    idleDays: (q) => daysSince(q?.lastFollowUp || q?.date),

    isStale: (q) => q?.status === 'Aberto' && q?.approval?.status !== 'Aprovado' && FollowUp.idleDays(q) >= STALE_DAYS,

    staleCount: () => (DB.get('quotes') || []).filter(FollowUp.isStale).length,

    hasPhone: (q) => !!waPhone(q?.phone),

    message: (q) => {
        const first = String(q?.customerName || '').trim().split(/\s+/)[0] || '';
        const what = q?.productName ? ` (${String(q.productName).slice(0, 80)})` : '';
        return `Oi${first ? `, ${first}` : ''}! Tudo bem? 😊\n`
            + `Passando para saber se você conseguiu ver o orçamento Nº ${docNo(q)}${what}, no valor de ${fmtBRL(q?.value)}.\n`
            + `Se quiser, consigo ajustar alguma coisa ou já colocar na produção. É só me falar!`;
    },

    /** Abre o WhatsApp com a mensagem e marca a cobrança no orçamento. */
    send: (quoteId) => {
        const quotes = DB.get('quotes') || [];
        const q = quotes.find(x => x.id === quoteId);
        if (!q) return false;
        const phone = waPhone(q.phone);
        if (!phone) return false;
        window.open(`https://wa.me/${phone}?text=${encodeURIComponent(FollowUp.message(q))}`, '_blank', 'noopener');
        const today = isoDate(new Date());
        q.lastFollowUp = today;
        q.followUps = [...(q.followUps || []), today];
        DB.save('quotes', quotes);
        return true;
    }
};

export default FollowUp;
