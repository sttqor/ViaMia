-- ═══════════════════════════════════════════════════════════════
-- Кабинет агентств и модерация. Запускать ПОСЛЕ supabase/schema.sql.
-- Плейбук: playbooks/agency-cabinet/PLAYBOOK.md. Проверка: 02-test-agency.sql.
-- Supabase → SQL Editor → вставить файл целиком → Run. Повторный запуск безопасен.
--
-- Агентство регистрируется само, но туристы его не видят, пока админ платформы
-- не проверит документы (status = 'approved'). Тур агентства тоже проходит
-- модерацию: агентство отправляет его на проверку, публикует только админ.
-- Правка опубликованного тура снова отправляет его на проверку.
--
-- Сделать себя админом (страница /admin):
--   insert into public.admins (user_id)
--   select id from auth.users where email = 'ваша@почта' on conflict do nothing;
-- ═══════════════════════════════════════════════════════════════

-- ── Админы платформы ───────────────────────────────────────────
create table if not exists public.admins (
  user_id    uuid primary key references auth.users (id) on delete cascade,
  created_at timestamptz not null default now()
);
alter table public.admins enable row level security;
drop policy if exists admins_self on public.admins;
create policy admins_self on public.admins for select to authenticated using (user_id = auth.uid());

create or replace function public.is_admin() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.admins where user_id = auth.uid());
$$;
revoke all on function public.is_admin() from public;
-- anon нужен: is_admin() стоит в правилах чтения туров, их проверяют и для гостя.
-- Отдаёт только «админ ли я», поэтому предупреждение линтера Supabase здесь ожидаемо.
grant execute on function public.is_admin() to anon, authenticated;

-- кто правит без ограничений: админ, SQL Editor / service_role (seed.sql)
create or replace function public.is_trusted() returns boolean
language sql stable security definer set search_path = public as $$
  select coalesce(auth.role(), '') not in ('anon', 'authenticated') or public.is_admin();
$$;
revoke all on function public.is_trusted() from public, anon, authenticated;

-- ── Агентства: юр. данные и статус проверки ────────────────────
alter table public.agencies add column if not exists status        text not null default 'pending';
alter table public.agencies add column if not exists legal_name    text;   -- ОсОО «…» / ИП …
alter table public.agencies add column if not exists inn           text;   -- ИНН, 14 цифр
alter table public.agencies add column if not exists license_no    text;   -- свидетельство о регистрации / лицензия
alter table public.agencies add column if not exists address       text;
alter table public.agencies add column if not exists email         text;
alter table public.agencies add column if not exists website       text;
alter table public.agencies add column if not exists about         text;
alter table public.agencies add column if not exists doc_paths     text[] not null default '{}';  -- файлы в бакете agency-docs
alter table public.agencies add column if not exists reject_reason text;
alter table public.agencies add column if not exists reviewed_at   timestamptz;

alter table public.agencies drop constraint if exists agencies_status_check;
alter table public.agencies add constraint agencies_status_check
  check (status in ('pending','approved','rejected','blocked'));
alter table public.agencies drop constraint if exists agencies_inn_check;
alter table public.agencies add constraint agencies_inn_check check (inn is null or inn ~ '^[0-9]{14}$');
create unique index if not exists agencies_one_per_owner on public.agencies (owner_user_id);

-- Владелец не может сам себя одобрить. Повторная отправка после отказа
-- или правка юр. данных — снова на проверку.
create or replace function public.agency_guard() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if public.is_trusted() then
    new.verified := new.status = 'approved';
    if tg_op = 'INSERT' or new.status is distinct from old.status then new.reviewed_at := now(); end if;
    return new;
  end if;
  if tg_op = 'INSERT' then
    new.status := 'pending';
    new.verified := false;
    new.reject_reason := null;
    new.reviewed_at := null;
    return new;
  end if;
  if old.status = 'blocked' then raise exception 'agency blocked'; end if;
  new.status := old.status;
  new.verified := old.verified;
  new.reject_reason := old.reject_reason;
  new.reviewed_at := old.reviewed_at;
  new.owner_user_id := old.owner_user_id;
  if old.status = 'rejected'
     or row(new.legal_name, new.inn, new.license_no, new.doc_paths)
        is distinct from row(old.legal_name, old.inn, old.license_no, old.doc_paths) then
    new.status := 'pending';
    new.verified := false;
    new.reject_reason := null;
  end if;
  return new;
end $$;
revoke all on function public.agency_guard() from public, anon, authenticated;
drop trigger if exists agency_guard on public.agencies;
create trigger agency_guard before insert or update on public.agencies
  for each row execute function public.agency_guard();

-- права на колонки (статус для не-админа всё равно перезапишет триггер)
revoke update on public.agencies from anon, authenticated;
grant update (name, phone, telegram, logo_url, legal_name, inn, license_no, address, email,
              website, about, doc_paths, status, reject_reason) on public.agencies to authenticated;

-- туристы видят только проверенные агентства; владелец и админ — всё
drop policy if exists agencies_read on public.agencies;
create policy agencies_read on public.agencies for select using (
  status = 'approved' or owner_user_id = auth.uid() or public.is_admin()
);
drop policy if exists agencies_admin on public.agencies;
create policy agencies_admin on public.agencies for update to authenticated
  using (public.is_admin()) with check (public.is_admin());

-- ── Туры: статус модерации ─────────────────────────────────────
-- draft — черновик, review — на проверке, published — виден туристам,
-- rejected — отклонён (причина в reject_reason), hidden — агентство сняло с показа.
alter table public.tours add column if not exists status         text not null default 'draft';
alter table public.tours add column if not exists reject_reason  text;
alter table public.tours add column if not exists submitted_at   timestamptz;
alter table public.tours add column if not exists published_once boolean not null default false;
alter table public.tours drop constraint if exists tours_status_check;
alter table public.tours add constraint tours_status_check
  check (status in ('draft','review','published','rejected','hidden'));
update public.tours set status = 'published', published_once = true where published and status = 'draft';
create index if not exists tours_status_idx on public.tours (status, submitted_at);

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
    -- сам агент может: черновик, на проверку, скрыть
    if new.status is distinct from old.status and new.status not in ('draft','review','hidden') then
      raise exception 'only admin can publish';
    end if;
    -- правка опубликованного тура → снова на проверку
    if old.status = 'published' and new.status = 'published' then
      new.status := 'review';
    end if;
    -- снятый с показа без правок возвращается сразу: проверку он уже прошёл
    if old.status = 'hidden' and new.status = 'review' and old.published_once
       and row(new.title, new.description, new.price, new.images, new.place, new.type, new.category,
               new.duration, new.meeting, new.highlights, new.includes, new.lat, new.lng, new.i18n,
               new.langs, new.group_size, new.free_cancel)
           is not distinct from
           row(old.title, old.description, old.price, old.images, old.place, old.type, old.category,
               old.duration, old.meeting, old.highlights, old.includes, old.lat, old.lng, old.i18n,
               old.langs, old.group_size, old.free_cancel) then
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
drop trigger if exists tour_guard on public.tours;
create trigger tour_guard before insert or update on public.tours
  for each row execute function public.tour_guard();

-- туристы: опубликованные туры платформы и проверенных агентств
drop policy if exists tours_read on public.tours;
create policy tours_read on public.tours for select using (
  (published and (agency_id is null
                  or agency_id in (select id from public.agencies where status = 'approved')))
  or agency_id in (select id from public.agencies where owner_user_id = auth.uid())
  or public.is_admin()
);
drop policy if exists tours_admin on public.tours;
create policy tours_admin on public.tours for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

-- бронь — только на тур, который виден туристам (агентство проверено)
create or replace function public.booking_fill() returns trigger
language plpgsql security definer set search_path = public as $$
declare t public.tours;
begin
  select tr.* into t from public.tours tr
   where tr.id = new.tour_id and tr.published
     and (tr.agency_id is null
          or exists (select 1 from public.agencies a where a.id = tr.agency_id and a.status = 'approved'));
  if not found then
    raise exception 'tour not available';
  end if;
  new.agency_id := t.agency_id;
  new.total_usd := t.price * new.guests;
  new.status := 'pending';
  new.created_at := now();
  new.user_id := auth.uid();
  if new.date < current_date or new.date > current_date + 365 then
    raise exception 'bad date';
  end if;
  return new;
end $$;
revoke all on function public.booking_fill() from public, anon, authenticated;

-- админ видит все заявки (разбор споров)
drop policy if exists booking_read_admin on public.booking_requests;
create policy booking_read_admin on public.booking_requests for select to authenticated
  using (public.is_admin());

-- ── Хранилище файлов ───────────────────────────────────────────
-- tour-photos — фото туров и логотипы, открыты всем. Путь: <agency_id>/<файл>.
-- agency-docs — документы для проверки, видят только владелец и админ.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('tour-photos', 'tour-photos', true, 5242880, array['image/jpeg','image/png','image/webp'])
on conflict (id) do update set public = excluded.public, file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('agency-docs', 'agency-docs', false, 10485760, array['image/jpeg','image/png','image/webp','application/pdf'])
on conflict (id) do update set public = excluded.public, file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

create or replace function public.my_agency_folder(path text) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.agencies
                  where owner_user_id = auth.uid() and status <> 'blocked'
                    and id::text = split_part(path, '/', 1));
$$;
revoke all on function public.my_agency_folder(text) from public, anon;
grant execute on function public.my_agency_folder(text) to authenticated;

drop policy if exists tour_photos_write on storage.objects;
create policy tour_photos_write on storage.objects for insert to authenticated
  with check (bucket_id = 'tour-photos' and (public.my_agency_folder(name) or public.is_admin()));
-- без права «видеть» строку supabase-js не может удалить файл (remove сначала ищет его).
-- Туристам это не нужно: фото открываются по публичной ссылке, мимо этих правил.
drop policy if exists tour_photos_read_own on storage.objects;
create policy tour_photos_read_own on storage.objects for select to authenticated
  using (bucket_id = 'tour-photos' and (public.my_agency_folder(name) or public.is_admin()));
drop policy if exists tour_photos_delete on storage.objects;
create policy tour_photos_delete on storage.objects for delete to authenticated
  using (bucket_id = 'tour-photos' and (public.my_agency_folder(name) or public.is_admin()));

drop policy if exists agency_docs_write on storage.objects;
create policy agency_docs_write on storage.objects for insert to authenticated
  with check (bucket_id = 'agency-docs' and public.my_agency_folder(name));
drop policy if exists agency_docs_read on storage.objects;
create policy agency_docs_read on storage.objects for select to authenticated
  using (bucket_id = 'agency-docs' and (public.my_agency_folder(name) or public.is_admin()));
drop policy if exists agency_docs_delete on storage.objects;
create policy agency_docs_delete on storage.objects for delete to authenticated
  using (bucket_id = 'agency-docs' and public.my_agency_folder(name));
