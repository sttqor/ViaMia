-- ═══════════════════════════════════════════════════════════════
-- Osh Guide (ViaMia) — схема базы Supabase
-- Запуск: Supabase → SQL Editor → вставить файл целиком → Run.
-- Потом так же запустить supabase/seed.sql (туры и факты из data.js).
-- Скрипт можно запускать повторно — он ничего не ломает.
-- ═══════════════════════════════════════════════════════════════

-- ── Агентства ──────────────────────────────────────────────────
create table if not exists public.agencies (
  id            uuid primary key default gen_random_uuid(),
  name          text not null check (char_length(name) between 2 and 120),
  phone         text,
  telegram      text,
  verified      boolean not null default false,   -- ставит только админ платформы
  logo_url      text,
  owner_user_id uuid not null references auth.users (id) on delete cascade,
  created_at    timestamptz not null default now()
);
create index if not exists agencies_owner_idx on public.agencies (owner_user_id);

-- ── Туры ───────────────────────────────────────────────────────
-- Цены в USD. Перевод — в i18n: {"en": {"title": "...", ...}}.
-- agency_id = null — туры самой платформы (меняются только из панели Supabase).
create table if not exists public.tours (
  id           text primary key default gen_random_uuid()::text,
  agency_id    uuid references public.agencies (id) on delete cascade,
  category     text not null check (category in ('practices','tours','food','culture','nature','trips','trekking')),
  type         text not null,
  title        text not null,
  place        text not null,
  duration     text not null,                         -- "2 часа", "45 мин" или число минут "120"
  price        numeric(10,2) check (price >= 0),        -- null — цена по запросу
  rating       numeric(2,1) check (rating between 0 and 5),
  reviews      integer not null default 0,
  badge        text,
  langs        text,                                  -- "RU · EN"
  agency_name  text,                                  -- агентство, пока у него нет аккаунта (agency_id)
  source_url   text,                                  -- страница тура на сайте агентства
  images       text[] not null default '{}',
  lat          double precision not null,
  lng          double precision not null,
  free_cancel  boolean not null default true,
  group_size   text,
  meeting      text,
  description  text,
  highlights   text[] not null default '{}',
  includes     text[] not null default '{}',
  i18n         jsonb not null default '{}'::jsonb,
  published    boolean not null default false,
  sort         integer not null default 100,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);
create index if not exists tours_published_idx on public.tours (published, sort);
create index if not exists tours_agency_idx on public.tours (agency_id);

-- ── Интересные факты ───────────────────────────────────────────
create table if not exists public.facts (
  id          text primary key default gen_random_uuid()::text,
  title       text not null,
  emoji       text,
  short       text,
  image       text,
  tag         text,
  body        text[] not null default '{}',
  points      text[] not null default '{}',
  link_label  text,
  link_tab    text,
  exp_id      text references public.tours (id) on delete set null,
  i18n        jsonb not null default '{}'::jsonb,
  published   boolean not null default false,
  sort        integer not null default 100,
  created_at  timestamptz not null default now()
);

-- ── Заявки на бронь ────────────────────────────────────────────
create table if not exists public.booking_requests (
  id          uuid primary key default gen_random_uuid(),
  code        text not null unique check (char_length(code) between 6 and 32),
  tour_id     text not null references public.tours (id) on delete restrict,
  agency_id   uuid references public.agencies (id) on delete set null,  -- проставляется триггером
  date        date not null,
  guests      integer not null check (guests between 1 and 20),
  name        text not null check (char_length(name) between 2 and 80),
  contact     text not null check (char_length(contact) between 5 and 120),
  total_usd   numeric(10,2),
  lang        text,
  status      text not null default 'pending'
              check (status in ('pending','confirmed','declined','cancelled','done')),
  created_at  timestamptz not null default now()
);
create index if not exists booking_agency_idx on public.booking_requests (agency_id, created_at desc);

-- updated_at для туров
create or replace function public.touch_updated_at() returns trigger
language plpgsql set search_path = public as $$
begin
  new.updated_at := now();
  return new;
end $$;

drop trigger if exists tours_touch on public.tours;
create trigger tours_touch before update on public.tours
  for each row execute function public.touch_updated_at();

-- Заявка: agency_id и сумма берутся из тура, а не от клиента; статус всегда pending
create or replace function public.booking_fill() returns trigger
language plpgsql security definer set search_path = public as $$
declare t public.tours;
begin
  select * into t from public.tours where id = new.tour_id and published;
  if not found then
    raise exception 'tour not available';
  end if;
  new.agency_id := t.agency_id;
  new.total_usd := t.price * new.guests;
  new.status := 'pending';
  new.created_at := now();
  if new.date < current_date or new.date > current_date + 365 then
    raise exception 'bad date';
  end if;
  return new;
end $$;

drop trigger if exists booking_fill on public.booking_requests;
create trigger booking_fill before insert on public.booking_requests
  for each row execute function public.booking_fill();

-- триггерные функции не должны вызываться через API (/rest/v1/rpc)
revoke all on function public.touch_updated_at() from public, anon, authenticated;
revoke all on function public.booking_fill() from public, anon, authenticated;

-- Турист отменяет свою заявку по коду брони (у него нет доступа к чтению таблицы)
create or replace function public.cancel_booking(p_code text) returns boolean
language plpgsql security definer set search_path = public as $$
begin
  update public.booking_requests
     set status = 'cancelled'
   where code = p_code and status in ('pending','confirmed');
  return found;
end $$;

revoke all on function public.cancel_booking(text) from public;
grant execute on function public.cancel_booking(text) to anon, authenticated;

-- ═══ RLS (правила доступа) ═════════════════════════════════════
alter table public.agencies          enable row level security;
alter table public.tours             enable row level security;
alter table public.facts             enable row level security;
alter table public.booking_requests  enable row level security;

-- Агентства: все видят карточку агентства; владелец создаёт и правит своё.
-- Поле verified владелец менять не может (права на колонки ниже).
drop policy if exists agencies_read on public.agencies;
create policy agencies_read on public.agencies for select using (true);

drop policy if exists agencies_insert_own on public.agencies;
create policy agencies_insert_own on public.agencies for insert to authenticated
  with check (owner_user_id = auth.uid() and verified = false);

drop policy if exists agencies_update_own on public.agencies;
create policy agencies_update_own on public.agencies for update to authenticated
  using (owner_user_id = auth.uid()) with check (owner_user_id = auth.uid());

revoke update on public.agencies from anon, authenticated;
grant update (name, phone, telegram, logo_url) on public.agencies to authenticated;

-- Туры: туристы видят только опубликованные; агентство видит и меняет только свои.
drop policy if exists tours_read on public.tours;
create policy tours_read on public.tours for select using (
  published
  or agency_id in (select id from public.agencies where owner_user_id = auth.uid())
);

drop policy if exists tours_write_own on public.tours;
create policy tours_write_own on public.tours for all to authenticated
  using (agency_id in (select id from public.agencies where owner_user_id = auth.uid()))
  with check (agency_id in (select id from public.agencies where owner_user_id = auth.uid()));

-- Факты: только чтение опубликованных (правятся из панели Supabase)
drop policy if exists facts_read on public.facts;
create policy facts_read on public.facts for select using (published);

-- Заявки: создать может кто угодно (анонимный турист); читать и менять статус — только агентство тура
drop policy if exists booking_insert on public.booking_requests;
create policy booking_insert on public.booking_requests for insert to anon, authenticated
  with check (true);

drop policy if exists booking_read_agency on public.booking_requests;
create policy booking_read_agency on public.booking_requests for select to authenticated
  using (agency_id in (select id from public.agencies where owner_user_id = auth.uid()));

drop policy if exists booking_update_agency on public.booking_requests;
create policy booking_update_agency on public.booking_requests for update to authenticated
  using (agency_id in (select id from public.agencies where owner_user_id = auth.uid()))
  with check (agency_id in (select id from public.agencies where owner_user_id = auth.uid()));

revoke update on public.booking_requests from anon, authenticated;
grant update (status) on public.booking_requests to authenticated;

-- ── обновление существующей базы (можно запускать повторно) ─────────────────
alter table public.tours drop constraint if exists tours_category_check;
alter table public.tours add constraint tours_category_check
  check (category in ('practices','tours','food','culture','nature','trips','trekking'));
alter table public.tours alter column price drop not null;
alter table public.tours add column if not exists agency_name text;
alter table public.tours add column if not exists source_url text;
