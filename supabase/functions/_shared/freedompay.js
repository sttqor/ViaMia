// Freedom Pay (протокол PayBox): общие куски для pay-init и pay-result.
// shortcut: формат подписи и ответов — по общей документации Freedom Pay/PayBox (их сайт из облака недоступен);
// при подключении сверить с документацией в кабинете мерчанта: имя скрипта, порядок полей, валюту.

// Строка для подписи: имя скрипта; значения параметров по алфавиту ключей; секретный ключ. pg_sig не участвует.
export function sigString(script, params, secret) {
  const values = Object.keys(params)
    .filter((k) => k !== "pg_sig")
    .sort()
    .map((k) => String(params[k] ?? ""));
  return [script, ...values, secret].join(";");
}

// значение тега из XML-ответа Freedom Pay
export function xmlTag(xml, name) {
  const m = String(xml).match(new RegExp(`<${name}>([\\s\\S]*?)</${name}>`));
  return m ? m[1].replace(/<!\[CDATA\[([\s\S]*?)\]\]>/, "$1").trim() : null;
}

const esc = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
export function xmlResponse(params) {
  return `<?xml version="1.0" encoding="utf-8"?><response>${Object.entries(params)
    .map(([k, v]) => `<${k}>${esc(v)}</${k}>`)
    .join("")}</response>`;
}

// сумма к списанию: цены в базе в USD; Freedom Pay в КР обычно в сомах — курс задаётся секретом USD_TO_KGS
export function chargeAmount(totalUsd, currency, usdToKgs) {
  const usd = Number(totalUsd);
  if (!(usd > 0)) return null;
  if (currency === "USD") return usd.toFixed(2);
  const rate = Number(usdToKgs);
  if (!(rate > 0)) return null;
  return (Math.round(usd * rate * 100) / 100).toFixed(2);
}

export const randomSalt = () => crypto.randomUUID().replace(/-/g, "");
