/**
 * shipments.js — Aba "Encomendas" (rastreio de envios)
 *
 * Cadastre o código de rastreio de cada envio (Correios ou transportadora),
 * ligado ou não a um pedido. A lista mostra há quantos dias foi postado,
 * destaca os atrasados, abre o rastreio no site oficial e manda o código +
 * link para o cliente no WhatsApp. O status é atualizado por você (os Correios
 * não liberam consulta automática sem contrato).
 * Dados na chave "shipments" (app_settings, sincroniza com a nuvem).
 */
import DB from '../db.js';
import App from '../app.js';
import { esc, isoDate, docNo, fmtBRL } from '../utils.js';
import WaMessage, { waPhone } from '../wa-message.js';

const KEY = 'shipments';
const LATE_DAYS = 10;
const CARRIERS = ['Correios', 'Jadlog', 'Loggi', 'J&T Express', 'Mercado Envios', 'Outra'];
const STATUS = [
    { id: 'Postado',           color: '#6C2BFF', bg: '#F1EBFF', icon: 'inventory_2' },
    { id: 'Em trânsito',       color: '#2563EB', bg: '#EFF6FF', icon: 'local_shipping' },
    { id: 'Saiu para entrega', color: '#B45309', bg: '#FEF3C7', icon: 'directions_run' },
    { id: 'Entregue',          color: '#059669', bg: '#ECFDF5', icon: 'task_alt' },
    { id: 'Problema',          color: '#DC2626', bg: '#FEF2F2', icon: 'report' }
];
const FILTERS = [
    { id: 'abertas', label: 'A caminho', test: (s) => !['Entregue'].includes(s.status) },
    { id: 'entregues', label: 'Entregues', test: (s) => s.status === 'Entregue' },
    { id: 'todas', label: 'Todas', test: () => true }
];
const isCorreios = (code) => /^[A-Z]{2}\d{9}[A-Z]{2}$/.test(code);
const fmtDate = (iso) => { const [y, m, d] = String(iso || '').split('-'); return d ? `${d}/${m}/${y}` : ''; };
const daysSince = (iso) => {
    if (!iso) return 0;
    const [y, m, d] = iso.split('-').map(Number);
    return Math.max(0, Math.floor((new Date().setHours(0, 0, 0, 0) - new Date(y, m - 1, d)) / 86400000));
};
const list = () => DB.get(KEY) || [];
const statusOf = (id) => STATUS.find(s => s.id === id) || STATUS[0];

/** Link de rastreio: site oficial quando é seguro, senão o 17TRACK (aceita qualquer transportadora). */
export const trackUrl = (s) => {
    const c = encodeURIComponent(s.code || '');
    if (s.carrier === 'Outra' && /^https?:\/\//.test(s.url || '')) return s.url;
    if (s.carrier === 'Correios') return `https://rastreamento.correios.com.br/app/index.php?objetos=${c}`;
    if (s.carrier === 'Loggi') return `https://www.loggi.com/rastreador/${c}`;
    return `https://t.17track.net/pt#nums=${c}`;
};
/** Link para mandar ao cliente (Correios: página sem captcha, boa no celular). */
const clientUrl = (s) => (s.carrier === 'Correios' ? `https://www.linkcorreios.com.br/?id=${encodeURIComponent(s.code)}` : trackUrl(s));

const Shipments = {
    filter: 'abertas',
    query: '',
    editing: null,      // id em edição
    pendingOrder: null, // id de pedido vindo do detalhe do pedido

    render: (container) => {
        Shipments.container = container;
        const orders = (DB.get('orders') || []).filter(o => o.status !== 'Cancelado')
            .sort((a, b) => (Number(b.number) || 0) - (Number(a.number) || 0)).slice(0, 200);
        const products = [...new Set((DB.get('products') || []).map(p => String(p.name || '').trim()).filter(Boolean))].sort();
        const customers = (DB.get('customers') || []).slice().sort((a, b) => String(a.name || '').localeCompare(String(b.name || '')));
        const all = list();
        const f = FILTERS.find(x => x.id === Shipments.filter) || FILTERS[0];
        const q = Shipments.query.trim().toLowerCase();
        const rows = all.filter(f.test)
            .filter(s => !q || [s.code, s.customerName, s.product, s.carrier, s.orderNo].some(v => String(v || '').toLowerCase().includes(q)))
            .sort((a, b) => (a.status === 'Entregue') - (b.status === 'Entregue') || String(b.postedAt).localeCompare(String(a.postedAt)));
        const open = all.filter(s => s.status !== 'Entregue');
        const late = open.filter(s => daysSince(s.postedAt) >= LATE_DAYS);
        const ed = all.find(s => s.id === Shipments.editing) || null;
        const lbl = 'text-xs font-black text-slate-400 uppercase mb-1 block';

        container.innerHTML = `
        <div class="max-w-[1400px] mx-auto flex flex-col gap-6 pb-12 animate-in fade-in duration-500">
            <div class="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h2 class="text-3xl font-black text-slate-800">Encomendas</h2>
                    <p class="text-slate-500 font-medium">Códigos de rastreio dos envios — Correios e transportadoras.</p>
                </div>
                <div class="flex gap-3 text-sm">
                    <span class="px-3 py-1.5 rounded-full font-bold" style="background:#EFF6FF;color:#2563EB;">${open.length} a caminho</span>
                    ${late.length ? `<span class="px-3 py-1.5 rounded-full font-bold" style="background:#FEF2F2;color:#DC2626;">${late.length} há ${LATE_DAYS}+ dias</span>` : ''}
                </div>
            </div>

            <form id="sh-form" class="section-card grid grid-cols-1 md:grid-cols-6 gap-4" autocomplete="off">
                <h3 class="md:col-span-6 section-heading flex items-center gap-2"><span class="material-symbols-outlined" style="color:var(--primary);">${ed ? 'edit' : 'add_box'}</span>${ed ? `Editar encomenda ${esc(ed.code)}` : 'Nova encomenda'}</h3>
                <div class="md:col-span-2">
                    <label class="${lbl}">Código de rastreio *</label>
                    <input id="sh-code" required class="w-full font-mono uppercase" placeholder="Ex.: AA123456789BR" value="${esc(ed?.code || '')}">
                </div>
                <div class="md:col-span-2">
                    <label class="${lbl}">Transportadora</label>
                    <select id="sh-carrier" class="w-full">${CARRIERS.map(c => `<option ${(ed?.carrier || 'Correios') === c ? 'selected' : ''}>${c}</option>`).join('')}</select>
                </div>
                <div class="md:col-span-2">
                    <label class="${lbl}">Data da postagem</label>
                    <input id="sh-date" type="date" class="w-full" value="${esc(ed?.postedAt || isoDate(new Date()))}">
                </div>
                <div class="md:col-span-2">
                    <label class="${lbl}">Pedido (opcional)</label>
                    <select id="sh-order" class="w-full">
                        <option value="">— Sem pedido —</option>
                        ${orders.map(o => `<option value="${esc(o.id)}" ${String(ed?.orderId) === String(o.id) ? 'selected' : ''}>Nº ${esc(docNo(o))} · ${esc(o.customerName || 'Cliente')}</option>`).join('')}
                    </select>
                </div>
                <div class="md:col-span-2">
                    <label class="${lbl}">Cliente *</label>
                    <input id="sh-customer" list="sh-customers" required class="w-full" placeholder="Nome do cliente" value="${esc(ed?.customerName || '')}">
                    <datalist id="sh-customers">${customers.map(c => `<option value="${esc(c.name)}">`).join('')}</datalist>
                </div>
                <div class="md:col-span-2">
                    <label class="${lbl}">WhatsApp do cliente</label>
                    <input id="sh-phone" class="w-full" placeholder="Para avisar o código" value="${esc(ed?.phone || '')}">
                </div>
                <div class="md:col-span-2">
                    <label class="${lbl}">Produto *</label>
                    <input id="sh-product" list="sh-products" required class="w-full" placeholder="O que foi enviado" value="${esc(ed?.product || '')}">
                    <datalist id="sh-products">${products.map(n => `<option value="${esc(n)}">`).join('')}</datalist>
                </div>
                <div class="md:col-span-2 ${ (ed?.carrier || 'Correios') === 'Outra' ? '' : 'hidden'}" id="sh-url-wrap">
                    <label class="${lbl}">Link de rastreio da transportadora</label>
                    <input id="sh-url" class="w-full" placeholder="https://…" value="${esc(ed?.url || '')}">
                </div>
                <div class="md:col-span-2">
                    <label class="${lbl}">Frete pago (R$)</label>
                    <input id="sh-cost" inputmode="decimal" class="w-full" placeholder="Opcional" value="${ed?.cost ? String(ed.cost).replace('.', ',') : ''}">
                </div>
                <div class="md:col-span-2">
                    <label class="${lbl}">Observação</label>
                    <input id="sh-note" class="w-full" placeholder="Ex.: PAC, 2 caixas" value="${esc(ed?.note || '')}">
                </div>
                <div class="md:col-span-6 flex flex-wrap gap-3">
                    <button type="submit" class="btn-primary flex items-center gap-2"><span class="material-symbols-outlined text-[20px]">${ed ? 'save' : 'add'}</span> ${ed ? 'Salvar alterações' : 'Adicionar encomenda'}</button>
                    <label class="flex items-center gap-2 text-sm text-slate-600 ${ed ? 'hidden' : ''}"><input type="checkbox" id="sh-notify" checked> Avisar o cliente no WhatsApp ao salvar</label>
                    ${ed ? '<button type="button" id="sh-cancel-edit" class="btn-ghost">Cancelar edição</button>' : ''}
                </div>
            </form>

            <div class="section-card">
                <div class="flex flex-wrap items-center gap-3 mb-4">
                    <div class="flex gap-1 p-1 rounded-xl" style="background:#F4F3F9;">
                        ${FILTERS.map(x => `<button type="button" data-filter="${x.id}" class="px-3 py-1.5 rounded-lg text-sm font-bold ${x.id === f.id ? 'bg-white shadow-sm text-slate-800' : 'text-slate-500'}">${x.label} <span class="text-slate-400">${all.filter(x.test).length}</span></button>`).join('')}
                    </div>
                    <input id="sh-search" class="ml-auto w-full md:w-72" placeholder="Buscar código, cliente, pedido…" value="${esc(Shipments.query)}">
                </div>
                <div id="sh-list" class="flex flex-col">
                    ${rows.length ? rows.map(Shipments.row).join('') : `
                    <div class="text-center py-12">
                        <span class="material-symbols-outlined text-4xl text-slate-300">local_shipping</span>
                        <p class="text-sm font-bold mt-2 text-slate-500">${all.length ? 'Nada neste filtro' : 'Nenhuma encomenda cadastrada'}</p>
                        <p class="text-xs mt-1 text-slate-400">Cadastre o código de rastreio no formulário acima.</p>
                    </div>`}
                </div>
            </div>
        </div>`;

        Shipments.bind(container);
        if (Shipments.pendingOrder) {
            const id = Shipments.pendingOrder;
            Shipments.pendingOrder = null;
            const sel = container.querySelector('#sh-order');
            if ([...sel.options].some(o => o.value === String(id))) { sel.value = String(id); Shipments.fillFromOrder(id); }
            container.querySelector('#sh-code').focus();
        }
    },

    row: (s) => {
        const st = statusOf(s.status);
        const days = daysSince(s.postedAt);
        const late = s.status !== 'Entregue' && days >= LATE_DAYS;
        return `
        <div class="flex flex-wrap md:flex-nowrap items-center gap-3 py-3 border-b last:border-0" style="border-color:#F1F0F7;" data-id="${esc(s.id)}">
            <div class="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0" style="background:${st.bg};color:${st.color};">
                <span class="material-symbols-outlined">${st.icon}</span>
            </div>
            <div class="flex-1 min-w-[200px]">
                <div class="flex flex-wrap items-center gap-2">
                    <button type="button" data-sh="copy" class="font-mono font-bold text-slate-800 hover:text-[var(--primary)]" title="Copiar código">${esc(s.code)}</button>
                    <span class="text-[11px] font-bold px-2 py-0.5 rounded-md bg-slate-100 text-slate-500">${esc(s.carrier)}</span>
                    ${s.orderNo ? `<span class="text-[11px] font-bold" style="color:var(--primary);">Pedido Nº ${esc(s.orderNo)}</span>` : ''}
                </div>
                ${s.product ? `<p class="text-sm font-semibold text-slate-800 truncate">${esc(s.product)}</p>` : ''}
                <p class="text-sm text-slate-600 truncate">${esc(s.customerName || '')}${s.note ? ` · <span class="text-slate-400">${esc(s.note)}</span>` : ''}</p>
                <p class="text-xs ${late ? 'font-bold' : ''}" style="color:${late ? '#DC2626' : 'var(--text-faint)'};">
                    Postado em ${fmtDate(s.postedAt)}${s.status === 'Entregue' ? (s.deliveredAt ? ` · entregue em ${fmtDate(s.deliveredAt)}` : '') : ` · há ${days} dia(s)${late ? ' — verifique o rastreio' : ''}`}${s.cost ? ` · frete ${fmtBRL(s.cost)}` : ''}${s.notifiedAt ? ' · cliente avisado ✓' : ''}
                </p>
            </div>
            <select data-sh="status" class="text-sm font-bold !py-1.5 !w-auto" style="color:${st.color}; border-radius:10px;">
                ${STATUS.map(x => `<option ${x.id === s.status ? 'selected' : ''}>${x.id}</option>`).join('')}
            </select>
            <div class="flex gap-1">
                <a href="${esc(trackUrl(s))}" target="_blank" rel="noopener" class="btn-ghost !py-1.5 !px-3 text-xs" title="Abrir o rastreio no site"><span class="material-symbols-outlined text-[18px]">travel_explore</span> Rastrear</a>
                <button type="button" data-sh="wa" class="w-9 h-9 flex items-center justify-center rounded-lg hover:bg-[#25D366]/20 text-[#075E54]" title="Mandar código e link para o cliente"><span class="material-symbols-outlined text-[18px]">chat</span></button>
                <button type="button" data-sh="edit" class="w-9 h-9 flex items-center justify-center rounded-lg hover:bg-slate-100 text-slate-500" title="Editar"><span class="material-symbols-outlined text-[18px]">edit</span></button>
                <button type="button" data-sh="del" class="w-9 h-9 flex items-center justify-center rounded-lg hover:bg-red-50 hover:text-red-500 text-slate-400" title="Excluir"><span class="material-symbols-outlined text-[18px]">delete</span></button>
            </div>
        </div>`;
    },

    fillFromOrder: (orderId) => {
        const c = Shipments.container;
        const o = (DB.get('orders') || []).find(x => String(x.id) === String(orderId));
        if (!o) return;
        const cust = (DB.get('customers') || []).find(x => String(x.id) === String(o.customerId));
        c.querySelector('#sh-customer').value = cust?.name || o.customerName || '';
        c.querySelector('#sh-phone').value = o.phone || cust?.phone || '';
        c.querySelector('#sh-product').value = String(o.productName || '').slice(0, 200);
    },

    message: (s) => {
        const shop = DB.get('shop_profile') || {};
        const first = String(s.customerName || '').trim().split(/\s+/)[0];
        return [
            `Oi${first ? `, ${first}` : ''}! 😊`,
            `Sua encomenda${s.product || s.orderNo ? ` (${[s.product, s.orderNo && `pedido Nº ${s.orderNo}`].filter(Boolean).join(', ')})` : ''} foi enviada${s.carrier && s.carrier !== 'Outra' ? ` pelos ${s.carrier === 'Correios' ? 'Correios' : s.carrier}` : ''}! 📦`,
            '', `Código de rastreio: *${s.code}*`, `Acompanhe aqui: ${clientUrl(s)}`,
            '', 'Qualquer dúvida, é só me chamar. Obrigado pela preferência!',
            shop.name ? `— ${shop.name}` : ''
        ].join('\n').trim();
    },

    sendWa: (s) => WaMessage.open({
        title: `Enviar rastreio ${s.code}`, subtitle: `${s.customerName || ''}${s.product ? ` · ${s.product}` : ''} · ${s.carrier}`,
        icon: 'local_shipping', message: Shipments.message(s),
        phone: waPhone(s.phone) || null,
        hint: 'O link abre o rastreio direto, sem o cliente precisar digitar o código.',
        onSent: () => { Shipments.patch(s.id, { notifiedAt: new Date().toISOString() }); Shipments.render(Shipments.container); }
    }),

    patch: (id, data) => DB.save(KEY, list().map(s => (s.id === id ? { ...s, ...data } : s))),

    /** Linha no histórico do pedido ligado. */
    orderNote: (orderId, text) => {
        if (!orderId) return;
        const orders = DB.get('orders') || [];
        const i = orders.findIndex(o => String(o.id) === String(orderId));
        if (i === -1) return;
        orders[i] = { ...orders[i], history: [...(orders[i].history || []), { at: new Date().toISOString(), text }] };
        DB.save('orders', orders);
    },

    bind: (container) => {
        const $ = (s) => container.querySelector(s);
        $('#sh-order').addEventListener('change', (e) => { if (e.target.value) Shipments.fillFromOrder(e.target.value); });
        $('#sh-customer').addEventListener('change', (e) => {
            const cust = (DB.get('customers') || []).find(x => String(x.name || '').trim().toLowerCase() === e.target.value.trim().toLowerCase());
            if (cust?.phone && !$('#sh-phone').value) $('#sh-phone').value = cust.phone;
        });
        $('#sh-carrier').addEventListener('change', (e) => $('#sh-url-wrap').classList.toggle('hidden', e.target.value !== 'Outra'));
        $('#sh-code').addEventListener('input', (e) => {
            const v = e.target.value.toUpperCase().replace(/\s+/g, '');
            if (isCorreios(v)) $('#sh-carrier').value = 'Correios';
        });
        $('#sh-cancel-edit')?.addEventListener('click', () => { Shipments.editing = null; Shipments.render(container); });

        $('#sh-form').addEventListener('submit', (e) => {
            e.preventDefault();
            const code = $('#sh-code').value.toUpperCase().replace(/\s+/g, '');
            const carrier = $('#sh-carrier').value;
            if (carrier === 'Correios' && !isCorreios(code)) {
                return App.toast('Código dos Correios tem 13 caracteres: 2 letras, 9 números e 2 letras (ex.: AA123456789BR).', 'error');
            }
            const all = list();
            const dup = all.find(s => s.code === code && s.id !== Shipments.editing);
            if (dup) return App.toast(`O código ${code} já está cadastrado (${dup.customerName || 'sem cliente'}).`, 'error');
            const orderId = $('#sh-order').value || null;
            const order = orderId ? (DB.get('orders') || []).find(o => String(o.id) === String(orderId)) : null;
            const cost = Number(String($('#sh-cost').value).replace(/\./g, '').replace(',', '.')) || 0;
            const data = {
                code, carrier, postedAt: $('#sh-date').value || isoDate(new Date()),
                orderId, orderNo: order ? docNo(order) : '',
                product: $('#sh-product').value.trim(),
                customerName: $('#sh-customer').value.trim(), phone: $('#sh-phone').value.trim(),
                url: carrier === 'Outra' ? $('#sh-url').value.trim() : '',
                cost: Math.round(cost * 100) / 100, note: $('#sh-note').value.trim()
            };
            if (Shipments.editing) {
                Shipments.patch(Shipments.editing, data);
                Shipments.editing = null;
                App.toast('Encomenda atualizada');
                return Shipments.render(container);
            }
            const s = { id: `sh_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 5)}`, status: 'Postado', createdAt: new Date().toISOString(), ...data };
            DB.save(KEY, [...all, s]);
            Shipments.orderNote(orderId, `Enviado (${carrier}) — rastreio ${code}`);
            const notify = $('#sh-notify').checked;
            Shipments.filter = 'abertas';
            Shipments.render(container);
            App.toast('Encomenda cadastrada');
            if (notify) Shipments.sendWa(s);
        });

        container.querySelectorAll('[data-filter]').forEach(b => b.addEventListener('click', () => { Shipments.filter = b.dataset.filter; Shipments.render(container); }));
        $('#sh-search').addEventListener('input', (e) => {
            Shipments.query = e.target.value;
            const pos = e.target.selectionStart;
            Shipments.render(container);
            const el = container.querySelector('#sh-search'); el.focus(); el.setSelectionRange(pos, pos);
        });

        const listEl = $('#sh-list');
        listEl.addEventListener('change', (e) => {
            if (e.target.dataset.sh !== 'status') return;
            const id = e.target.closest('[data-id]').dataset.id;
            const s = list().find(x => x.id === id);
            const status = e.target.value;
            Shipments.patch(id, { status, deliveredAt: status === 'Entregue' ? isoDate(new Date()) : null });
            if (status === 'Entregue' || status === 'Problema') Shipments.orderNote(s?.orderId, `Encomenda ${s?.code}: ${status.toLowerCase()}`);
            App.toast(`Status: ${status}`);
            Shipments.render(container);
        });
        listEl.addEventListener('click', async (e) => {
            const b = e.target.closest('[data-sh]');
            if (!b || b.dataset.sh === 'status') return;
            const s = list().find(x => x.id === b.closest('[data-id]').dataset.id);
            if (!s) return;
            if (b.dataset.sh === 'copy') {
                try { await navigator.clipboard.writeText(s.code); App.toast('Código copiado'); } catch { window.prompt('Copie o código:', s.code); }
            } else if (b.dataset.sh === 'wa') Shipments.sendWa(s);
            else if (b.dataset.sh === 'edit') { Shipments.editing = s.id; Shipments.render(container); container.querySelector('#sh-code').focus(); window.scrollTo({ top: 0, behavior: 'smooth' }); }
            else if (b.dataset.sh === 'del') App.confirm({
                title: `Excluir a encomenda ${s.code}?`, message: 'Ela sai da lista de rastreio.', type: 'danger', confirmLabel: 'Sim, excluir',
                onConfirm: () => { DB.save(KEY, list().filter(x => x.id !== s.id)); Shipments.render(container); }
            });
        });
    }
};

export default Shipments;
