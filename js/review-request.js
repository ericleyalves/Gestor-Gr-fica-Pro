/**
 * review-request.js — Pedido de avaliação no Google depois da entrega
 *
 * Ao confirmar a entrega, abre a mensagem pronta com o link de avaliação do
 * Perfil da Empresa no Google (Configurações → Perfil da gráfica → "Link de
 * avaliação no Google"). Registra `reviewRequestedAt` no pedido.
 * Sem link cadastrado, não abre sozinha: só mostra uma dica.
 */
import DB from './db.js';
import { docNo } from './utils.js';
import WaMessage from './wa-message.js';
import { orderOf, phoneOf, firstName, shortProduct, fmtWhen, stampOrder } from './ready-notice.js';

const app = () => import('./app.js').then(m => m.default);

/** Link de avaliação da Gráfica Arteflix (usado se o campo das Configurações estiver vazio). */
export const DEFAULT_REVIEW_LINK = 'https://g.page/r/CTE2y9jOOEIuEBM/review';

const ReviewRequest = {
    link: () => String((DB.get('shop_profile') || {}).googleReview || '').trim() || DEFAULT_REVIEW_LINK,

    message: (o) => {
        const shop = DB.get('shop_profile') || {};
        const first = firstName(o), product = shortProduct(o, 60);
        const link = ReviewRequest.link() || '[cole aqui o link de avaliação do Google]';
        return [
            `Oi${first ? `, ${first}` : ''}! Tudo certo com o seu pedido${product ? ` (${product})` : ''}? 😊`,
            '',
            'Se você gostou do resultado, poderia deixar uma avaliação pra gente no Google? Leva menos de 1 minuto e ajuda muito a nossa gráfica:',
            '',
            `⭐ ${link}`,
            '',
            `Muito obrigado pela confiança!${shop.name ? `\n— ${shop.name}` : ''}`
        ].join('\n');
    },

    /** Chamado depois de confirmar a entrega. */
    afterDelivery: async (orderId, onDone) => {
        const o = orderOf(orderId);
        if (!o || o.reviewRequestedAt) return;
        if (!ReviewRequest.link()) {
            (await app()).toast('Dica: cole o link de avaliação do Google em Configurações → Perfil da gráfica para pedir avaliação a cada entrega.', 'info');
            return;
        }
        ReviewRequest.open(orderId, { auto: true, onDone });
    },

    open: (orderId, { auto = false, onDone } = {}) => {
        const o = orderOf(orderId);
        if (!o) return;
        const when = fmtWhen(o.reviewRequestedAt);
        WaMessage.open({
            title: 'Pedir avaliação no Google',
            subtitle: `Pedido Nº ${docNo(o)} · ${o.customerName || ''}${when ? ` · já pedido em ${when}` : ''}`,
            icon: 'star',
            message: ReviewRequest.message(o),
            phone: phoneOf(o),
            warning: ReviewRequest.link() ? '' : 'Falta o link de avaliação. Cadastre em <b>Configurações → Perfil da gráfica</b> (Google Meu Negócio → "Pedir avaliações" → copiar link).',
            hint: 'Avaliações recentes ajudam a gráfica a aparecer nas buscas do Google em Maceió.',
            auto,
            onSent: () => { stampOrder(orderId, 'reviewRequestedAt', 'Pedido de avaliação no Google enviado (WhatsApp)'); onDone?.(); }
        });
    }
};

export default ReviewRequest;
