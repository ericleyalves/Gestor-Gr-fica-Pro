/**
 * receipts.js — Aba "Recibos"
 *
 * Gera recibo avulso ou a partir de um pedido (cliente, documento, valor recebido
 * e descrição já preenchidos). O recibo sai com a logo, cores e dados da gráfica
 * (Configurações → Perfil da gráfica), valor por extenso, numeração sequencial e
 * assinatura salva (ou linha para assinar). Imprime/salva em PDF (via do cliente) e manda pelo
 * WhatsApp. Os recibos emitidos ficam no histórico (chave "receipts", sincronizada).
 */
import DB from '../db.js';
import App from '../app.js';
import { fmtBRL, esc, isoDate, docNo, nextNumber } from '../utils.js';
import Payments, { METHODS } from '../payments.js';
import QuotePDF from '../pdf.js';
import Signature from '../signature.js';
import WaMessage, { waPhone } from '../wa-message.js';
import { extenso } from '../extenso.js';

const KEY = 'receipts';
const validColor = (c) => (/^#[0-9a-f]{6}$/i.test(String(c || '')) ? c : '#6C2BFF');
const fmtDate = (iso) => { const [y, m, d] = String(iso || '').split('-'); return d ? `${d}/${m}/${y}` : ''; };
const longDate = (iso) => {
    const [y, m, d] = String(iso || isoDate(new Date())).split('-').map(Number);
    return new Date(y, m - 1, d).toLocaleDateString('pt-BR', { day: 'numeric', month: 'long', year: 'numeric' });
};
const cityOf = (shop) => shop.pixCity || (String(shop.address || '').match(/([A-Za-zÀ-ÿ' ]+)\s*[\/-]\s*[A-Z]{2}\b/)?.[1] || '').trim();
const num = (v) => Number(String(v ?? '').replace(/\./g, '').replace(',', '.')) || 0;
const list = () => DB.get(KEY) || [];

const Receipts = {
    pendingOrder: null,   // id de pedido para abrir a aba já preenchida (vem do detalhe do pedido)

    render: (container) => {
        Receipts.container = container;
        const shop = DB.get('shop_profile') || {};
        const customers = (DB.get('customers') || []).slice().sort((a, b) => String(a.name || '').localeCompare(String(b.name || '')));
        const orders = (DB.get('orders') || []).filter(o => o.status !== 'Cancelado')
            .sort((a, b) => (Number(b.number) || 0) - (Number(a.number) || 0)).slice(0, 200);
        const issued = list().slice().sort((a, b) => (Number(b.number) || 0) - (Number(a.number) || 0));
        const lbl = 'text-xs font-black text-slate-400 uppercase mb-1 block';

        container.innerHTML = `
        <div class="max-w-[1400px] mx-auto flex flex-col gap-6 pb-12 animate-in fade-in duration-500">
            <div>
                <h2 class="text-3xl font-black text-slate-800">Recibos</h2>
                <p class="text-slate-500 font-medium">Gere o recibo com a logo da gráfica, imprima ou envie pelo WhatsApp.</p>
            </div>
            ${shop.logo ? '' : `<div class="section-card !py-3 text-sm flex items-center gap-2" style="background:#FFFBEB;color:#B45309;">
                <span class="material-symbols-outlined">info</span>Cadastre a logo em <b>Configurações → Perfil da gráfica</b> para ela sair no recibo.</div>`}

            <div class="grid grid-cols-1 xl:grid-cols-5 gap-6">
                <form id="rc-form" class="section-card xl:col-span-3 grid grid-cols-1 md:grid-cols-2 gap-4" autocomplete="off">
                    <div class="md:col-span-2">
                        <label class="${lbl}">Gerar a partir de um pedido (opcional)</label>
                        <select id="rc-order" class="w-full">
                            <option value="">— Recibo avulso —</option>
                            ${orders.map(o => `<option value="${esc(o.id)}">Nº ${esc(docNo(o))} · ${esc(o.customerName || 'Cliente')} · ${fmtBRL(o.value)}${Payments.paid(o) ? ` (pago ${fmtBRL(Payments.paid(o))})` : ''}</option>`).join('')}
                        </select>
                    </div>
                    <div>
                        <label class="${lbl}">Recebido de *</label>
                        <input id="rc-payer" list="rc-customers" required class="w-full" placeholder="Nome do cliente">
                        <datalist id="rc-customers">${customers.map(c => `<option value="${esc(c.name)}">`).join('')}</datalist>
                    </div>
                    <div>
                        <label class="${lbl}">CPF / CNPJ</label>
                        <input id="rc-doc" class="w-full" placeholder="Opcional">
                    </div>
                    <div>
                        <label class="${lbl}">Valor (R$) *</label>
                        <input id="rc-amount" required inputmode="decimal" class="w-full" placeholder="0,00">
                    </div>
                    <div>
                        <label class="${lbl}">Forma de pagamento</label>
                        <select id="rc-method" class="w-full">${METHODS.map(m => `<option>${m}</option>`).join('')}</select>
                    </div>
                    <div class="md:col-span-2">
                        <p id="rc-words" class="text-xs italic text-slate-500 -mt-2">&nbsp;</p>
                    </div>
                    <div class="md:col-span-2">
                        <label class="${lbl}">Referente a *</label>
                        <input id="rc-ref" required class="w-full" placeholder="Ex.: 100 cartões de visita / sinal do pedido Nº 012">
                    </div>
                    <div>
                        <label class="${lbl}">Data</label>
                        <input id="rc-date" type="date" class="w-full" value="${isoDate(new Date())}">
                    </div>
                    <div>
                        <label class="${lbl}">Cidade</label>
                        <input id="rc-city" class="w-full" value="${esc(cityOf(shop))}" placeholder="Ex.: Maceió/AL">
                    </div>
                    <div class="md:col-span-2 flex flex-wrap items-center gap-3 p-3 rounded-xl" style="background:#F8F7FC; border:1px solid #ECEAF3;">
                        ${shop.signature
                            ? `<img src="${esc(shop.signature)}" alt="Assinatura" style="height:46px; max-width:180px; object-fit:contain;">
                               <label class="flex items-center gap-2 text-sm text-slate-600"><input type="checkbox" id="rc-signed" checked> Sair assinado</label>`
                            : '<span class="text-sm text-slate-500">Sem assinatura salva — o recibo sai com a linha para assinar à mão.</span>'}
                        <button type="button" id="rc-sign" class="btn-ghost !py-1.5 !px-3 text-xs ml-auto"><span class="material-symbols-outlined text-[18px]">draw</span> ${shop.signature ? 'Trocar assinatura' : 'Cadastrar assinatura'}</button>
                        ${shop.signature ? '<button type="button" id="rc-sign-del" class="btn-ghost !py-1.5 !px-3 text-xs hover:!text-red-500">Remover</button>' : ''}
                    </div>
                    <div class="md:col-span-2 flex flex-wrap gap-3 pt-2">
                        <button type="submit" class="btn-primary flex items-center gap-2"><span class="material-symbols-outlined text-[20px]">print</span> Gerar e imprimir / PDF</button>
                        <button type="button" id="rc-wa" class="btn-ghost flex items-center gap-2"><span class="material-symbols-outlined text-[20px]">chat</span> Gerar e enviar no WhatsApp</button>
                        <button type="button" id="rc-clear" class="btn-ghost">Limpar</button>
                    </div>
                </form>

                <div class="section-card xl:col-span-2">
                    <h3 class="section-heading flex items-center gap-2 mb-3"><span class="material-symbols-outlined" style="color:var(--primary);">receipt_long</span> Recibos emitidos <span class="text-slate-400 text-sm">${issued.length}</span></h3>
                    <div class="flex flex-col max-h-[560px] overflow-y-auto" id="rc-list">
                        ${issued.length ? issued.map(r => `
                        <div class="flex items-center gap-3 py-2.5 border-b last:border-0" style="border-color:#F1F0F7;">
                            <div class="flex-1 min-w-0">
                                <p class="text-sm font-semibold truncate text-slate-800">Nº ${esc(docNo(r))} · ${esc(r.payer)}</p>
                                <p class="text-xs truncate text-slate-500">${fmtDate(r.date)} · <b>${fmtBRL(r.amount)}</b> · ${esc(r.ref)}</p>
                            </div>
                            <button type="button" data-rc="print" data-id="${esc(r.id)}" title="Imprimir de novo" class="p-1.5 rounded-lg hover:bg-slate-100 text-slate-500"><span class="material-symbols-outlined text-[20px]">print</span></button>
                            <button type="button" data-rc="wa" data-id="${esc(r.id)}" title="Enviar no WhatsApp" class="p-1.5 rounded-lg hover:bg-slate-100 text-slate-500"><span class="material-symbols-outlined text-[20px]">chat</span></button>
                            <button type="button" data-rc="del" data-id="${esc(r.id)}" title="Excluir" class="p-1.5 rounded-lg hover:bg-red-50 text-slate-400 hover:text-red-500"><span class="material-symbols-outlined text-[20px]">delete</span></button>
                        </div>`).join('') : '<p class="text-sm text-slate-400 italic py-6 text-center">Nenhum recibo ainda.</p>'}
                    </div>
                </div>
            </div>
        </div>`;

        Receipts.bind(container);
        if (Receipts.pendingOrder) {
            const id = Receipts.pendingOrder;
            Receipts.pendingOrder = null;
            const sel = container.querySelector('#rc-order');
            if ([...sel.options].some(op => op.value === String(id))) { sel.value = String(id); Receipts.fillFromOrder(id); }
        }
    },

    fillFromOrder: (orderId) => {
        const c = Receipts.container;
        const o = (DB.get('orders') || []).find(x => String(x.id) === String(orderId));
        if (!o) return;
        const cust = (DB.get('customers') || []).find(x => String(x.id) === String(o.customerId));
        const paid = Payments.paid(o);
        const last = (o.payments || []).slice(-1)[0];
        const amount = paid > 0 ? paid : Number(o.value) || 0;
        const balance = Payments.balance(o);
        const product = String(o.productName || '').trim();
        c.querySelector('#rc-payer').value = cust?.name || o.customerName || '';
        c.querySelector('#rc-doc').value = cust?.document || '';
        c.querySelector('#rc-amount').value = amount.toFixed(2).replace('.', ',');
        c.querySelector('#rc-ref').value = `${balance > 0.009 && paid > 0 ? 'Pagamento parcial do ' : ''}Pedido Nº ${docNo(o)}${product ? ` – ${product.slice(0, 120)}` : ''}`;
        if (last?.method && METHODS.includes(last.method)) c.querySelector('#rc-method').value = last.method;
        Receipts.updateWords();
    },

    updateWords: () => {
        const c = Receipts.container, v = num(c.querySelector('#rc-amount').value);
        c.querySelector('#rc-words').textContent = v > 0 ? `(${extenso(v)})` : ' ';
    },

    /** Lê o formulário, valida e salva no histórico. */
    issue: () => {
        const c = Receipts.container, f = c.querySelector('#rc-form');
        if (!f.reportValidity()) return null;
        const amount = Math.round(num(c.querySelector('#rc-amount').value) * 100) / 100;
        if (amount <= 0) { App.toast('Informe um valor maior que zero.', 'error'); return null; }
        const payer = c.querySelector('#rc-payer').value.trim();
        const cust = (DB.get('customers') || []).find(x => String(x.name || '').trim().toLowerCase() === payer.toLowerCase());
        const all = list();
        const r = {
            id: `rc_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`,
            number: nextNumber(all),
            date: c.querySelector('#rc-date').value || isoDate(new Date()),
            payer, payerDoc: c.querySelector('#rc-doc').value.trim(),
            customerId: cust?.id || null,
            orderId: c.querySelector('#rc-order').value || null,
            amount, method: c.querySelector('#rc-method').value,
            ref: c.querySelector('#rc-ref').value.trim(),
            city: c.querySelector('#rc-city').value.trim(),
            signed: !!(Signature.get() && c.querySelector('#rc-signed')?.checked),
            createdAt: new Date().toISOString()
        };
        DB.save(KEY, [...all, r]);
        if (r.orderId) {   // registra no histórico do pedido
            const orders = DB.get('orders') || [];
            const i = orders.findIndex(o => String(o.id) === String(r.orderId));
            if (i > -1) {
                orders[i] = { ...orders[i], history: [...(orders[i].history || []), { at: r.createdAt, text: `Recibo Nº ${docNo(r)} emitido (${fmtBRL(r.amount)})` }] };
                DB.save('orders', orders);
            }
        }
        return r;
    },

    /** HTML do recibo para impressão (A4; 1 via ou 2 vias com linha de corte). */
    html: async (r, twoCopies = false) => {
        await QuotePDF.ensureBrandColors();
        const shop = DB.get('shop_profile') || {};
        const brand = validColor(shop.brandColor);
        const brand2 = /^#[0-9a-f]{6}$/i.test(String(shop.brandColor2 || '')) ? shop.brandColor2 : brand;
        const name = shop.name || 'Minha Gráfica';
        const initials = name.split(/\s+/).filter(Boolean).slice(0, 2).map(w => w[0]).join('').toUpperCase();
        const contacts = [shop.cnpj && `CNPJ ${shop.cnpj}`, shop.phone, shop.email, shop.instagram && `@${String(shop.instagram).replace(/^@/, '')}`]
            .filter(Boolean).map(esc).join(' · ');
        const via = (label) => `
        <section class="rc">
            <header>
                <div class="brand">
                    <div class="logo">${shop.logo
                        ? `<img src="${esc(shop.logo)}" alt="" onerror="this.outerHTML='<span class=&quot;ini&quot;>${esc(initials)}</span>'">`
                        : `<span class="ini">${esc(initials)}</span>`}</div>
                    <div>
                        <h1>${esc(name)}</h1>
                        ${contacts ? `<p>${contacts}</p>` : ''}
                        ${shop.address ? `<p>${esc(shop.address)}</p>` : ''}
                    </div>
                </div>
                <div class="doc">
                    <div class="kind">RECIBO</div>
                    <div class="no">Nº ${esc(docNo(r))}</div>
                </div>
            </header>
            <div class="value"><span>Valor</span><strong>${fmtBRL(r.amount)}</strong></div>
            <p class="body">
                Recebi(emos) de <b>${esc(r.payer)}</b>${r.payerDoc ? `, CPF/CNPJ <b>${esc(r.payerDoc)}</b>,` : ''}
                a importância de <b>${fmtBRL(r.amount)}</b> (<i>${esc(extenso(r.amount))}</i>),
                referente a <b>${esc(r.ref)}</b>${r.method ? `, pago em <b>${esc(r.method)}</b>` : ''}.
            </p>
            <p class="body">Para maior clareza, firmo(amos) o presente recibo, dando plena quitação do valor acima.</p>
            <div class="foot">
                <p>${r.city ? `${esc(r.city)}, ` : ''}${esc(longDate(r.date))}.</p>
                <div class="sign">${r.signed && shop.signature ? `<img src="${esc(shop.signature)}" alt="">` : ''}<div class="line">${esc(name)}${shop.cnpj ? `<br>CNPJ ${esc(shop.cnpj)}` : ''}</div></div>
            </div>
            ${twoCopies ? `<p class="via">${label}</p>` : ''}
        </section>`;

        return `<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><title>Recibo Nº ${esc(docNo(r))} - ${esc(r.payer)}</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Poppins:wght@700;800&display=swap" rel="stylesheet">
<style>
    @page { size: A4; margin: 0; }
    * { box-sizing: border-box; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
    body { margin: 0; font-family: 'Inter', system-ui, sans-serif; color: #17151F; font-size: 12px; }
    :root { --brand: ${brand}; --brand2: ${brand2}; }
    .rc { height: 148.5mm; padding: 11mm 15mm 8mm; position: relative; display: flex; flex-direction: column; }
    .rc + .rc { border-top: 1px dashed #b9b6c6; }
    .rc + .rc::before { content: '✂'; position: absolute; top: -9px; left: 8mm; font-size: 14px; color: #8a8799; background: #fff; padding: 0 2mm; }
    header { display: flex; justify-content: space-between; align-items: center; gap: 8mm; padding-bottom: 4mm;
             border-bottom: 1.6mm solid; border-image: linear-gradient(90deg, var(--brand), var(--brand2)) 1; }
    .brand { display: flex; align-items: center; gap: 4mm; min-width: 0; }
    .logo { width: 22mm; height: 22mm; border-radius: 4mm; display: flex; align-items: center; justify-content: center; flex-shrink: 0;
            border: 1px solid #ECEAF3; padding: 1.5mm; background: #fff; }
    .logo img { max-width: 100%; max-height: 100%; object-fit: contain; }
    .logo .ini { font-family: 'Poppins', sans-serif; font-weight: 800; font-size: 22px; color: var(--brand); }
    h1 { margin: 0; font-family: 'Poppins', sans-serif; font-size: 17px; font-weight: 800; letter-spacing: -.01em; }
    .brand p { margin: .8mm 0 0; font-size: 9.5px; color: #6B6880; }
    .doc { text-align: right; flex-shrink: 0; }
    .kind { font-family: 'Poppins', sans-serif; font-size: 24px; font-weight: 800; letter-spacing: .08em; color: var(--brand); line-height: 1; }
    .no { margin-top: 2mm; display: inline-block; padding: 1mm 3mm; border-radius: 99px; background: var(--brand); color: #fff; font-weight: 700; font-size: 10.5px; }
    .value { align-self: flex-end; margin-top: 5mm; display: flex; align-items: center; gap: 4mm; padding: 2.5mm 5mm; border-radius: 3mm;
             background: linear-gradient(115deg, var(--brand), var(--brand2)); color: #fff; }
    .value span { font-size: 9px; font-weight: 700; letter-spacing: .14em; text-transform: uppercase; opacity: .9; }
    .value strong { font-family: 'Poppins', sans-serif; font-size: 20px; font-weight: 800; }
    .body { font-size: 12.5px; line-height: 1.75; margin: 5mm 0 0; text-align: justify; }
    .body + .body { margin-top: 2mm; }
    .foot { margin-top: auto; display: flex; justify-content: space-between; align-items: flex-end; gap: 10mm; padding-top: 8mm; }
    .foot p { margin: 0; font-size: 11.5px; }
    .sign { width: 75mm; text-align: center; font-size: 10px; color: #3a3748; }
    .sign img { display: block; max-width: 68mm; max-height: 20mm; margin: 0 auto -2.5mm; object-fit: contain; }
    .sign .line { border-top: 1px solid #17151F; padding-top: 1.5mm; }
    .via { position: absolute; right: 15mm; bottom: 3mm; margin: 0; font-size: 8.5px; letter-spacing: .12em; text-transform: uppercase; color: #9a97aa; }
</style></head><body>
${via('Via do cliente')}${twoCopies ? via('Via da gráfica') : ''}
</body></html>`;
    },

    print: async (r, twoCopies = false) => QuotePDF.print(await Receipts.html(r, twoCopies)),

    message: (r) => {
        const shop = DB.get('shop_profile') || {};
        const first = String(r.payer || '').trim().split(/\s+/)[0];
        return [
            `Oi${first ? `, ${first}` : ''}! 😊`,
            `Confirmamos o recebimento de *${fmtBRL(r.amount)}* (${extenso(r.amount)}), referente a ${r.ref}${r.method ? `, pago em ${r.method}` : ''}.`,
            `Recibo Nº ${docNo(r)} · ${fmtDate(r.date)}`,
            '', 'Obrigado pela preferência!',
            shop.name ? `— ${shop.name}${shop.cnpj ? ` (CNPJ ${shop.cnpj})` : ''}` : ''
        ].filter(s => s !== null).join('\n').trim();
    },

    sendWa: (r) => {
        const cust = (DB.get('customers') || []).find(x => String(x.id) === String(r.customerId));
        const order = r.orderId ? (DB.get('orders') || []).find(o => String(o.id) === String(r.orderId)) : null;
        WaMessage.open({
            title: `Enviar recibo Nº ${docNo(r)}`, subtitle: `${r.payer} · ${fmtBRL(r.amount)}`,
            icon: 'receipt_long', message: Receipts.message(r),
            phone: waPhone(order?.phone) || waPhone(cust?.phone) || null,
            hint: 'Para mandar o PDF: clique em imprimir, escolha "Salvar como PDF" e anexe na conversa.'
        });
    },

    bind: (container) => {
        const $ = (s) => container.querySelector(s);
        $('#rc-order').addEventListener('change', (e) => { if (e.target.value) Receipts.fillFromOrder(e.target.value); });
        $('#rc-amount').addEventListener('input', Receipts.updateWords);
        $('#rc-payer').addEventListener('change', (e) => {
            const cust = (DB.get('customers') || []).find(x => String(x.name || '').trim().toLowerCase() === e.target.value.trim().toLowerCase());
            if (cust?.document && !$('#rc-doc').value) $('#rc-doc').value = cust.document;
        });
        $('#rc-clear').addEventListener('click', () => Receipts.render(container));
        $('#rc-sign').addEventListener('click', () => Signature.open(() => Receipts.render(container)));
        $('#rc-sign-del')?.addEventListener('click', () => App.confirm({
            title: 'Remover a assinatura?', message: 'Os próximos recibos saem só com a linha para assinar à mão.',
            type: 'danger', confirmLabel: 'Sim, remover',
            onConfirm: () => { Signature.save(''); Receipts.render(container); }
        }));
        $('#rc-form').addEventListener('submit', (e) => {
            e.preventDefault();
            const r = Receipts.issue();
            if (!r) return;
            Receipts.print(r);
            App.toast(`Recibo Nº ${docNo(r)} gerado — escolha a impressora ou "Salvar como PDF"`);
            Receipts.render(container);
        });
        $('#rc-wa').addEventListener('click', () => {
            const r = Receipts.issue();
            if (!r) return;
            Receipts.render(container);
            Receipts.sendWa(r);
        });
        $('#rc-list').addEventListener('click', (e) => {
            const b = e.target.closest('[data-rc]');
            if (!b) return;
            const r = list().find(x => x.id === b.dataset.id);
            if (!r) return;
            if (b.dataset.rc === 'print') Receipts.print(r);
            else if (b.dataset.rc === 'wa') Receipts.sendWa(r);
            else if (b.dataset.rc === 'del') App.confirm({
                title: `Excluir o recibo Nº ${docNo(r)}?`, message: 'Ele sai do histórico. O número não é reaproveitado se houver recibos depois dele.',
                type: 'danger', confirmLabel: 'Sim, excluir',
                onConfirm: () => { DB.save(KEY, list().filter(x => x.id !== r.id)); Receipts.render(container); }
            });
        });
    }
};

export default Receipts;
