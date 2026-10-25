/**
 * pix.js — Pix "copia e cola" (BR Code estático com valor)
 *
 * Gera o código no padrão EMV do Banco Central (Manual de Padrões para
 * Iniciação do Pix): o cliente cola no app do banco e o valor já vem
 * preenchido. Sem integração com banco: é o mesmo código que o QR Code
 * estático. Confira sempre o primeiro com um Pix de teste de R$ 0,01.
 *
 * Usa de Configurações → Perfil da gráfica: Chave Pix, Tipo da chave,
 * Nome do recebedor (ou o nome da gráfica) e Cidade.
 */
import DB from './db.js';

const tlv = (id, value) => `${id}${String(value.length).padStart(2, '0')}${value}`;

/** CRC16-CCITT (polinômio 0x1021, valor inicial 0xFFFF), em hexa maiúsculo. */
export const crc16 = (str) => {
    let crc = 0xFFFF;
    for (let i = 0; i < str.length; i++) {
        crc ^= str.charCodeAt(i) << 8;
        for (let b = 0; b < 8; b++) crc = (crc & 0x8000) ? ((crc << 1) ^ 0x1021) & 0xFFFF : (crc << 1) & 0xFFFF;
    }
    return crc.toString(16).toUpperCase().padStart(4, '0');
};

/** Texto sem acento, maiúsculo, só caracteres aceitos, cortado no limite. */
const plain = (s, max) => String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/[^A-Za-z0-9 .\-]/g, ' ').replace(/\s+/g, ' ').trim().toUpperCase().slice(0, max);

const isEmail = (k) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(k);
const isEvp = (k) => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(k);

/**
 * Chave no formato que o Pix exige.
 * type: 'cpf' | 'cnpj' | 'phone' | 'email' | 'evp' | '' (detectar)
 */
export const normalizeKey = (key, type = '') => {
    const k = String(key || '').trim();
    if (!k) return '';
    const d = k.replace(/\D/g, '');
    const t = type || (isEmail(k) ? 'email' : isEvp(k) ? 'evp'
        : k.startsWith('+') || /[()]/.test(k) ? 'phone'
        : d.length === 14 ? 'cnpj'
        : d.length === 13 && d.startsWith('55') ? 'phone'
        : d.length === 11 ? 'cpf' : d.length === 10 ? 'phone' : '');
    if (t === 'email') return k.toLowerCase();
    if (t === 'evp') return k.toLowerCase();
    if (t === 'cnpj') return d.length === 14 ? d : '';
    if (t === 'cpf') return d.length === 11 ? d : '';
    if (t === 'phone') {
        const n = d.startsWith('55') && d.length >= 12 ? d : `55${d}`;
        return n.length >= 12 && n.length <= 13 ? `+${n}` : '';
    }
    return '';
};

/** Cidade a partir do endereço ("…, Maceió/AL" → "MACEIO"). */
const cityFromAddress = (address) => {
    const m = String(address || '').match(/([A-Za-zÀ-ÿ' ]+)\s*[\/-]\s*[A-Z]{2}\b/);
    return m ? m[1] : '';
};

/**
 * Monta o código.
 * @param {object} o  { key, type, name, city, amount, txid, description }
 */
export const brCode = ({ key, type = '', name, city, amount, txid = '***', description = '' }) => {
    const k = normalizeKey(key, type);
    if (!k) return '';
    const desc = plain(description, 40);
    const account = tlv('00', 'br.gov.bcb.pix') + tlv('01', k) + (desc ? tlv('02', desc) : '');
    const value = Number(amount) > 0 ? tlv('54', (Math.round(Number(amount) * 100) / 100).toFixed(2)) : '';
    const tx = String(txid || '***').replace(/[^A-Za-z0-9]/g, '').slice(0, 25) || '***';
    const payload = tlv('00', '01')
        + tlv('26', account)
        + tlv('52', '0000')
        + tlv('53', '986')
        + value
        + tlv('58', 'BR')
        + tlv('59', plain(name, 25) || 'RECEBEDOR')
        + tlv('60', plain(city, 15) || 'BRASIL')
        + tlv('62', tlv('05', tx))
        + '6304';
    return payload + crc16(payload);
};

const Pix = {
    /** A gráfica tem chave válida? */
    ready: () => {
        const s = DB.get('shop_profile') || {};
        return !!normalizeKey(s.pixKey, s.pixKeyType || '');
    },

    /** Código para um valor (txid ajuda a reconhecer o pagamento no extrato). */
    forAmount: (amount, txid = '***') => {
        const s = DB.get('shop_profile') || {};
        return brCode({
            key: s.pixKey, type: s.pixKeyType || '',
            name: s.pixName || s.name, city: s.pixCity || cityFromAddress(s.address) || 'MACEIO',
            amount, txid
        });
    },

    /** Linhas prontas para colar numa mensagem de WhatsApp. */
    messageLines: (amount, txid, label = 'Pix copia e cola') => {
        const code = Pix.forAmount(amount, txid);
        const s = DB.get('shop_profile') || {};
        if (!code) return s.pixKey ? [`Chave Pix: ${s.pixKey}`] : [];
        return [`${label}:`, code, '', `(Ou pela chave: ${s.pixKey})`];
    }
};

export default Pix;
