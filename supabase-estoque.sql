-- =====================================================================
-- Gestão Gráfico Pro — tabela do ESTOQUE de materiais
-- Rode UMA vez em: Supabase > SQL Editor > New query > colar > Run
-- Pode rodar de novo sem problema. Requer o supabase-setup.sql (is_member()).
-- =====================================================================
create table if not exists public.materials (
  id         text primary key,
  data       jsonb,
  updated_at timestamptz default now()
);

alter table public.materials enable row level security;
revoke all on public.materials from anon;
grant select, insert, update, delete on public.materials to authenticated;

drop policy if exists "equipe_acessa" on public.materials;
create policy "equipe_acessa" on public.materials
  for all to authenticated using (public.is_member()) with check (public.is_member());

-- Conferência: deve mostrar materials com rls = true
select tablename, rowsecurity as rls from pg_tables
where schemaname = 'public' and tablename = 'materials';
