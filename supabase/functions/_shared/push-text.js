// Тексты push по типу события (booking_events.kind). Тест — supabase/functions/push-text.test.mjs.
// Языки: ru и en; ky/kk/uz → ru, остальные → en (как fallbackOf в src/i18n.js).

const TEXT = {
  ru: {
    new: ["Новая заявка", (p) => `${p.tour || "Тур"} · ${p.date || ""} · гостей: ${p.guests ?? 1}`],
    cancelled: ["Заявку отменили", (p) => `${p.tour || "Тур"} · ${p.date || ""}`],
    confirmed: ["Бронь подтверждена", (p) => `${p.tour || "Тур"} · ${p.date || ""}. Детали — в билете`],
    declined: ["Агентство отклонило заявку", (p) => p.reason || p.tour || ""],
    expired: ["Заявка без ответа", (p) => `${p.tour || "Тур"}: агентство не ответило за 24 ч`],
    done: ["Тур состоялся", (p) => `Спасибо, что были с нами: ${p.tour || ""}`],
    updated: ["Детали поездки изменились", (p) => `${p.tour || "Тур"} · ${p.date || ""}`],
    message: ["Новое сообщение", (p) => (p.name ? `${p.name}: ` : "") + (p.text || "")],
  },
  en: {
    new: ["New booking request", (p) => `${p.tour || "Tour"} · ${p.date || ""} · guests: ${p.guests ?? 1}`],
    cancelled: ["Booking cancelled", (p) => `${p.tour || "Tour"} · ${p.date || ""}`],
    confirmed: ["Booking confirmed", (p) => `${p.tour || "Tour"} · ${p.date || ""}. Details are in your ticket`],
    declined: ["The agency declined your request", (p) => p.reason || p.tour || ""],
    expired: ["No reply to your request", (p) => `${p.tour || "Tour"}: the agency didn't reply within 24 h`],
    done: ["Tour completed", (p) => `Thanks for travelling with us: ${p.tour || ""}`],
    updated: ["Trip details changed", (p) => `${p.tour || "Tour"} · ${p.date || ""}`],
    message: ["New message", (p) => (p.name ? `${p.name}: ` : "") + (p.text || "")],
  },
};

const RU_LIKE = new Set(["ru", "ky", "kk", "uz"]);

export function pushLang(lang) {
  return RU_LIKE.has(lang) ? "ru" : "en";
}

// { title, body } или null, если тип неизвестен
export function pushText(kind, payload, lang) {
  const row = TEXT[pushLang(lang)][kind];
  if (!row) return null;
  const body = String(row[1](payload || {})).trim().replace(/\s·\s*$/, "");
  return { title: row[0], body: body.slice(0, 180) };
}

// куда открыть приложение по нажатию
export function pushUrl(event, code) {
  if (event.to_agency) return "/";
  return code ? `/?ticket=${encodeURIComponent(code)}` : "/";
}
