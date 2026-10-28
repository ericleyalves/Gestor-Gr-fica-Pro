/**
 * files.js — Arquivos de corte / gabaritos ligados aos produtos
 *
 * - Metadados ficam em product.files (sincroniza junto com o produto).
 * - O binário fica no Supabase Storage (ver DB.uploadFile / DB.fileUrl).
 * - Pedidos não copiam os arquivos: eles apontam para o produto
 *   (item.productId; pedidos antigos sem productId são ligados pelo nome).
 *   Assim, atualizar o arquivo no produto já vale para todos os pedidos.
 */
import DB from './db.js';
import { esc, docNo } from './utils.js';

const toast = (msg, type = 'success') => import('./app.js').then(m => m.default.toast(msg, type));

const ICONS = {
    cdr: 'draw', ai: 'draw', eps: 'draw', svg: 'polyline', dxf: 'architecture', dwg: 'architecture',
    pdf: 'picture_as_pdf', png: 'image', jpg: 'image', jpeg: 'image', webp: 'image',
    zip: 'folder_zip', rar: 'folder_zip', '7z': 'folder_zip', lbrn: 'precision_manufacturing', lbrn2: 'precision_manufacturing'
};

const Files = {
    ext: (name) => (String(name).split('.').pop() || '').toLowerCase(),
    icon: (name) => ICONS[Files.ext(name)] || 'description',

    fmtSize: (b) => {
        if (!b) return '';
        if (b < 1024) return `${b} B`;
        if (b < 1048576) return `${(b / 1024).toFixed(0)} KB`;
        return `${(b / 1048576).toFixed(1)} MB`;
    },

    /**
     * Reduz a foto antes de enviar (lado maior até `max` px, JPEG/WebP ~85%).
     * Uma foto de celular de 4 MB vira ~100–200 KB. GIF vai sem alterar (animação).
     */
    resizeImage: (file, max = 1000) => new Promise((resolve, reject) => {
        if (!file.type.startsWith('image/')) return reject(new Error('Escolha um arquivo de imagem (JPG, PNG, WEBP).'));
        if (file.type === 'image/gif') return resolve(file);
        const img = new Image();
        const url = URL.createObjectURL(file);
        img.onload = () => {
            URL.revokeObjectURL(url);
            const scale = Math.min(1, max / Math.max(img.width, img.height));
            const canvas = document.createElement('canvas');
            canvas.width = Math.round(img.width * scale);
            canvas.height = Math.round(img.height * scale);
            const ctx = canvas.getContext('2d');
            const keepAlpha = file.type === 'image/png' || file.type === 'image/webp';
            if (!keepAlpha) { ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, canvas.width, canvas.height); }
            ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
            // PNG/WEBP com transparência → WEBP (mantém fundo transparente); demais → JPEG
            canvas.toBlob(b => b ? resolve(b) : reject(new Error('Não foi possível processar a imagem.')),
                keepAlpha ? 'image/webp' : 'image/jpeg', 0.85);
        };
        img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('Imagem inválida ou corrompida.')); };
        img.src = url;
    }),

    /**
     * Duas cores marcantes da imagem (ignora branco, preto, cinza e transparente).
     * Agrupa por matiz e escolhe os 2 grupos mais frequentes com matiz bem diferente.
     */
    dominantColors: (url) => new Promise((resolve, reject) => {
        if (!url) return resolve([]);
        const img = new Image();
        img.crossOrigin = 'anonymous';          // bucket público do Supabase permite CORS
        img.onload = () => {
            const W = 120, H = Math.max(1, Math.round(120 * img.height / img.width));
            const cv = document.createElement('canvas'); cv.width = W; cv.height = H;
            const ctx = cv.getContext('2d'); ctx.drawImage(img, 0, 0, W, H);
            let data;
            try { data = ctx.getImageData(0, 0, W, H).data; } catch (e) { return reject(e); }
            const bins = new Map();               // matiz (24 faixas) → soma de cores
            for (let i = 0; i < data.length; i += 4) {
                const [r, g, b, a] = [data[i], data[i + 1], data[i + 2], data[i + 3]];
                if (a < 200) continue;
                const max = Math.max(r, g, b), min = Math.min(r, g, b), l = (max + min) / 510, d = max - min;
                if (d < 70 || l < 0.18 || l > 0.85) continue;     // pouco saturado/escuro/claro demais
                let h = max === r ? ((g - b) / d) % 6 : max === g ? (b - r) / d + 2 : (r - g) / d + 4;
                h = (h * 60 + 360) % 360;
                const k = Math.floor(h / 15);
                const bin = bins.get(k) || { n: 0, r: 0, g: 0, b: 0, h: 0 };
                bin.n++; bin.r += r; bin.g += g; bin.b += b; bin.h += h;
                bins.set(k, bin);
            }
            const hex = (v) => Math.round(v).toString(16).padStart(2, '0');
            const groups = [...bins.values()].sort((a, b) => b.n - a.n)
                .map(x => ({ n: x.n, h: x.h / x.n, c: `#${hex(x.r / x.n)}${hex(x.g / x.n)}${hex(x.b / x.n)}`.toUpperCase() }));
            const first = groups[0];
            if (!first) return resolve([]);
            const hueDist = (a, b) => Math.min(Math.abs(a - b), 360 - Math.abs(a - b));
            const second = groups.find(g => hueDist(g.h, first.h) > 40 && g.n > first.n * 0.08);
            resolve([first.c, second?.c].filter(Boolean));
        };
        img.onerror = () => reject(new Error('Não foi possível abrir a logo.'));
        img.src = url;
    }),

    /** Baixa um arquivo pelo link assinado (não sai da página). */
    download: async (path, name) => {
        try {
            const url = await DB.fileUrl(path, name);
            const a = document.createElement('a');
            a.href = url;
            a.download = name || '';
            a.rel = 'noopener';
            document.body.appendChild(a);
            a.click();
            a.remove();
        } catch (e) {
            console.error(e);
            toast('Não foi possível baixar: ' + (e.message || 'erro na nuvem'), 'error');
        }
    },

    /** Linha de arquivo. actions: 'download' | 'edit' (download + remover). */
    row: (f, actions = 'download') => `
        <div class="flex items-center gap-3 p-2.5 rounded-xl border bg-white" style="border-color:var(--border);">
            <div class="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0" style="background:var(--primary-light); color:var(--primary);">
                <span class="material-symbols-outlined" style="font-size:18px;">${f.uploading ? 'progress_activity' : Files.icon(f.name)}</span>
            </div>
            <div class="flex-1 min-w-0">
                <p class="text-sm font-bold truncate" style="color:var(--text-main);" title="${esc(f.name)}">${esc(f.name)}</p>
                <p class="text-[10px] font-semibold uppercase" style="color:var(--text-faint);">
                    ${f.uploading ? 'Enviando…' : `${esc(Files.ext(f.name))} · ${Files.fmtSize(f.size)}`}
                </p>
            </div>
            ${f.uploading ? '' : `
                <button type="button" class="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-violet-50 transition-all" style="color:var(--primary);"
                        data-file-download="${esc(f.path)}" data-file-name="${esc(f.name)}" title="Baixar">
                    <span class="material-symbols-outlined" style="font-size:18px;">download</span>
                </button>
                ${actions === 'edit' ? `
                <button type="button" class="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-red-50 hover:text-red-500 transition-all text-slate-400"
                        data-file-remove="${esc(f.path)}" title="Remover">
                    <span class="material-symbols-outlined" style="font-size:18px;">delete</span>
                </button>` : ''}
            `}
        </div>`,

    /** Liga os botões de download dentro de um container (delegação, chame uma vez). */
    bindDownloads: (root) => {
        root.addEventListener('click', (e) => {
            const btn = e.target.closest('[data-file-download]');
            if (!btn) return;
            e.preventDefault();
            e.stopPropagation();
            Files.download(btn.dataset.fileDownload, btn.dataset.fileName);
        });
    },

    /** Produtos (com arquivos) usados num pedido/orçamento. */
    forOrder: (order, products = DB.get('products') || []) => {
        const byId = new Map(products.map(p => [String(p.id), p]));
        const byName = new Map(products.map(p => [String(p.name).trim().toLowerCase(), p]));
        const found = new Map();
        (Array.isArray(order?.items) ? order.items : []).forEach(item => {
            const p = (item.productId != null && byId.get(String(item.productId)))
                   || byName.get(String(item.name || '').trim().toLowerCase());
            if (p && Array.isArray(p.files) && p.files.length) found.set(String(p.id), p);
        });
        return [...found.values()];
    },

    /** Total de arquivos de um pedido: os do cliente (order.files) + os dos produtos. */
    countForOrder: (order, products) =>
        (Array.isArray(order?.files) ? order.files.length : 0) +
        Files.forOrder(order, products).reduce((n, p) => n + p.files.length, 0),

    /**
     * Janela de arquivos de um pedido.
     * opts.orderKey: 'orders' | 'quotes' → permite anexar arquivos do cliente nesse pedido (ficam só nele).
     * opts.onChange: chamado depois de enviar/remover (para redesenhar a tela de trás).
     */
    openOrderModal: (order, title = 'Arquivos do pedido', opts = {}) => {
        document.getElementById('ggp-files-modal')?.remove();
        const key = opts.orderKey;
        const editable = !!key;
        let uploading = 0;

        const el = document.createElement('div');
        el.id = 'ggp-files-modal';
        el.className = 'fixed inset-0 z-[120] flex items-center justify-center p-4';
        el.style.cssText = 'background:rgba(10,10,20,0.5); backdrop-filter:blur(8px);';

        const current = () => editable
            ? (DB.get(key) || []).find(o => String(o.id) === String(order.id)) || order
            : order;

        const saveOrderFiles = (files) => {
            const list = DB.get(key) || [];
            const idx = list.findIndex(o => String(o.id) === String(order.id));
            if (idx === -1) return;
            list[idx] = { ...list[idx], files };
            DB.save(key, list);
            opts.onChange?.();
        };

        const render = () => {
            const o = current();
            const own = Array.isArray(o.files) ? o.files : [];
            const groups = Files.forOrder(o);
            el.innerHTML = `
            <div class="w-full max-w-xl rounded-2xl bg-white shadow-2xl flex flex-col max-h-[88vh]">
                <div class="flex items-center justify-between px-5 py-4 border-b" style="border-color:var(--border);">
                    <div>
                        <h3 class="text-base font-black" style="color:var(--text-main);">${esc(title)}</h3>
                        <p class="text-xs" style="color:var(--text-faint);">${o.number ? `${key === 'quotes' ? 'Orçamento' : 'Pedido'} Nº ${esc(docNo(o))}` : esc(o.id)} · ${esc(o.customerName || '')}</p>
                    </div>
                    <button type="button" data-close class="w-8 h-8 flex items-center justify-center rounded-full hover:bg-slate-100" style="color:var(--text-faint);">
                        <span class="material-symbols-outlined" style="font-size:18px;">close</span>
                    </button>
                </div>
                <div class="overflow-y-auto p-5 space-y-6" style="background:var(--bg-main);">
                    ${editable ? `
                    <div>
                        <div class="flex items-center justify-between mb-2">
                            <div>
                                <p class="label-caps" style="color:var(--primary);">Arquivos do cliente (só deste ${key === 'quotes' ? 'orçamento — vão junto para o pedido' : 'pedido'})</p>
                                <p class="text-[11px]" style="color:var(--text-faint);">Arte personalizada, logo, nomes… não vão para o cadastro do produto.</p>
                            </div>
                            <button type="button" data-upload class="btn-primary !py-1.5 !px-3 text-xs flex-shrink-0">
                                <span class="material-symbols-outlined !text-sm">upload</span> Adicionar
                            </button>
                            <input type="file" data-file-input multiple class="hidden">
                        </div>
                        <div data-drop class="rounded-xl border-2 border-dashed p-3 space-y-2 transition-all" style="border-color:var(--border);">
                            ${own.length ? own.map(f => Files.row(f, 'edit')).join('') : `
                                <p class="text-[11px] text-center py-3 italic" style="color:var(--text-faint);">Clique em "Adicionar" ou arraste os arquivos para cá.</p>`}
                        </div>
                    </div>` : ''}

                    ${groups.length ? `
                    <div>
                        <p class="label-caps mb-2">Arquivos dos produtos (gabaritos)</p>
                        <div class="space-y-4">
                            ${groups.map(p => `
                                <div>
                                    <p class="text-xs font-bold mb-1.5" style="color:var(--text-muted);">${esc(p.name)}</p>
                                    <div class="space-y-2">${p.files.map(f => Files.row(f)).join('')}</div>
                                </div>`).join('')}
                        </div>
                    </div>` : (!editable ? `
                        <div class="text-center py-8">
                            <span class="material-symbols-outlined text-4xl text-slate-300">folder_off</span>
                            <p class="text-sm font-bold mt-2" style="color:var(--text-muted);">Nenhum arquivo</p>
                            <p class="text-xs mt-1" style="color:var(--text-faint);">Anexe os arquivos de corte no cadastro do produto.</p>
                        </div>` : '')}
                </div>
            </div>`;
        };

        const upload = async (fileList) => {
            const files = [...(fileList || [])];
            if (!files.length) return;
            const temp = files.map(f => ({ path: `uploading-${Math.random()}`, name: f.name, size: f.size, uploading: true }));
            const base = (current().files || []).slice();
            uploading += files.length;
            // mostra "Enviando…" sem salvar ainda
            const o = current(); o.files = [...base, ...temp]; render(); o.files = base;
            const done = [];
            await Promise.all(files.map(async (file) => {
                try { done.push(await DB.uploadFile(`orders/${order.id}`, file)); }
                catch (e) { console.error(e); import('./app.js').then(m => m.default.toast(`Falha ao enviar "${file.name}": ${e.message || 'erro na nuvem'}`, 'error')); }
                finally { uploading--; }
            }));
            if (done.length) {
                saveOrderFiles([...(current().files || []), ...done]);
                import('./app.js').then(m => m.default.toast(`${done.length} arquivo(s) anexado(s) ao pedido`));
            }
            render();
        };

        const close = () => {
            if (uploading) return import('./app.js').then(m => m.default.toast('Aguarde terminar o envio.', 'error'));
            el.remove(); document.removeEventListener('keydown', onKey);
        };
        const onKey = (e) => { if (e.key === 'Escape') close(); };

        el.addEventListener('click', (e) => {
            if (e.target === el || e.target.closest('[data-close]')) return close();
            if (e.target.closest('[data-upload]')) return el.querySelector('[data-file-input]').click();
            const rm = e.target.closest('[data-file-remove]');
            if (rm && editable) {
                const path = rm.dataset.fileRemove;
                import('./app.js').then(m => m.default.confirm({
                    title: 'Remover arquivo?',
                    message: 'O arquivo será apagado deste pedido.',
                    type: 'danger',
                    confirmLabel: 'Remover',
                    onConfirm: () => {
                        saveOrderFiles((current().files || []).filter(f => f.path !== path));
                        DB.removeFiles([path]);
                        render();
                    }
                }));
            }
        });
        el.addEventListener('change', (e) => {
            if (e.target.matches('[data-file-input]')) { upload(e.target.files); e.target.value = ''; }
        });
        el.addEventListener('dragover', (e) => { if (editable) { e.preventDefault(); el.querySelector('[data-drop]')?.style.setProperty('border-color', 'var(--primary)'); } });
        el.addEventListener('dragleave', () => el.querySelector('[data-drop]')?.style.setProperty('border-color', 'var(--border)'));
        el.addEventListener('drop', (e) => { if (editable) { e.preventDefault(); upload(e.dataTransfer.files); } });

        document.addEventListener('keydown', onKey);
        Files.bindDownloads(el);
        render();
        document.body.appendChild(el);
    }
};

export default Files;
