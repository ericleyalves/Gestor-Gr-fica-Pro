-- =====================================================================
-- Gestão Gráfico Pro — LINK DE APROVAÇÃO DO ORÇAMENTO
-- Rode UMA vez em: Supabase > SQL Editor > New query > colar > Run
-- Pode rodar de novo sem problema. Requer o supabase-setup.sql (is_member()).
--
-- Segurança: o cliente (sem login) NÃO lê a tabela. Ele só consegue
-- ver/responder UM orçamento, pelo token secreto do link (32 caracteres
-- aleatórios), através das duas funções abaixo.
-- =====================================================================
create table if not exists public.public_quotes (
  token         text primary key check (length(token) >= 24),
  quote_id      text not null,
  data          jsonb not null,               -- cópia do orçamento (HTML + resumo)
  status        text not null default 'Aberto' check (status in ('Aberto','Aprovado','Alteração')),
  client_name   text,
  client_note   text,
  created_at    timestamptz default now(),
  responded_at  timestamptz
);
create index if not exists public_quotes_quote_idx on public.public_quotes (quote_id);

alter table public.public_quotes enable row level security;
revoke all on public.public_quotes from anon;
grant select, insert, update, delete on public.public_quotes to authenticated;

drop policy if exists "equipe_acessa" on public.public_quotes;
create policy "equipe_acessa" on public.public_quotes
  for all to authenticated using (public.is_member()) with check (public.is_member());

-- Cliente abre o link: devolve só aquele orçamento
create or replace function public.get_public_quote(p_token text)
returns jsonb language sql stable security definer set search_path = public as $$
  select jsonb_build_object('data', data, 'status', status, 'client_name', client_name,
                            'client_note', client_note, 'responded_at', responded_at)
  from public.public_quotes where token = p_token and length(p_token) >= 24;
$$;

-- Cliente responde: aprovar ou pedir alteração (uma vez; dentro da validade)
create or replace function public.respond_public_quote(p_token text, p_action text, p_name text, p_note text)
returns jsonb language plpgsql security definer set search_path = public as $$
declare r public.public_quotes;
begin
  select * into r from public.public_quotes where token = p_token and length(p_token) >= 24 for update;
  if not found then return jsonb_build_object('ok', false, 'error', 'not_found'); end if;
  if r.status <> 'Aberto' then return jsonb_build_object('ok', false, 'error', 'already', 'status', r.status); end if;
  if (r.data->>'validUntil') is not null and (r.data->>'validUntil')::date < (now() at time zone 'America/Maceio')::date then
    return jsonb_build_object('ok', false, 'error', 'expired');
  end if;
  if p_action not in ('aprovar', 'alterar') then return jsonb_build_object('ok', false, 'error', 'action'); end if;
  if coalesce(trim(p_name), '') = '' then return jsonb_build_object('ok', false, 'error', 'name'); end if;
  update public.public_quotes
     set status = case when p_action = 'aprovar' then 'Aprovado' else 'Alteração' end,
         client_name = left(trim(p_name), 80),
         client_note = left(coalesce(trim(p_note), ''), 1000),
         responded_at = now()
   where token = p_token;
  return jsonb_build_object('ok', true, 'status', case when p_action = 'aprovar' then 'Aprovado' else 'Alteração' end);
end $$;

revoke all on function public.get_public_quote(text) from public;
revoke all on function public.respond_public_quote(text, text, text, text) from public;
grant execute on function public.get_public_quote(text) to anon, authenticated;
grant execute on function public.respond_public_quote(text, text, text, text) to anon, authenticated;

-- Conferência: deve mostrar public_quotes com rls = true
select tablename, rowsecurity as rls from pg_tables
where schemaname = 'public' and tablename = 'public_quotes';
