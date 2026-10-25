-- =====================================================================
-- Gestão Gráfico Pro — CATÁLOGO ONLINE
-- Rode UMA vez em: Supabase > SQL Editor > New query > colar > Run
-- Pode rodar de novo sem problema. Requer o supabase-setup.sql (is_member()).
--
-- O sistema grava aqui uma CÓPIA PÚBLICA do catálogo (só nome, categoria,
-- fotos e preço "a partir de" dos produtos marcados). Custos, estoque,
-- arquivos e clientes NUNCA vão para esta tabela.
-- Qualquer pessoa (sem login) pode LER; só a equipe logada pode gravar.
-- =====================================================================
create table if not exists public.public_catalog (
  id          text primary key,              -- 'main'
  data        jsonb not null,
  updated_at  timestamptz default now()
);

alter table public.public_catalog enable row level security;
revoke all on public.public_catalog from anon;
grant select on public.public_catalog to anon;
grant select, insert, update, delete on public.public_catalog to authenticated;

drop policy if exists "publico_le" on public.public_catalog;
create policy "publico_le" on public.public_catalog
  for select to anon, authenticated using (true);

drop policy if exists "equipe_grava" on public.public_catalog;
create policy "equipe_grava" on public.public_catalog
  for all to authenticated using (public.is_member()) with check (public.is_member());

-- Conferência: deve mostrar public_catalog com rls = true
select tablename, rowsecurity as rls from pg_tables
where schemaname = 'public' and tablename = 'public_catalog';
