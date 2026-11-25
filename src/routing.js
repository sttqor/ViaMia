// Прокладка маршрута по улицам: OSRM на серверах FOSSGIS (бесплатно, без ключа, CORS открыт).
// Пешком — routed-foot, на машине — routed-car. Не ответил — прямые линии с оценкой времени.

const BASE = {
  foot: "https://routing.openstreetmap.de/routed-foot/route/v1/foot",
  car: "https://routing.openstreetmap.de/routed-car/route/v1/driving",
};
const SPEED_KMH = { foot: 4.5, car: 25 }; // для запасного варианта
const cache = new Map();

// расстояние по прямой, км
export function distKm(a, b) {
  const R = 6371;
  const rad = (d) => (d * Math.PI) / 180;
  const dLat = rad(b[1] - a[1]);
  const dLng = rad(b[0] - a[0]);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(rad(a[1])) * Math.cos(rad(b[1])) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

function straight(points, mode) {
  let km = 0;
  for (let i = 1; i < points.length; i++) km += distKm(points[i - 1], points[i]) * 1.3;
  // шаги для навигатора: только прибытие на каждую остановку
  const legs = points.slice(1).map((p) => ({ steps: [{ name: "", maneuver: { type: "arrive", location: p } }] }));
  return { coords: points, distance: km * 1000, duration: (km / SPEED_KMH[mode]) * 3600, legs, approx: true };
}

// points — [[lng, lat], …] в порядке обхода. Возвращает { coords, distance (м), duration (с), approx }
export async function fetchRoute(points, mode = "foot", signal) {
  if (points.length < 2) return { coords: points, distance: 0, duration: 0, approx: false };
  const path = points.map(([lng, lat]) => `${lng.toFixed(6)},${lat.toFixed(6)}`).join(";");
  const key = `${mode}|${path}`;
  if (cache.has(key)) return cache.get(key);
  try {
    // steps=true — пошаговые манёвры для навигатора (navigation.js)
    const r = await fetch(`${BASE[mode]}/${path}?overview=full&geometries=geojson&steps=true`, { signal });
    if (!r.ok) throw new Error(String(r.status));
    const j = await r.json();
    const route = j.routes?.[0];
    if (j.code !== "Ok" || !route) throw new Error(j.code || "no route");
    const res = {
      coords: route.geometry.coordinates,
      distance: route.distance,
      duration: route.duration,
      legs: route.legs.map((l) => ({ steps: l.steps.map((s) => ({ name: s.name, maneuver: s.maneuver })) })),
      approx: false,
    };
    cache.set(key, res);
    return res;
  } catch (err) {
    if (err.name === "AbortError") throw err;
    return straight(points, mode);
  }
}

// текущее местоположение или null (без ошибки — просто нет)
export function getPosition(timeout = 8000) {
  return new Promise((resolve) => {
    if (!navigator.geolocation) return resolve(null);
    navigator.geolocation.getCurrentPosition(
      (p) => resolve([p.coords.longitude, p.coords.latitude]),
      () => resolve(null),
      { enableHighAccuracy: true, timeout, maximumAge: 60000 },
    );
  });
}
