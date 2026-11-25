// время встречи — всегда по Ошу (UTC+6, без перехода на летнее время), не по телефону — как в src/agency/BookingsTab.jsx.
// Без Intl с timeZone: в Hermes на Android формат en-CA / часовые пояса ведут себя не везде одинаково.
const OSH = 6 * 3600 * 1000;
const osh = (ms) => new Date(ms + OSH).toISOString();
export const todayOsh = () => osh(Date.now()).slice(0, 10);
export const timeOsh = (iso) => (iso ? osh(new Date(iso).getTime()).slice(11, 16) : "");

// «9:30» / «09.30» → «09:30»; не время — null
export function readTime(s) {
  const m = /^\s*(\d{1,2})[:.](\d{2})\s*$/.exec(s || "");
  if (!m || Number(m[1]) > 23 || Number(m[2]) > 59) return null;
  return `${m[1].padStart(2, "0")}:${m[2]}`;
}
