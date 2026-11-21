-- ═══════════════════════════════════════════════════════════════
-- Бронь как у взрослых сервисов: гиды, программа тура, детали для туриста,
-- чат по брони, события (уведомления в приложении), сгорание заявок.
-- Запускать после supabase/schema.sql и playbooks/agency-cabinet/toolbox/01-agency.sql.
-- Повторный запуск безопасен. Тест прав — 02-test-booking.sql (с откатом).
-- ═══════════════════════════════════════════════════════════════

-- ── Гиды агентства ─────────────────────────────────────────────
create table if not exists public.guides (
  id          uuid primary key default gen_random_uuid(),
  agency_id   uuid not null references public.agencies (id) on delete cascade,
  name        text not null check (char_length(name) between 2 and 80),
  photo_url   text check (photo_url is null or char_length(photo_url) <= 500),
  langs       text[] not null default '{}',
  phone       text check (phone is null or char_length(phone) <= 40),
  show_phone  boolean not null default false,   -- агентство разрешило показать телефон туристу
  active      boolean not null default true,
  created_at  timestamptz not null default now()
);
create index if not exists guides_agency_idx on public.guides (agency_id);
alter table public.guides enable row level security;

-- агентство ведёт своих гидов; туристы читают гида только через my_trip()
drop policy if exists guides_own on public.guides;
create policy guides_own on public.guides for all to authenticated
  using (agency_id in (select id from public.agencies where owner_user_id = auth.uid()))
  with check (agency_id in (select id from public.agencies where owner_user_id = auth.uid() and status <> 'blocked'));
drop policy if exists guides_admin on public.guides;
create policy guides_admin on public.guides for select to authenticated using (public.is_admin());

-- фото гидов лежат в tour-photos (публичный бакет): <agency_id>/guides/<файл>.
-- права на запись уже даёт my_agency_folder() из 01-agency.sql.

-- ── Программа тура ─────────────────────────────────────────────
-- [{ "time": "10:00", "title": "Сулайман-Тоо", "lat": 40.53, "lng": 72.78 }, …]
alter table public.tours add column if not exists itinerary jsonb not null default '[]'::jsonb;
alter table public.tours drop constraint if exists tours_itinerary_check;
alter table public.tours add constraint tours_itinerary_check
  check (jsonb_typeof(itinerary) = 'array' and jsonb_array_length(itinerary) <= 30);

-- tour_guard: программа — часть содержания тура (скрыли → правили → снова проверка)
create or replace function public.tour_guard() returns trigger
language plpgsql security definer set search_path = public as $$
declare a public.agencies;
begin
  if public.is_trusted() then
    new.published := new.status = 'published';
    if new.status = 'published' then
      new.reject_reason := null;
      new.published_once := true;
    end if;
    return new;
  end if;

  select * into a from public.agencies where id = new.agency_id;
  if not found or a.status = 'blocked' then raise exception 'agency not allowed'; end if;
  new.agency_name := a.name;

  if tg_op = 'INSERT' then
    new.rating := null; new.reviews := 0; new.badge := null; new.sort := 100;
    new.reject_reason := null; new.published_once := false;
    if new.status not in ('draft','review') then new.status := 'draft'; end if;
  else
    new.rating := old.rating; new.reviews := old.reviews; new.badge := old.badge; new.sort := old.sort;
    new.agency_id := old.agency_id;
    new.reject_reason := old.reject_reason;
    new.published_once := old.published_once;
    if new.status is distinct from old.status and new.status not in ('draft','review','hidden') then
      raise exception 'only admin can publish';
    end if;
    if old.status = 'published' and new.status = 'published' then
      new.status := 'review';
    end if;
    if old.status = 'hidden' and new.status = 'review' and old.published_once
       and row(new.title, new.description, new.price, new.images, new.place, new.type, new.category,
               new.duration, new.meeting, new.highlights, new.includes, new.lat, new.lng, new.i18n,
               new.langs, new.group_size, new.free_cancel, new.itinerary)
           is not distinct from
           row(old.title, old.description, old.price, old.images, old.place, old.type, old.category,
               old.duration, old.meeting, old.highlights, old.includes, old.lat, old.lng, old.i18n,
               old.langs, old.group_size, old.free_cancel, old.itinerary) then
      new.status := 'published';
    end if;
  end if;

  if new.status = 'review' and (tg_op = 'INSERT' or old.status is distinct from 'review') then
    new.submitted_at := now();
    new.reject_reason := null;
  end if;
  new.published := new.status = 'published';
  return new;
end $$;
revoke all on function public.tour_guard() from public, anon, authenticated;

-- ── Детали брони ───────────────────────────────────────────────
alter table public.booking_requests add column if not exists guide_id uuid references public.guides (id) on delete set null;
alter table public.booking_requests add column if not exists meet_at timestamptz;
alter table public.booking_requests add column if not exists agency_note text;
alter table public.booking_requests add column if not exists decline_reason text;
alter table public.booking_requests add column if not exists updated_at timestamptz not null default now();
alter table public.booking_requests add column if not exists tourist_read_at timestamptz;  -- чат: до какого места прочитал турист
alter table public.booking_requests add column if not exists agency_read_at timestamptz;   -- … и агентство
alter table public.booking_requests drop constraint if exists booking_requests_status_check;
alter table public.booking_requests add constraint booking_requests_status_check
  check (status in ('pending','confirmed','declined','cancelled','done','expired'));
alter table public.booking_requests drop constraint if exists booking_requests_note_check;
alter table public.booking_requests add constraint booking_requests_note_check
  check ((agency_note is null or char_length(agency_note) <= 1000)
     and (decline_reason is null or char_length(decline_reason) <= 300));

-- агентство меняет статус и детали; остальное (имя, контакт, сумма, дата) — нет
revoke update on public.booking_requests from anon, authenticated;
grant update (status, guide_id, meet_at, agency_note, decline_reason) on public.booking_requests to authenticated;

-- охранник: какие переходы статуса можно и чей гид
create or replace function public.booking_guard() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  new.updated_at := now();
  if public.is_trusted() then return new; end if;

  if new.guide_id is distinct from old.guide_id and new.guide_id is not null
     and not exists (select 1 from public.guides g where g.id = new.guide_id and g.agency_id = old.agency_id) then
    raise exception 'guide of another agency';
  end if;

  if new.status is distinct from old.status then
    if not (
         (old.status = 'pending'   and new.status in ('confirmed','declined','cancelled','expired'))
      or (old.status = 'confirmed' and new.status in ('done','cancelled'))
    ) then
      raise exception 'bad status change % -> %', old.status, new.status;
    end if;
    -- причину отказа требует экран кабинета; база не требует, чтобы старая версия кабинета не ломалась
  end if;
  return new;
end $$;
revoke all on function public.booking_guard() from public, anon, authenticated;
drop trigger if exists booking_guard on public.booking_requests;
create trigger booking_guard before update on public.booking_requests
  for each row execute function public.booking_guard();

-- ── Чат по брони ───────────────────────────────────────────────
-- Пишут турист (владелец брони) и агентство тура. Гость без аккаунта чата не имеет.
create table if not exists public.booking_messages (
  id           uuid primary key default gen_random_uuid(),
  booking_id   uuid not null references public.booking_requests (id) on delete cascade,
  sender_id    uuid references auth.users (id) on delete set null,
  from_agency  boolean not null default false,
  body         text not null check (char_length(btrim(body)) between 1 and 2000),
  created_at   timestamptz not null default now()
);
create index if not exists booking_messages_idx on public.booking_messages (booking_id, created_at);
alter table public.booking_messages enable row level security;

create or replace function public.can_see_booking(p_booking uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.booking_requests b
     where b.id = p_booking
       and (b.user_id = auth.uid()
            or b.agency_id in (select id from public.agencies where owner_user_id = auth.uid())
            or public.is_admin()));
$$;
revoke all on function public.can_see_booking(uuid) from public, anon;
grant execute on function public.can_see_booking(uuid) to authenticated;

drop policy if exists messages_read on public.booking_messages;
create policy messages_read on public.booking_messages for select to authenticated
  using (public.can_see_booking(booking_id));
drop policy if exists messages_write on public.booking_messages;
create policy messages_write on public.booking_messages for insert to authenticated
  with check (public.can_see_booking(booking_id));

-- кто пишет и когда — решает база, не телефон
create or replace function public.message_fill() returns trigger
language plpgsql security definer set search_path = public as $$
declare b public.booking_requests;
begin
  select * into b from public.booking_requests where id = new.booking_id;
  if not found then raise exception 'no booking'; end if;
  if b.status not in ('pending','confirmed','done') then raise exception 'chat closed'; end if;
  new.sender_id := auth.uid();
  new.from_agency := exists (select 1 from public.agencies where id = b.agency_id and owner_user_id = auth.uid());
  if not new.from_agency and b.user_id is distinct from auth.uid() then raise exception 'not your booking'; end if;
  new.created_at := now();
  new.body := btrim(new.body);
  return new;
end $$;
revoke all on function public.message_fill() from public, anon, authenticated;
drop trigger if exists message_fill on public.booking_messages;
create trigger message_fill before insert on public.booking_messages
  for each row execute function public.message_fill();

-- отметить чат прочитанным (турист не может править таблицу заявок напрямую)
create or replace function public.mark_chat_read(p_booking uuid) returns void
language plpgsql security definer set search_path = public as $$
begin
  update public.booking_requests set tourist_read_at = now()
   where id = p_booking and user_id = auth.uid();
  update public.booking_requests set agency_read_at = now()
   where id = p_booking and agency_id in (select id from public.agencies where owner_user_id = auth.uid());
end $$;
revoke all on function public.mark_chat_read(uuid) from public, anon;
grant execute on function public.mark_chat_read(uuid) to authenticated;

-- ── События (колокольчик в приложении; позже — письма и push) ──
create table if not exists public.booking_events (
  id          uuid primary key default gen_random_uuid(),
  booking_id  uuid not null references public.booking_requests (id) on delete cascade,
  to_user     uuid references auth.users (id) on delete cascade,      -- турист
  to_agency   uuid references public.agencies (id) on delete cascade, -- агентство
  kind        text not null,   -- new | confirmed | declined | cancelled | expired | done | updated | message
  payload     jsonb not null default '{}'::jsonb,
  created_at  timestamptz not null default now(),
  read_at     timestamptz,
  check (to_user is not null or to_agency is not null)
);
create index if not exists booking_events_user_idx on public.booking_events (to_user, created_at desc);
create index if not exists booking_events_agency_idx on public.booking_events (to_agency, created_at desc);
alter table public.booking_events enable row level security;

drop policy if exists events_read on public.booking_events;
create policy events_read on public.booking_events for select to authenticated
  using (to_user = auth.uid()
         or to_agency in (select id from public.agencies where owner_user_id = auth.uid()));

create or replace function public.mark_events_read() returns void
language sql security definer set search_path = public as $$
  update public.booking_events set read_at = now()
   where read_at is null
     and (to_user = auth.uid()
          or to_agency in (select id from public.agencies where owner_user_id = auth.uid()));
$$;
revoke all on function public.mark_events_read() from public, anon;
grant execute on function public.mark_events_read() to authenticated;

create or replace function public.booking_notify() returns trigger
language plpgsql security definer set search_path = public as $$
declare t text;
begin
  select title into t from public.tours where id = new.tour_id;
  if tg_op = 'INSERT' then
    if new.agency_id is not null then
      insert into public.booking_events (booking_id, to_agency, kind, payload)
      values (new.id, new.agency_id, 'new', jsonb_build_object('tour', t, 'date', new.date, 'guests', new.guests));
    end if;
    return new;
  end if;

  if new.status is distinct from old.status then
    if new.status = 'cancelled' and old.status in ('pending','confirmed') and auth.uid() is distinct from
         (select owner_user_id from public.agencies where id = new.agency_id) then
      -- отменил турист → сообщить агентству
      if new.agency_id is not null then
        insert into public.booking_events (booking_id, to_agency, kind, payload)
        values (new.id, new.agency_id, 'cancelled', jsonb_build_object('tour', t, 'date', new.date));
      end if;
    elsif new.user_id is not null then
      insert into public.booking_events (booking_id, to_user, kind, payload)
      values (new.id, new.user_id, new.status,
              jsonb_build_object('tour', t, 'date', new.date, 'reason', new.decline_reason));
    end if;
  elsif new.user_id is not null and new.status = 'confirmed'
        and row(new.guide_id, new.meet_at, new.agency_note) is distinct from row(old.guide_id, old.meet_at, old.agency_note) then
    insert into public.booking_events (booking_id, to_user, kind, payload)
    values (new.id, new.user_id, 'updated', jsonb_build_object('tour', t, 'date', new.date));
  end if;
  return new;
end $$;
revoke all on function public.booking_notify() from public, anon, authenticated;
drop trigger if exists booking_notify on public.booking_requests;
create trigger booking_notify after insert or update on public.booking_requests
  for each row execute function public.booking_notify();

create or replace function public.message_notify() returns trigger
language plpgsql security definer set search_path = public as $$
declare b public.booking_requests;
begin
  select * into b from public.booking_requests where id = new.booking_id;
  if new.from_agency then
    if b.user_id is not null then
      insert into public.booking_events (booking_id, to_user, kind, payload)
      values (b.id, b.user_id, 'message', jsonb_build_object('text', left(new.body, 140)));
    end if;
  elsif b.agency_id is not null then
    insert into public.booking_events (booking_id, to_agency, kind, payload)
    values (b.id, b.agency_id, 'message', jsonb_build_object('text', left(new.body, 140), 'name', b.name));
  end if;
  return new;
end $$;
revoke all on function public.message_notify() from public, anon, authenticated;
drop trigger if exists message_notify on public.booking_messages;
create trigger message_notify after insert on public.booking_messages
  for each row execute function public.message_notify();

-- ── «Поездка» для туриста: гид и контакты только после подтверждения ──
create or replace function public.my_trip(p_booking uuid) returns jsonb
language plpgsql stable security definer set search_path = public as $$
declare b public.booking_requests; g public.guides; a public.agencies; r jsonb;
begin
  select * into b from public.booking_requests where id = p_booking and user_id = auth.uid();
  if not found then return null; end if;
  r := jsonb_build_object('id', b.id, 'status', b.status, 'meet_at', b.meet_at, 'note', b.agency_note,
                          'decline_reason', b.decline_reason, 'updated_at', b.updated_at,
                          'unread', (select count(*) from public.booking_messages m
                                      where m.booking_id = b.id and m.from_agency
                                        and m.created_at > coalesce(b.tourist_read_at, 'epoch')));
  if b.status in ('confirmed','done') then
    select * into a from public.agencies where id = b.agency_id;
    if found then
      r := r || jsonb_build_object('agency', jsonb_build_object('name', a.name, 'phone', a.phone, 'telegram', a.telegram));
    end if;
    select * into g from public.guides where id = b.guide_id;
    if found then
      r := r || jsonb_build_object('guide', jsonb_build_object('name', g.name, 'photo_url', g.photo_url, 'langs', g.langs,
                                                              'phone', case when g.show_phone then g.phone end));
    end if;
  end if;
  return r;
end $$;
revoke all on function public.my_trip(uuid) from public, anon;
grant execute on function public.my_trip(uuid) to authenticated;

-- ── Сгорание заявок без ответа ─────────────────────────────────
-- 24 ч без ответа или день тура уже прошёл → expired (турист получит событие).
create or replace function public.expire_stale_bookings() returns integer
language plpgsql security definer set search_path = public as $$
declare n integer;
begin
  update public.booking_requests set status = 'expired'
   where status = 'pending'
     and (created_at < now() - interval '24 hours' or date < (now() at time zone 'Asia/Bishkek')::date);
  get diagnostics n = row_count;
  return n;
end $$;
revoke all on function public.expire_stale_bookings() from public, anon, authenticated;

-- ── Живые обновления (Supabase Realtime, RLS учитывается) ──────
do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and tablename = 'booking_events') then
      alter publication supabase_realtime add table public.booking_events;
    end if;
    if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and tablename = 'booking_messages') then
      alter publication supabase_realtime add table public.booking_messages;
    end if;
  end if;
end $$;

-- раз в 15 минут (pg_cron)
create extension if not exists pg_cron;
select cron.unschedule(jobid) from cron.job where jobname = 'expire-bookings';
select cron.schedule('expire-bookings', '*/15 * * * *', 'select public.expire_stale_bookings()');
