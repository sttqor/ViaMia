-- Исправления после ночного аудита безопасности (28.11.2026). НЕ ПРИМЕНЕНО к базе — ждёт решения.
-- Повторный запуск безопасен. Применять после 01-booking.sql, 01-agency.sql, 03-require-login.sql, 04-hardening.sql, 05-payments.sql.
-- После применения: прогнать 02-test-booking.sql и 02-test-agency.sql (тесты с откатом).

-- 1. Отменить бронь может только её владелец (раньше — любой, кто знает код: код виден в ссылке
--    ?ticket=…, в адресах оплаты и на экране у гида). Старые гостевые брони без user_id отменить
--    через приложение больше нельзя — их отменяет агентство.
create or replace function public.cancel_booking(p_code text) returns boolean
language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null then return false; end if;
  update public.booking_requests
     set status = 'cancelled'
   where code = p_code and user_id = auth.uid() and status in ('pending','confirmed');
  return found;
end $$;
revoke all on function public.cancel_booking(text) from public, anon;
grant execute on function public.cancel_booking(text) to authenticated;

-- 2. При создании заявки турист не может заранее заполнить поля агентства
--    (гид, время встречи, комментарий, причина отказа, отметки «прочитано»).
--    Это та же функция, что в 05-payments.sql, плюс обнуление этих полей.
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
  new.updated_at := now();
  new.user_id := auth.uid();
  -- оплату нельзя «прислать» вместе с заявкой
  new.paid_at := null;
  new.paid_amount := null;
  new.paid_currency := null;
  new.payment_id := null;
  -- поля агентства заполняет только агентство
  new.guide_id := null;
  new.meet_at := null;
  new.agency_note := null;
  new.decline_reason := null;
  new.tourist_read_at := null;
  new.agency_read_at := null;
  if new.date < current_date or new.date > current_date + 365 then
    raise exception 'bad date';
  end if;
  return new;
end $$;
revoke all on function public.booking_fill() from public, anon, authenticated;

-- 3. Заявка — только из аккаунта (то же, что 03-require-login.sql; повторяем на случай, если 03 не применён:
--    иначе лимит 20 заявок / 10 мин гостей не касается и агентства можно завалить спамом).
drop policy if exists booking_insert on public.booking_requests;
create policy booking_insert on public.booking_requests for insert to authenticated
  with check (true);

-- 4. Заблокированное агентство теряет доступ к заявкам и чату.
drop policy if exists booking_update_agency on public.booking_requests;
create policy booking_update_agency on public.booking_requests for update to authenticated
  using (agency_id in (select id from public.agencies where owner_user_id = auth.uid() and status <> 'blocked'))
  with check (agency_id in (select id from public.agencies where owner_user_id = auth.uid() and status <> 'blocked'));

create or replace function public.message_fill() returns trigger
language plpgsql security definer set search_path = public as $$
declare b public.booking_requests;
begin
  select * into b from public.booking_requests where id = new.booking_id;
  if not found then raise exception 'no booking'; end if;
  if b.status not in ('pending','confirmed','done') then raise exception 'chat closed'; end if;
  new.sender_id := auth.uid();
  new.from_agency := exists (
    select 1 from public.agencies
     where id = b.agency_id and owner_user_id = auth.uid() and status <> 'blocked');
  if not new.from_agency and b.user_id is distinct from auth.uid() then raise exception 'not your booking'; end if;
  new.created_at := now();
  new.body := btrim(new.body);
  return new;
end $$;
revoke all on function public.message_fill() from public, anon, authenticated;

-- 5. Одобренное агентство сменило название или логотип — снова на проверку
--    (иначе можно переименоваться в чужое агентство и сохранить метку «проверено»).
--    Та же функция, что в 01-agency.sql, в список полей добавлены name и logo_url.
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
     or row(new.name, new.logo_url, new.legal_name, new.inn, new.license_no, new.doc_paths)
        is distinct from row(old.name, old.logo_url, old.legal_name, old.inn, old.license_no, old.doc_paths) then
    new.status := 'pending';
    new.verified := false;
    new.reject_reason := null;
  end if;
  return new;
end $$;
revoke all on function public.agency_guard() from public, anon, authenticated;

-- НЕ ВОШЛО (нужно решение или переделка кабинета):
-- • вошедший пользователь видит все колонки одобренных агентств (ИНН, юр. данные, документы) —
--   ограничение колонок для authenticated сломает чтение своей анкеты владельцем; нужен view/RPC для владельца и админа;
-- • pay-init / pay-result: повторный pay-init даёт второй платёж, оплата отменённой брони засчитывается (оплата выключена до ключей);
-- • push-send без общего секрета (verify_jwt=false) — добавить заголовок-секрет из Vault в триггер event_push;
-- • save_push переносит чужой endpoint на себя; pay-result сравнивает подпись не за постоянное время.
