// Ответ Freedom Pay об оплате (pg_result_url). Вызывает их сервер, не турист — без проверки JWT
// (deploy с --no-verify-jwt). Доверяем только подписи pg_sig. Повторный вызов безопасен: оплату пишем один раз.
// Оплачено → заявка у агентства помечается, агентству и туристу уходит событие (колокольчик).
import { createClient } from "jsr:@supabase/supabase-js@2";
import { chargeAmount, randomSalt, sigString, xmlResponse } from "../_shared/freedompay.js";
import { md5 } from "../_shared/md5.js";

const SCRIPT = "pay-result"; // последний кусок адреса pg_result_url — участвует в подписи

Deno.serve(async (req) => {
  const env = (k, d) => Deno.env.get(k) ?? d;
  const secret = env("FREEDOMPAY_SECRET");
  const reply = async (status, description) => {
    const p = { pg_status: status, pg_description: description, pg_salt: randomSalt() };
    p.pg_sig = await md5(sigString(SCRIPT, p, secret));
    return new Response(xmlResponse(p), { headers: { "Content-Type": "application/xml" } });
  };
  if (!secret) return new Response("payments_off", { status: 503 });

  // поля приходят формой (POST) или в адресе (GET)
  const params =
    req.method === "POST"
      ? Object.fromEntries(new URLSearchParams(await req.text()))
      : Object.fromEntries(new URL(req.url).searchParams);
  if (!params.pg_sig || (await md5(sigString(SCRIPT, params, secret))) !== params.pg_sig) {
    return reply("rejected", "bad signature");
  }
  if (params.pg_result !== "1") return reply("ok", "not paid"); // неуспешная оплата: ничего не меняем

  const admin = createClient(env("SUPABASE_URL"), env("SUPABASE_SERVICE_ROLE_KEY"));
  const { data: b } = await admin
    .from("booking_requests")
    .select("id, user_id, agency_id, date, total_usd, paid_at, tour:tours(title)")
    .eq("id", params.pg_order_id)
    .maybeSingle();
  if (!b) return reply("rejected", "unknown order");
  if (b.paid_at) return reply("ok", "already paid"); // повтор от Freedom Pay

  // сумма должна совпасть с той, что мы выставили (курс мог смениться — допускаем 1%)
  const expected = Number(chargeAmount(b.total_usd, params.pg_currency, env("USD_TO_KGS")));
  if (!(expected > 0) || Math.abs(Number(params.pg_amount) - expected) > expected * 0.01) {
    console.error("Freedom Pay amount mismatch", params.pg_order_id, params.pg_amount, expected);
    return reply("rejected", "amount mismatch");
  }

  const { data: updated } = await admin
    .from("booking_requests")
    .update({
      paid_at: new Date().toISOString(),
      paid_amount: Number(params.pg_amount),
      paid_currency: params.pg_currency,
      payment_id: params.pg_payment_id,
    })
    .eq("id", b.id)
    .is("paid_at", null) // гонка двух уведомлений — пишет только первое
    .select("id");
  if (updated?.length) {
    const payload = { tour: b.tour?.title, date: b.date };
    const events = [];
    if (b.agency_id) events.push({ booking_id: b.id, to_agency: b.agency_id, kind: "paid", payload });
    if (b.user_id) events.push({ booking_id: b.id, to_user: b.user_id, kind: "paid", payload });
    if (events.length) await admin.from("booking_events").insert(events);
  }
  return reply("ok", "paid");
});
