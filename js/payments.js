/**
 * payments.js — Valores recebidos dos pedidos (sinal, parcelas, quitação)
 *
 * Cada pedido guarda order.payments = [{ id, date: 'AAAA-MM-DD', amount, method }].
 * Pedidos antigos (sem payments) concluídos contam como pagos; os demais, como nada recebido.
 */
import DB from './db.js';
import { esc, fmtBRL, isoDate, docNo } from './utils.js';

export const METHODS = ['Pix', 'Dinheiro', 'Cartão de débito', 'Cartão de crédito', 'Transferência', 'Boleto'];

const round = (v) => Math.round((Number(v) || 0) * 100) / 100;
const isDone = (o) => /Conclu|Pronto|Entregue/i.test(String(o?.status || ''));
const toast = (msg, type) => import('./app.js').then(m => m.default.toast(msg, type));

const Payments = {
    /** Total já recebido. */
    paid: (order) => {
        if (!order) return 0;
        if (!Array.isArray(order.payments)) return isDone(order) ? round(order.value) : 0;   // legado
        return round(order.payments.reduce((n, p) => n + (Number(p.amount) || 0), 0));
    },

    /** Quanto falta receber (nunca negativo). */
    balance: (order) => Math.max(0, round((Number(order?.value) || 0) - Payments.paid(order))),

    /** { label, style } para selo de pagamento. */
    badge: (order) => {
        const paid = Payments.paid(order), bal = Payments.balance(order);
        if (bal <= 0.009) return { label: 'PAGO', style: 'background:#ECFDF5;color:#059669;' };
        if (paid > 0) return { label: `FALTA ${fmtBRL(bal)}`, style: 'background:#FFFBEB;color:#B45309;' };
        return { label: 'A RECEBER', style: 'background:#FEF2F2;color:#DC2626;' };
    },

    /**
     * Bloco "valor recebido" reutilizável (usado no Gerar Pedido e no registro de pagamento).
     * Retorna { html, bind(root) → () => { amount, method } }.
     */
    fieldset: (total, alreadyPaid = 0, prefix = 'pay') => {
        const left = Math.max(0, round(total - alreadyPaid));
        const html = `
            <div class="space-y-3">
                <div class="flex flex-wrap gap-2">
                    <button type="button" data-pay-chip="0" class="px-3 py-1.5 rounded-xl border text-xs font-bold">Nada agora</button>
                    <button type="button" data-pay-chip="0.5" class="px-3 py-1.5 rounded-xl border text-xs font-bold">50% (${fmtBRL(left / 2)})</button>
                    <button type="button" data-pay-chip="1" class="px-3 py-1.5 rounded-xl border text-xs font-bold">${alreadyPaid > 0 ? 'Restante' : 'Total'} (${fmtBRL(left)})</button>
                </div>
                <div class="grid grid-cols-2 gap-3">
                    <div>
                        <label>Valor recebido (R$)</label>
                        <input type="number" id="${prefix}-amount" min="0" step="0.01" inputmode="decimal" placeholder="0,00">
                    </div>
                    <div>
                        <label>Forma</label>
                        <select id="${prefix}-method">${METHODS.map(m => `<option>${m}</option>`).join('')}</select>
                    </div>
                </div>
                <p id="${prefix}-hint" class="text-sm font-semibold"></p>
            </div>`;

        const bind = (root) => {
            const amountEl = root.querySelector(`#${prefix}-amount`);
            const methodEl = root.querySelector(`#${prefix}-method`);
            const hint = root.querySelector(`#${prefix}-hint`);
            const sync = () => {
                const v = Math.min(left, Math.max(0, Number(String(amountEl.value).replace(',', '.')) || 0));
                const rest = round(left - v);
                hint.innerHTML = rest <= 0.009
                    ? `<span style="color:#059669;">✓ Pedido quitado</span>`
                    : `<span style="color:#B45309;">Falta receber: ${fmtBRL(rest)}</span>`;
                root.querySelectorAll('[data-pay-chip]').forEach(b => {
                    const on = Math.abs(round(left * Number(b.dataset.payChip)) - v) < 0.01;
                    b.style.background = on ? 'var(--primary)' : '';
                    b.style.color = on ? '#fff' : '';
                    b.style.borderColor = on ? 'var(--primary)' : 'var(--border)';
                });
            };
            root.querySelectorAll('[data-pay-chip]').forEach(b => b.addEventListener('click', () => {
                const v = round(left * Number(b.dataset.payChip));
                amountEl.value = v ? v.toFixed(2) : '';
                sync();
            }));
            amountEl.addEventListener('input', sync);
            sync();
            return () => ({
                amount: Math.min(left, Math.max(0, round(String(amountEl.value).replace(',', '.')))),
                method: methodEl.value
            });
        };
        return { html, bind };
    },

    /** Cria o registro de pagamento (ou null se valor 0). */
    entry: ({ amount, method }, date = new Date()) => amount > 0
        ? { id: `PG-${Date.now().toString(36)}${Math.random().toString(36).slice(2, 5)}`, date: isoDate(date), amount: round(amount), method }
        : null,

    /** Janela para ver e registrar pagamentos de um pedido salvo. */
    openModal: (orderId, onChange) => {
        document.getElementById('ggp-pay-modal')?.remove();
        const getOrder = () => (DB.get('orders') || []).find(o => String(o.id) === String(orderId));
        const order = getOrder();
        if (!order) return;

        const el = document.createElement('div');
        el.id = 'ggp-pay-modal';
        el.className = 'fixed inset-0 z-[120] flex items-center justify-center p-4';
        el.style.cssText = 'background:rgba(10,10,20,0.5); backdrop-filter:blur(8px);';

        const save = (payments) => {
            const list = DB.get('orders') || [];
            const i = list.findIndex(o => String(o.id) === String(orderId));
            if (i === -1) return;
            list[i] = { ...list[i], payments };
            DB.save('orders', list);
            onChange?.();
        };

        const render = () => {
            const o = getOrder();
            const history = Array.isArray(o.payments) ? o.payments : [];
            const paid = Payments.paid(o), bal = Payments.balance(o);
            const fs = Payments.fieldset(Number(o.value) || 0, paid, 'pm');
            const fmtD = (iso) => { const [y, m, d] = String(iso).split('-'); return `${d}/${m}/${y}`; };
            el.innerHTML = `
                <div class="w-full max-w-lg rounded-2xl bg-white shadow-2xl flex flex-col max-h-[88vh]">
                    <div class="flex items-center justify-between px-6 py-4 border-b" style="border-color:var(--border);">
                        <div>
                            <h3 class="text-lg font-black" style="color:var(--text-main);">Pagamentos do pedido</h3>
                            <p class="text-xs" style="color:var(--text-faint);">Pedido Nº ${esc(docNo(o))} · ${esc(o.customerName || '')}</p>
                        </div>
                        <button type="button" data-close class="w-8 h-8 flex items-center justify-center rounded-full hover:bg-slate-100" style="color:var(--text-faint);">
                            <span class="material-symbols-outlined" style="font-size:18px;">close</span>
                        </button>
                    </div>
                    <div class="overflow-y-auto px-6 py-5 space-y-5">
                        <div class="grid grid-cols-3 gap-2 text-center">
                            <div class="rounded-xl p-3" style="background:var(--bg-main);"><p class="label-caps">Total</p><p class="font-black">${fmtBRL(o.value)}</p></div>
                            <div class="rounded-xl p-3" style="background:#ECFDF5;"><p class="label-caps">Recebido</p><p class="font-black" style="color:#059669;">${fmtBRL(paid)}</p></div>
                            <div class="rounded-xl p-3" style="background:${bal > 0 ? '#FFFBEB' : '#ECFDF5'};"><p class="label-caps">Falta</p><p class="font-black" style="color:${bal > 0 ? '#B45309' : '#059669'};">${fmtBRL(bal)}</p></div>
                        </div>

                        ${history.length ? `
                        <div>
                            <p class="label-caps mb-2">Recebimentos</p>
                            <div class="space-y-1.5">
                                ${history.map(p => `
                                    <div class="flex items-center justify-between gap-3 px-3 py-2 rounded-lg border" style="border-color:var(--border);">
                                        <span class="text-xs" style="color:var(--text-muted);">${fmtD(p.date)} · ${esc(p.method)}</span>
                                        <span class="flex items-center gap-2">
                                            <b class="text-sm">${fmtBRL(p.amount)}</b>
                                            <button type="button" data-pay-remove="${esc(p.id)}" class="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-red-50 text-slate-400 hover:text-red-500" title="Remover">
                                                <span class="material-symbols-outlined" style="font-size:16px;">delete</span>
                                            </button>
                                        </span>
                                    </div>`).join('')}
                            </div>
                        </div>` : ''}

                        ${bal > 0 ? `
                        <div>
                            <p class="label-caps mb-2">Registrar recebimento</p>
                            ${fs.html}
                        </div>` : `<p class="text-sm font-bold text-center" style="color:#059669;">✓ Pedido quitado</p>`}
                    </div>
                    <div class="flex justify-end gap-2 px-6 py-4 border-t" style="border-color:var(--border);">
                        <button type="button" data-close class="btn-ghost">Fechar</button>
                        ${bal > 0 ? `<button type="button" id="pm-save" class="btn-primary"><span class="material-symbols-outlined" style="font-size:18px;">payments</span> Registrar</button>` : ''}
                    </div>
                </div>`;
            const read = bal > 0 ? fs.bind(el) : null;
            el.querySelector('#pm-save')?.addEventListener('click', () => {
                const e = Payments.entry(read());
                if (!e) return toast('Informe o valor recebido', 'error');
                const base = Array.isArray(o.payments) ? o.payments : (paid > 0 ? [Payments.entry({ amount: paid, method: 'Não informado' })] : []);
                save([...base, e]);
                toast(`Recebimento de ${fmtBRL(e.amount)} registrado`);
                render();
            });
        };

        const close = () => { el.remove(); document.removeEventListener('keydown', onKey); };
        const onKey = (e) => { if (e.key === 'Escape') close(); };
        document.addEventListener('keydown', onKey);
        el.addEventListener('click', (e) => {
            if (e.target === el || e.target.closest('[data-close]')) return close();
            const rm = e.target.closest('[data-pay-remove]');
            if (rm) {
                const o = getOrder();
                save((o.payments || []).filter(p => p.id !== rm.dataset.payRemove));
                render();
            }
        });
        render();
        document.body.appendChild(el);
    }
};

export default Payments;
