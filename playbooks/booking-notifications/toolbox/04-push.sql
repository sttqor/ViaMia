-- Push-уведомления в веб-версии (Web Push, VAPID). Написано 27.11.2026, ещё не применено.
-- Как работает: триггер на booking_events → pg_net зовёт edge function push-send → она шлёт push
-- на все подписки получателя (турист или владелец агентства).
-- Секрета между базой и функцией нет: функция получает только id события и сама «забирает» его
-- (pushed_at is null → now()), поэтому лишний вызов не отправит ничего нового.
-- Тест с откатом — 05-test-push.sql.

create extension if not exists pg_net with schema extensions;

-- ── Подписки браузеров ──
create table if not exists public.push_subscriptions (
  endpoint    text primary key,                 -- адрес push-сервиса браузера, уникален на устройство
  user_id     uuid not null references auth.users (id) on delete cascade,
  p256dh      text not null,
  auth        text not null,
  lang        text not null default 'ru',
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  check (endpoint like 'https://%' and length(endpoint) < 1000),
  check (length(p256dh) < 200 and length(auth) < 100 and length(lang) <= 5)
);
create index if not exists push_subscriptions_user_idx on public.push_subscriptions (user_id);
alter table public.push_subscriptions enable row level security;

drop policy if exists push_own_read on public.push_subscriptions;
create policy push_own_read on public.push_subscriptions for select to authenticated
  using (user_id = (select auth.uid()));
-- писать — только через функции ниже

-- сохранить/обновить подписку этого браузера (если браузер был у другого аккаунта — переходит текущему)
create or replace function public.save_push(p_endpoint text, p_p256dh text, p_auth text, p_lang text)
returns void language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null then raise exception 'not_signed_in'; end if;
  insert into public.push_subscriptions (endpoint, user_id, p256dh, auth, lang)
  values (p_endpoint, auth.uid(), p_p256dh, p_auth, coalesce(nullif(p_lang, ''), 'ru'))
  on conflict (endpoint) do update
    set user_id = excluded.user_id, p256dh = excluded.p256dh, auth = excluded.auth,
        lang = excluded.lang, updated_at = now();
end $$;
revoke all on function public.save_push(text, text, text, text) from public, anon;
grant execute on function public.save_push(text, text, text, text) to authenticated;

create or replace function public.drop_push(p_endpoint text)
returns void language sql security definer set search_path = public as $$
  delete from public.push_subscriptions where endpoint = p_endpoint and user_id = auth.uid();
$$;
revoke all on function public.drop_push(text) from public, anon;
grant execute on function public.drop_push(text) to authenticated;

-- ── Отправка ──
alter table public.booking_events add column if not exists pushed_at timestamptz;
-- старые события уже «отправлены» — повторный вызов функции не разошлёт их
update public.booking_events set pushed_at = created_at where pushed_at is null;

create or replace function public.event_push() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  perform net.http_post(
    url := 'https://wksvdvqxixyjguvbcqza.supabase.co/functions/v1/push-send',
    body := jsonb_build_object('event_id', new.id),
    headers := '{"Content-Type": "application/json"}'::jsonb,
    timeout_milliseconds := 5000
  );
  return new;
exception when others then
  return new; -- push не должен ломать бронь и чат
end $$;
revoke all on function public.event_push() from public, anon, authenticated;
drop trigger if exists event_push on public.booking_events;
create trigger event_push after insert on public.booking_events
  for each row execute function public.event_push();
