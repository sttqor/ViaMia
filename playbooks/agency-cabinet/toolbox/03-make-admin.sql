-- ═══════════════════════════════════════════════════════════════
-- Дать доступ к модерации (/admin). Запускать после 01-agency.sql.
-- Supabase → SQL Editor → заменить почту → Run.
-- Сначала один раз войдите в приложение этой почтой, иначе пользователя ещё нет.
-- ═══════════════════════════════════════════════════════════════
insert into public.admins (user_id)
select id from auth.users where email = 'ваша@почта'
on conflict do nothing;

-- проверить, кто админ:
-- select u.email from public.admins a join auth.users u on u.id = a.user_id;

-- забрать доступ:
-- delete from public.admins where user_id = (select id from auth.users where email = 'ваша@почта');
