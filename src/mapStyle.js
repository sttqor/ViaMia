// Оформление карты — общее для сайта (src/OshMap.jsx) и телефона (mobile/):
// категории меток и стиль OpenFreeMap, перекрашенный в палитру приложения.
import { Banknote, BedDouble, Camera, Coffee, Compass, Cross, Landmark, MoonStar, Pill, ShoppingBasket, Trees, UtensilsCrossed } from "lucide-react";
import { fallbackOf } from "./i18n";

// Цвет метки — по группе: туры (акцент), культура, еда, природа, сервисы.
export const C_TOUR = "#D4532B";
export const C_CULTURE = "#1E2638";
const C_FOOD = "#C98A1E";
const C_NATURE = "#4F7A55";
const C_SERVICE = "#6B6459";
const C_MED = "#C8102E";

// prio — кто важнее при наложении меток (меньше — важнее)
export const MAP_CATS = [
  { id: "tours", Icon: Compass, color: C_TOUR, prio: 0 },
  { id: "sight", Icon: Camera, color: C_CULTURE, prio: 1 },
  { id: "museum", Icon: Landmark, color: C_CULTURE, prio: 1 },
  { id: "mosque", Icon: MoonStar, color: C_CULTURE, prio: 2 },
  { id: "market", Icon: ShoppingBasket, color: C_FOOD, prio: 2 },
  { id: "cafe", Icon: Coffee, color: C_FOOD, prio: 3 },
  { id: "food", Icon: UtensilsCrossed, color: C_FOOD, prio: 3 },
  { id: "park", Icon: Trees, color: C_NATURE, prio: 3 },
  { id: "hotel", Icon: BedDouble, color: C_SERVICE, prio: 4 },
  { id: "atm", Icon: Banknote, color: C_SERVICE, prio: 5 },
  { id: "pharmacy", Icon: Pill, color: C_MED, prio: 5 },
  { id: "hospital", Icon: Cross, color: C_MED, prio: 5 },
];

// ── стиль карты в цветах приложения ─────────────────────────────

export const PALETTE = {
  light: {
    base: "positron",
    bg: "#FAF6F0",
    water: "#D3DDE0",
    park: "#E3E8D2",
    residential: "#F4EDE3",
    building: "#ECE2D3",
    road: "#FFFFFF",
    casing: "#E8E0D4",
    rail: "#D8CFC2",
    text: "#6B6459",
    strong: "#1E2638",
    halo: "#FAF6F0",
  },
  dark: {
    base: "dark",
    bg: "#12161F",
    water: "#1A2433",
    park: "#17201B",
    residential: "#161B25",
    building: "#1F2633",
    road: "#2D3546",
    casing: "#232A38",
    rail: "#2D3546",
    text: "#A59D90",
    strong: "#EDE7DD",
    halo: "#12161F",
  },
};

// wrapUrl — как переписать адреса тайлов/шрифтов (веб: osh:// для офлайн-кэша, телефон — как есть)
export function recolor(style, theme, lang, wrapUrl = (u) => u) {
  const p = PALETTE[theme];
  const nameKey = lang === "ru" || fallbackOf(lang) === "ru" ? "name:ru" : `name:${lang}`;
  // щиты трасс (US/EU) в Оше не нужны и сыплют предупреждениями
  const layers = style.layers.filter((l) => !/shield/.test(l.id)).map((src) => {
    const l = { ...src, paint: { ...(src.paint || {}) }, layout: { ...(src.layout || {}) } };
    const id = l.id;
    if (l.type === "background") l.paint["background-color"] = p.bg;
    else if (l.type === "fill") {
      if (/water/.test(id)) l.paint["fill-color"] = p.water;
      else if (/park|wood|grass/.test(id)) {
        l.paint["fill-color"] = p.park;
        delete l.paint["fill-pattern"]; // узор леса из спрайта не нужен (и в dark его нет)
      }
      else if (/residential/.test(id)) l.paint["fill-color"] = p.residential;
      else if (/building/.test(id)) {
        l.paint["fill-color"] = p.building;
        l.paint["fill-outline-color"] = p.casing;
      }
    } else if (l.type === "line") {
      if (/waterway/.test(id)) l.paint["line-color"] = p.water;
      else if (/rail/.test(id)) l.paint["line-color"] = p.rail;
      else if (/casing/.test(id)) l.paint["line-color"] = p.casing;
      else if (/highway|road|path|pier/.test(id)) l.paint["line-color"] = p.road;
      else if (/boundary/.test(id)) l.paint["line-color"] = p.rail;
    } else if (l.type === "symbol" && l.layout["text-field"]) {
      const isPlace = /label_city|label_town|place_city|place_town/.test(id);
      l.paint["text-color"] = isPlace ? p.strong : p.text;
      l.paint["text-halo-color"] = p.halo;
      l.paint["text-halo-width"] = 1.4;
      // подписи улиц и районов — на языке интерфейса, если в OSM есть перевод
      if (JSON.stringify(l.layout["text-field"]).includes("name")) {
        l.layout["text-field"] = ["coalesce", ["get", nameKey], ["get", "name"]];
      }
    }
    return l;
  });
  const sources = Object.fromEntries(
    Object.entries(style.sources).map(([k, v]) => {
      const s = { ...v };
      if (s.url) s.url = wrapUrl(s.url);
      if (s.tiles) s.tiles = s.tiles.map(wrapUrl);
      return [k, s];
    }),
  );
  const sprite = Array.isArray(style.sprite) ? style.sprite.map((x) => ({ ...x, url: wrapUrl(x.url) })) : wrapUrl(style.sprite);
  return { ...style, layers, sources, sprite, glyphs: wrapUrl(style.glyphs) };
}

