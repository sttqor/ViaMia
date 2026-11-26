// node supabase/functions/freedompay.test.mjs — проверка подписи и разбора ответа
import assert from "node:assert";
import { createHash } from "node:crypto";
import { chargeAmount, sigString, xmlResponse, xmlTag } from "./_shared/freedompay.js";

const md5 = (s) => createHash("md5").update(s).digest("hex");
const p = { pg_merchant_id: "1", pg_amount: "25.00", pg_salt: "abc", pg_order_id: "x", pg_sig: "skip" };
assert.equal(sigString("init_payment.php", p, "SECRET"), "init_payment.php;25.00;1;x;abc;SECRET"); // по алфавиту ключей, без pg_sig
assert.equal(md5(sigString("init_payment.php", p, "SECRET")).length, 32);
assert.equal(xmlTag("<response><pg_status>ok</pg_status><pg_redirect_url><![CDATA[https://pay/x?a=1]]></pg_redirect_url></response>", "pg_redirect_url"), "https://pay/x?a=1");
assert.equal(xmlTag("<response></response>", "pg_status"), null);
assert.match(xmlResponse({ pg_status: "ok", pg_description: "a<b" }), /<pg_description>a&lt;b<\/pg_description>/);
assert.equal(chargeAmount(17, "KGS", 87.5), "1487.50");
assert.equal(chargeAmount(17, "USD"), "17.00");
assert.equal(chargeAmount(17, "KGS", undefined), null); // нет курса — платить нельзя
assert.equal(chargeAmount(null, "USD"), null);
console.log("freedompay ok");
