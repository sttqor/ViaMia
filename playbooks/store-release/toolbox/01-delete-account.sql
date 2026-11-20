-- ═══════════════════════════════════════════════════════════════
-- Удаление аккаунта самим пользователем (требование App Store и Google Play).
-- Вызов из приложения: supabase.rpc("delete_my_account").
-- Что уходит: auth.users → каскадом profiles (избранное, маршрут), сессии.
-- Брони остаются у агентства (user_id → null) — это их учёт, см. политику.
-- Владельца агентства и админа не удаляем автоматически: туры и заявки
-- туристов пропали бы каскадом. Им — через поддержку.
-- ═══════════════════════════════════════════════════════════════
create or replace function public.delete_my_account()
returns void
language plpgsql
security definer
set search_path = public
as $$
declare uid uuid := auth.uid();
begin
  if uid is null then raise exception 'not_signed_in'; end if;
  if exists (select 1 from public.agencies where owner_user_id = uid) then raise exception 'agency_owner'; end if;
  if exists (select 1 from public.admins where user_id = uid) then raise exception 'admin'; end if;
  delete from auth.users where id = uid;
end;
$$;

revoke execute on function public.delete_my_account() from public, anon;
grant execute on function public.delete_my_account() to authenticated;
