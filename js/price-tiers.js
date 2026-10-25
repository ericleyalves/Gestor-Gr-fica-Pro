/**
 * price-tiers.js — Preço por quantidade (tabela de lojista)
 *
 * No produto: product.priceTiers = [{ minQty: 50, price: 2.9 }, { minQty: 100, price: 2.5 }]
 * (preço unitário BASE a partir daquela quantidade; as variações somam por cima,
 * como no preço normal). Abaixo da 1ª faixa vale o preço normal do produto.
 */
import { esc, fmtBRL } from './utils.js';

const PriceTiers = {
    /** Faixas válidas, em ordem crescente de quantidade. */
    of: (p) => (Array.isArray(p?.priceTiers) ? p.priceTiers : [])
        .map(t => ({ minQty: Math.round(Number(t.minQty) || 0), price: Math.round((Number(t.price) || 0) * 100) / 100 }))
        .filter(t => t.minQty > 1 && t.price > 0)
        .sort((a, b) => a.minQty - b.minQty),

    /** Faixa que vale para a quantidade (null = preço normal). */
    tierFor: (p, qty) => {
        const q = Number(qty) || 1;
        return PriceTiers.of(p).filter(t => q >= t.minQty).pop() || null;
    },

    /** Preço unitário base para a quantidade. */
    basePrice: (p, qty) => {
        const t = PriceTiers.tierFor(p, qty);
        return t ? t.price : (parseFloat(p?.price) || 0);
    },

    /** Próxima faixa (para dica "a partir de 100 un fica R$ X"). */
    nextTier: (p, qty) => PriceTiers.of(p).find(t => (Number(qty) || 1) < t.minQty) || null,

    /** Texto curto: "50+ un R$ 2,90 · 100+ un R$ 2,50". */
    summary: (p) => PriceTiers.of(p).map(t => `${t.minQty}+ un ${fmtBRL(t.price)}`).join(' · '),

    /** Linhas editáveis do formulário do produto. */
    editorHtml: (tiers) => {
        const rows = (tiers || []).map((t, i) => `
            <div class="flex items-center gap-2" data-tier="${i}">
                <span class="text-xs font-bold whitespace-nowrap" style="color:var(--text-faint);">A partir de</span>
                <input type="number" min="2" step="1" class="tier-qty !w-24" value="${esc(t.minQty || '')}" placeholder="50" inputmode="numeric">
                <span class="text-xs font-bold whitespace-nowrap" style="color:var(--text-faint);">un → R$</span>
                <input type="number" min="0" step="0.01" class="tier-price !w-28" value="${t.price ? Number(t.price).toFixed(2) : ''}" placeholder="0,00" inputmode="decimal">
                <span class="text-xs whitespace-nowrap" style="color:var(--text-faint);">/ un</span>
                <button type="button" class="tier-del w-8 h-8 flex items-center justify-center rounded-lg hover:bg-red-50 hover:text-red-500 text-slate-400" title="Remover faixa">
                    <span class="material-symbols-outlined" style="font-size:18px;">delete</span></button>
            </div>`).join('');
        return rows || `<p class="text-xs italic" style="color:var(--text-faint);">Sem faixas: vale sempre o preço de venda acima.</p>`;
    }
};

export default PriceTiers;
