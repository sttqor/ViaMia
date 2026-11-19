// Кыргызские номера: +996 и 9 цифр, вид на экране — «+996 (XXX) XX-XX-XX».
// Коды мобильных операторов КР (первые цифры после 996), сверено по таблице
// Sputnik / for.kg, сентябрь 2026 — 60 префиксов:
//   O!        — 500–509, 700–709
//   MEGA      — 550–559, 755, 880, 888, 990, 995–999
//   Beeline   — 220–229, 770–779, 600
// Номер мог уйти к другому оператору (MNP) — это не важно, важно, что код мобильный.
// Если появится новый диапазон — дописать в OPERATOR_PREFIXES.
export const OPERATOR_PREFIXES = [
  "50", "70", "55", "22", "77", // целые десятки
  "755", "880", "888", "990", "995", "996", "997", "998", "999", "600",
];
const isOperator = (d) => OPERATOR_PREFIXES.some((p) => d.startsWith(p));

const CC = "996";
const LEN = 9; // цифр после кода страны

// Похоже ли то, что вводят, на телефон (а не на почту)
export function looksLikePhone(raw) {
  const s = String(raw || "").trim();
  return s !== "" && /^[+\d\s()-]+$/.test(s);
}

// Девять национальных цифр из любого ввода: «+996 700…», «996700123456», «0700…», «700…».
// Код страны отрезаем, только если ввод начинается с «+» или цифр больше девяти:
// иначе «99…» (MegaCom) при наборе превращалось бы в начало «996».
export function nationalDigits(raw) {
  const s = String(raw || "").trim();
  let d = s.replace(/\D/g, "");
  if (s.startsWith("+")) {
    // «+9», «+99» — код страны ещё набирают
    d = CC.startsWith(d) ? "" : d.startsWith(CC) ? d.slice(CC.length) : d;
  } else if (d.length > LEN && d.startsWith(CC)) {
    d = d.slice(CC.length);
  } else if (d.startsWith("0")) {
    d = d.slice(1);
  }
  return d.slice(0, LEN);
}

// Маска по мере ввода: «+996 (70», «+996 (700) 12-3»…
// Пока цифр номера нет — оставляем как есть («+», «+99»), чтобы не мешать набору
export function formatPhone(raw) {
  const d = nationalDigits(raw);
  if (!d) return String(raw || "").replace(/[^+\d]/g, "").slice(0, 4);
  let out = `+${CC} (${d.slice(0, 3)}`;
  // скобку и дефисы ставим, только когда за ними уже есть цифра — иначе их не стереть
  if (d.length > 3) out += `) ${d.slice(3, 5)}`;
  if (d.length > 5) out += `-${d.slice(5, 7)}`;
  if (d.length > 7) out += `-${d.slice(7, 9)}`;
  return out;
}

// "ok" | "short" | "operator"
export function checkPhone(raw) {
  const d = nationalDigits(raw);
  if (d.length < LEN) return "short";
  if (!isOperator(d)) return "operator";
  return "ok";
}

// Вид для Supabase (E.164): +996700123456
export function toE164(raw) {
  return `+${CC}${nationalDigits(raw)}`;
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

// Поле входа «почта или телефон» → { id: { email } | { phone } } или { error: ключ перевода }.
// mode: "any" — что ввели, "email" / "phone" — только этот способ (привязка в профиле)
export function readLoginId(raw, mode = "any") {
  const s = String(raw || "").trim();
  if (!s) return { error: mode === "phone" ? "login.errPhone" : mode === "email" ? "login.errEmail" : "login.errId" };
  if (mode !== "email" && looksLikePhone(s)) {
    const check = checkPhone(s);
    if (check === "short") return { error: "login.errPhone" };
    if (check === "operator") return { error: "login.errOperator" };
    return { id: { phone: toE164(s) } };
  }
  if (mode === "phone") return { error: "login.errPhone" };
  const email = s.toLowerCase();
  return EMAIL_RE.test(email) ? { id: { email } } : { error: "login.errEmail" };
}

// Как показать адрес/номер человеку: «a@b.kg» или «+996 (700) 12-34-56»
export function showLoginId(id) {
  return id?.phone ? formatPhone(id.phone) : id?.email || "";
}

// Supabase хранит телефон без «+» («996700123456») — для показа в профиле
export function prettyPhone(stored) {
  return stored ? formatPhone(`+${String(stored).replace(/^\+/, "")}`) : "";
}
