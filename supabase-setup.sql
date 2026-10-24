-- =====================================================================
-- Gestão Gráfico Pro — configuração do banco (Supabase)
-- Rode UMA vez em: Supabase > SQL Editor > New query > colar > Run
-- Pode rodar de novo sem problema (é idempotente).
--
-- O que faz:
--  1. Ajusta as tabelas customers/products/quotes/orders para o novo formato
--     (id texto + coluna data jsonb). Linhas antigas continuam funcionando.
--  2. Cria app_settings (perfil da gráfica) e team_members (quem pode entrar).
--  3. Liga RLS: só usuários logados E cadastrados em team_members acessam.
--     A chave pública sozinha não lê nem grava mais nada.
--
-- ANTES DE RODAR: confira o e-mail do administrador no passo 4 (final).
-- =====================================================================

-- 1) Tabelas de dados --------------------------------------------------
do $$
declare
  t text;
  c record;
  id_type text;
begin
  foreach t in array array['customers','products','quotes','orders'] loop
    execute format('create table if not exists public.%I (id text primary key)', t);
    execute format('alter table public.%I add column if not exists data jsonb', t);
    execute format('alter table public.%I add column if not exists updated_at timestamptz default now()', t);

    -- Colunas antigas deixam de ser obrigatórias (o app agora grava em "data")
    for c in
      select column_name from information_schema.columns
      where table_schema = 'public' and table_name = t
        and is_nullable = 'NO' and column_name <> 'id'
    loop
      begin
        execute format('alter table public.%I alter column %I drop not null', t, c.column_name);
      exception when others then
        raise notice 'Tabela %, coluna %: mantida obrigatória (%)', t, c.column_name, sqlerrm;
      end;
    end loop;

    -- id precisa ser texto (o app gera ids como "ORD-XXXX", uuid ou números)
    select data_type into id_type from information_schema.columns
     where table_schema = 'public' and table_name = t and column_name = 'id';
    if id_type is distinct from 'text' then
      begin
        execute format('alter table public.%I alter column id drop default', t);
        execute format('alter table public.%I alter column id type text using id::text', t);
      exception when others then
        raise notice 'Tabela %: não foi possível converter id para texto (%)', t, sqlerrm;
      end;
    end if;
  end loop;
end $$;

-- 2) Configurações e equipe -------------------------------------------
create table if not exists public.app_settings (
  id         text primary key,
  data       jsonb,
  updated_at timestamptz default now()
);

create table if not exists public.team_members (
  email      text primary key check (email = lower(email)),
  name       text,
  role       text not null default 'user' check (role in ('admin','user')),
  created_at timestamptz default now()
);

-- Funções auxiliares (security definer evita recursão nas políticas)
create or replace function public.is_member() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.team_members
                 where email = lower(coalesce(auth.jwt() ->> 'email', '')));
$$;

create or replace function public.is_admin() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.team_members
                 where email = lower(coalesce(auth.jwt() ->> 'email', '')) and role = 'admin');
$$;

revoke all on function public.is_member() from public, anon;
revoke all on function public.is_admin()  from public, anon;
grant execute on function public.is_member() to authenticated;
grant execute on function public.is_admin()  to authenticated;

-- 3) Segurança (RLS) ---------------------------------------------------
do $$
declare
  t text;
  p record;
begin
  foreach t in array array['customers','products','quotes','orders','app_settings','team_members'] loop
    execute format('alter table public.%I enable row level security', t);
    -- remove políticas antigas (algumas podiam liberar acesso público)
    for p in select policyname from pg_policies where schemaname = 'public' and tablename = t loop
      execute format('drop policy %I on public.%I', p.policyname, t);
    end loop;
    execute format('revoke all on public.%I from anon', t);
    execute format('grant select, insert, update, delete on public.%I to authenticated', t);
  end loop;

  foreach t in array array['customers','products','quotes','orders','app_settings'] loop
    execute format(
      'create policy "equipe_acessa" on public.%I for all to authenticated using (public.is_member()) with check (public.is_member())', t);
  end loop;
end $$;

create policy "equipe_ve_equipe"   on public.team_members for select to authenticated using (public.is_member());
create policy "admin_insere"       on public.team_members for insert to authenticated with check (public.is_admin());
create policy "admin_altera"       on public.team_members for update to authenticated using (public.is_admin()) with check (public.is_admin());
create policy "admin_remove"       on public.team_members for delete to authenticated using (public.is_admin());

-- 4) Primeiro administrador -------------------------------------------
-- Troque o e-mail se quiser. Depois crie o login dele em:
-- Authentication > Users > Add user > Create new user (marque "Auto Confirm User").
insert into public.team_members (email, name, role)
values ('erickalvesaju@gmail.com', 'Ericley', 'admin')
on conflict (email) do update set role = 'admin';

-- Conferência: deve listar as 6 tabelas com rls = true
select tablename, rowsecurity as rls
from pg_tables
where schemaname = 'public'
  and tablename in ('customers','products','quotes','orders','app_settings','team_members');
