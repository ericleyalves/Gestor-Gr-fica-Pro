/**
 * pdf.js — Orçamento em PDF (layout profissional)
 *
 * Monta uma página A4 com a identidade da gráfica (Configurações > Perfil:
 * logo, cor da marca, contatos, Pix, validade, prazo) e abre a janela de
 * impressão do navegador num iframe oculto → "Salvar como PDF".
 * Texto vetorial (nítido e pesquisável), sem biblioteca extra.
 */
import DB from './db.js';
import { esc, fmtBRL, docNo } from './utils.js';
import Files from './files.js';
import Payments from './payments.js';

// Ícones SVG inline (não dependem de fonte externa para aparecer no PDF)
const ICON = {
    phone: '<path d="M6.6 10.8a15.1 15.1 0 0 0 6.6 6.6l2.2-2.2a1 1 0 0 1 1-.25 11.4 11.4 0 0 0 3.6.57 1 1 0 0 1 1 1V20a1 1 0 0 1-1 1A17 17 0 0 1 3 4a1 1 0 0 1 1-1h3.5a1 1 0 0 1 1 1c0 1.25.2 2.45.57 3.57a1 1 0 0 1-.25 1z"/>',
    mail: '<path d="M20 4H4a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V6a2 2 0 0 0-2-2zm0 4-8 5-8-5V6l8 5 8-5z"/>',
    insta: '<path d="M7 2h10a5 5 0 0 1 5 5v10a5 5 0 0 1-5 5H7a5 5 0 0 1-5-5V7a5 5 0 0 1 5-5zm5 5a5 5 0 1 0 0 10 5 5 0 0 0 0-10zm0 2a3 3 0 1 1 0 6 3 3 0 0 1 0-6zm5.5-3a1.5 1.5 0 1 0 0 3 1.5 1.5 0 0 0 0-3z"/>',
    pin: '<path d="M12 2a7 7 0 0 0-7 7c0 5.25 7 13 7 13s7-7.75 7-13a7 7 0 0 0-7-7zm0 9.5A2.5 2.5 0 1 1 12 6.5a2.5 2.5 0 0 1 0 5z"/>',
    pix: '<path d="M12 2 2 12l10 10 10-10zm0 3.2L18.8 12 12 18.8 5.2 12z"/>'
};
const svg = (name, size = 11) =>
    `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">${ICON[name]}</svg>`;

/** Texto que pode virar nome de arquivo (sem / \\ : * ? " < > |). */
const fileName = (s) => String(s || '').replace(/[\\/:*?"<>|]+/g, ' ').replace(/\s+/g, ' ').trim();
const validColor = (c) => /^#[0-9a-f]{6}$/i.test(String(c || '')) ? c : '#6C2BFF';

const QuotePDF = {
    /**
     * @param {object} q { number, date, customer, phone, items[], totals{}, notes, deadline }
     *   items: { name, quantity, price (total da linha), material, finish, category }
     */
    /**
     * Cor ainda no padrão do sistema (roxo) e há logo? Usa a paleta da logo e salva no perfil,
     * para o PDF já sair com as cores da marca sem precisar configurar.
     */
    ensureBrandColors: async () => {
        const shop = DB.get('shop_profile') || {};
        const isDefault = !shop.brandColor || String(shop.brandColor).toLowerCase() === '#6c2bff';
        if (!shop.logo || !isDefault) return;
        try {
            const timeout = new Promise(r => setTimeout(() => r([]), 3000));
            const [c1, c2] = await Promise.race([Files.dominantColors(shop.logo), timeout]);
            if (c1) DB.save('shop_profile', { ...(DB.get('shop_profile') || {}), brandColor: c1, brandColor2: c2 || c1 });
        } catch (e) { console.warn('PDF: não foi possível ler as cores da logo', e); }
    },

    /** Monta o HTML do orçamento/pedido (usado no PDF e no link de aprovação). */
    html: async (q) => {
        await QuotePDF.ensureBrandColors();
        const shop = DB.get('shop_profile') || {};
        const brand = validColor(shop.brandColor);
        const brand2 = /^#[0-9a-f]{6}$/i.test(String(shop.brandColor2 || '')) ? shop.brandColor2 : brand;
        const date = q.date || new Date();
        const fmtDate = (d) => d.toLocaleDateString('pt-BR');
        const validityDays = parseInt(shop.validityDays) || 15;
        const validUntil = new Date(date.getTime() + validityDays * 86400000);
        const deadlineDays = parseInt(shop.defaultDeadline) || 0;
        const deadline = q.deadline || (deadlineDays ? `${deadlineDays} dias úteis` : '3 a 5 dias úteis');
        const { subtotal = 0, freight = 0, urgency = 0, art = 0, extras = 0, discount = 0, total = 0 } = q.totals || {};
        const isOrder = q.kind === 'pedido';
        const kindLabel = isOrder ? 'PEDIDO' : 'ORÇAMENTO';
        // Pedidos antigos não guardam frete/urgência/arte separados: mostra a diferença como "adicionais"
        const otherExtras = Math.max(0, Math.round((extras - freight - urgency - art) * 100) / 100);
        const nl2br = (t) => esc(t).replace(/\n/g, '<br>');
        const detail = (i) => [i.optionsText, i.material, i.colors, i.finish].filter(v => v && v !== '-').map(esc).join(' · ');
        const items = q.items || [];
        const totalQty = items.reduce((n, i) => n + (Number(i.quantity) || 1), 0);

        const rows = items.map((i, idx) => {
            const qty = Number(i.quantity) || 1;
            const line = Number(i.price) || 0;
            return `
                <tr>
                    <td class="num">${String(idx + 1).padStart(2, '0')}</td>
                    <td>
                        <div class="item-name">${esc(i.name)}</div>
                        ${detail(i) ? `<div class="item-detail">${detail(i)}</div>` : ''}
                    </td>
                    <td class="c">${qty}</td>
                    <td class="r">${fmtBRL(line / qty)}</td>
                    <td class="r strong">${fmtBRL(line)}</td>
                </tr>`;
        }).join('');

        const extra = (label, v, sign = '+') => v > 0
            ? `<div class="t-row"><span>${label}</span><span>${sign} ${fmtBRL(v)}</span></div>` : '';

        const contacts = [
            shop.phone && `${svg('phone')} ${esc(shop.phone)}`,
            shop.email && `${svg('mail')} ${esc(shop.email)}`,
            shop.instagram && `${svg('insta')} ${esc(shop.instagram)}`
        ].filter(Boolean);

        const shopName = shop.name || 'Minha Gráfica';
        const safeName = fileName(q.customer || 'cliente');
        const initials = shopName.split(/\s+/).filter(Boolean).slice(0, 2).map(w => w[0]).join('').toUpperCase();

        const html = `<!doctype html>
<html lang="pt-BR"><head><meta charset="utf-8">
<title>${isOrder ? 'Pedido' : 'Orçamento'} ${esc(safeName)}</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Poppins:wght@600;700;800&family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet">
<style>
    :root {
        --brand: ${brand};
        --brand2: ${brand2};
        --brand-dark: color-mix(in srgb, var(--brand) 70%, #000);
        --brand-soft: color-mix(in srgb, var(--brand) 8%, #fff);
        --brand-line: color-mix(in srgb, var(--brand) 18%, #fff);
        --ink: #17151f; --muted: #6b6880; --line: #ebe9f2;
    }
    @page { size: A4; margin: 0; }
    * { box-sizing: border-box; }
    html, body { margin: 0; }
    table { font-size: inherit; }   /* garante o mesmo tamanho de fonte nas células */
    body { font-family: 'Inter', 'Segoe UI', Arial, sans-serif; color: var(--ink); font-size: 11.5px; line-height: 1.45;
           -webkit-print-color-adjust: exact; print-color-adjust: exact; }
    h1, h2, .display { font-family: 'Poppins', 'Segoe UI', Arial, sans-serif; }
    .page { padding: 0 14mm 20mm; }

    /* ---------- Cabeçalho ---------- */
    .hero { position: relative; margin: 0 -14mm; padding: 10mm 14mm 12mm; color: #fff; overflow: hidden;
            background: linear-gradient(115deg, var(--brand-dark) 0%, var(--brand) 42%, var(--brand2) 100%); }
    .hero::after { content: ''; position: absolute; right: -40mm; top: -50mm; width: 120mm; height: 120mm; border-radius: 50%;
                   background: rgba(255,255,255,.08); }
    .hero::before { content: ''; position: absolute; right: 30mm; bottom: -60mm; width: 90mm; height: 90mm; border-radius: 50%;
                    background: rgba(255,255,255,.06); }
    .hero-inner { position: relative; z-index: 1; display: flex; justify-content: space-between; align-items: center; gap: 10mm; }
    .brand { display: flex; align-items: center; gap: 5mm; min-width: 0; }
    .logo { width: 25mm; height: 25mm; border-radius: 5mm; background: #fff; display: flex; align-items: center; justify-content: center;
            padding: 2.5mm; flex-shrink: 0; box-shadow: 0 6px 18px rgba(0,0,0,.18); }
    .logo img { max-width: 100%; max-height: 100%; object-fit: contain; }
    .logo .ini { font-family: 'Poppins', sans-serif; font-weight: 800; font-size: 26px; color: var(--brand); }
    .brand h1 { margin: 0; font-size: 21px; font-weight: 800; letter-spacing: -.02em; line-height: 1.15; }
    .brand .sub { margin-top: 1.5mm; font-size: 10px; opacity: .85; display: flex; flex-wrap: wrap; gap: 1mm 4mm; }
    .brand .sub span { display: inline-flex; align-items: center; gap: 1.2mm; }
    .doc { text-align: right; flex-shrink: 0; }
    .doc .kind { font-family: 'Poppins', sans-serif; font-size: 25px; font-weight: 800; letter-spacing: .06em; line-height: 1; }
    .doc .no { display: inline-block; margin-top: 2.5mm; background: rgba(255,255,255,.18); border: 1px solid rgba(255,255,255,.35);
               padding: 1.2mm 3mm; border-radius: 99px; font-weight: 700; font-size: 10.5px; letter-spacing: .03em; }

    /* ---------- Faixa de dados ---------- */
    .meta { display: grid; grid-template-columns: repeat(4, 1fr); margin-top: -6mm; position: relative; z-index: 2;
            background: #fff; border-radius: 4mm; box-shadow: 0 8px 24px rgba(23,21,31,.08); border: 1px solid var(--line); }
    .meta div { padding: 3.5mm 4.5mm; border-right: 1px solid var(--line); }
    .meta div:last-child { border-right: 0; background: var(--brand-soft); border-radius: 0 4mm 4mm 0; }
    .label { font-size: 8.5px; font-weight: 700; letter-spacing: .12em; text-transform: uppercase; color: var(--muted); }
    .meta strong { display: block; margin-top: .8mm; font-size: 12.5px; font-weight: 700; }
    .meta div:last-child strong { color: var(--brand); font-family: 'Poppins', sans-serif; font-size: 14px; }

    /* ---------- Partes ---------- */
    .parties { display: grid; grid-template-columns: 1fr 1fr; gap: 5mm; margin-top: 6mm; }
    .card { border: 1px solid var(--line); border-radius: 4mm; padding: 4mm 5mm; }
    .card .label { color: var(--brand2); margin-bottom: 1.5mm; }
    .card .big { font-size: 14px; font-weight: 700; }
    .card .line { color: var(--muted); font-size: 10.5px; display: flex; align-items: center; gap: 1.5mm; margin-top: .6mm; }
    .card .line svg { color: var(--brand); flex-shrink: 0; }

    /* ---------- Itens ---------- */
    h2.sec { font-size: 12px; font-weight: 700; margin: 7mm 0 3mm; display: flex; align-items: center; gap: 2.5mm; }
    h2.sec::before { content: ''; width: 1.2mm; height: 4.5mm; border-radius: 1mm; background: linear-gradient(var(--brand), var(--brand2)); }
    h2.sec small { margin-left: auto; font-family: 'Inter', sans-serif; font-weight: 500; font-size: 10px; color: var(--muted); }
    table.items { width: 100%; border-collapse: separate; border-spacing: 0; border: 1px solid var(--line); border-radius: 4mm; overflow: hidden; }
    table.items th { background: var(--brand-soft); color: var(--brand-dark); font-size: 8.5px; font-weight: 700; text-transform: uppercase;
                     letter-spacing: .1em; padding: 3mm 3.5mm; text-align: left; border-bottom: 1px solid var(--brand-line); }
    table.items td { padding: 3.2mm 3.5mm; border-bottom: 1px solid var(--line); vertical-align: top; }
    table.items tr:last-child td { border-bottom: 0; }
    table.items tbody tr:nth-child(even) td { background: #fbfafd; }
    table.items tr { page-break-inside: avoid; }
    .num { color: var(--brand2); font-weight: 700; font-size: 10px; width: 9mm; }
    .item-name { font-weight: 600; font-size: 11.5px; }
    .item-detail { color: var(--muted); font-size: 10px; margin-top: .6mm; }
    .c { text-align: center !important; } .r { text-align: right !important; white-space: nowrap; } .strong { font-weight: 700; }

    /* ---------- Rodapé do orçamento ---------- */
    .bottom { display: grid; grid-template-columns: 1fr 72mm; gap: 6mm; margin-top: 6mm; page-break-inside: avoid; }
    .pay .row { display: flex; gap: 2mm; margin-top: 1.5mm; }
    .pix { margin-top: 3mm; display: flex; align-items: center; gap: 3mm; background: var(--brand-soft); border: 1px dashed var(--brand-line);
           border-radius: 3mm; padding: 2.5mm 3.5mm; }
    .pix svg { color: var(--brand2); }
    .pix b { display: block; font-size: 12px; word-break: break-all; }
    .notes { margin-top: 4mm; }
    .totals { border: 1px solid var(--line); border-radius: 4mm; overflow: hidden; align-self: start; }
    .t-row { display: flex; justify-content: space-between; padding: 2.2mm 4.5mm; font-size: 11px; color: #3a3748; }
    .t-row:first-child { padding-top: 3.5mm; }
    .t-total { margin-top: 1.5mm; background: linear-gradient(115deg, var(--brand), var(--brand2)); color: #fff;
               padding: 4mm 4.5mm; display: flex; justify-content: space-between; align-items: center; }
    .t-total span { font-size: 9px; font-weight: 700; letter-spacing: .14em; text-transform: uppercase; opacity: .9; }
    .t-total strong { font-family: 'Poppins', sans-serif; font-size: 20px; font-weight: 800; letter-spacing: -.01em; }

    .terms { margin-top: 5mm; color: var(--muted); font-size: 9.5px; line-height: 1.55; page-break-inside: avoid; }
    .terms .label { color: var(--ink); margin-bottom: 1mm; }

    .sign { display: grid; grid-template-columns: 1.6fr 1fr; gap: 10mm; margin-top: 11mm; page-break-inside: avoid; }
    .sign div { border-top: 1px solid #c9c6d6; padding-top: 1.5mm; font-size: 9px; color: var(--muted); text-align: center; }

    /* ---------- Rodapé fixo (repete em todas as páginas) ---------- */
    .foot { position: fixed; left: 0; right: 0; bottom: 0; height: 15mm; padding: 0 14mm; display: flex; align-items: center;
            justify-content: space-between; font-size: 9px; color: var(--muted); border-top: 1px solid var(--line); background: #fff; }
    .foot::before { content: ''; position: absolute; left: 0; right: 0; bottom: 0; height: 1.6mm; background: linear-gradient(90deg, var(--brand), var(--brand2)); }
    .foot b { color: var(--ink); }
</style></head>
<body>
<div class="page">
    <header class="hero">
        <div class="hero-inner">
            <div class="brand">
                <div class="logo">${shop.logo
                    ? `<img src="${esc(shop.logo)}" alt="" onerror="this.outerHTML='<span class=&quot;ini&quot;>${esc(initials)}</span>'">`
                    : `<span class="ini">${esc(initials)}</span>`}</div>
                <div style="min-width:0">
                    <h1>${esc(shopName)}</h1>
                    <div class="sub">
                        ${shop.cnpj ? `<span>CNPJ ${esc(shop.cnpj)}</span>` : ''}
                        ${shop.instagram ? `<span>${svg('insta', 10)} ${esc(shop.instagram)}</span>` : ''}
                    </div>
                </div>
            </div>
            <div class="doc">
                <div class="kind">${kindLabel}</div>
                <div class="no">Nº ${esc(q.number)}</div>
            </div>
        </div>
    </header>

    <section class="meta">
        <div><span class="label">Emissão</span><strong>${fmtDate(date)}</strong></div>
        ${isOrder
            ? `<div><span class="label">Status</span><strong>${esc(q.status || 'Em andamento')}</strong></div>`
            : `<div><span class="label">Válido até</span><strong>${fmtDate(validUntil)}</strong></div>`}
        <div><span class="label">Prazo de produção</span><strong>${esc(deadline)}</strong></div>
        <div><span class="label">Valor total</span><strong>${fmtBRL(total)}</strong></div>
    </section>

    <section class="parties">
        <div class="card">
            <div class="label">Cliente</div>
            <div class="big">${esc(q.customer)}</div>
            ${q.phone ? `<div class="line">${svg('phone')} ${esc(q.phone)}</div>` : ''}
            ${q.address ? `<div class="line">${svg('pin')} ${esc(q.address)}</div>` : ''}
        </div>
        <div class="card">
            <div class="label">Emitido por</div>
            <div class="big">${esc(shopName)}</div>
            ${contacts.map(c => `<div class="line">${c}</div>`).join('')}
            ${shop.address ? `<div class="line">${svg('pin')} ${esc(shop.address)}</div>` : ''}
        </div>
    </section>

    <h2 class="sec">Itens do ${isOrder ? 'pedido' : 'orçamento'} <small>${items.length} ${items.length === 1 ? 'item' : 'itens'} · ${totalQty} ${totalQty === 1 ? 'unidade' : 'unidades'}</small></h2>
    <table class="items">
        <thead><tr>
            <th>#</th><th>Descrição</th>
            <th class="c" style="width:16mm">Qtd</th><th class="r" style="width:27mm">Unitário</th><th class="r" style="width:29mm">Total</th>
        </tr></thead>
        <tbody>${rows}</tbody>
    </table>

    <section class="bottom">
        <div>
            <div class="card pay">
                <div class="label">Formas de pagamento</div>
                <div>${esc(shop.paymentConditions || 'A combinar')}</div>
                ${shop.pixKey ? `<div class="pix">${svg('pix', 18)}<div><span class="label">Chave Pix</span><b>${esc(shop.pixKey)}</b></div></div>` : ''}
            </div>
            ${q.notes ? `<div class="card notes"><div class="label">Observações</div>${nl2br(q.notes)}</div>` : ''}
        </div>
        <div class="totals">
            <div class="t-row"><span>Subtotal</span><span>${fmtBRL(subtotal)}</span></div>
            ${extra('Frete', freight)}
            ${extra('Adicionais', otherExtras)}
            ${extra('Taxa de urgência', urgency)}
            ${extra('Instalação / Arte', art)}
            ${extra(`Desconto${q.totals?.discountPct ? ` (${(Math.round(q.totals.discountPct * 100) / 100).toLocaleString('pt-BR')}%)` : ''}`, discount, '-')}
            <div class="t-total"><span>Total</span><strong>${fmtBRL(total)}</strong></div>
            ${q.paid != null && q.paid > 0 ? `
            <div class="t-row" style="padding-top:3mm;"><span>Valor pago</span><span style="color:#059669;font-weight:700;">- ${fmtBRL(q.paid)}</span></div>
            <div class="t-row" style="padding-bottom:3.5mm;font-weight:800;"><span>${total - q.paid > 0.009 ? 'Saldo a pagar' : 'Situação'}</span>
                <span style="color:${total - q.paid > 0.009 ? '#B45309' : '#059669'};">${total - q.paid > 0.009 ? fmtBRL(total - q.paid) : 'QUITADO'}</span></div>` : ''}
        </div>
    </section>

    ${shop.terms ? `<section class="terms"><div class="label">Condições gerais</div>${nl2br(shop.terms)}</section>` : ''}

    <section class="sign">
        <div>${isOrder ? 'Recebido por — assinatura do cliente' : 'De acordo — assinatura do cliente'}</div>
        <div>${isOrder ? 'Data de entrega' : 'Data de aprovação'}: ____ / ____ / ________</div>
    </section>
</div>

<footer class="foot">
    <span><b>${esc(shopName)}</b> — obrigado pela preferência!</span>
    <span>${isOrder ? `Pedido ${esc(q.number)} · emitido em ${fmtDate(date)}` : `Orçamento ${esc(q.number)} · válido até ${fmtDate(validUntil)}`}</span>
</footer>
</body></html>`;

        return html;
    },

    open: async (q) => QuotePDF.print(await QuotePDF.html(q)),


    /** Imprime um HTML num iframe oculto (o usuário escolhe "Salvar como PDF" ou a impressora). */
    print: (html) => {
        document.getElementById('ggp-print-frame')?.remove();
        const frame = document.createElement('iframe');
        frame.id = 'ggp-print-frame';
        frame.setAttribute('aria-hidden', 'true');
        frame.style.cssText = 'position:fixed; right:0; bottom:0; width:0; height:0; border:0; visibility:hidden;';
        document.body.appendChild(frame);

        const doc = frame.contentDocument;
        doc.open(); doc.write(html); doc.close();

        const win = frame.contentWindow;
        let printed = false;
        // O Chrome sugere o nome do PDF pelo título da página principal: troca durante a impressão
        const oldTitle = document.title;
        const docTitle = (doc.title || '').trim();
        const print = () => {
            if (printed) return;
            printed = true;
            if (docTitle) document.title = docTitle;
            win.focus();
            win.print();   // bloqueia até fechar a janela de impressão
            setTimeout(() => { document.title = oldTitle; frame.remove(); }, 1000);
        };
        // Espera logo + fontes (no máx. 3,5 s; sem internet sai com a fonte do sistema)
        const imgs = [...doc.images].map(img => img.complete ? null : new Promise(r => { img.onload = img.onerror = r; }));
        const fonts = doc.fonts ? doc.fonts.ready : null;
        Promise.all([...imgs, fonts]).then(() => setTimeout(print, 150));
        setTimeout(print, 3500);
    },

    /**
     * Ficha de produção (uso interno, SEM valores): cliente, prazo, itens com foto,
     * opções, observações, arquivos e checklist para a bancada.
     */
    productionSheet: (order) => {
        const shop = DB.get('shop_profile') || {};
        const brand = validColor(shop.brandColor);
        const products = DB.get('products') || [];
        const customer = (DB.get('customers') || []).find(c => String(c.id) === String(order.customerId));
        const fmtD = (iso) => { const [y, m, d] = String(iso || '').split('-'); return d ? `${d}/${m}/${y}` : '—'; };
        const items = Array.isArray(order.items) && order.items.length ? order.items : [{ name: order.productName, quantity: 1 }];
        const prodOf = (i) => products.find(p => String(p.id) === String(i.productId)) || products.find(p => p.name === i.name);
        const files = [
            ...(order.files || []).map(f => ({ name: f.name, from: 'Cliente' })),
            ...items.flatMap(i => (prodOf(i)?.files || []).map(f => ({ name: f.name, from: prodOf(i).name })))
        ];
        const today = new Date(); const t = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
        const late = order.dueDate && order.dueDate < t;
        const bal = Payments.balance(order);
        const detail = (i) => [i.optionsText, i.material, i.colors, i.finish].filter(v => v && v !== '-').map(esc).join(' · ');

        const html = `<!doctype html><html lang="pt-BR"><head><meta charset="utf-8">
<title>Ficha Pedido ${esc(docNo(order))} ${esc(fileName(order.customerName || ''))}</title>
<style>
    @page { size: A4; margin: 12mm; }
    * { box-sizing: border-box; }
    body { font-family: 'Segoe UI', Arial, sans-serif; color: #17151f; font-size: 12px; margin: 0;
           -webkit-print-color-adjust: exact; print-color-adjust: exact; }
    table { font-size: inherit; }
    .top { display: flex; justify-content: space-between; align-items: stretch; gap: 6mm; border-bottom: 3px solid ${brand}; padding-bottom: 4mm; }
    .op { font-size: 11px; letter-spacing: .12em; font-weight: 800; color: ${brand}; }
    .num { font-size: 26px; font-weight: 900; letter-spacing: -.01em; }
    .muted { color: #6b6880; font-size: 11px; }
    .due { text-align: center; border: 2px solid ${late ? '#DC2626' : '#17151f'}; border-radius: 3mm; padding: 2mm 5mm; min-width: 42mm; }
    .due b { display: block; font-size: 20px; color: ${late ? '#DC2626' : '#17151f'}; }
    .grid { display: grid; grid-template-columns: 1.4fr 1fr; gap: 4mm; margin: 5mm 0; }
    .box { border: 1px solid #dcd9e6; border-radius: 3mm; padding: 3mm 4mm; }
    .lbl { font-size: 9px; font-weight: 800; letter-spacing: .1em; text-transform: uppercase; color: #6b6880; margin-bottom: 1mm; }
    .big { font-size: 15px; font-weight: 800; }
    table.items { width: 100%; border-collapse: collapse; margin-top: 2mm; }
    table.items th { text-align: left; font-size: 9px; letter-spacing: .1em; text-transform: uppercase; color: #6b6880; border-bottom: 2px solid #17151f; padding: 2mm; }
    table.items td { border-bottom: 1px solid #dcd9e6; padding: 3mm 2mm; vertical-align: top; }
    tr { page-break-inside: avoid; }
    .thumb { width: 18mm; height: 18mm; border-radius: 2mm; object-fit: cover; border: 1px solid #dcd9e6; }
    .qty { font-size: 20px; font-weight: 900; text-align: center; width: 20mm; }
    .chk { width: 5mm; height: 5mm; border: 1.5px solid #17151f; border-radius: 1mm; display: inline-block; vertical-align: middle; margin-right: 2mm; }
    .steps { display: grid; grid-template-columns: repeat(4, 1fr); gap: 3mm; margin-top: 5mm; }
    .steps div { border: 1px dashed #b9b5c9; border-radius: 3mm; padding: 3mm; font-weight: 700; }
    .notes { min-height: 22mm; white-space: pre-wrap; }
    .sign { display: grid; grid-template-columns: 1fr 1fr; gap: 10mm; margin-top: 12mm; }
    .sign div { border-top: 1px solid #17151f; padding-top: 1.5mm; text-align: center; font-size: 10px; color: #6b6880; }
    .pay { display: inline-block; padding: 1mm 3mm; border-radius: 99px; font-weight: 800; font-size: 10px;
           background: ${bal > 0.009 ? '#FFFBEB' : '#ECFDF5'}; color: ${bal > 0.009 ? '#B45309' : '#059669'}; }
</style></head><body>
    <div class="top">
        <div>
            <div class="op">FICHA DE PRODUÇÃO · ${esc(shop.name || '')}</div>
            <div class="num">Pedido Nº ${esc(docNo(order))}</div>
            <div class="muted">Pedido em ${fmtD(order.date)} · Status: <b>${esc(order.status || '')}</b></div>
        </div>
        <div class="due">
            <div class="lbl">${late ? 'Atrasado — era para' : 'Entregar até'}</div>
            <b>${fmtD(order.dueDate)}</b>
            <div class="muted">${order.deadlineDays ? `${order.deadlineDays} dia(s) úteis` : ''}</div>
        </div>
    </div>

    <div class="grid">
        <div class="box">
            <div class="lbl">Cliente</div>
            <div class="big">${esc(customer?.name || order.customerName || '—')}</div>
            <div class="muted">${esc(order.phone || customer?.phone || '')}${customer?.address ? ` · ${esc(customer.address)}` : ''}</div>
        </div>
        <div class="box">
            <div class="lbl">Pagamento</div>
            <span class="pay">${bal > 0.009 ? `FALTA RECEBER ${fmtBRL(bal)}` : 'PAGO'}</span>
            <div class="muted" style="margin-top:1.5mm;">Conferir antes de entregar.</div>
        </div>
    </div>

    <table class="items">
        <thead><tr><th style="width:8mm"></th><th style="width:22mm">Foto</th><th>Produto / detalhes</th><th style="text-align:center">Qtd</th></tr></thead>
        <tbody>
            ${items.map(i => { const p = prodOf(i); const img = p?.image; return `
            <tr>
                <td><span class="chk"></span></td>
                <td>${img ? `<img class="thumb" src="${esc(img)}" onerror="this.remove()">` : ''}</td>
                <td><div style="font-weight:700;font-size:13px;">${esc(i.name || '')}</div>${detail(i) ? `<div class="muted">${detail(i)}</div>` : ''}</td>
                <td class="qty">${Number(i.quantity) || 1}</td>
            </tr>`; }).join('')}
        </tbody>
    </table>

    <div class="grid">
        <div class="box">
            <div class="lbl">Observações</div>
            <div class="notes">${esc(order.notes || '')}</div>
        </div>
        <div class="box">
            <div class="lbl">Arquivos (${files.length})</div>
            ${files.length ? files.map(f => `<div><span class="chk"></span>${esc(f.name)} <span class="muted">· ${esc(f.from)}</span></div>`).join('') : '<div class="muted">Nenhum arquivo anexado.</div>'}
        </div>
    </div>

    <div class="lbl" style="margin-top:4mm;">Etapas</div>
    <div class="steps">
        <div><span class="chk"></span>Arte aprovada</div>
        <div><span class="chk"></span>Corte / impressão</div>
        <div><span class="chk"></span>Acabamento</div>
        <div><span class="chk"></span>Embalado</div>
    </div>

    <div class="sign"><div>Produzido por</div><div>Conferido por / data</div></div>
</body></html>`;
        QuotePDF.print(html);
    },

    /**
     * PDF de um pedido/orçamento já salvo. Recalcula o que pedidos antigos não guardavam
     * (subtotal = soma dos itens; o que sobrar entre subtotal − desconto e o total vira "adicionais").
     */
    /** Converte um pedido/orçamento salvo no formato do documento. */
    docFromOrder: (order, kind = 'pedido') => {
        const items = Array.isArray(order.items) && order.items.length
            ? order.items
            : [{ name: order.productName || 'Item', quantity: 1, price: parseFloat(order.value) || 0 }];
        const subtotal = order.subtotal != null ? Number(order.subtotal) : items.reduce((n, i) => n + (parseFloat(i.price) || 0), 0);
        const discount = Number(order.discount) || 0;
        const total = parseFloat(order.value) || 0;
        const freight = Number(order.freight) || 0, urgency = Number(order.urgency) || 0, art = Number(order.art) || 0;
        const customer = (DB.get('customers') || []).find(c => String(c.id) === String(order.customerId));
        const [y, m, d] = String(order.date || '').split('-').map(Number);
        const fmtD = (iso) => { const [yy, mm, dd] = String(iso).split('-'); return `${dd}/${mm}/${yy}`; };
        const days = Number(order.deadlineDays) || 0;
        const deadline = order.dueDate ? `até ${fmtD(order.dueDate)}${days ? ` (${days} ${days === 1 ? 'dia útil' : 'dias úteis'})` : ''}`
                       : days ? `${days} ${days === 1 ? 'dia útil' : 'dias úteis'}` : undefined;
        return {
            kind,
            deadline,
            number: docNo(order),
            date: y ? new Date(y, m - 1, d) : new Date(),
            status: order.status,
            customer: customer?.name || order.customerName || 'Cliente',
            phone: order.phone || customer?.phone || '',
            address: customer?.address || '',
            items,
            totals: { subtotal, freight, urgency, art, discount, total,
                      extras: Math.max(0, total - subtotal + discount),
                      discountPct: order.discountPct ?? (subtotal > 0 ? discount / subtotal * 100 : 0) },
            notes: order.notes,
            paid: kind === 'pedido' ? Payments.paid(order) : null
        };
    },

    fromOrder: (order, kind = 'pedido') => QuotePDF.open(QuotePDF.docFromOrder(order, kind)),
    htmlFromOrder: (order, kind = 'pedido') => QuotePDF.html(QuotePDF.docFromOrder(order, kind))
};

export default QuotePDF;
