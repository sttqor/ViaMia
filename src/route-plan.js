import { durationMinutes } from "./i18n";
import { distKm } from "./routing";

// План дня по точкам маршрута: отрезки (км, пешком), итог по времени и часы прихода (старт в 09:00).
// Общее для веба (RouteView) и телефона (mobile).
const WALK_KMH = 4.5;

export function minutesToClock(mins) {
  const h = Math.floor(mins / 60) % 24;
  const m = Math.round(mins % 60);
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

// по прямой, с поправкой на улицы ×1.3
const walkKm = (a, b) => distKm([a.lng, a.lat], [b.lng, b.lat]) * 1.3;

export function planRoute(items) {
  const legs = items.map((item, i) => (i === 0 ? 0 : walkKm(items[i - 1], item)));
  const totalKm = legs.reduce((a, b) => a + b, 0);
  const totalMin = items.reduce((a, it) => a + durationMinutes(it.duration), 0) + (totalKm / WALK_KMH) * 60;
  const times = [];
  let cursor = 9 * 60;
  items.forEach((it, i) => {
    cursor += (legs[i] / WALK_KMH) * 60;
    times.push(minutesToClock(cursor));
    cursor += durationMinutes(it.duration);
  });
  return { legs, totalKm, totalMin, times };
}
