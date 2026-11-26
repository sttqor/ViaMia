-- Оплата картой через Freedom Pay (подготовка, 26.11.2026). Повторный запуск безопасен.
-- Поля оплаты пишет только серверная функция pay-result (service_role): у туриста и агентства
-- права UPDATE на эти колонки нет, а при создании заявки booking_fill их обнуляет.

alter table public.booking_requests
  add column if not exists paid_at timestamptz,      -- когда пришла оплата (null — не оплачено)
  add column if not exists paid_amount numeric,      -- сколько списали
  add column if not exists paid_currency text,       -- в какой валюте (KGS / USD)
  add column if not exists payment_id text;          -- pg_payment_id из Freedom Pay (для сверки и возврата)

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
  -- оплату нельзя «прислать» вместе с заявкой
  new.paid_at := null;
  new.paid_amount := null;
  new.paid_currency := null;
  new.payment_id := null;
  if new.date < current_date or new.date > current_date + 365 then
    raise exception 'bad date';
  end if;
  return new;
end $$;
