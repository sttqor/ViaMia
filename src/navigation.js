// Геометрия и шаги пошаговой навигации (без React).
// Маршрут — линия [[lng, lat], …] от OSRM; положение человека проецируется на неё,
// по «пройденному вдоль линии» считаем следующий манёвр, остаток пути и сход с маршрута.
import {
  ArrowUp,
  ArrowUpLeft,
  ArrowUpRight,
  CornerUpLeft,
  CornerUpRight,
  Flag,
  Navigation,
  RotateCw,
  Undo2,
} from "lucide-react";

const M_LAT = 110540; // метров в градусе широты
const M_LNG = 111320; // метров в градусе долготы на экваторе

// плоская проекция вокруг точки — для расстояний в пределах города точности хватает
function toXY(p, origin) {
  const k = Math.cos((origin[1] * Math.PI) / 180);
  return [(p[0] - origin[0]) * M_LNG * k, (p[1] - origin[1]) * M_LAT];
}

export function meters(a, b) {
  const [x, y] = toXY(b, a);
  return Math.hypot(x, y);
}

// азимут a → b в градусах (0 — север, по часовой)
export function bearing(a, b) {
  const [x, y] = toXY(b, a);
  return ((Math.atan2(x, y) * 180) / Math.PI + 360) % 360;
}

// накопленная длина линии: cum[i] — метров от начала до точки i
export function measure(coords) {
  const cum = new Float64Array(coords.length);
  for (let i = 1; i < coords.length; i++) cum[i] = cum[i - 1] + meters(coords[i - 1], coords[i]);
  return { cum, total: cum[coords.length - 1] || 0 };
}

// Ближайшая точка линии к p. from — с какого отрезка искать (вперёд, чтобы не прыгать назад на петлях).
// Возвращает { along — метров от начала, dist — метров от линии, idx — номер отрезка, point, heading — азимут отрезка }
export function project(coords, cum, p, from = 0) {
  let best = { along: 0, dist: Infinity, idx: 0, point: coords[0], heading: 0 };
  const start = Math.max(0, from - 2);
  for (let i = start; i < coords.length - 1; i++) {
    const a = coords[i];
    const [bx, by] = toXY(coords[i + 1], a);
    const [px, py] = toXY(p, a);
    const len2 = bx * bx + by * by;
    const tt = len2 ? Math.max(0, Math.min(1, (px * bx + py * by) / len2)) : 0;
    const dx = px - tt * bx;
    const dy = py - tt * by;
    const dist = Math.hypot(dx, dy);
    if (dist < best.dist) {
      const pt = [a[0] + (coords[i + 1][0] - a[0]) * tt, a[1] + (coords[i + 1][1] - a[1]) * tt];
      best = { along: cum[i] + Math.sqrt(len2) * tt, dist, idx: i, point: pt, heading: bearing(a, coords[i + 1]) };
    }
    // дальше 300 м вперёд от хорошего совпадения не ищем
    if (best.dist < 30 && cum[i] - best.along > 300) break;
  }
  return best;
}

// точка на линии через s метров от начала (для демо-режима)
export function pointAt(coords, cum, s) {
  if (s <= 0) return { point: coords[0], heading: bearing(coords[0], coords[1] || coords[0]) };
  for (let i = 1; i < coords.length; i++) {
    if (cum[i] >= s) {
      const seg = cum[i] - cum[i - 1] || 1;
      const tt = (s - cum[i - 1]) / seg;
      const a = coords[i - 1];
      const b = coords[i];
      return { point: [a[0] + (b[0] - a[0]) * tt, a[1] + (b[1] - a[1]) * tt], heading: bearing(a, b) };
    }
  }
  const n = coords.length;
  return { point: coords[n - 1], heading: bearing(coords[n - 2] || coords[n - 1], coords[n - 1]) };
}

// остаток линии от точки проекции до конца
export function remainingLine(coords, proj) {
  return [proj.point, ...coords.slice(proj.idx + 1)];
}

// iOS разрешает озвучку только после нажатия: «будим» её пустой фразой прямо в обработчике клика
export function primeSpeech() {
  try {
    const u = new SpeechSynthesisUtterance(" ");
    u.volume = 0;
    window.speechSynthesis?.speak(u);
  } catch {
    /* озвучки нет */
  }
}

// ── манёвры ──

const BY_MODIFIER = {
  uturn: { key: "nav.m.uturn", Icon: Undo2 },
  "sharp left": { key: "nav.m.sharpLeft", Icon: CornerUpLeft },
  left: { key: "nav.m.left", Icon: CornerUpLeft },
  "slight left": { key: "nav.m.slightLeft", Icon: ArrowUpLeft },
  straight: { key: "nav.m.straight", Icon: ArrowUp },
  "slight right": { key: "nav.m.slightRight", Icon: ArrowUpRight },
  right: { key: "nav.m.right", Icon: CornerUpRight },
  "sharp right": { key: "nav.m.sharpRight", Icon: CornerUpRight },
};

function maneuverOf(m) {
  if (m.type === "depart") return { key: "nav.m.depart", Icon: Navigation };
  if (m.type === "arrive") return { key: "nav.m.arrive", Icon: Flag };
  if (/roundabout|rotary/.test(m.type) && m.exit) return { key: "nav.m.roundabout", Icon: RotateCw, vars: { n: m.exit } };
  return BY_MODIFIER[m.modifier] || BY_MODIFIER.straight;
}

// Шаги OSRM → [{ at (метров от начала линии), key, vars, Icon, road, leg, arrive }].
// Шаги без настоящего манёвра («улица сменила название», «продолжайте прямо» в середине) выкидываем.
export function buildSteps(data, coords, cum) {
  const out = [];
  let from = 0;
  (data.legs || []).forEach((leg, legIdx) => {
    for (const s of leg.steps || []) {
      const m = s.maneuver;
      const proj = project(coords, cum, m.location, from);
      from = proj.idx;
      const man = maneuverOf(m);
      const noise = (m.type === "new name" || m.type === "continue") && (!m.modifier || m.modifier === "straight");
      const midDepart = m.type === "depart" && legIdx > 0;
      if (noise || midDepart) continue;
      out.push({ at: proj.along, ...man, vars: man.vars || {}, road: s.name || "", leg: legIdx, arrive: m.type === "arrive" });
    }
  });
  return out;
}
