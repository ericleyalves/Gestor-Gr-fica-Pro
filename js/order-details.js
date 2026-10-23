/**
 * order-details.js — Janela "Detalhes do pedido"
 * Abre ao clicar no card (Produção) ou no olho (Vendas). Reúne tudo do pedido:
 * status, prazo, cliente, itens, valores, pagamento, arquivos, histórico e ações.
 */
import DB from './db.js';
import { esc, fmtBRL, docNo, isoDate } from './utils.js';
import Payments from './payments.js';
import Files from './files.js';
import QuotePDF from './pdf.js';

export const STATUSES = ['Aguardando Arte', 'Produção', 'Finalizado', 'Concluído', 'Entregue'];
export const DELIVERY_METHODS = ['Retirada na loja', 'Entrega própria', 'Motoboy', 'Correios', 'Transportadora', 'Uber/99 Entrega'];
const fmtD = (iso) => { const [y, m, d] = String(iso || '').split('-'); return d ? `${d}/${m}/${y}` : '—'; };
const app = () => import('./app.js').then(m => m.default);

const OrderDetails = {
    open: (orderId, onChange) => {
        document.getElementById('ggp-order-modal')?.remove();
        const get = () => (DB.get('orders') || []).find(o => String(o.id) === String(orderId));
        if (!get()) return;

        const el = document.createElement('div');
        el.id = 'ggp-order-modal';
        el.className = 'fixed inset-0 z-[110] flex items-center justify-center p-4';
        el.style.cssText = 'background:rgba(10,10,20,0.5); backdrop-filter:blur(8px);';

        const update = (patch, text) => {
            const list = DB.get('orders') || [];
            const i = list.findIndex(o => String(o.id) === String(orderId));
            if (i === -1) return;
            const history = [...(list[i].history || []), { at: new Date().toISOString(), text }];
            list[i] = { ...list[i], ...patch, history };
            DB.save('orders', list);
            onChange?.();
            render();
        };

        const render = () => {
            const o = get();
            if (!o) return close();
            const customer = (DB.get('customers') || []).find(c => String(c.id) === String(o.customerId));
            const items = Array.isArray(o.items) && o.items.length ? o.items : [{ name: o.productName, quantity: 1, price: o.value }];
            const paid = Payments.paid(o), bal = Payments.balance(o);
            const badge = Payments.badge(o);
            const canceled = o.status === 'Cancelado';
            const nFiles = Files.countForOrder(o);
            const today = new Date(); const t = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
            const late = o.dueDate && o.dueDate < t && !/Conclu|Pronto|Entregue/.test(o.status || '') && !canceled;
            const action = (id, icon, label, extra = '') => `
                <button type="button" data-act="${id}" class="flex items-center gap-1.5 px-3 py-2 rounded-xl border text-xs font-bold hover:border-primary hover:text-primary transition-all ${extra}" style="border-color:var(--border); color:var(--text-muted);">
                    <span class="material-symbols-outlined" style="font-size:17px;">${icon}</span>${label}</button>`;

            el.innerHTML = `
            <div class="w-full max-w-3xl rounded-2xl bg-white shadow-2xl flex flex-col max-h-[92vh]">
                <div class="px-6 py-4 border-b flex items-start justify-between gap-4" style="border-color:var(--border);">
                    <div class="min-w-0">
                        <div class="flex items-center gap-2 flex-wrap">
                            <h3 class="text-xl font-black" style="color:var(--text-main);">Pedido Nº ${esc(docNo(o))}</h3>
                            <span class="text-[10px] font-black px-2 py-0.5 rounded-full" style="${badge.style}">${badge.label}</span>
                            ${late ? `<span class="text-[10px] font-black px-2 py-0.5 rounded-full" style="background:#FEF2F2;color:#DC2626;">ATRASADO</span>` : ''}
                        </div>
                        <p class="text-xs mt-0.5" style="color:var(--text-faint);">Criado em ${fmtD(o.date)} · código ${esc(o.id)}</p>
                    </div>
                    <button type="button" data-close class="w-8 h-8 flex items-center justify-center rounded-full hover:bg-slate-100 flex-shrink-0" style="color:var(--text-faint);">
                        <span class="material-symbols-outlined" style="font-size:18px;">close</span>
                    </button>
                </div>

                <div class="overflow-y-auto px-6 py-5 space-y-5" style="background:var(--bg-main);">
                    <!-- Status / prazo / cliente -->
                    <div class="grid grid-cols-1 md:grid-cols-3 gap-3">
                        <div class="bg-white rounded-xl border p-3" style="border-color:var(--border);">
                            <p class="label-caps mb-1">Status</p>
                            ${canceled ? `<p class="font-bold" style="color:#DC2626;">Cancelado</p>` : `
                            <select data-status class="font-semibold" style="padding-top:6px;padding-bottom:6px;">
                                ${[...new Set([...STATUSES, o.status])].map(s => `<option ${s === o.status ? 'selected' : ''}>${esc(s)}</option>`).join('')}
                            </select>`}
                        </div>
                        <div class="bg-white rounded-xl border p-3" style="border-color:var(--border);">
                            <p class="label-caps mb-1">Entrega</p>
                            ${o.deliveredAt ? `
                            <p class="font-bold" style="color:#059669;">✓ Entregue ${fmtD(o.deliveredAt)}</p>
                            <p class="text-xs truncate" style="color:var(--text-faint);">${esc([o.deliveryMethod, o.deliveredTo && `para ${o.deliveredTo}`].filter(Boolean).join(' · '))}</p>` : `
                            <p class="font-bold" style="color:${late ? '#DC2626' : 'var(--text-main)'};">${o.dueDate ? fmtD(o.dueDate) : 'Sem prazo'}</p>
                            <p class="text-xs" style="color:var(--text-faint);">${o.deadlineDays ? `${o.deadlineDays} dia(s) úteis` : ''}</p>`}
                        </div>
                        <div class="bg-white rounded-xl border p-3 min-w-0" style="border-color:var(--border);">
                            <p class="label-caps mb-1">Cliente</p>
                            <p class="font-bold truncate" style="color:var(--text-main);">${esc(customer?.name || o.customerName || '—')}</p>
                            <p class="text-xs truncate" style="color:var(--text-faint);">${esc(o.phone || customer?.phone || '')}</p>
                        </div>
                    </div>

                    <!-- Itens -->
                    <div class="bg-white rounded-xl border overflow-hidden" style="border-color:var(--border);">
                        <div class="px-4 py-2.5 border-b label-caps" style="border-color:var(--border);">Itens</div>
                        ${items.map(i => `
                            <div class="px-4 py-3 border-b last:border-0 flex items-start gap-3" style="border-color:#F1F0F7;">
                                <span class="text-sm font-black w-12 text-right flex-shrink-0" style="color:var(--primary);">${Number(i.quantity) || 1}x</span>
                                <div class="flex-1 min-w-0">
                                    <p class="text-sm font-semibold" style="color:var(--text-main);">${esc(i.name || '')}</p>
                                    ${[i.optionsText, i.material, i.colors, i.finish].filter(v => v && v !== '-').length ? `<p class="text-xs" style="color:var(--text-muted);">${[i.optionsText, i.material, i.colors, i.finish].filter(v => v && v !== '-').map(esc).join(' · ')}</p>` : ''}
                                </div>
                                <span class="text-sm font-bold whitespace-nowrap">${fmtBRL(i.price)}</span>
                            </div>`).join('')}
                        <div class="px-4 py-3 text-sm space-y-1" style="background:#FAFBFF;">
                            ${o.subtotal != null ? `<div class="flex justify-between"><span style="color:var(--text-muted);">Subtotal</span><span>${fmtBRL(o.subtotal)}</span></div>` : ''}
                            ${o.discount ? `<div class="flex justify-between"><span style="color:var(--text-muted);">Desconto${o.discountPct ? ` (${Number(o.discountPct).toLocaleString('pt-BR')}%)` : ''}</span><span>- ${fmtBRL(o.discount)}</span></div>` : ''}
                            ${(Number(o.freight) || 0) + (Number(o.urgency) || 0) + (Number(o.art) || 0) ? `<div class="flex justify-between"><span style="color:var(--text-muted);">Frete/adicionais</span><span>+ ${fmtBRL((Number(o.freight) || 0) + (Number(o.urgency) || 0) + (Number(o.art) || 0))}</span></div>` : ''}
                            <div class="flex justify-between text-base font-black pt-1"><span>Total</span><span style="color:var(--primary);">${fmtBRL(o.value)}</span></div>
                            <div class="flex justify-between text-xs"><span style="color:#059669;">Recebido ${fmtBRL(paid)}</span><span style="color:${bal > 0 ? '#B45309' : '#059669'};">${bal > 0 ? `Falta ${fmtBRL(bal)}` : 'Quitado'}</span></div>
                        </div>
                    </div>

                    ${o.notes ? `<div class="bg-white rounded-xl border p-4" style="border-color:var(--border);"><p class="label-caps mb-1">Observações</p><p class="text-sm whitespace-pre-wrap">${esc(o.notes)}</p></div>` : ''}

                    ${(o.history || []).length ? `
                    <div>
                        <p class="label-caps mb-2">Histórico</p>
                        <div class="space-y-1">${[...o.history].reverse().slice(0, 12).map(h => `
                            <p class="text-xs" style="color:var(--text-muted);"><b>${new Date(h.at).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}</b> · ${esc(h.text)}</p>`).join('')}
                        </div>
                    </div>` : ''}
                </div>

                <div class="px-6 py-4 border-t flex flex-wrap gap-2" style="border-color:var(--border);">
                    ${canceled ? '' : `<button type="button" data-act="edit" class="btn-primary !py-2 !px-4 text-xs"><span class="material-symbols-outlined" style="font-size:17px;">edit</span> Editar pedido</button>`}
                    ${!canceled && o.status !== 'Entregue' ? `<button type="button" data-act="deliver" class="btn-primary !py-2 !px-4 text-xs" style="background:#059669;"><span class="material-symbols-outlined" style="font-size:17px;">local_shipping</span> Marcar entregue</button>` : ''}
                    ${action('pay', 'payments', bal > 0 ? 'Registrar pagamento' : 'Pagamentos')}
                    ${action('files', 'folder_open', `Arquivos${nFiles ? ` (${nFiles})` : ''}`)}
                    ${action('sheet', 'print', 'Ficha')}
                    ${action('pdf', 'picture_as_pdf', 'PDF')}
                    ${canceled ? '' : action('cancel', 'cancel', 'Cancelar pedido', 'ml-auto hover:!border-red-400 hover:!text-red-500')}
                </div>
            </div>`;
        };

        const close = () => { el.remove(); document.removeEventListener('keydown', onKey); };
        const onKey = (e) => { if (e.key === 'Escape' && !document.getElementById('ggp-pay-modal') && !document.getElementById('ggp-files-modal')) close(); };
        document.addEventListener('keydown', onKey);

        el.addEventListener('change', (e) => {
            if (!e.target.matches('[data-status]')) return;
            const from = get().status, to = e.target.value;
            if (to === 'Entregue') { e.target.value = from; return OrderDetails.deliver(orderId, () => { onChange?.(); render(); }); }
            if (from !== to) { update({ status: to }, `Status: ${from} → ${to}`); app().then(a => a.toast(`Pedido Nº ${docNo(get())}: ${to}`)); }
        });

        el.addEventListener('click', async (e) => {
            if (e.target === el || e.target.closest('[data-close]')) return close();
            const act = e.target.closest('[data-act]')?.dataset.act;
            if (!act) return;
            const o = get();
            if (act === 'edit') {
                const { default: Quotes } = await import('./pages/quotes.js');
                Quotes.pendingOrderEdit = o.id;
                close();
                (await app()).navigateTo('orcamentos');
            } else if (act === 'deliver') OrderDetails.deliver(o.id, () => { onChange?.(); render(); });
            else if (act === 'pay') Payments.openModal(o.id, () => { onChange?.(); render(); });
            else if (act === 'files') Files.openOrderModal(o, 'Arquivos do pedido', { orderKey: 'orders', onChange: () => { onChange?.(); render(); } });
            else if (act === 'sheet') QuotePDF.productionSheet(o);
            else if (act === 'pdf') QuotePDF.fromOrder(o);
            else if (act === 'cancel') {
                (await app()).confirm({
                    title: `Cancelar o pedido Nº ${docNo(o)}?`,
                    message: 'Ele sai da produção e não conta mais na receita. Dá para reativar depois em Vendas → Cancelados.',
                    type: 'danger', confirmLabel: 'Sim, cancelar',
                    onConfirm: () => update({ previousStatus: o.status, status: 'Cancelado' }, 'Pedido cancelado')
                });
            }
        });

        render();
        document.body.appendChild(el);
    },

    /** Janela "Marcar como entregue": data, forma, quem recebeu e, se faltar, o recebimento do saldo. */
    deliver: (orderId, onChange) => {
        document.getElementById('ggp-deliver-modal')?.remove();
        const o = (DB.get('orders') || []).find(x => String(x.id) === String(orderId));
        if (!o) return;
        const bal = Payments.balance(o);
        const fs = bal > 0.009 ? Payments.fieldset(Number(o.value) || 0, Payments.paid(o), 'dv') : null;
        const el = document.createElement('div');
        el.id = 'ggp-deliver-modal';
        el.className = 'fixed inset-0 z-[130] flex items-center justify-center p-4';
        el.style.cssText = 'background:rgba(10,10,20,0.5); backdrop-filter:blur(8px);';
        el.innerHTML = `
            <div class="w-full max-w-md rounded-2xl bg-white shadow-2xl max-h-[94vh] overflow-y-auto">
                <div class="px-6 pt-6 pb-2 flex items-center gap-3">
                    <div class="w-10 h-10 rounded-xl flex items-center justify-center" style="background:#ECFDF5; color:#059669;"><span class="material-symbols-outlined">local_shipping</span></div>
                    <div>
                        <h3 class="text-lg font-black" style="color:var(--text-main);">Entregar pedido Nº ${esc(docNo(o))}</h3>
                        <p class="text-xs" style="color:var(--text-faint);">${esc(o.customerName || '')}</p>
                    </div>
                </div>
                <div class="px-6 py-4 space-y-4">
                    <div class="grid grid-cols-2 gap-3">
                        <div><label>Data da entrega</label><input type="date" id="dv-date" value="${isoDate(new Date())}"></div>
                        <div><label>Como</label><select id="dv-method">${DELIVERY_METHODS.map(m => `<option>${m}</option>`).join('')}</select></div>
                    </div>
                    <div><label>Recebido por <span class="font-normal" style="color:var(--text-faint);">(opcional)</span></label><input id="dv-to" placeholder="Nome de quem retirou/recebeu"></div>
                    ${fs ? `
                    <div class="pt-4 border-t" style="border-color:var(--border);">
                        <p class="text-sm font-black" style="color:#B45309;">Falta receber ${fmtBRL(bal)}</p>
                        <p class="text-xs mb-3" style="color:var(--text-faint);">Recebeu agora na entrega?</p>
                        ${fs.html}
                    </div>` : `<p class="text-sm font-bold" style="color:#059669;">✓ Pedido já está pago</p>`}
                </div>
                <div class="px-6 py-4 border-t flex justify-end gap-2" style="border-color:var(--border);">
                    <button type="button" data-close class="btn-ghost">Cancelar</button>
                    <button type="button" id="dv-ok" class="btn-primary" style="background:#059669;"><span class="material-symbols-outlined" style="font-size:18px;">check_circle</span> Confirmar entrega</button>
                </div>
            </div>`;
        const read = fs ? fs.bind(el) : null;
        const close = () => el.remove();
        el.addEventListener('click', (e) => { if (e.target === el || e.target.closest('[data-close]')) close(); });
        el.querySelector('#dv-ok').addEventListener('click', async () => {
            const list = DB.get('orders') || [];
            const i = list.findIndex(x => String(x.id) === String(orderId));
            if (i === -1) return close();
            const cur = list[i];
            const date = el.querySelector('#dv-date').value || isoDate(new Date());
            const method = el.querySelector('#dv-method').value;
            const to = el.querySelector('#dv-to').value.trim();
            const pay = read ? Payments.entry(read(), new Date(`${date}T12:00:00`)) : null;
            const base = Array.isArray(cur.payments) ? cur.payments : [];
            list[i] = {
                ...cur, status: 'Entregue', deliveredAt: date, deliveryMethod: method, deliveredTo: to,
                ...(pay ? { payments: [...base, pay] } : {}),
                history: [...(cur.history || []), { at: new Date().toISOString(), text: `Entregue (${method}${to ? ` para ${to}` : ''})${pay ? ` · recebido ${fmtBRL(pay.amount)} (${pay.method})` : ''}` }]
            };
            DB.save('orders', list);
            close();
            onChange?.();
            (await app()).toast(`Pedido Nº ${docNo(list[i])} entregue ✓`);
        });
        document.body.appendChild(el);
    }
};

export default OrderDetails;
