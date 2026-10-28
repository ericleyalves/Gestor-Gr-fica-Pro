/**
 * db.js — Camada de dados do Gestão Gráfico Pro
 *
 * Estratégia "local primeiro + nuvem":
 *  - Toda leitura vem do localStorage (instantâneo e funciona offline).
 *  - save(key, array) compara com a versão anterior ITEM A ITEM e coloca numa
 *    fila persistente (ggp__pending) só o que mudou: "upsert" ou "delete".
 *  - A fila é enviada ao Supabase em lotes e só sai da fila quando a nuvem
 *    confirma. Sem internet, ela espera e é reenviada depois.
 *  - Na nuvem cada registro fica como { id text, data jsonb, updated_at },
 *    o que aceita qualquer campo novo sem precisar mudar o banco.
 *  - Linhas antigas (colunas snake_case) continuam sendo lidas normalmente.
 *
 * A chave abaixo é a chave PÚBLICA (publishable). Ela pode ficar no navegador:
 * quem protege os dados são as políticas RLS + login (ver supabase-setup.sql).
 */
const SUPABASE_URL = 'https://lcfzdammuehwnclywuhp.supabase.co';
const SUPABASE_KEY = 'sb_publishable_g20FE0UERlssSI48Pswv2A_qPghVpQC';

const TABLES = ['customers', 'products', 'quotes', 'orders', 'transactions', 'materials'];   // transactions = despesas/entradas avulsas (supabase-financeiro.sql)
const SETTINGS = ['shop_profile', 'product_categories', 'receipts'];          // salvos na tabela app_settings (id = chave)
const PENDING_KEY = 'ggp__pending';
const MIGRATION_FLAG = 'ggp__cloud_v2';
const FILES_BUCKET = 'product-files';     // Storage: arquivos de corte/gabaritos (supabase-arquivos.sql)
const MAX_FILE_MB = 50;
const IMAGES_BUCKET = 'product-images';   // Storage público: fotos dos produtos
const CHUNK = 500;                          // linhas por requisição
const PAGE = 1000;                          // linhas por página na leitura

let client = null;
let flushTimer = null;
let flushing = null;

// ---------- utilitários ----------
const ls = {
    get(k) {
        try { const v = localStorage.getItem(k); return v ? JSON.parse(v) : null; }
        catch (e) { console.error(`Dado corrompido em ${k}:`, e); return null; }
    },
    set(k, v) { localStorage.setItem(k, JSON.stringify(v)); }
};

const toCamelCase = (obj) => {
    if (!obj) return null;
    const out = {};
    for (const key in obj) {
        out[key.replace(/[-_]([a-z])/g, (_, c) => c.toUpperCase())] = obj[key];
    }
    return out;
};

const remoteTable = (key) =>
    TABLES.includes(key) ? key : (SETTINGS.includes(key) ? 'app_settings' : null);

// Fila: { tabela: { id: "upsert:<seq>" | "delete:<seq>" } }
// O <seq> garante que uma alteração feita DURANTE o envio não seja descartada.
let seq = 0;
const getPending = () => ls.get(PENDING_KEY) || {};
const opOf = (v) => (v || '').split(':')[0];
const markMany = (table, ops) => {
    if (!ops.length) return;
    const p = getPending();
    p[table] = p[table] || {};
    ops.forEach(([id, op]) => { p[table][String(id)] = `${op}:${Date.now()}.${++seq}`; });
    ls.set(PENDING_KEY, p);
};

// Linha da nuvem -> objeto do app
const fromRow = (row) => {
    if (row && row.data && typeof row.data === 'object') return row.data;
    const { data, updated_at, ...rest } = row || {};   // formato antigo (colunas)
    return toCamelCase(rest);
};

const chunks = (arr, n) => {
    const out = [];
    for (let i = 0; i < arr.length; i += n) out.push(arr.slice(i, i + n));
    return out;
};

// ---------- API pública ----------
const DB = {
    get: (key) => ls.get(`ggp_${key}`),

    save: (key, data) => {
        const prev = DB.get(key);
        ls.set(`ggp_${key}`, data);

        const table = remoteTable(key);
        if (!table) return;                      // chave só local

        if (table === 'app_settings') {
            markMany(table, [[key, 'upsert']]);
        } else {
            const before = new Map(
                (Array.isArray(prev) ? prev : [])
                    .filter(i => i && i.id != null)
                    .map(i => [String(i.id), JSON.stringify(i)])
            );
            const after = new Set();
            const ops = [];
            (Array.isArray(data) ? data : []).forEach(item => {
                if (!item || item.id == null) return;
                const id = String(item.id);
                after.add(id);
                if (before.get(id) !== JSON.stringify(item)) ops.push([id, 'upsert']);
            });
            before.forEach((_, id) => { if (!after.has(id)) ops.push([id, 'delete']); });
            markMany(table, ops);
        }
        DB.scheduleFlush();
    },

    pendingCount: () =>
        Object.values(getPending()).reduce((n, t) => n + Object.keys(t).length, 0),

    // ---------- nuvem ----------
    ready: () => !!client,
    client: () => client,

    hasSession: async () => {
        if (!client) return false;
        try { const { data } = await client.auth.getSession(); return !!data.session; }
        catch { return false; }
    },

    scheduleFlush: () => {
        clearTimeout(flushTimer);
        flushTimer = setTimeout(() => DB.flush(), 400);
    },

    _rowsFor: (table, ids) => {
        const now = new Date().toISOString();
        if (table === 'app_settings') {
            return ids.filter(k => DB.get(k) != null)
                      .map(k => ({ id: k, data: DB.get(k), updated_at: now }));
        }
        const local = new Map((DB.get(table) || [])
            .filter(i => i && i.id != null).map(i => [String(i.id), i]));
        return ids.filter(id => local.has(id))
                  .map(id => ({ id, data: local.get(id), updated_at: now }));
    },

    /** Envia a fila para o Supabase. Retorna true se tudo foi aceito. */
    flush: async () => {
        if (flushing) return flushing;
        if (!client || !(await DB.hasSession())) return false;

        flushing = (async () => {
            let ok = true;
            const snapshot = getPending();
            for (const [table, ops] of Object.entries(snapshot)) {
                const entries = Object.entries(ops);
                const upIds  = entries.filter(([, v]) => opOf(v) === 'upsert').map(([id]) => id);
                const delIds = entries.filter(([, v]) => opOf(v) === 'delete').map(([id]) => id);
                const done = [];

                if (upIds.length) {
                    const rows = DB._rowsFor(table, upIds);
                    const sent = new Set(rows.map(r => r.id));
                    upIds.forEach(id => { if (!sent.has(id)) done.push(id); }); // sumiu localmente
                    for (const part of chunks(rows, CHUNK)) {
                        const { error } = await client.from(table).upsert(part, { onConflict: 'id' });
                        if (error) { ok = false; console.error(`Nuvem: falha ao salvar ${table}`, error); }
                        else done.push(...part.map(r => r.id));
                    }
                }
                for (const part of chunks(delIds, CHUNK)) {
                    const { error } = await client.from(table).delete().in('id', part);
                    if (error) { ok = false; console.error(`Nuvem: falha ao excluir em ${table}`, error); }
                    else done.push(...part);
                }

                // Remove da fila só o que não foi alterado de novo durante o envio
                const cur = getPending();
                done.forEach(id => {
                    if (cur[table] && cur[table][id] === ops[id]) delete cur[table][id];
                });
                if (cur[table] && !Object.keys(cur[table]).length) delete cur[table];
                ls.set(PENDING_KEY, cur);
            }
            window.dispatchEvent(new CustomEvent('db_status', { detail: { ok, pending: DB.pendingCount() } }));
            return ok;
        })();

        try { return await flushing; } finally { flushing = null; }
    },

    _fetchAll: async (table) => {
        const all = [];
        for (let from = 0; ; from += PAGE) {
            const { data, error } = await client.from(table).select('*')
                .order('id').range(from, from + PAGE - 1);
            if (error) { console.error(`Nuvem: falha ao ler ${table}`, error); return null; }
            all.push(...data);
            if (data.length < PAGE) return all;
        }
    },

    /** Na primeira vez nesta versão: backup local + envia tudo que só existe aqui. */
    _migrateOnce: () => {
        if (localStorage.getItem(MIGRATION_FLAG)) return;
        try {
            if (!localStorage.getItem('ggp__backup_v1')) {
                const backup = {};
                Object.keys(localStorage).filter(k => k.startsWith('ggp_') && !k.startsWith('ggp__') && k !== 'ggp_app_users')
                    .forEach(k => { backup[k] = localStorage.getItem(k); });
                localStorage.setItem('ggp__backup_v1', JSON.stringify({ at: new Date().toISOString(), backup }));
            }
        } catch (e) { console.warn('Backup local não coube no navegador:', e); }

        TABLES.forEach(t => {
            const items = (DB.get(t) || []).filter(i => i && i.id != null);
            markMany(t, items.map(i => [i.id, 'upsert']));
        });
        SETTINGS.forEach(k => { if (DB.get(k) != null) markMany('app_settings', [[k, 'upsert']]); });
        localStorage.setItem(MIGRATION_FLAG, new Date().toISOString());
    },

    /**
     * Envia pendências e depois traz a nuvem para o local.
     * A nuvem é a fonte da verdade, exceto para itens com alteração local pendente.
     * Retorna true se algo mudou localmente (para a tela se redesenhar).
     */
    syncFromCloud: async () => {
        if (!client || !(await DB.hasSession())) return false;
        DB._migrateOnce();
        await DB.flush();

        const pending = getPending();
        let changed = false;

        for (const table of TABLES) {
            const rows = await DB._fetchAll(table);
            if (rows === null) continue;                       // erro: mantém o local
            const ops = pending[table] || {};
            const local = DB.get(table) || [];
            const cloud = new Map(rows.map(fromRow)
                .filter(i => i && i.id != null).map(i => [String(i.id), i]));

            // Proteção: nuvem vazia e local com dados → provável problema de acesso. Não apaga nada.
            if (cloud.size === 0 && local.length > 0) {
                console.warn(`Nuvem retornou ${table} vazia; dados locais preservados.`);
                continue;
            }

            const merged = [];
            const seen = new Set();
            local.forEach(item => {
                if (!item || item.id == null) { merged.push(item); return; }
                const id = String(item.id);
                seen.add(id);
                if (opOf(ops[id]) === 'upsert') merged.push(item);          // alteração local ainda não enviada
                else if (cloud.has(id)) merged.push(cloud.get(id));         // versão da nuvem
                // senão: foi excluído em outro dispositivo
            });
            cloud.forEach((item, id) => {
                if (!seen.has(id) && opOf(ops[id]) !== 'delete') merged.push(item); // novo de outro dispositivo
            });

            if (JSON.stringify(merged) !== JSON.stringify(local)) {
                ls.set(`ggp_${table}`, merged);
                changed = true;
            }
        }

        const settingsRows = await DB._fetchAll('app_settings');
        if (settingsRows) {
            const ops = pending.app_settings || {};
            settingsRows.forEach(r => {
                if (!SETTINGS.includes(r.id) || r.data == null || opOf(ops[r.id]) === 'upsert') return;
                if (JSON.stringify(r.data) !== JSON.stringify(DB.get(r.id))) {
                    ls.set(`ggp_${r.id}`, r.data);
                    changed = true;
                }
            });
        }
        return changed;
    },

    // ---------- autenticação (Supabase Auth) ----------
    signIn: (email, password) =>
        client.auth.signInWithPassword({ email: email.trim().toLowerCase(), password }),

    signOut: async () => {
        try { await client?.auth.signOut(); } catch (e) { console.warn(e); }
        localStorage.removeItem('ggp_user');
    },

    /**
     * Usuário da sessão. undefined = não deu para confirmar (timeout/rede); null = sem sessão.
     * O getSession do supabase-js pode demorar (rede lenta ou trava de outra aba aberta).
     */
    currentUser: async (timeoutMs = 8000) => {
        if (!client) return undefined;
        const timeout = new Promise(r => setTimeout(() => r({ timedOut: true }), timeoutMs));
        try {
            const res = await Promise.race([client.auth.getSession(), timeout]);
            if (res.timedOut) return undefined;
            return res.data?.session?.user || null;
        } catch { return undefined; }
    },

    /** Lê a sessão salva no navegador sem rede (para abrir o sistema na hora ao atualizar a página). */
    storedSessionEmail: () => {
        try {
            const s = JSON.parse(localStorage.getItem('ggp-auth') || 'null');
            return s?.refresh_token && s?.user?.email ? s.user.email.toLowerCase() : null;
        } catch { return null; }
    },

    resetPassword: (email) =>
        client.auth.resetPasswordForEmail(email.trim().toLowerCase(), { redirectTo: location.origin + location.pathname }),

    changePassword: (password) => client.auth.updateUser({ password }),

    /** Retorna { member, error }. member = null se o e-mail não estiver liberado. */
    getMembership: async (email) => {
        const { data, error } = await client.from('team_members')
            .select('email,name,role').eq('email', email.toLowerCase()).maybeSingle();
        return { member: data, error };
    },

    listTeam: () => client.from('team_members').select('email,name,role,created_at').order('created_at'),

    /** Libera um e-mail na equipe e (opcional) cria o login com senha inicial. */
    addMember: async ({ name, email, password, role }) => {
        const e = email.trim().toLowerCase();
        const { error } = await client.from('team_members').upsert({ email: e, name, role }, { onConflict: 'email' });
        if (error) return { error };
        if (password) {
            // Cliente temporário: cria a conta SEM trocar a sessão de quem está logado.
            const temp = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY, {
                auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false, storageKey: 'ggp-temp-signup' }
            });
            const { error: e2 } = await temp.auth.signUp({ email: e, password, options: { data: { name } } });
            if (e2 && !/already|registered/i.test(e2.message)) return { error: e2, partial: true };
        }
        return { error: null };
    },

    removeMember: (email) => client.from('team_members').delete().eq('email', email.toLowerCase()),

    // ---------- arquivos (Supabase Storage) ----------
    // O produto guarda só os metadados em product.files = [{ path, name, size, type, uploadedAt }].
    // O arquivo em si fica no bucket privado; para baixar geramos um link assinado temporário.

    /** Envia um arquivo para a pasta indicada. Retorna os metadados para salvar no produto. */
    uploadFile: async (folder, file) => {
        if (!client || !(await DB.hasSession()))
            throw new Error('Sem conexão com a nuvem. Verifique a internet e faça login.');
        if (file.size > MAX_FILE_MB * 1024 * 1024)
            throw new Error(`"${file.name}" passa de ${MAX_FILE_MB} MB.`);
        // Nome seguro para o Storage (sem acento/espaço); o nome original fica nos metadados
        const safe = file.name.normalize('NFD').replace(/[\u0300-\u036f]/g, '')
            .replace(/[^\w.\-]+/g, '_').slice(-120) || 'arquivo';
        const path = `${String(folder).replace(/[^\w\-]/g, '_')}/${Date.now().toString(36)}-${safe}`;
        const { error } = await client.storage.from(FILES_BUCKET)
            .upload(path, file, { upsert: false, contentType: file.type || 'application/octet-stream' });
        if (error) throw error;
        return { path, name: file.name, size: file.size, type: file.type || '', uploadedAt: new Date().toISOString() };
    },

    /** Link temporário (5 min) que já força o download com o nome original. */
    fileUrl: async (path, name) => {
        if (!client) throw new Error('Sem conexão com a nuvem.');
        const { data, error } = await client.storage.from(FILES_BUCKET)
            .createSignedUrl(path, 300, { download: name || true });
        if (error) throw error;
        return data.signedUrl;
    },

    /** Envia a foto (já reduzida) para o bucket público. Retorna a URL pública. */
    uploadImage: async (folder, blob) => {
        if (!client || !(await DB.hasSession()))
            throw new Error('Sem conexão com a nuvem. Verifique a internet e faça login.');
        const ext = blob.type === 'image/png' ? 'png' : blob.type === 'image/gif' ? 'gif' : blob.type === 'image/webp' ? 'webp' : 'jpg';
        const path = `${String(folder).replace(/[^\w\-]/g, '_')}/${Date.now().toString(36)}.${ext}`;
        const { error } = await client.storage.from(IMAGES_BUCKET)
            .upload(path, blob, { upsert: false, contentType: blob.type, cacheControl: '31536000' });
        if (error) throw error;
        return client.storage.from(IMAGES_BUCKET).getPublicUrl(path).data.publicUrl;
    },

    /** Apaga uma foto pela URL — só se ela for do nosso bucket (links externos são ignorados). */
    removeImage: async (url) => {
        const mark = `/storage/v1/object/public/${IMAGES_BUCKET}/`;
        const i = String(url || '').indexOf(mark);
        if (i === -1 || !client) return;
        const path = decodeURIComponent(url.slice(i + mark.length).split('?')[0]);
        const { error } = await client.storage.from(IMAGES_BUCKET).remove([path]);
        if (error) console.warn('Não foi possível remover a foto:', error);
    },

    /** Remove arquivos do Storage (falha silenciosa: no pior caso sobra um arquivo órfão). */
    removeFiles: async (paths) => {
        const list = (paths || []).filter(Boolean);
        if (!list.length || !client) return;
        const { error } = await client.storage.from(FILES_BUCKET).remove(list);
        if (error) console.warn('Não foi possível remover arquivos do Storage:', error);
    },

    init: () => {
        // Remove a lista antiga de usuários com senhas em texto puro
        localStorage.removeItem('ggp_app_users');

        // Coleções locais vazias (sem gerar envio para a nuvem)
        TABLES.forEach(t => { if (!Array.isArray(DB.get(t))) ls.set(`ggp_${t}`, []); });

        if (window.supabase?.createClient) {
            client = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY, {
                auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true, storageKey: 'ggp-auth' }
            });
        } else {
            console.error('Biblioteca do Supabase não carregou (sem internet?). Trabalhando só localmente.');
        }

        // Reenvio automático da fila
        window.addEventListener('online', () => DB.flush());
        setInterval(() => { if (DB.pendingCount()) DB.flush(); }, 60000);
    }
};

DB.init();
export default DB;
