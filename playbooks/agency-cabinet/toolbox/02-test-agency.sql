-- ═══════════════════════════════════════════════════════════════
-- Проверка правил модерации (01-agency.sql). Ничего не сохраняет.
-- Как запускать: SQL Editor (или MCP execute_sql) →
--   begin;  <весь 01-agency.sql>  <этот файл>  rollback;
-- В конце блок НАРОЧНО падает с ошибкой RESULTS — так весь тест откатывается,
-- а в тексте ошибки видны итоги. Нужно минимум 2 пользователя в auth.users.
-- Ожидаемо (последний прогон 20.11.2026 — всё так):
--   1 pending/false · 2 pending · 3 draft/false/null/Тест · 4 blocked
--   5 0 · 5b 0 · 5c blocked · 6 approved/true · 6b published/true
--   7 1 · 7b booking ok · 8 review/false · 9 1 · 10 pending
-- ═══════════════════════════════════════════════════════════════
do $t$
declare a uuid; b uuid; ag uuid; tid text; r text := ''; v text; n int;
begin
  -- a — обычный пользователь (не админ), b — любой другой (станет админом внутри теста)
  select id into a from auth.users where id not in (select user_id from public.admins) order by created_at limit 1;
  select id into b from auth.users where id <> a order by created_at limit 1;
  -- как пользователь A
  perform set_config('request.jwt.claims', json_build_object('sub', a, 'role', 'authenticated')::text, true);
  execute 'set local role authenticated';
  insert into public.agencies (name, owner_user_id, status, verified, inn) values ('Тест', a, 'approved', true, '12345678901234') returning id into ag;
  select status || '/' || verified into v from public.agencies where id = ag; r := r || '1 ins agency: ' || v || E'\n';
  update public.agencies set status = 'approved' where id = ag;
  select status into v from public.agencies where id = ag; r := r || '2 self-approve: ' || v || E'\n';
  insert into public.tours (agency_id, category, type, title, place, duration, price, lat, lng, status, published, rating)
    values (ag, 'tours', 'Пешком', 'Тест-тур', 'Ош', '120', 10, 40.5, 72.8, 'published', true, 5) returning id into tid;
  select status || '/' || published || '/' || coalesce(rating::text,'null') || '/' || agency_name into v from public.tours where id = tid;
  r := r || '3 ins tour: ' || v || E'\n';
  begin
    update public.tours set status = 'published' where id = tid; r := r || '4 self-publish: ALLOWED (bad)' || E'\n';
  exception when others then r := r || '4 self-publish: blocked ' || sqlerrm || E'\n'; end;
  update public.tours set status = 'review' where id = tid;
  -- аноним
  execute 'reset role';
  perform set_config('request.jwt.claims', json_build_object('role', 'anon')::text, true);
  execute 'set local role anon';
  select count(*) into n from public.tours where id = tid; r := r || '5 anon sees review tour: ' || n || E'\n';
  select count(*) into n from public.agencies where id = ag; r := r || '5b anon sees pending agency: ' || n || E'\n';
  begin
    insert into public.booking_requests (code, tour_id, date, guests, name, contact) values ('TESTCODE1', tid, current_date + 3, 2, 'Тест', 'test@x.kg');
    r := r || '5c booking unpublished: ALLOWED (bad)' || E'\n';
  exception when others then r := r || '5c booking unpublished: blocked' || E'\n'; end;
  -- админ B
  execute 'reset role';
  insert into public.admins (user_id) values (b) on conflict do nothing;
  perform set_config('request.jwt.claims', json_build_object('sub', b, 'role', 'authenticated')::text, true);
  execute 'set local role authenticated';
  update public.agencies set status = 'approved' where id = ag;
  update public.tours set status = 'published' where id = tid;
  select status || '/' || verified into v from public.agencies where id = ag; r := r || '6 admin approve agency: ' || v || E'\n';
  select status || '/' || published into v from public.tours where id = tid; r := r || '6b admin publish tour: ' || v || E'\n';
  -- аноним видит
  execute 'reset role';
  perform set_config('request.jwt.claims', json_build_object('role', 'anon')::text, true);
  execute 'set local role anon';
  select count(*) into n from public.tours where id = tid; r := r || '7 anon sees published: ' || n || E'\n';
  insert into public.booking_requests (code, tour_id, date, guests, name, contact) values ('TESTCODE2', tid, current_date + 3, 2, 'Тест', 'test@x.kg');
  r := r || '7b booking ok' || E'\n';
  -- A правит опубликованный
  execute 'reset role';
  perform set_config('request.jwt.claims', json_build_object('sub', a, 'role', 'authenticated')::text, true);
  execute 'set local role authenticated';
  update public.tours set title = 'Новое имя' where id = tid;
  select status || '/' || published into v from public.tours where id = tid; r := r || '8 edit published: ' || v || E'\n';
  select count(*) into n from public.booking_requests where agency_id = ag; r := r || '9 agency sees bookings: ' || n || E'\n';
  update public.agencies set inn = '99999999999999' where id = ag;
  select status into v from public.agencies where id = ag; r := r || '10 change inn: ' || v || E'\n';
  execute 'reset role';
  raise exception 'RESULTS%', E'\n' || r;
end $t$;
