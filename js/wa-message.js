/**
 * wa-message.js — Janela "mensagem pronta para o WhatsApp"
 *
 * Mostra o texto (editável), com "Abrir WhatsApp" (wa.me com a mensagem) e
 * "Copiar". Nada é enviado sozinho. Usada pelo aviso de pedido pronto e pelo
 * pedido de avaliação no Google.
 */
import { esc } from './utils.js';

const app = () => import('./app.js').then(m => m.default);

/** Telefone só com dígitos e DDI 55 (formato do wa.me). '' se inválido. */
export const waPhone = (phone) => {
    let d = String(phone || '').replace(/\D/g, '').replace(/^0+/, '');
    if (d.length === 10 || d.length === 11) d = `55${d}`;
    return d.length >= 12 ? d : '';
};

/**
 * @param {object} o
 * @param {string} o.title, o.subtitle, o.icon (Material Symbols), o.message, o.phone
 * @param {string} [o.hint]      linha de ajuda sob o texto
 * @param {string} [o.warning]   aviso amarelo no topo (ex.: falta configurar algo)
 * @param {boolean} [o.auto]     abriu sozinha → botão "Agora não"
 * @param {Function} [o.onSent]  chamado ao abrir o WhatsApp ou copiar
 */
const WaMessage = {
    open: ({ title, subtitle = '', icon = 'chat', message, phone, hint = '', warning = '', auto = false, onSent }) => {
        const num = waPhone(phone);
        document.getElementById('ggp-wa-modal')?.remove();
        const el = document.createElement('div');
        el.id = 'ggp-wa-modal';
        el.className = 'fixed inset-0 z-[135] flex items-center justify-center p-4';
        el.style.cssText = 'background:rgba(10,10,20,0.5); backdrop-filter:blur(8px);';
        el.innerHTML = `
            <div class="w-full max-w-lg rounded-2xl bg-white shadow-2xl flex flex-col max-h-[90vh]">
                <div class="flex items-center justify-between px-6 py-4 border-b" style="border-color:var(--border);">
                    <div class="flex items-center gap-3">
                        <div class="w-10 h-10 rounded-xl flex items-center justify-center" style="background:#DCF8C6; color:#075E54;"><span class="material-symbols-outlined">${esc(icon)}</span></div>
                        <div>
                            <h3 class="text-lg font-black" style="color:var(--text-main);">${esc(title)}</h3>
                            <p class="text-xs" style="color:var(--text-faint);">${esc(subtitle)}</p>
                        </div>
                    </div>
                    <button type="button" data-close class="w-8 h-8 flex items-center justify-center rounded-full hover:bg-slate-100" style="color:var(--text-faint);">
                        <span class="material-symbols-outlined" style="font-size:18px;">close</span></button>
                </div>
                <div class="p-5 space-y-3 overflow-y-auto">
                    ${warning ? `<p class="text-xs p-3 rounded-xl" style="background:#FEF3C7; color:#92400E;">${warning}</p>` : ''}
                    ${num ? '' : `<p class="text-xs p-3 rounded-xl" style="background:#FEF3C7; color:#92400E;">Este pedido não tem WhatsApp válido. Copie a mensagem e envie por onde preferir, ou cadastre o telefone do cliente.</p>`}
                    <textarea id="wa-msg" spellcheck="false" class="w-full resize-none" style="min-height:220px; background:#DCF8C6; border:0; border-radius:12px; padding:14px 16px; font-size:14px; line-height:1.5; color:#111;"></textarea>
                    ${hint ? `<p class="text-[11px]" style="color:var(--text-faint);">${hint}</p>` : ''}
                </div>
                <div class="flex flex-wrap justify-end gap-2 px-6 py-4 border-t" style="border-color:var(--border);">
                    <button type="button" data-close class="btn-ghost">${auto ? 'Agora não' : 'Fechar'}</button>
                    <button type="button" id="wa-copy" class="btn-ghost"><span class="material-symbols-outlined" style="font-size:18px;">content_copy</span> Copiar</button>
                    ${num ? `<a id="wa-open" target="_blank" rel="noopener" class="btn-primary" style="background:#25D366;">
                        <span class="material-symbols-outlined" style="font-size:18px;">chat</span> Abrir WhatsApp</a>` : ''}
                </div>
            </div>`;

        const ta = el.querySelector('#wa-msg');
        ta.value = message;
        const wa = el.querySelector('#wa-open');
        const upd = () => { if (wa) wa.href = `https://wa.me/${num}?text=${encodeURIComponent(ta.value)}`; };
        upd(); ta.addEventListener('input', upd);

        const close = () => { el.remove(); document.removeEventListener('keydown', onKey); };
        const onKey = (e) => { if (e.key === 'Escape') close(); };
        document.addEventListener('keydown', onKey);
        const sent = async (msg) => { (await app()).toast(msg, 'success'); close(); onSent?.(); };
        el.addEventListener('click', (e) => { if (e.target === el || e.target.closest('[data-close]')) close(); });
        wa?.addEventListener('click', () => sent('WhatsApp aberto com a mensagem — é só enviar'));
        el.querySelector('#wa-copy').addEventListener('click', async () => {
            try { await navigator.clipboard.writeText(ta.value); } catch { ta.select(); document.execCommand('copy'); }
            sent('Mensagem copiada! Cole na conversa do cliente.');
        });
        document.body.appendChild(el);
    }
};

export default WaMessage;
