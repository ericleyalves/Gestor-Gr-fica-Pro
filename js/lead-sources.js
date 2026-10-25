/**
 * lead-sources.js — Origem do cliente (de onde veio o orçamento/pedido)
 *
 * A lista fica salva na nuvem em app_settings.lead_sources (como as categorias
 * de produto). Origens que começam com "Anúncio" contam como anúncio pago no
 * relatório (custo por venda, retorno).
 *
 * O valor escolhido é gravado no campo `leadSource` de orçamentos, pedidos e
 * despesas de marketing. Não precisa mudar o banco: tudo vai no jsonb "data".
 */
import DB from './db.js';
import { esc } from './utils.js';

export const DEFAULT_SOURCES = [
    'Anúncio · Vídeo Produtos',
    'Anúncio · Souvenir Orla',
    'Anúncio · Reel Letreiro',
    'Instagram (orgânico)',
    'Google',
    'Indicação',
    'Cliente antigo',
    'Outro'
];
export const NO_SOURCE = 'Não informado';
const NEW = '__new__';

const clean = (s) => String(s || '').trim().replace(/\s+/g, ' ');

const LeadSources = {
    /** É anúncio pago? (começa com "Anúncio") */
    isAd: (name) => /^an[uú]ncio/i.test(clean(name)),

    /** Origens salvas + as já usadas (nada some se a lista mudar). */
    list: () => {
        const saved = DB.get('lead_sources');
        const used = [...(DB.get('quotes') || []), ...(DB.get('orders') || []), ...(DB.get('transactions') || [])]
            .map(x => x?.leadSource);
        const seen = new Set();
        return [...(Array.isArray(saved) ? saved : DEFAULT_SOURCES), ...used]
            .map(clean).filter(Boolean)
            .filter(s => { const k = s.toLowerCase(); return !seen.has(k) && seen.add(k); });
    },

    /** Acrescenta uma origem nova à lista salva. Devolve o nome como ficou. */
    add: (name) => {
        const n = clean(name);
        if (!n) return '';
        const existing = LeadSources.list().find(s => s.toLowerCase() === n.toLowerCase());
        if (existing) return existing;
        const saved = Array.isArray(DB.get('lead_sources')) ? DB.get('lead_sources') : [...DEFAULT_SOURCES];
        DB.save('lead_sources', [...saved, n]);
        return n;
    },

    /** Última origem usada para este cliente (para já vir preenchida). */
    lastFor: (customerId) => {
        if (customerId == null || customerId === '') return '';
        const all = [...(DB.get('orders') || []), ...(DB.get('quotes') || [])]
            .filter(x => String(x.customerId) === String(customerId) && clean(x.leadSource))
            .sort((a, b) => String(b.date || '').localeCompare(String(a.date || '')));
        return all[0]?.leadSource || '';
    },

    /** <option>s do select (com "não informado" no topo e "+ nova" no fim). */
    options: (selected = '', { emptyLabel = 'Selecione a origem…' } = {}) => {
        const list = LeadSources.list();
        const sel = clean(selected);
        if (sel && !list.some(s => s === sel)) list.push(sel);
        const ads = list.filter(LeadSources.isAd), others = list.filter(s => !LeadSources.isAd(s));
        const opt = (s) => `<option value="${esc(s)}" ${s === sel ? 'selected' : ''}>${esc(s)}</option>`;
        return `<option value="" ${!sel ? 'selected' : ''}>${esc(emptyLabel)}</option>`
            + (ads.length ? `<optgroup label="Anúncios pagos">${ads.map(opt).join('')}</optgroup>` : '')
            + (others.length ? `<optgroup label="Outras origens">${others.map(opt).join('')}</optgroup>` : '')
            + `<option value="${NEW}">+ Nova origem…</option>`;
    },

    /**
     * Liga o comportamento de "+ Nova origem…" num <select>.
     * Ao escolher, pede o nome (ex.: "Anúncio · Carrossel Placas"), salva e seleciona.
     */
    bind: (select, opts = {}) => {
        if (!select) return;
        let last = select.value;
        select.addEventListener('focus', () => { if (select.value !== NEW) last = select.value; });
        select.addEventListener('change', () => {
            if (select.value !== NEW) { last = select.value; return; }
            const name = window.prompt('Nome da nova origem.\nDica: comece com "Anúncio" para entrar no relatório de anúncios.\nEx.: Anúncio · Carrossel Placas', 'Anúncio · ');
            const n = clean(name);
            const onlyPrefix = /^an[uú]ncio\s*·?$/i.test(n);   // deixou só o "Anúncio · " sugerido
            const value = n && !onlyPrefix ? LeadSources.add(n) : last;
            select.innerHTML = LeadSources.options(value, opts);
            select.value = value;
            last = value;
            select.dispatchEvent(new Event('input', { bubbles: true }));
        });
    },

    /** Valor do select pronto para gravar ('' quando não escolhido). */
    valueOf: (select) => {
        const v = clean(select?.value);
        return v === NEW ? '' : v;
    }
};

export default LeadSources;
