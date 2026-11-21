-- ═══════════════════════════════════════════════════════════════
-- Тест прав брони/чата/событий (01-booking.sql). Ничего не сохраняет:
-- блок в конце нарочно падает с RESULTS — всё откатывается, итоги в тексте ошибки.
-- Создаёт своих временных пользователей, реальные данные не трогает.
-- Ожидаемо (последний прогон — см. PLAYBOOK.md):
--   1 pending / new-events 1 · 2 tourist self-confirm: pending · 3 foreign guide: blocked · 4 agency edits price: blocked
--   5 confirmed / tourist-events 1 · 6 trip guide Гид Тест, phone null, agency ok
--   7 msg tourist from_agency=f · 8 msg agency from_agency=t · 9 stranger 0 / null / blocked
--   10 back to pending: blocked · 11 unread after read 0 · 12 expired + event · 13 tourist sees own events only
-- ═══════════════════════════════════════════════════════════════
do $t$
declare
  u uuid := gen_random_uuid();   -- турист
  a uuid := gen_random_uuid();   -- владелец агентства
  x uuid := gen_random_uuid();   -- посторонний
  o uuid := gen_random_uuid();   -- владелец другого агентства
  ag uuid; ag2 uuid; g1 uuid; g2 uuid; tid text := 'test-tour-bk'; bid uuid; bid2 uuid;
  r text := ''; v text; n int; j jsonb;
begin
  insert into auth.users (id, instance_id, aud, role, email) values
    (u, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'bk-tourist@example.invalid'),
    (a, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'bk-agency@example.invalid'),
    (x, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'bk-stranger@example.invalid'),
    (o, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'bk-other@example.invalid');
  -- данные заводим как postgres (доверенный)
  insert into public.agencies (name, owner_user_id, status, verified, phone, telegram) values ('Тест-агентство', a, 'approved', true, '+996000000000', '@test') returning id into ag;
  insert into public.agencies (name, owner_user_id, status, verified) values ('Чужое', o, 'approved', true) returning id into ag2;
  insert into public.tours (id, agency_id, category, type, title, place, duration, price, lat, lng, status, published)
    values (tid, ag, 'tours', 'Пешком', 'Тест-тур', 'Ош', '120', 10, 40.5, 72.8, 'published', true);
  insert into public.guides (agency_id, name, phone) values (ag, 'Гид Тест', '+996111') returning id into g1;
  insert into public.guides (agency_id, name) values (ag2, 'Чужой гид') returning id into g2;

  -- 1 турист бронирует
  perform set_config('request.jwt.claims', json_build_object('sub', u, 'role', 'authenticated')::text, true);
  execute 'set local role authenticated';
  insert into public.booking_requests (code, tour_id, date, guests, name, contact)
    values ('BKTEST01', tid, current_date + 2, 2, 'Турист', 'bk@example.invalid') returning id into bid;
  execute 'reset role';
  select status into v from public.booking_requests where id = bid;
  select count(*) into n from public.booking_events where booking_id = bid and to_agency = ag and kind = 'new';
  r := r || '1 ' || v || ' / new-events ' || n || E'\n';

  -- 2 турист пытается подтвердить сам
  perform set_config('request.jwt.claims', json_build_object('sub', u, 'role', 'authenticated')::text, true);
  execute 'set local role authenticated';
  begin
    update public.booking_requests set status = 'confirmed' where id = bid;
  exception when others then null; end;
  execute 'reset role';
  select status into v from public.booking_requests where id = bid;
  r := r || '2 tourist self-confirm: ' || v || E'\n';

  -- 3–5 агентство
  perform set_config('request.jwt.claims', json_build_object('sub', a, 'role', 'authenticated')::text, true);
  execute 'set local role authenticated';
  begin
    update public.booking_requests set guide_id = g2 where id = bid; r := r || '3 foreign guide: ALLOWED (bad)' || E'\n';
  exception when others then r := r || '3 foreign guide: blocked' || E'\n'; end;
  begin
    update public.booking_requests set total_usd = 0 where id = bid; r := r || '4 agency edits price: ALLOWED (bad)' || E'\n';
  exception when others then r := r || '4 agency edits price: blocked' || E'\n'; end;
  update public.booking_requests set status = 'confirmed', guide_id = g1, meet_at = now() + interval '2 days', agency_note = 'Возьмите воду' where id = bid;
  execute 'reset role';
  select status into v from public.booking_requests where id = bid;
  select count(*) into n from public.booking_events where booking_id = bid and to_user = u and kind = 'confirmed';
  r := r || '5 ' || v || ' / tourist-events ' || n || E'\n';

  -- 6 турист открывает «поездку»
  perform set_config('request.jwt.claims', json_build_object('sub', u, 'role', 'authenticated')::text, true);
  execute 'set local role authenticated';
  j := public.my_trip(bid);
  r := r || '6 trip guide ' || coalesce(j->'guide'->>'name', 'NULL') || ', phone ' || coalesce(j->'guide'->>'phone', 'null')
         || ', agency ' || case when j->'agency'->>'name' = 'Тест-агентство' then 'ok' else 'MISSING' end || E'\n';
  -- 7 турист пишет
  insert into public.booking_messages (booking_id, body, from_agency) values (bid, '  Здравствуйте!  ', true);
  execute 'reset role';
  select from_agency::text into v from public.booking_messages where booking_id = bid order by created_at limit 1;
  r := r || '7 msg tourist from_agency=' || v || E'\n';

  -- 8 агентство отвечает
  perform set_config('request.jwt.claims', json_build_object('sub', a, 'role', 'authenticated')::text, true);
  execute 'set local role authenticated';
  insert into public.booking_messages (booking_id, body) values (bid, 'Ждём вас!');
  execute 'reset role';
  select from_agency::text into v from public.booking_messages where booking_id = bid and body = 'Ждём вас!';
  r := r || '8 msg agency from_agency=' || v || E'\n';

  -- 9 посторонний
  perform set_config('request.jwt.claims', json_build_object('sub', x, 'role', 'authenticated')::text, true);
  execute 'set local role authenticated';
  select count(*) into n from public.booking_messages where booking_id = bid;
  j := public.my_trip(bid);
  r := r || '9 stranger ' || n || ' / ' || coalesce(j::text, 'null');
  begin
    insert into public.booking_messages (booking_id, body) values (bid, 'спам'); r := r || ' / ALLOWED (bad)' || E'\n';
  exception when others then r := r || ' / blocked' || E'\n'; end;
  execute 'reset role';

  -- 10 агентство откатывает статус назад
  perform set_config('request.jwt.claims', json_build_object('sub', a, 'role', 'authenticated')::text, true);
  execute 'set local role authenticated';
  begin
    update public.booking_requests set status = 'pending' where id = bid; r := r || '10 back to pending: ALLOWED (bad)' || E'\n';
  exception when others then r := r || '10 back to pending: blocked' || E'\n'; end;
  execute 'reset role';

  -- 11 турист прочитал чат
  perform set_config('request.jwt.claims', json_build_object('sub', u, 'role', 'authenticated')::text, true);
  execute 'set local role authenticated';
  perform public.mark_chat_read(bid);
  j := public.my_trip(bid);
  r := r || '11 unread after read ' || (j->>'unread') || E'\n';
  -- вторая заявка — для сгорания
  insert into public.booking_requests (code, tour_id, date, guests, name, contact)
    values ('BKTEST02', tid, current_date + 3, 1, 'Турист', 'bk@example.invalid') returning id into bid2;
  execute 'reset role';

  -- 12 заявка висит 25 часов → сгорает
  update public.booking_requests set created_at = now() - interval '25 hours' where id = bid2;
  perform public.expire_stale_bookings();
  select status into v from public.booking_requests where id = bid2;
  select count(*) into n from public.booking_events where booking_id = bid2 and to_user = u and kind = 'expired';
  r := r || '12 ' || v || ' + event ' || n || E'\n';

  -- 13 турист видит только свои события
  perform set_config('request.jwt.claims', json_build_object('sub', u, 'role', 'authenticated')::text, true);
  execute 'set local role authenticated';
  select count(*) into n from public.booking_events where to_user is distinct from u;
  execute 'reset role';
  r := r || '13 foreign events visible to tourist: ' || n || E'\n';

  raise exception 'RESULTS%', E'\n' || r;
end $t$;
