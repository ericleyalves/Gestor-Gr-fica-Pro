/**
 * catalog.js — Catálogo online (vitrine pública para mandar no WhatsApp)
 *
 * Em Produtos → "Catálogo online": você escolhe quais produtos aparecem, se
 * mostra o preço "a partir de" e clica em Publicar. O sistema grava uma cópia
 * pública e enxuta em public_catalog (supabase-catalogo.sql): nome, categoria,
 * fotos e preço. Custo, estoque, arquivos e clientes nunca saem do sistema.
 * A página catalogo.html (GitHub Pages) lê essa cópia e tem o botão
 * "Pedir orçamento" que abre o WhatsApp da gráfica já com o nome do produto.
 */
import DB from './db.js';
import App from './app.js';
import { esc, fmtBRL } from './utils.js';
import WaMessage from './wa-message.js';

const TABLE = 'public_catalog';
const ROW_ID = 'main';
const DEFAULT_PAGE = 'https://ericleyalves.github.io/Gestor-Gr-fica-Pro/catalogo.html';

/** Produto entra no catálogo? (padrão: ativos entram, até você desmarcar) */
const inCatalog = (p) => (p.inCatalog === undefined ? p.status !== false : !!p.inCatalog);

/** Menor preço possível: preço base + a opção mais barata de cada variação. */
const fromPrice = (p) => {
    let v = parseFloat(p.price) || 0;
    (p.variations || []).forEach(g => {
        const prices = (g.options || []).filter(o => String(o.name || '').trim()).map(o => parseFloat(o.price) || 0);
        if (prices.length) v += Math.min(...prices);
    });
    return Math.round(v * 100) / 100;
};
const imagesOf = (p) => (Array.isArray(p?.images) && p.images.length ? p.images : (p?.image ? [p.image] : []))
    .filter(u => /^https?:\/\//i.test(String(u)));   // só links públicos (fotos coladas como dados ficam de fora)

const Catalog = {
    pageUrl: () => String((DB.get('shop_profile') || {}).catalogUrl || DEFAULT_PAGE).trim(),

    /** Monta a cópia pública (sem custo, estoque, arquivos). */
    snapshot: () => {
        const shop = DB.get('shop_profile') || {};
        const showPrices = shop.catalogShowPrices !== false;
        const products = (DB.get('products') || []).filter(inCatalog).map(p => ({
            id: String(p.id),
            name: String(p.name || '').trim(),
            category: String(p.category || '').trim() || 'Outros',
            images: imagesOf(p).slice(0, 6),
            price: showPrices ? fromPrice(p) : null,
            options: (p.variations || []).filter(g => String(g.name || '').trim())
                .map(g => ({ name: g.name, values: (g.options || []).map(o => String(o.name || '').trim()).filter(Boolean) }))
        })).filter(p => p.name);
        return {
            shop: {
                name: shop.name || '', phone: shop.phone || '', instagram: shop.instagram || '',
                address: shop.address || '', logo: /^https?:\/\//i.test(shop.logo || '') ? shop.logo : '',
                color: shop.brandColor || '#6C2BFF', color2: shop.brandColor2 || ''
            },
            showPrices,
            products,
            updatedAt: new Date().toISOString()
        };
    },

    publish: async () => {
        const client = DB.client();
        if (!client || !(await DB.hasSession())) { App.toast('Sem conexão com a nuvem — publicar precisa de internet.', 'error'); return false; }
        const data = Catalog.snapshot();
        if (!data.products.length) { App.toast('Marque pelo menos um produto para o catálogo', 'error'); return false; }
        const { error } = await client.from(TABLE).upsert({ id: ROW_ID, data, updated_at: data.updatedAt }, { onConflict: 'id' });
        if (error) {
            console.error('Catálogo:', error);
            App.toast(/relation|does not exist|schema cache/i.test(error.message || '')
                ? 'Falta criar a tabela: rode o arquivo supabase-catalogo.sql no Supabase (SQL Editor).'
                : `Não foi possível publicar: ${error.message}`, 'error');
            return false;
        }
        DB.save('shop_profile', { ...(DB.get('shop_profile') || {}), catalogPublishedAt: data.updatedAt, catalogCount: data.products.length });
        return true;
    },

    shareMessage: () => {
        const shop = DB.get('shop_profile') || {};
        return `Oi! 😊 Esse é o catálogo${shop.name ? ` da ${shop.name}` : ''} com os nossos produtos personalizados:\n\n${Catalog.pageUrl()}\n\nViu algo que gostou? É só tocar em "Pedir orçamento" que a gente já te atende por aqui.`;
    },

    /** Janela: escolher produtos, preço on/off, publicar e compartilhar. */
    open: () => {
        document.getElementById('ggp-catalog-modal')?.remove();
        const el = document.createElement('div');
        el.id = 'ggp-catalog-modal';
        el.className = 'fixed inset-0 z-[110] flex items-center justify-center p-4';
        el.style.cssText = 'background:rgba(10,10,20,0.5); backdrop-filter:blur(8px);';

        const render = () => {
            const shop = DB.get('shop_profile') || {};
            const products = (DB.get('products') || []).slice().sort((a, b) => String(a.category || '').localeCompare(String(b.category || ''), 'pt-BR') || String(a.name || '').localeCompare(String(b.name || ''), 'pt-BR'));
            const n = products.filter(inCatalog).length;
            const pub = shop.catalogPublishedAt ? new Date(shop.catalogPublishedAt).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' }) : '';
            el.innerHTML = `
            <div class="w-full max-w-3xl rounded-2xl bg-white shadow-2xl flex flex-col max-h-[90vh]">
                <div class="flex items-center justify-between gap-3 px-6 py-4 border-b" style="border-color:var(--border);">
                    <div>
                        <h3 class="text-lg font-black" style="color:var(--text-main);">Catálogo online</h3>
                        <p class="text-xs" style="color:var(--text-faint);">${pub ? `Publicado em ${esc(pub)} · ${shop.catalogCount || 0} produto(s)` : 'Ainda não publicado'} · ${n} marcado(s) agora</p>
                    </div>
                    <button type="button" data-close class="w-8 h-8 flex items-center justify-center rounded-full hover:bg-slate-100" style="color:var(--text-faint);">
                        <span class="material-symbols-outlined" style="font-size:18px;">close</span></button>
                </div>
                <div class="px-6 py-3 border-b flex flex-wrap items-center gap-4" style="border-color:var(--border);">
                    <label class="!mb-0 flex items-center gap-2 text-sm font-semibold cursor-pointer" style="color:var(--text-main); text-transform:none;">
                        <input type="checkbox" id="cat-prices" class="!w-4 !h-4" ${shop.catalogShowPrices !== false ? 'checked' : ''}> Mostrar preço "a partir de"
                    </label>
                    <button type="button" data-all="1" class="text-xs font-bold" style="color:var(--primary);">Marcar todos</button>
                    <button type="button" data-all="0" class="text-xs font-bold" style="color:var(--text-faint);">Desmarcar todos</button>
                </div>
                <div class="overflow-y-auto p-4 grid grid-cols-1 sm:grid-cols-2 gap-2" style="background:var(--bg-main);">
                    ${products.length ? products.map(p => {
                        const img = imagesOf(p)[0];
                        return `
                        <label class="!mb-0 flex items-center gap-3 p-3 rounded-xl border bg-white cursor-pointer" style="border-color:var(--border); text-transform:none;">
                            <input type="checkbox" data-pid="${esc(p.id)}" class="!w-4 !h-4 flex-shrink-0" ${inCatalog(p) ? 'checked' : ''}>
                            <div class="w-11 h-11 rounded-lg overflow-hidden bg-slate-100 flex-shrink-0 flex items-center justify-center">
                                ${img ? `<img src="${esc(img)}" class="w-full h-full object-cover" alt="">` : '<span class="material-symbols-outlined text-slate-300">image</span>'}</div>
                            <div class="min-w-0">
                                <p class="text-sm font-bold truncate" style="color:var(--text-main);">${esc(p.name || '')}</p>
                                <p class="text-xs truncate" style="color:var(--text-faint);">${esc(p.category || 'Outros')} · a partir de ${fmtBRL(fromPrice(p))}${img ? '' : ' · <span style="color:#B45309;">sem foto</span>'}</p>
                            </div>
                        </label>`;
                    }).join('') : '<p class="text-sm italic text-center col-span-full py-8" style="color:var(--text-faint);">Cadastre produtos primeiro.</p>'}
                </div>
                <div class="px-6 py-4 border-t flex flex-wrap items-center gap-2" style="border-color:var(--border);">
                    <input id="cat-link" readonly class="flex-1 min-w-[200px] text-xs" value="${esc(Catalog.pageUrl())}">
                    <a href="${esc(Catalog.pageUrl())}" target="_blank" rel="noopener" class="btn-ghost !py-2 !px-3 text-xs">Ver</a>
                    <button type="button" id="cat-share" class="btn-ghost !py-2 !px-3 text-xs" ${pub ? '' : 'disabled style="opacity:.5"'}>
                        <span class="material-symbols-outlined" style="font-size:16px;">share</span> Mandar no WhatsApp</button>
                    <button type="button" id="cat-publish" class="btn-primary">
                        <span class="material-symbols-outlined" style="font-size:18px;">publish</span> ${pub ? 'Atualizar catálogo' : 'Publicar catálogo'}</button>
                </div>
            </div>`;
        };

        const setProducts = (fn) => {
            const list = DB.get('products') || [];
            list.forEach(fn);
            DB.save('products', list);
        };
        const close = () => { el.remove(); document.removeEventListener('keydown', onKey); };
        const onKey = (e) => { if (e.key === 'Escape' && !document.getElementById('ggp-wa-modal')) close(); };
        document.addEventListener('keydown', onKey);

        el.addEventListener('change', (e) => {
            const pid = e.target.dataset?.pid;
            if (pid) { setProducts(p => { if (String(p.id) === pid) p.inCatalog = e.target.checked; }); render(); }
            else if (e.target.id === 'cat-prices') DB.save('shop_profile', { ...(DB.get('shop_profile') || {}), catalogShowPrices: e.target.checked });
        });
        el.addEventListener('click', async (e) => {
            if (e.target === el || e.target.closest('[data-close]')) return close();
            const all = e.target.closest('[data-all]');
            if (all) { setProducts(p => { p.inCatalog = all.dataset.all === '1'; }); return render(); }
            if (e.target.closest('#cat-publish')) {
                const btn = e.target.closest('#cat-publish');
                btn.disabled = true; btn.style.opacity = '.6';
                const ok = await Catalog.publish();
                render();
                if (ok) App.toast('Catálogo publicado! Já pode mandar o link.', 'success');
                return;
            }
            if (e.target.closest('#cat-share')) {
                WaMessage.open({ title: 'Mandar o catálogo', subtitle: 'Cole na conversa, no status ou na bio do Instagram', icon: 'storefront', message: Catalog.shareMessage(), phone: null });
            }
        });
        render();
        document.body.appendChild(el);
    }
};

export default Catalog;
