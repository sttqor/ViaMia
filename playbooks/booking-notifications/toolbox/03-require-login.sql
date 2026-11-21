-- Бронь только из аккаунта (иначе не уведомить и чата нет).
-- Применять ВМЕСТЕ с выкладкой экрана брони со входом по почте, не раньше:
-- старая версия сайта шлёт заявки гостем, и они начнут падать.
drop policy if exists booking_insert on public.booking_requests;
create policy booking_insert on public.booking_requests for insert to authenticated
  with check (true);
