/**
 * signature.js — Assinatura da gráfica (para sair no recibo)
 *
 * Desenhe com o mouse/dedo ou envie uma foto da assinatura (de preferência em
 * papel branco). A imagem é recortada, fica com fundo transparente e é salva
 * pequena em shop_profile.signature (PNG em base64, sincroniza com a nuvem).
 */
import DB from './db.js';

const MAX_W = 600, MAX_H = 200;

/** Recorta as bordas vazias, deixa o fundo claro transparente e reduz o tamanho. */
const clean = (srcCanvas, removeLight = false) => {
    const w = srcCanvas.width, h = srcCanvas.height;
    const ctx = srcCanvas.getContext('2d', { willReadFrequently: true });
    const img = ctx.getImageData(0, 0, w, h), d = img.data;
    let x0 = w, y0 = h, x1 = -1, y1 = -1;
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
        const i = (y * w + x) * 4;
        if (removeLight) {                      // foto: claro vira transparente, escuro vira tinta
            const lum = 0.299 * d[i] + 0.587 * d[i + 1] + 0.114 * d[i + 2];
            const a = lum > 170 ? 0 : Math.min(255, (170 - lum) * 2.2);
            d[i] = d[i + 1] = d[i + 2] = 20; d[i + 3] = a;
        }
        if (d[i + 3] > 30) { if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; }
    }
    if (x1 < 0) return '';
    ctx.putImageData(img, 0, 0);
    const pad = 6, cw = x1 - x0 + 1 + pad * 2, ch = y1 - y0 + 1 + pad * 2;
    const scale = Math.min(1, MAX_W / cw, MAX_H / ch);
    const out = document.createElement('canvas');
    out.width = Math.round(cw * scale); out.height = Math.round(ch * scale);
    out.getContext('2d').drawImage(srcCanvas, x0 - pad, y0 - pad, cw, ch, 0, 0, out.width, out.height);
    return out.toDataURL('image/png');
};

const Signature = {
    get: () => (DB.get('shop_profile') || {}).signature || '',
    save: (dataUrl) => DB.save('shop_profile', { ...(DB.get('shop_profile') || {}), signature: dataUrl || '' }),

    /** Janela para desenhar ou enviar a assinatura. */
    open: (onSave) => {
        document.getElementById('ggp-sign-modal')?.remove();
        const el = document.createElement('div');
        el.id = 'ggp-sign-modal';
        el.style.cssText = 'position:fixed; inset:0; z-index:9999; background:rgba(15,13,25,.55); display:flex; align-items:center; justify-content:center; padding:16px;';
        el.innerHTML = `
        <div style="background:#fff; border-radius:20px; width:100%; max-width:640px; padding:22px; box-shadow:0 20px 60px rgba(0,0,0,.25);">
            <div class="flex items-center justify-between mb-1">
                <h3 class="text-lg font-black text-slate-800 flex items-center gap-2"><span class="material-symbols-outlined" style="color:var(--primary);">draw</span> Sua assinatura</h3>
                <button type="button" data-close class="p-1 rounded-lg hover:bg-slate-100 text-slate-500"><span class="material-symbols-outlined">close</span></button>
            </div>
            <p class="text-xs text-slate-500 mb-3">Assine no quadro com o mouse ou o dedo — ou envie uma foto da assinatura feita com caneta em papel branco.</p>
            <canvas id="sg-pad" style="width:100%; height:220px; border:2px dashed #D9D6E5; border-radius:14px; background:#fff; touch-action:none; cursor:crosshair;"></canvas>
            <div class="flex flex-wrap items-center gap-2 mt-3">
                <button type="button" id="sg-clear" class="btn-ghost !py-2 !px-3 text-sm"><span class="material-symbols-outlined text-[18px]">ink_eraser</span> Limpar</button>
                <label class="btn-ghost !py-2 !px-3 text-sm cursor-pointer"><span class="material-symbols-outlined text-[18px]">upload</span> Enviar foto
                    <input type="file" id="sg-file" accept="image/*" class="hidden"></label>
                <button type="button" id="sg-save" class="btn-primary !py-2 ml-auto"><span class="material-symbols-outlined text-[18px]">check</span> Salvar assinatura</button>
            </div>
        </div>`;
        document.body.appendChild(el);

        const pad = el.querySelector('#sg-pad');
        const ratio = Math.max(2, window.devicePixelRatio || 1);
        pad.width = pad.clientWidth * ratio; pad.height = pad.clientHeight * ratio;
        const ctx = pad.getContext('2d');
        ctx.scale(ratio, ratio);
        ctx.lineCap = 'round'; ctx.lineJoin = 'round'; ctx.strokeStyle = '#141220'; ctx.lineWidth = 2.6;
        let drawing = false, last = null, fromPhoto = false;
        const pos = (e) => { const r = pad.getBoundingClientRect(); return { x: e.clientX - r.left, y: e.clientY - r.top }; };
        pad.addEventListener('pointerdown', (e) => {
            if (fromPhoto) { ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.clearRect(0, 0, pad.width, pad.height); ctx.scale(ratio, ratio); fromPhoto = false; }
            drawing = true; last = pos(e); pad.setPointerCapture(e.pointerId);
            ctx.beginPath(); ctx.arc(last.x, last.y, 1.2, 0, Math.PI * 2); ctx.fillStyle = '#141220'; ctx.fill();
        });
        pad.addEventListener('pointermove', (e) => {
            if (!drawing) return;
            const p = pos(e);
            ctx.beginPath(); ctx.moveTo(last.x, last.y); ctx.lineTo(p.x, p.y); ctx.stroke();
            last = p;
        });
        const stop = () => { drawing = false; };
        pad.addEventListener('pointerup', stop); pad.addEventListener('pointercancel', stop);

        const close = () => el.remove();
        el.addEventListener('click', (e) => { if (e.target === el || e.target.closest('[data-close]')) close(); });
        el.querySelector('#sg-clear').onclick = () => {
            ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.clearRect(0, 0, pad.width, pad.height); ctx.scale(ratio, ratio); fromPhoto = false;
        };
        el.querySelector('#sg-file').onchange = (e) => {
            const file = e.target.files?.[0];
            if (!file) return;
            const img = new Image();
            img.onload = () => {
                ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.clearRect(0, 0, pad.width, pad.height);
                const s = Math.min(pad.width / img.width, pad.height / img.height);
                const w = img.width * s, h = img.height * s;
                ctx.drawImage(img, (pad.width - w) / 2, (pad.height - h) / 2, w, h);
                // mostra já sem o fundo do papel
                const prev = clean(pad, true);
                ctx.clearRect(0, 0, pad.width, pad.height);
                if (prev) {
                    const p = new Image();
                    p.onload = () => { const k = Math.min(pad.width / p.width, pad.height / p.height, 2.5);
                        ctx.drawImage(p, (pad.width - p.width * k) / 2, (pad.height - p.height * k) / 2, p.width * k, p.height * k); };
                    p.src = prev;
                }
                ctx.scale(ratio, ratio); fromPhoto = true;
                URL.revokeObjectURL(img.src);
            };
            img.src = URL.createObjectURL(file);
        };
        el.querySelector('#sg-save').onclick = async () => {
            const data = clean(pad);
            const { default: App } = await import('./app.js');
            if (!data) return App.toast('Assine no quadro ou envie uma foto primeiro.', 'error');
            Signature.save(data);
            App.toast('Assinatura salva! Ela vai sair nos próximos recibos.');
            close();
            onSave?.(data);
        };
    }
};

export default Signature;
