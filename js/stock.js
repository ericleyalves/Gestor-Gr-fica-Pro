/**
 * stock.js — Regras do estoque
 *
 * Materiais (tabela "materials"): { id, name, category, unit, stock, minQty, cost, supplier, location, moves[] }
 *   moves: [{ at, qty (+entrada / −saída), reason, orderId? }]
 * Produto: product.materials = [{ materialId, qty }]  → consumo POR UNIDADE vendida.
 * Produto com "Controlar estoque" (manageStock) também tem o estoque de peça pronta baixado.
 *
 * Baixa automática: quando o pedido sai de "Aguardando Arte" (Produção em diante).
 * Estorno: se um pedido já baixado for cancelado, devolve tudo. order.stockDeducted evita baixa dupla.
 */
import DB from './db.js';
import { docNo } from './utils.js';

export const MAT_CATEGORIES = ['Chapas MDF', 'Acrílico', 'Tintas / UV', 'Embalagens', 'Ferragens / Argolas', 'Adesivos / Papéis', 'Outros'];
export const UNITS = ['chapa', 'un', 'm²', 'm', 'ml', 'kg', 'rolo', 'pacote', 'folha'];

const round3 = (v) => Math.round((Number(v) || 0) * 1000) / 1000;
const PRODUCING = ['Produção', 'Finalizado', 'Concluído', 'Entregue', 'Acabamento', 'Pronto'];
const isProducing = (status) => PRODUCING.some(s => String(status || '').includes(s));

const Stock = {
    isLow: (m) => Number(m.minQty) > 0 && Number(m.stock) <= Number(m.minQty),

    /** Necessidade de materiais e peças prontas de um pedido: { materials: Map(id→qty), products: Map(id→qty) } */
    needsOf: (order) => {
        const products = DB.get('products') || [];
        const materials = new Map(), finished = new Map();
        (order.items || []).forEach(i => {
            const p = products.find(x => String(x.id) === String(i.productId));
            if (!p) return;
            const q = Number(i.quantity) || 1;
            (p.materials || []).forEach(u => {
                if (!u.materialId || !(Number(u.qty) > 0)) return;
                materials.set(u.materialId, round3((materials.get(u.materialId) || 0) + Number(u.qty) * q));
            });
            if (p.manageStock) finished.set(p.id, (finished.get(p.id) || 0) + q);
        });
        return { materials, finished };
    },

    /** Lança movimentos (sign −1 = baixa, +1 = estorno). Retorna textos do que mudou. */
    _apply: (order, sign, reason) => {
        const { materials: need, finished } = Stock.needsOf(order);
        const log = [];
        if (need.size) {
            const mats = DB.get('materials') || [];
            const at = new Date().toISOString();
            need.forEach((qty, id) => {
                const m = mats.find(x => x.id === id);
                if (!m) return;
                const delta = round3(sign * qty);
                m.stock = round3((Number(m.stock) || 0) + delta);
                m.moves = [...(m.moves || []), { at, qty: delta, reason: `${reason} · Pedido Nº ${docNo(order)}`, orderId: order.id }].slice(-300);
                log.push(`${m.name}: ${delta > 0 ? '+' : ''}${String(delta).replace('.', ',')} ${m.unit}`);
            });
            DB.save('materials', mats);
        }
        if (finished.size) {
            const prods = DB.get('products') || [];
            finished.forEach((qty, id) => {
                const p = prods.find(x => x.id === id);
                if (!p) return;
                p.stock = Math.max(0, (Number(p.stock) || 0) + sign * qty);
                log.push(`${p.name} (pronto): ${sign > 0 ? '+' : '−'}${qty}`);
            });
            DB.save('products', prods);
        }
        return log;
    },

    /**
     * Chame sempre que o status de um pedido mudar. Recebe o pedido JÁ com o status novo,
     * marca stockDeducted e salva o pedido. Retorna o pedido atualizado.
     */
    syncOrder: (orderId) => {
        const orders = DB.get('orders') || [];
        const i = orders.findIndex(o => String(o.id) === String(orderId));
        if (i === -1) return null;
        const o = orders[i];
        let log = null, text = '';
        if (!o.stockDeducted && isProducing(o.status) && o.status !== 'Cancelado') {
            log = Stock._apply(o, -1, 'Baixa automática');
            o.stockDeducted = true; text = 'Baixa no estoque';
        } else if (o.stockDeducted && o.status === 'Cancelado') {
            log = Stock._apply(o, +1, 'Estorno (cancelado)');
            o.stockDeducted = false; text = 'Estoque devolvido (cancelado)';
        }
        if (log === null) return o;
        if (log.length) o.history = [...(o.history || []), { at: new Date().toISOString(), text: `${text}: ${log.join('; ')}` }];
        orders[i] = o;
        DB.save('orders', orders);
        if (log.length) {
            const low = (DB.get('materials') || []).filter(Stock.isLow);
            if (low.length) import('./app.js').then(m => m.default.toast(`Estoque baixo: ${low.slice(0, 3).map(x => x.name).join(', ')}${low.length > 3 ? '…' : ''}`, 'error'));
        }
        return o;
    }
};

export default Stock;
