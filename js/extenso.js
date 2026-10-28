/**
 * extenso.js — Valor em reais por extenso (pt-BR), para o recibo.
 * extenso(1250.5) → "mil duzentos e cinquenta reais e cinquenta centavos"
 */
const UN = ['', 'um', 'dois', 'três', 'quatro', 'cinco', 'seis', 'sete', 'oito', 'nove', 'dez', 'onze', 'doze',
    'treze', 'quatorze', 'quinze', 'dezesseis', 'dezessete', 'dezoito', 'dezenove'];
const DEZ = ['', '', 'vinte', 'trinta', 'quarenta', 'cinquenta', 'sessenta', 'setenta', 'oitenta', 'noventa'];
const CEN = ['', 'cento', 'duzentos', 'trezentos', 'quatrocentos', 'quinhentos', 'seiscentos', 'setecentos', 'oitocentos', 'novecentos'];

/** 0–999 por extenso. */
const ate999 = (n) => {
    if (n === 0) return '';
    if (n === 100) return 'cem';
    const c = Math.floor(n / 100), r = n % 100, parts = [];
    if (c) parts.push(CEN[c]);
    if (r) parts.push(r < 20 ? UN[r] : DEZ[Math.floor(r / 10)] + (r % 10 ? ` e ${UN[r % 10]}` : ''));
    return parts.join(' e ');
};

/** Inteiro por extenso (até centenas de bilhões). */
const inteiro = (n) => {
    if (n === 0) return 'zero';
    const groups = [];                         // de 3 em 3, do menor para o maior
    while (n > 0) { groups.push(n % 1000); n = Math.floor(n / 1000); }
    const names = [['', ''], ['mil', 'mil'], ['milhão', 'milhões'], ['bilhão', 'bilhões']];
    const out = [];
    for (let i = groups.length - 1; i >= 0; i--) {
        const g = groups[i];
        if (!g) continue;
        let txt = i === 1 && g === 1 ? 'mil' : `${ate999(g)}${names[i][0] ? ` ${g === 1 ? names[i][0] : names[i][1]}` : ''}`;
        out.push({ txt, g, i });
    }
    // "e" antes do último grupo quando ele é < 100 ou centena redonda (ex.: mil e cem, mil e vinte)
    return out.map((p, k) => {
        if (k === 0) return p.txt;
        const last = k === out.length - 1;
        const useE = last && (p.g < 100 || p.g % 100 === 0);
        return `${useE ? 'e ' : ''}${p.txt}`;
    }).join(out.length > 1 ? ' ' : '').replace(/\s+/g, ' ').trim();
};

/** Reais e centavos por extenso. */
export const extenso = (valor) => {
    const v = Math.round((Math.abs(Number(valor)) || 0) * 100);
    const reais = Math.floor(v / 100), cent = v % 100;
    const big = reais >= 1000000 && reais % 1000000 === 0;   // "um milhão DE reais"
    const r = reais ? `${inteiro(reais)}${big ? ' de' : ''} ${reais === 1 ? 'real' : 'reais'}` : '';
    const c = cent ? `${inteiro(cent)} ${cent === 1 ? 'centavo' : 'centavos'}` : '';
    if (!r && !c) return 'zero real';
    return [r, c].filter(Boolean).join(' e ');
};

export default extenso;
