-- =====================================================================
-- Gestão Gráfico Pro — armazenamento de ARQUIVOS DE CORTE / GABARITOS
-- Rode UMA vez em: Supabase > SQL Editor > New query > colar > Run
-- Pode rodar de novo sem problema (é idempotente).
-- Requer que o supabase-setup.sql já tenha sido rodado (usa is_member()).
--
-- Cria o bucket privado "product-files" (até 50 MB por arquivo) e libera
-- leitura/envio/exclusão só para quem está logado E cadastrado na equipe.
-- Ninguém de fora baixa os arquivos: o app gera links temporários (5 min).
-- =====================================================================

insert into storage.buckets (id, name, public, file_size_limit)
values ('product-files', 'product-files', false, 52428800)
on conflict (id) do update
  set public = false, file_size_limit = excluded.file_size_limit;

drop policy if exists "equipe_arquivos_ler"     on storage.objects;
drop policy if exists "equipe_arquivos_enviar"  on storage.objects;
drop policy if exists "equipe_arquivos_alterar" on storage.objects;
drop policy if exists "equipe_arquivos_excluir" on storage.objects;

create policy "equipe_arquivos_ler" on storage.objects
  for select to authenticated
  using (bucket_id = 'product-files' and public.is_member());

create policy "equipe_arquivos_enviar" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'product-files' and public.is_member());

create policy "equipe_arquivos_alterar" on storage.objects
  for update to authenticated
  using (bucket_id = 'product-files' and public.is_member())
  with check (bucket_id = 'product-files' and public.is_member());

create policy "equipe_arquivos_excluir" on storage.objects
  for delete to authenticated
  using (bucket_id = 'product-files' and public.is_member());

-- Conferência: deve mostrar o bucket com public = false
select id, public, file_size_limit from storage.buckets where id = 'product-files';

-- =====================================================================
-- FOTOS DOS PRODUTOS (bucket público: a foto precisa abrir em <img>)
-- Qualquer um com o link vê a foto; só a equipe envia/altera/apaga.
-- =====================================================================
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('product-images', 'product-images', true, 5242880,
        array['image/jpeg','image/png','image/webp','image/gif'])
on conflict (id) do update
  set public = true, file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "equipe_fotos_enviar"  on storage.objects;
drop policy if exists "equipe_fotos_alterar" on storage.objects;
drop policy if exists "equipe_fotos_excluir" on storage.objects;

create policy "equipe_fotos_enviar" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'product-images' and public.is_member());

create policy "equipe_fotos_alterar" on storage.objects
  for update to authenticated
  using (bucket_id = 'product-images' and public.is_member())
  with check (bucket_id = 'product-images' and public.is_member());

create policy "equipe_fotos_excluir" on storage.objects
  for delete to authenticated
  using (bucket_id = 'product-images' and public.is_member());

select id, public, file_size_limit from storage.buckets
where id in ('product-files', 'product-images');
