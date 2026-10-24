/**
 * approval.js — Link para o cliente aprovar o orçamento
 *
 * Fluxo: gera um token secreto → grava uma cópia do orçamento (HTML do PDF + resumo)
 * em public_quotes (supabase-aprovacao.sql) → a página aprovar.html mostra ao cliente
 * e deixa ele "Aprovar" ou "Pedir alteração" → o sistema confere as respostas e avisa.
 */
import DB from './db.js';
import App from './app.js';
import QuotePDF from './pdf.js';
import { esc, fmtBRL, docNo } from './utils.js';

const TABLE = 'public_quotes';
const DEFAULT_PAGE = 'https://ericleyalves.github.io/Gestor-Gr-fica-Pro/aprovar.html';

const newToken = () => {
    const a = new Uint8Array(24);
    crypto.getRandomValues(a);
    return [...a].map(b => 'abcdefghijkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789'[b % 56]).join('');
};
const pageUrl = () => String((DB.get('shop_profile') || {}).approvalUrl || DEFAULT_PAGE).trim();
const linkFor = (token) => `${pageUrl()}${pageUrl().includes('?') ? '&' : '?'}t=${token}`;
const onlyDigits = (s) => String(s || '').replace(/\D/g, '');

const STATUS = {
    Aberto:     { label: 'Aguardando cliente', style: 'background:#EEF2FF; color:#4338CA;' },
    Aprovado:   { label: 'Aprovado pelo cliente', style: 'background:#DCFCE7; color:#047857;' },
    'Alteração': { label: 'Cliente pediu alteração', style: 'background:#FEF3C7; color:#B45309;' }
};

const Approval = {
    STATUS,

    /** Etiqueta para mostrar nas listas (vazio se nunca mandou link). */
    badge: (q) => {
        const s = q?.approval && STATUS[q.approval.status];
        return s ? `<span class="text-[9px] font-black px-1.5 py-0.5 rounded-full" style="${s.style}">${s.label.toUpperCase()}</span>` : '';
    },

    /** Cria/atualiza o link do orçamento salvo e mostra a mensagem para o WhatsApp. */
    share: async (quoteId, { silent = false } = {}) => {
        const quotes = DB.get('quotes') || [];
        const q = quotes.find(x => x.id === quoteId);
        if (!q) return App.toast('Salve o orçamento primeiro', 'error');
        const client = DB.client();
        if (!client || !(await DB.hasSession())) return silent ? null : App.toast('Sem conexão com a nuvem — o link precisa de internet.', 'error');

        const shop = DB.get('shop_profile') || {};
        const validDays = parseInt(shop.validityDays) || 15;
        const [y, m, d] = String(q.date || '').split('-').map(Number);
        const base = y ? new Date(y, m - 1, d) : new Date();
        const until = new Date(base.getTime() + validDays * 86400000);
        const validUntil = `${until.getFullYear()}-${String(until.getMonth() + 1).padStart(2, '0')}-${String(until.getDate()).padStart(2, '0')}`;

        // Já respondido? Um link novo (o antigo continua mostrando a resposta dada)
        const answered = q.approval && q.approval.status !== 'Aberto';
        const token = (!answered && q.approval?.token) || newToken();
        if (!silent) App.toast('Gerando link…', 'info');
        let html;
        try {
            html = (await QuotePDF.htmlFromOrder(q, 'orcamento'))
                .replace('</head>', '<style>.sign{display:none!important}</style></head>');
        } catch (e) { console.error(e); return App.toast('Não foi possível montar o orçamento.', 'error'); }

        const data = {
            html, validUntil,
            number: docNo(q), total: Number(q.value) || 0,
            customer: q.customerName || '',
            shopName: shop.name || 'Gráfica', shopPhone: shop.phone || '',
            brandColor: shop.brandColor || '#6C2BFF', logo: shop.logo || ''
        };
        const { error } = await client.from(TABLE).upsert({ token, quote_id: q.id, data, status: 'Aberto' }, { onConflict: 'token' });
        if (error) {
            console.error(error);
            const missing = /relation|does not exist|schema cache/i.test(error.message || '');
            return App.toast(missing ? 'Rode o arquivo supabase-aprovacao.sql no Supabase primeiro.' : 'Não foi possível criar o link.', 'error');
        }
        q.approval = { token, status: 'Aberto', sentAt: new Date().toISOString() };
        DB.save('quotes', quotes);
        if (silent) App.toast('Link do cliente atualizado com as alterações', 'info');
        else Approval.showLink(q);
    },

    /** Janela com o link e a mensagem pronta. */
    showLink: (q) => {
        document.getElementById('ggp-approval-modal')?.remove();
        const shop = DB.get('shop_profile') || {};
        const link = linkFor(q.approval.token);
        const first = String(q.customerName || '').split(' ')[0];
        const msg = `Olá${first ? `, ${first}` : ''}! Segue o orçamento Nº ${docNo(q)} da ${shop.name || 'nossa gráfica'} — total ${fmtBRL(q.value)}.\n\n`
            + `Confira os detalhes e aprove por aqui:\n${link}\n\nQualquer ajuste, é só pedir pelo mesmo link. 😉`;
        const phone = onlyDigits(q.phone);
        const el = document.createElement('div');
        el.id = 'ggp-approval-modal';
        el.className = 'fixed inset-0 z-[130] flex items-center justify-center p-4';
        el.style.cssText = 'background:rgba(10,10,20,0.5); backdrop-filter:blur(8px);';
        el.innerHTML = `
            <div class="w-full max-w-lg rounded-2xl bg-white shadow-2xl flex flex-col max-h-[88vh]">
                <div class="flex items-center justify-between px-6 py-4 border-b" style="border-color:var(--border);">
                    <div>
                        <h3 class="text-lg font-black" style="color:var(--text-main);">Link de aprovação</h3>
                        <p class="text-xs" style="color:var(--text-faint);">O cliente abre, confere e clica em Aprovar. O sistema te avisa.</p>
                    </div>
                    <button type="button" data-close class="w-8 h-8 flex items-center justify-center rounded-full hover:bg-slate-100" style="color:var(--text-faint);">
                        <span class="material-symbols-outlined" style="font-size:18px;">close</span></button>
                </div>
                <div class="p-5 space-y-3 overflow-y-auto">
                    <div class="flex gap-2">
                        <input id="ap-link" readonly class="flex-1 text-xs" value="${esc(link)}">
                        <a href="${esc(link)}" target="_blank" rel="noopener" class="btn-ghost !py-2 !px-3 text-xs">Ver</a>
                    </div>
                    <textarea id="ap-msg" spellcheck="false" class="w-full resize-none" style="min-height:190px; background:#DCF8C6; border:0; border-radius:12px; padding:14px 16px; font-size:14px; line-height:1.5; color:#111;"></textarea>
                </div>
                <div class="flex flex-wrap justify-end gap-2 px-6 py-4 border-t" style="border-color:var(--border);">
                    ${phone ? `<a id="ap-wa" target="_blank" rel="noopener" class="btn-ghost">Abrir conversa no WhatsApp</a>` : ''}
                    <button type="button" id="ap-copy" class="btn-primary" style="background:#25D366;">
                        <span class="material-symbols-outlined" style="font-size:18px;">content_copy</span> Copiar mensagem</button>
                </div>
            </div>`;
        const ta = el.querySelector('#ap-msg');
        ta.value = msg;
        const wa = el.querySelector('#ap-wa');
        const updWa = () => { if (wa) wa.href = `https://wa.me/${phone.length <= 11 ? '55' + phone : phone}?text=${encodeURIComponent(ta.value)}`; };
        updWa(); ta.addEventListener('input', updWa);
        const close = () => { el.remove(); document.removeEventListener('keydown', onKey); };
        const onKey = (e) => { if (e.key === 'Escape') close(); };
        document.addEventListener('keydown', onKey);
        el.addEventListener('click', (e) => { if (e.target === el || e.target.closest('[data-close]')) close(); });
        el.querySelector('#ap-copy').addEventListener('click', async () => {
            try { await navigator.clipboard.writeText(ta.value); } catch { ta.select(); document.execCommand('copy'); }
            App.toast('Mensagem copiada! Cole na conversa do cliente.', 'success');
        });
        document.body.appendChild(el);
    },

    /** Confere se algum cliente respondeu. Devolve true se mudou algo. */
    check: async () => {
        const quotes = DB.get('quotes') || [];
        const waiting = quotes.filter(q => q.approval?.status === 'Aberto' && q.approval.token);
        const client = DB.client();
        if (!waiting.length || !client || !navigator.onLine || !(await DB.hasSession())) return false;
        const { data, error } = await client.from(TABLE)
            .select('token,status,client_name,client_note,responded_at')
            .in('token', waiting.map(q => q.approval.token)).neq('status', 'Aberto');
        if (error || !data?.length) return false;
        data.forEach(r => {
            const q = waiting.find(x => x.approval.token === r.token);
            if (!q) return;
            q.approval = { ...q.approval, status: r.status, clientName: r.client_name, clientNote: r.client_note, respondedAt: r.responded_at };
            const who = r.client_name || q.customerName || 'O cliente';
            App.toast(r.status === 'Aprovado'
                ? `✅ ${who} APROVOU o orçamento Nº ${docNo(q)} (${fmtBRL(q.value)})`
                : `✏️ ${who} pediu alteração no orçamento Nº ${docNo(q)}${r.client_note ? `: "${r.client_note}"` : ''}`, 'success');
        });
        DB.save('quotes', quotes);
        return true;
    },

    /** Confere a cada 2 min e quando a janela volta ao foco. */
    watch: (onChange) => {
        if (Approval._watching) return;
        Approval._watching = true;
        const run = async () => { try { if (await Approval.check()) onChange?.(); } catch (e) { console.warn('Aprovação:', e); } };
        setInterval(() => { if (!document.hidden) run(); }, 120000);
        document.addEventListener('visibilitychange', () => { if (!document.hidden) run(); });
        run();
    }
};

export default Approval;
