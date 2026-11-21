// Ссылка «Открыть в 2ГИС» (маршруты строит свой навигатор). Ключ не нужен — на телефоне с 2ГИС откроется приложение,
// без него — сайт 2gis.kg. Координаты у 2ГИС идут «долгота,широта».
const BASE = "https://2gis.kg/osh";

export function twoGisPlace(lat, lng) {
  return `${BASE}/geo/${lng}%2C${lat}?m=${lng}%2C${lat}%2F17`;
}

// расстояние по прямой, метры
export function distanceM(a, b) {
  const R = 6371000;
  const toRad = (x) => (x * Math.PI) / 180;
  const dLat = toRad(b[1] - a[1]);
  const dLng = toRad(b[0] - a[0]);
  const s = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(a[1])) * Math.cos(toRad(b[1])) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(s));
}

// пешком ~4.5 км/ч, по городу путь длиннее прямой примерно на 30%
export function walkMinutes(m) {
  return Math.max(1, Math.round((m * 1.3) / 75));
}
