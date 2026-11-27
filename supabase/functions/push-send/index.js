// Отправить Web Push по событию брони. Зовёт база (триггер event_push в
// playbooks/booking-notifications/toolbox/04-push.sql) с телом { event_id }.
// Секрета нет: событие «забирается» один раз (pushed_at), повторный вызов ничего не шлёт.
// Деплой — без проверки JWT (verify_jwt = false).
// Секреты (Supabase → Edge Functions → Secrets): VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY,
// VAPID_SUBJECT (mailto:… для push-сервисов, по умолчанию почта поддержки).
import { createClient } from "jsr:@supabase/supabase-js@2";
import webpush from "npm:web-push@3.6.7";
import { pushText, pushUrl } from "../_shared/push-text.js";

const MAX_AGE_MS = 60 * 60 * 1000; // старше часа — уже не новость
const json = (body, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });

Deno.serve(async (req) => {
  if (req.method !== "POST") return json({ error: "method" }, 405);
  const env = (k, d) => Deno.env.get(k) ?? d;
  const pub = env("VAPID_PUBLIC_KEY");
  const priv = env("VAPID_PRIVATE_KEY");
  if (!pub || !priv) return json({ error: "push_off" }, 503); // ключей ещё нет

  const { event_id } = await req.json().catch(() => ({}));
  if (typeof event_id !== "string" || !/^[0-9a-f-]{36}$/i.test(event_id)) return json({ error: "bad_event" }, 400);

  const admin = createClient(env("SUPABASE_URL"), env("SUPABASE_SERVICE_ROLE_KEY"));
  // забрать событие ровно один раз
  const { data: ev } = await admin
    .from("booking_events")
    .update({ pushed_at: new Date().toISOString() })
    .eq("id", event_id)
    .is("pushed_at", null)
    .select("id, booking_id, to_user, to_agency, kind, payload, created_at")
    .maybeSingle();
  if (!ev) return json({ sent: 0, skip: "taken" });
  if (Date.now() - new Date(ev.created_at).getTime() > MAX_AGE_MS) return json({ sent: 0, skip: "old" });

  let userId = ev.to_user;
  if (!userId && ev.to_agency) {
    const { data: a } = await admin.from("agencies").select("owner_user_id").eq("id", ev.to_agency).maybeSingle();
    userId = a?.owner_user_id;
  }
  if (!userId) return json({ sent: 0, skip: "no_user" });

  // «уведомления о турах» выключены в профиле — не шлём (настройка общая для всех устройств)
  const { data: prof } = await admin.from("profiles").select("settings").eq("id", userId).maybeSingle();
  if (prof?.settings?.notifs === false) return json({ sent: 0, skip: "off" });

  const { data: subs } = await admin.from("push_subscriptions").select("endpoint, p256dh, auth, lang").eq("user_id", userId);
  if (!subs?.length) return json({ sent: 0 });

  const { data: b } = await admin.from("booking_requests").select("code").eq("id", ev.booking_id).maybeSingle();
  webpush.setVapidDetails(env("VAPID_SUBJECT", "mailto:viamiasupp@gmail.com"), pub, priv);

  let sent = 0;
  const gone = [];
  await Promise.all(
    subs.map(async (s) => {
      const text = pushText(ev.kind, ev.payload, s.lang);
      if (!text) return;
      const msg = JSON.stringify({ ...text, url: pushUrl(ev, b?.code), tag: `bk-${ev.booking_id}` });
      try {
        await webpush.sendNotification({ endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } }, msg, {
          TTL: 24 * 3600,
          urgency: "high",
        });
        sent += 1;
      } catch (e) {
        // 404/410 — браузер отписался, подписку убираем
        if (e?.statusCode === 404 || e?.statusCode === 410) gone.push(s.endpoint);
        else console.error("push failed", e?.statusCode, String(e?.body || e).slice(0, 200));
      }
    })
  );
  if (gone.length) await admin.from("push_subscriptions").delete().in("endpoint", gone);
  return json({ sent, gone: gone.length });
});
