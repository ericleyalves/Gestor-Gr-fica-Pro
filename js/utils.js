// Helpers compartilhados entre as páginas
export const fmtBRL = (v) => parseFloat(v || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

/**
 * Escapa texto para uso seguro dentro de innerHTML/atributos.
 * Use em TODO dado digitado pelo usuário ou vindo da nuvem: ${esc(cliente.nome)}
 */
const ESC_MAP = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;', '`': '&#96;' };
export const esc = (v) => (v == null ? '' : String(v)).replace(/[&<>"'`]/g, ch => ESC_MAP[ch]);

/** Soma dias úteis (seg–sex) a uma data. Feriados não são considerados. */
export const addBusinessDays = (date, n) => {
    const d = new Date(date);
    d.setHours(12, 0, 0, 0);
    let left = Math.max(0, Math.round(Number(n) || 0));
    while (left > 0) { d.setDate(d.getDate() + 1); if (d.getDay() !== 0 && d.getDay() !== 6) left--; }
    return d;
};

/** Data local no formato AAAA-MM-DD (sem o desvio de fuso do toISOString). */
export const isoDate = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

/** "qui, 30/10" a partir de Date ou AAAA-MM-DD. */
export const fmtShortDate = (v) => {
    const d = typeof v === 'string' ? new Date(`${v}T12:00:00`) : v;
    if (!d || isNaN(d)) return '';
    return d.toLocaleDateString('pt-BR', { weekday: 'short', day: '2-digit', month: '2-digit' }).replace('.', '');
};

/**
 * Preenchimento automático de endereço pelo CEP (ViaCEP, gratuito).
 * Liga um campo de CEP a um campo de endereço: com 8 dígitos busca e preenche
 * "Rua, nº - Bairro, Cidade/UF" e posiciona o cursor para digitar o número.
 */
export const bindCepLookup = (cepEl, addressEl) => {
    if (!cepEl || !addressEl) return;
    let last = '';
    cepEl.addEventListener('input', async () => {
        const d = cepEl.value.replace(/\D/g, '').slice(0, 8);
        cepEl.value = d.length > 5 ? `${d.slice(0, 5)}-${d.slice(5)}` : d;
        if (d.length !== 8 || d === last) return;
        last = d;
        cepEl.style.opacity = '.6';
        try {
            const r = await fetch(`https://viacep.com.br/ws/${d}/json/`);
            const j = await r.json();
            if (j.erro) throw new Error('CEP não encontrado');
            const street = j.logradouro || '';
            const rest = [j.bairro, `${j.localidade}/${j.uf}`].filter(Boolean).join(', ');
            addressEl.value = street ? `${street}, nº  - ${rest}` : rest;
            addressEl.focus();
            const pos = street ? street.length + 5 : addressEl.value.length;   // logo depois de "nº "
            addressEl.setSelectionRange(pos, pos);
        } catch (e) {
            console.warn('CEP:', e.message);
            addressEl.placeholder = 'CEP não encontrado — digite o endereço';
        } finally { cepEl.style.opacity = ''; }
    });
};
