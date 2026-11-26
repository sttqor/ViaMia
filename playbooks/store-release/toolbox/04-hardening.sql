-- Укрепление после production-audit (26.11.2026). Повторный запуск безопасен.

-- 1. Лимит заявок: не больше 20 за 10 минут с одного аккаунта (защита агентств от спама).
--    В тексте ошибки — сколько минут ждать: «rate_limited:7». Приложение пишет «повторите через 7 мин».
create or replace function public.booking_rate_limit() returns trigger
language plpgsql security definer set search_path = public as $$
declare oldest timestamptz;
begin
  if auth.uid() is null then return new; end if;
  -- 20-я с конца заявка за последние 10 минут: пока она не «состарится», новые не принимаем
  select created_at into oldest from public.booking_requests
  where user_id = auth.uid() and created_at > now() - interval '10 minutes'
  order by created_at desc offset 19 limit 1;
  if oldest is not null then
    raise exception 'rate_limited:%', greatest(1, ceil(extract(epoch from (oldest + interval '10 minutes' - now())) / 60))::int
      using errcode = 'P0001';
  end if;
  return new;
end $$;
drop trigger if exists booking_rate_limit on public.booking_requests;
create trigger booking_rate_limit before insert on public.booking_requests
  for each row execute function public.booking_rate_limit();

-- 2. Гость (без входа) видит у агентства только то, что показывает приложение: имя, логотип, «проверено».
--    ИНН, юр. данные, документы, владелец, причина отказа — только вошедшим (и RLS всё равно режет по строкам).
revoke select on public.agencies from anon;
-- owner_user_id нужен правилу tours_read (подзапрос идёт с правами гостя), без него туры не прочитать
grant select (id, name, verified, logo_url, status, about, website, created_at, owner_user_id) on public.agencies to anon;

-- 3. Индексы под внешние ключи (советы supabase advisors).
create index if not exists booking_events_booking_idx on public.booking_events (booking_id);
create index if not exists booking_messages_sender_idx on public.booking_messages (sender_id);
create index if not exists booking_requests_guide_idx on public.booking_requests (guide_id);
create index if not exists booking_requests_tour_idx on public.booking_requests (tour_id);
create index if not exists facts_exp_idx on public.facts (exp_id);

-- 4. auth.uid() в правилах RLS — через (select auth.uid()): считается один раз на запрос, а не на каждую строку.
do $$
declare p record; q text; w text;
begin
  for p in
    select pol.polname, c.relname,
           pg_get_expr(pol.polqual, pol.polrelid) qual,
           pg_get_expr(pol.polwithcheck, pol.polrelid) wchk
    from pg_policy pol join pg_class c on c.oid = pol.polrelid
    join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public'
  loop
    q := replace(p.qual, 'auth.uid()', '(select auth.uid())');
    w := replace(p.wchk, 'auth.uid()', '(select auth.uid())');
    if q is distinct from p.qual then
      execute format('alter policy %I on public.%I using (%s)', p.polname, p.relname, q);
    end if;
    if w is distinct from p.wchk then
      execute format('alter policy %I on public.%I with check (%s)', p.polname, p.relname, w);
    end if;
  end loop;
end $$;
