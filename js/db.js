const SUPABASE_URL = 'https://lcfzdammuehwnclywuhp.supabase.co';
const SUPABASE_KEY = 'sb_publishable_g20FE0UERlssSI48Pswv2A_qPghVpQC';

let supabaseClient = null;

const toSnakeCase = (obj) => {
    if (!obj) return null;
    const newObj = {};
    for (let key in obj) {
        let snake = key.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);
        newObj[snake] = obj[key];
    }
    return newObj;
};

const toCamelCase = (obj) => {
    if (!obj) return null;
    const newObj = {};
    for (let key in obj) {
        let camel = key.replace(/([-_][a-z])/g, group => group.toUpperCase().replace('-', '').replace('_', ''));
        newObj[camel] = obj[key];
    }
    return newObj;
};

const DB = {
    initSupabase: () => {
        if (window.supabase) {
            supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
            console.log("Supabase Client Initialized");
        }
    },

    syncFromCloud: async () => {
        if (!supabaseClient) return;
        const tables = ['customers', 'products', 'quotes', 'orders'];
        
        for (const table of tables) {
            try {
                const { data, error } = await supabaseClient.from(table).select('*');
                if (!error && data && data.length > 0) {
                    const camelData = data.map(toCamelCase);
                    localStorage.setItem(`ggp_${table}`, JSON.stringify(camelData));
                }
            } catch (e) {
                console.error(`Erro ao puxar ${table}:`, e);
            }
        }
    },

    save: (key, data) => {
        // Salva Local
        localStorage.setItem(`ggp_${key}`, JSON.stringify(data));
        
        // Salva na Nuvem (Background)
        if (supabaseClient && ['customers', 'products', 'quotes', 'orders'].includes(key)) {
            // Supabase exige upsert array e que os campos existam.
            const snakeData = Array.isArray(data) ? data.map(toSnakeCase) : [toSnakeCase(data)];
            
            // Para evitar conflito de UUID caso o sistema local gere IDs que não são UUID, 
            // a tabela no banco do Supabase deve aceitar esses IDs. 
            // (As tabelas quotes e orders do script já são TEXT).
            supabaseClient.from(key).upsert(snakeData).then(({ error }) => {
                if (error) console.error(`Erro ao salvar ${key} na nuvem:`, error);
            });
        }
    },

    get: (key) => {
        const data = localStorage.getItem(`ggp_${key}`);
        return data ? JSON.parse(data) : null;
    },

    init: () => {
        // Dados locais de fallback inicial
        if (!DB.get('products')) {
            DB.save('products', [
                { id: '1', name: 'Cartão Couchê 300g UV Total', category: 'Cartão de visita', type: 'Milheiro', cost: 25.00, price: 45.00, status: true, ref: 'CC300UV-F', stock: 150 },
            ]);
        }
        if (!DB.get('customers')) {
            DB.save('customers', [
                { id: '1', name: 'Agência CriaMais', email: 'contato@criamais.com', phone: '(11) 99999-9999', document: '12.345.678/0001-90' }
            ]);
        }
        if (!DB.get('orders')) {
            DB.save('orders', []);
        }
        if (!DB.get('quotes')) {
            DB.save('quotes', []);
        }

        // Tenta iniciar a sincronização com a nuvem após um pequeno delay para garantir que a lib carregou
        setTimeout(() => {
            DB.initSupabase();
            DB.syncFromCloud().then(() => {
                // Dispara evento para re-renderizar caso a nuvem tenha dados novos
                window.dispatchEvent(new Event('db_synced'));
            });
        }, 1000);
    }
};

DB.init();
export default DB;
