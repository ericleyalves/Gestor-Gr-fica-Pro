-- =====================================================================
-- Gestão Gráfico Pro — tabela do FINANCEIRO (despesas e entradas avulsas)
-- Rode UMA vez em: Supabase > SQL Editor > New query > colar > Run
-- Pode rodar de novo sem problema. Requer o supabase-setup.sql (is_member()).
-- =====================================================================
create table if not exists public.transactions (
  id         text primary key,
  data       jsonb,
  updated_at timestamptz default now()
);

alter table public.transactions enable row level security;
revoke all on public.transactions from anon;
grant select, insert, update, delete on public.transactions to authenticated;

drop policy if exists "equipe_acessa" on public.transactions;
create policy "equipe_acessa" on public.transactions
  for all to authenticated using (public.is_member()) with check (public.is_member());

-- Conferência: deve mostrar transactions com rls = true
select tablename, rowsecurity as rls from pg_tables
where schemaname = 'public' and tablename = 'transactions';
