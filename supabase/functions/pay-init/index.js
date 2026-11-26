// Создать платёж Freedom Pay по подтверждённой брони и вернуть ссылку на страницу оплаты.
// Вызывает турист из билета (supabase.functions.invoke("pay-init", { body: { booking_id } })).
// Секреты (Supabase → Edge Functions → Secrets): FREEDOMPAY_MERCHANT_ID, FREEDOMPAY_SECRET,
// FREEDOMPAY_CURRENCY (KGS|USD, по умолчанию KGS), USD_TO_KGS (курс, если KGS), FREEDOMPAY_TESTING=1 (тест),
// FREEDOMPAY_API (по умолчанию https://api.freedompay.kg), SITE_URL (куда вернуть туриста после оплаты).
import { createClient } from "jsr:@supabase/supabase-js@2";
import { chargeAmount, randomSalt, sigString, xmlTag } from "../_shared/freedompay.js";
import { md5 } from "../_shared/md5.js";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};
const json = (body, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...CORS, "Content-Type": "application/json" } });

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  const env = (k, d) => Deno.env.get(k) ?? d;
  const merchant = env("FREEDOMPAY_MERCHANT_ID");
  const secret = env("FREEDOMPAY_SECRET");
  if (!merchant || !secret) return json({ error: "payments_off" }, 503); // ключей ещё нет

  // кто платит — по токену туриста
  const url = env("SUPABASE_URL");
  const userClient = createClient(url, env("SUPABASE_ANON_KEY"), {
    global: { headers: { Authorization: req.headers.get("Authorization") ?? "" } },
  });
  const { data: auth } = await userClient.auth.getUser();
  if (!auth?.user) return json({ error: "not_signed_in" }, 401);

  const { booking_id } = await req.json().catch(() => ({}));
  if (!booking_id) return json({ error: "no_booking" }, 400);

  const admin = createClient(url, env("SUPABASE_SERVICE_ROLE_KEY"));
  const { data: b } = await admin
    .from("booking_requests")
    .select("id, code, user_id, status, total_usd, paid_at, lang, tour:tours(title)")
    .eq("id", booking_id)
    .maybeSingle();
  if (!b || b.user_id !== auth.user.id) return json({ error: "not_found" }, 404);
  if (b.paid_at) return json({ error: "already_paid" }, 409);
  if (b.status !== "confirmed") return json({ error: "not_confirmed" }, 409); // платим только после подтверждения агентством

  const currency = env("FREEDOMPAY_CURRENCY", "KGS");
  const amount = chargeAmount(b.total_usd, currency, env("USD_TO_KGS"));
  if (!amount) return json({ error: "no_price" }, 409);

  const site = env("SITE_URL", "https://osh-explorer2.vercel.app");
  const params = {
    pg_order_id: b.id,
    pg_merchant_id: merchant,
    pg_amount: amount,
    pg_currency: currency,
    pg_description: `ViaMia: ${b.tour?.title || "тур"} (${b.code})`.slice(0, 250),
    pg_salt: randomSalt(),
    pg_result_url: `${url}/functions/v1/pay-result`,
    pg_success_url: `${site}/?paid=${b.code}`,
    pg_failure_url: `${site}/?payfail=${b.code}`,
    pg_language: b.lang === "ru" || b.lang === "ky" ? "ru" : "en",
    pg_testing_mode: env("FREEDOMPAY_TESTING") === "1" ? "1" : "0",
  };
  if (auth.user.email) params.pg_user_contact_email = auth.user.email;
  params.pg_sig = await md5(sigString("init_payment.php", params, secret));

  const res = await fetch(`${env("FREEDOMPAY_API", "https://api.freedompay.kg")}/init_payment.php`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams(params),
  });
  const xml = await res.text();
  if (xmlTag(xml, "pg_status") !== "ok") {
    console.error("Freedom Pay init failed", xml.slice(0, 500));
    return json({ error: "provider", detail: xmlTag(xml, "pg_error_description") }, 502);
  }
  return json({ url: xmlTag(xml, "pg_redirect_url") });
});
