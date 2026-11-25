-- Профиль туриста: имя уже есть (profiles.name), добавляем фото.
-- Фото — в бакете avatars, папка = id пользователя: загрузить и удалить может только он сам.
-- Бакет публичный (картинку видно по ссылке, список файлов — нет): ссылка случайная, её знает только владелец.
-- При удалении аккаунта приложение сначала удаляет фото (SQL-удаление из storage запрещено Supabase).

alter table public.profiles add column if not exists avatar_url text;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('avatars', 'avatars', true, 2097152, array['image/webp', 'image/jpeg', 'image/png'])
on conflict (id) do update set public = true, file_size_limit = 2097152, allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists avatars_write on storage.objects;
create policy avatars_write on storage.objects for insert to authenticated
  with check (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists avatars_delete on storage.objects;
create policy avatars_delete on storage.objects for delete to authenticated
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);

-- для delete нужен и select своих файлов (так работает storage api)
drop policy if exists avatars_read_own on storage.objects;
create policy avatars_read_own on storage.objects for select to authenticated
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);
