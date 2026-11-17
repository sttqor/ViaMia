// Выгрузка важных мест Оша из OpenStreetMap (Overpass) в src/places-osm.json.
// Запуск: node scripts/fetch-places.mjs  (Node 18+, только встроенный fetch)

import { writeFile, mkdir } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const OUT = resolve(ROOT, "src", "places-osm.json");

// bbox Оша: south, west, north, east
const BBOX = "40.47,72.70,40.60,72.88";
const ENDPOINTS = [
  "https://overpass-api.de/api/interpreter",
  "https://overpass.kumi.systems/api/interpreter",
];
const MAX_ATTEMPTS = 3;
const RETRY_STATUS = new Set([429, 500, 502, 503, 504]);
// категории без обязательного имени (берём brand/operator, если name нет)
const OPTIONAL_NAME = new Set(["atm", "pharmacy"]);
const DEDUP_METERS = 50;

// Порядок важен: первое совпавшее правило задаёт cat.
const RULES = [
  { cat: "cafe", tags: [{ amenity: "cafe" }] },
  { cat: "food", tags: [{ amenity: "restaurant" }, { amenity: "fast_food" }] },
  { cat: "museum", tags: [{ tourism: "museum" }, { amenity: "arts_centre" }] },
  {
    cat: "sight",
    tags: [
      { tourism: "attraction" },
      { tourism: "viewpoint" },
      { historic: "monument" },
      { historic: "memorial" },
      { historic: "archaeological_site" },
      { historic: "castle" },
    ],
  },
  { cat: "mosque", tags: [{ amenity: "place_of_worship", religion: "muslim" }], needName: true },
  { cat: "market", tags: [{ amenity: "marketplace" }, { shop: "mall" }] },
  { cat: "park", tags: [{ leisure: "park" }], needName: true },
  { cat: "hotel", tags: [{ tourism: "hotel" }, { tourism: "hostel" }, { tourism: "guest_house" }] },
  { cat: "atm", tags: [{ amenity: "atm" }, { amenity: "bank" }, { amenity: "bureau_de_change" }] },
  { cat: "pharmacy", tags: [{ amenity: "pharmacy" }] },
  { cat: "hospital", tags: [{ amenity: "hospital" }, { amenity: "clinic" }] },
];

function buildQuery() {
  const lines = [];
  for (const rule of RULES) {
    for (const conds of rule.tags) {
      const filters = Object.entries(conds)
        .map(([k, v]) => `["${k}"="${v}"]`)
        .join("");
      const nameFilter = rule.needName ? `["name"]` : "";
      lines.push(`  nwr${filters}${nameFilter}(${BBOX});`);
    }
  }
  return `[out:json][timeout:90];\n(\n${lines.join("\n")}\n);\nout center tags;`;
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function queryOverpass(query) {
  const body = new URLSearchParams({ data: query }).toString();
  for (const url of ENDPOINTS) {
    for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
      try {
        const res = await fetch(url, {
          method: "POST",
          headers: {
            "content-type": "application/x-www-form-urlencoded",
            accept: "application/json",
            "user-agent": "osh-guide-places-export/1.0",
          },
          body,
        });
        if (!res.ok) {
          console.warn(`[${url}] HTTP ${res.status}, попытка ${attempt}/${MAX_ATTEMPTS}`);
          if (!RETRY_STATUS.has(res.status)) break; // не повторяем — пробуем запасной сервер
        } else {
          const json = JSON.parse(await res.text());
          if (!Array.isArray(json.elements)) {
            throw new Error(`нет elements: ${json.remark ?? "неизвестный ответ"}`);
          }
          return { json, url };
        }
      } catch (err) {
        console.warn(`[${url}] ошибка: ${err.message}, попытка ${attempt}/${MAX_ATTEMPTS}`);
      }
      if (attempt < MAX_ATTEMPTS) await sleep(attempt * 15000);
    }
    console.warn(`Переходим к следующему серверу.`);
  }
  throw new Error("Все Overpass-серверы недоступны");
}

const round5 = (n) => Math.round(n * 1e5) / 1e5;

function haversineM(a, b) {
  const R = 6371000;
  const toRad = (d) => (d * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

function matchRule(tags) {
  return RULES.find((rule) =>
    rule.tags.some((conds) => Object.entries(conds).every(([k, v]) => tags[k] === v)),
  );
}

function toPlace(el) {
  const tags = el.tags ?? {};
  const lat = el.lat ?? el.center?.lat;
  const lng = el.lon ?? el.center?.lon;
  if (typeof lat !== "number" || typeof lng !== "number") return null;

  const rule = matchRule(tags);
  if (!rule) return null;

  let name = (tags.name ?? "").trim();
  if (!name && OPTIONAL_NAME.has(rule.cat)) {
    name = (tags.brand ?? tags.operator ?? "").trim();
  } else if (!name) {
    return null;
  }

  const place = { id: el.type[0] + el.id, cat: rule.cat, name };
  if (tags["name:en"]) place.name_en = tags["name:en"].trim();
  place.lat = round5(lat);
  place.lng = round5(lng);
  if (tags.opening_hours) place.hours = tags.opening_hours;
  const phone = tags.phone ?? tags["contact:phone"];
  if (phone) place.phone = phone;
  if (tags.website) place.web = tags.website;
  return place;
}

function dedupe(places) {
  const kept = [];
  for (const p of places) {
    const key = p.name.toLowerCase();
    const dup =
      key &&
      kept.some(
        (k) =>
          k.cat === p.cat &&
          k.name.toLowerCase() === key &&
          haversineM(k, p) < DEDUP_METERS,
      );
    if (!dup) kept.push(p);
  }
  return kept;
}

async function main() {
  const query = buildQuery();
  const { json, url } = await queryOverpass(query);
  console.log(`Ответ от ${url}: элементов ${json.elements.length}`);

  const places = json.elements.map(toPlace).filter(Boolean);
  const unique = dedupe(places);
  console.log(`С координатами и подходящими тегами: ${places.length}, после дедупа: ${unique.length}`);

  unique.sort((a, b) => {
    if (a.cat !== b.cat) return a.cat < b.cat ? -1 : 1;
    return a.name.localeCompare(b.name, "ru");
  });

  const text = JSON.stringify(unique).replace(/\},\{/g, "},\n{") + "\n";
  await mkdir(dirname(OUT), { recursive: true });
  await writeFile(OUT, text, "utf8");

  const counts = {};
  for (const p of unique) counts[p.cat] = (counts[p.cat] ?? 0) + 1;
  console.log("\nПо категориям:");
  for (const rule of RULES) {
    console.log(`  ${rule.cat.padEnd(10)} ${counts[rule.cat] ?? 0}`);
  }
  console.log(`\nФайл: ${OUT}`);
  console.log(`Размер: ${(Buffer.byteLength(text, "utf8") / 1024).toFixed(1)} КБ`);
  for (const cat of ["sight", "museum"]) {
    const names = unique.filter((p) => p.cat === cat).slice(0, 3).map((p) => p.name);
    console.log(`Примеры ${cat}: ${names.join(" | ")}`);
  }
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
