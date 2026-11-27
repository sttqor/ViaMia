// Карта на MapLibre + бесплатные векторные тайлы OpenFreeMap (без ключа и лимитов).
// Стиль перекрашивается в палитру приложения, в тёмной теме — свой.
// Важные места города (кафе, музеи, мечети…) — из OpenStreetMap,
// выгружены заранее в places-osm.json скриптом scripts/fetch-places.mjs.
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import * as maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
// воркер maplibre собираем сами: по умолчанию он ищется рядом с бандлом, а Vite его туда не кладёт
import workerUrl from "maplibre-gl/dist/maplibre-gl-worker.mjs?worker&url";
import { AnimatePresence, motion } from "motion/react";
import {
  Car,
  Clock,
  Footprints,
  Lightbulb,
  Globe,
  Map as MapIcon,
  Navigation,
  Phone,
  Route,
  Search,
  X,
} from "lucide-react";
import PLACES from "./places-osm.json";
import { C_CULTURE, C_TOUR, MAP_CATS, PALETTE, recolor } from "./mapStyle";
import { CITY } from "./data";
import { fallbackOf } from "./i18n";
import { distKm, fetchRoute, getPosition } from "./routing";
import { primeSpeech } from "./navigation";
import { Navigator } from "./Navigator";
import { Loader } from "./Status";
import { useSettings } from "./settings-context";
import { TIPS } from "./tips-data.js";

// у места на карте — один совет к случаю (мечеть, базар)
const PLACE_TIP = { mosque: "mosque-shoes", market: "bazaar-haggle" };
import { distanceM, twoGisPlace, walkMinutes } from "./twogis";
import { cachedFetch, registerOshProtocol, toOsh } from "./offlineMap";
import "./OshMap.css";

maplibregl.setWorkerUrl(workerUrl);
// тайлы, шрифты и значки — через кэш (карта Оша работает без интернета)
registerOshProtocol(maplibregl);

const SPRING = { type: "spring", bounce: 0, duration: 0.32 };
const SHEET = { initial: { opacity: 0, y: 24 }, animate: { opacity: 1, y: 0 }, exit: { opacity: 0, y: 24 }, transition: SPRING };

// ── категории и метки ────────────────────────────────────────────

const CAT = Object.fromEntries(MAP_CATS.map((c) => [c.id, c]));

// Векторная иконка lucide → строка SVG (без рендера React: берём её iconNode)
function iconMarkup(Icon) {
  const nodes = Icon.render({}, null)?.props?.iconNode ?? [];
  const esc = (v) => String(v).replace(/&/g, "&amp;").replace(/"/g, "&quot;");
  return nodes
    .map(([tag, attrs]) => {
      const a = Object.entries(attrs)
        .filter(([k]) => k !== "key")
        .map(([k, v]) => `${k}="${esc(v)}"`)
        .join(" ");
      return `<${tag} ${a}/>`;
    })
    .join("");
}

// Круглая метка: цветной круг, белая обводка, белая иконка. Рисуется в 2× для чёткости.
function pinSvg(cat, size) {
  const r = size / 2 - 1.5;
  const icon = size * 0.5;
  const off = (size - icon) / 2;
  return (
    `<svg xmlns="http://www.w3.org/2000/svg" width="${size * 2}" height="${size * 2}" viewBox="0 0 ${size} ${size}">` +
    `<circle cx="${size / 2}" cy="${size / 2}" r="${r}" fill="${cat.color}" stroke="#fff" stroke-width="2"/>` +
    `<g transform="translate(${off} ${off}) scale(${icon / 24})" fill="none" stroke="#fff" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">` +
    iconMarkup(cat.Icon) +
    "</g></svg>"
  );
}

const imageCache = new Map();
function loadPin(cat, size) {
  const key = `${cat.id}-${size}`;
  if (!imageCache.has(key)) {
    imageCache.set(
      key,
      new Promise((resolve, reject) => {
        const img = new Image(size * 2, size * 2);
        img.onload = () => resolve(img);
        img.onerror = reject;
        img.src = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(pinSvg(cat, size))}`;
      }),
    );
  }
  return imageCache.get(key);
}

// стрелка «я» для навигации: терракотовый наконечник в белом круге, смотрит вверх (на север)
const ARROW_SVG =
  '<svg xmlns="http://www.w3.org/2000/svg" width="96" height="96" viewBox="0 0 48 48">' +
  '<circle cx="24" cy="24" r="21" fill="#fff" stroke="#E8E0D4" stroke-width="1.5"/>' +
  '<path d="M24 9 L35 36 L24 30 L13 36 Z" fill="#D4532B" stroke="#B8431F" stroke-width="1.5" stroke-linejoin="round"/></svg>';
let arrowImg = null;
function loadArrow() {
  arrowImg ||= new Promise((resolve, reject) => {
    const img = new Image(96, 96);
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(ARROW_SVG)}`;
  });
  return arrowImg;
}

async function addPins(map) {
  await Promise.all([
    ...MAP_CATS.map(async (cat) => {
      const size = cat.id === "tours" ? 38 : 28;
      const img = await loadPin(cat, size);
      if (!map.hasImage(`pin-${cat.id}`)) map.addImage(`pin-${cat.id}`, img, { pixelRatio: 2 });
    }),
    loadArrow().then((img) => {
      if (!map.hasImage("nav-arrow")) map.addImage("nav-arrow", img, { pixelRatio: 2 });
    }),
  ]);
}

// ── стиль карты в цветах приложения ─────────────────────────────

const styleCache = new Map();

async function loadStyle(theme, lang) {
  const base = PALETTE[theme].base;
  if (!styleCache.has(base)) {
    styleCache.set(
      base,
      cachedFetch(`https://tiles.openfreemap.org/styles/${base}`).then((r) => r.json()),
    );
  }
  try {
    return recolor(await styleCache.get(base), theme, lang, toOsh);
  } catch (err) {
    styleCache.delete(base); // при следующей попытке — заново
    throw err;
  }
}

// шрифт подписей берём из самого стиля (его глифы точно есть на сервере)
function styleFont(map) {
  for (const l of map.getStyle().layers) {
    const f = l.layout?.["text-font"];
    if (Array.isArray(f) && typeof f[0] === "string") return f;
  }
  return ["Noto Sans Regular"];
}

// тема, которая реально стоит на <html> (data-theme ставит SettingsProvider)
function useResolvedTheme() {
  const read = () => (document.documentElement.dataset.theme === "dark" ? "dark" : "light");
  const [theme, setTheme] = useState(read);
  useEffect(() => {
    const obs = new MutationObserver(() => setTheme(read()));
    obs.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });
    return () => obs.disconnect();
  }, []);
  return theme;
}

// Создаёт карту и держит стиль в актуальной теме/языке. onStyle вызывается после
// каждой (пере)загрузки стиля — там добавляются свои источники и слои.
function useMapLibre(ref, options, onStyle) {
  const { lang } = useSettings();
  const theme = useResolvedTheme();
  const mapRef = useRef(null);
  const onStyleRef = useRef(onStyle);
  const [failed, setFailed] = useState(false);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    onStyleRef.current = onStyle;
  });

  useEffect(() => {
    let cancelled = false;
    loadStyle(theme, lang)
      .then((style) => {
        if (cancelled || !ref.current) return;
        let map = mapRef.current;
        if (!map) {
          map = new maplibregl.Map({ container: ref.current, style, attributionControl: false, ...options });
          map.addControl(new maplibregl.AttributionControl({ compact: true }), "bottom-left");
          mapRef.current = map;
        } else {
          map.setStyle(style, { diff: false });
        }
        map.once("style.load", async () => {
          if (cancelled) return;
          await addPins(map);
          if (cancelled) return;
          onStyleRef.current?.(map);
          setReady(true);
        });
        setFailed(false);
      })
      .catch(() => {
        if (!cancelled) setFailed(true);
      });
    return () => {
      cancelled = true;
    };
    // options — константа места вызова
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [theme, lang]);

  useEffect(
    () => () => {
      mapRef.current?.remove();
      mapRef.current = null;
    },
    [],
  );

  return { mapRef, failed, ready };
}

const fc = (features) => ({ type: "FeatureCollection", features });
const point = (lng, lat, properties) => ({ type: "Feature", geometry: { type: "Point", coordinates: [lng, lat] }, properties });

// ── маленькая карта в карточке тура/факта ───────────────────────

const MINI_OPTS = { interactive: false, zoom: 15 };

export function MiniMap({ lat, lng, label }) {
  const ref = useRef(null);
  const posRef = useRef({ lat, lng, label });
  useEffect(() => {
    posRef.current = { lat, lng, label };
  });

  const onStyle = useCallback((map) => {
    const { lat: la, lng: ln, label: lb } = posRef.current;
    map.jumpTo({ center: [ln, la], zoom: 15 });
    map.addSource("spot", { type: "geojson", data: fc([point(ln, la, { label: lb })]) });
    map.addLayer({
      id: "spot",
      type: "symbol",
      source: "spot",
      layout: {
        "icon-image": "pin-tours",
        "icon-allow-overlap": true,
        "text-field": ["get", "label"],
        "text-font": styleFont(map),
        "text-size": 12,
        "text-offset": [0, 1.6],
        "text-anchor": "top",
      },
      paint: { "text-color": "#1E2638", "text-halo-color": "#FFFFFF", "text-halo-width": 1.5 },
    });
  }, []);

  const { mapRef, ready } = useMapLibre(ref, { ...MINI_OPTS, center: [lng, lat] }, onStyle);

  // сменилось место — двигаем точку, карту не пересоздаём
  useEffect(() => {
    const map = mapRef.current;
    if (!ready || !map?.getSource("spot")) return;
    map.getSource("spot").setData(fc([point(lng, lat, { label })]));
    map.jumpTo({ center: [lng, lat] });
  }, [lat, lng, label, ready, mapRef]);

  return <div ref={ref} className="mini-map" />;
}

// ── выбор точки: кабинет агентства (точка встречи тура) ─────────
// Тап по карте или перетаскивание метки → onPick({ lat, lng })
const PICK_OPTS = { zoom: 14, maxZoom: 19, minZoom: 9 };

export function PickMap({ lat, lng, onPick }) {
  const ref = useRef(null);
  const posRef = useRef({ lat, lng });
  const onPickRef = useRef(onPick);
  useEffect(() => {
    posRef.current = { lat, lng };
    onPickRef.current = onPick;
  });

  const onStyle = useCallback((map) => {
    const { lat: la, lng: ln } = posRef.current;
    map.addSource("spot", { type: "geojson", data: fc([point(ln, la, {})]) });
    map.addLayer({
      id: "spot",
      type: "symbol",
      source: "spot",
      layout: { "icon-image": "pin-tours", "icon-allow-overlap": true },
    });
    if (map.__pickBound) return; // после смены темы обработчик уже висит
    map.__pickBound = true;
    map.on("click", (e) => {
      const next = { lat: +e.lngLat.lat.toFixed(6), lng: +e.lngLat.lng.toFixed(6) };
      onPickRef.current?.(next);
    });
  }, []);

  const { mapRef, ready } = useMapLibre(ref, { ...PICK_OPTS, center: [lng, lat] }, onStyle);

  useEffect(() => {
    const map = mapRef.current;
    if (!ready || !map?.getSource("spot")) return;
    map.getSource("spot").setData(fc([point(lng, lat, {})]));
    if (!map.getBounds().contains([lng, lat])) map.jumpTo({ center: [lng, lat] });
  }, [lat, lng, ready, mapRef]);

  return <div ref={ref} className="mini-map pick-map" />;
}

// ── большая карта: туры + важные места ──────────────────────────

const EXPLORE_OPTS = { center: [CITY.lng, CITY.lat], zoom: 14, maxZoom: 19, minZoom: 10 };

// линия маршрута и номера остановок для источников карты
function routeLine(r) {
  const coords = r?.data?.coords;
  if (!coords || coords.length < 2) return fc([]);
  return fc([{ type: "Feature", geometry: { type: "LineString", coordinates: coords }, properties: { approx: Boolean(r.data.approx) } }]);
}
function routeStops(r) {
  if (!r) return fc([]);
  return fc(r.stops.map((s, i) => point(s.lng, s.lat, { n: String(i + 1) })));
}
function fmtKm(m, locale, t) {
  const km = Math.max(0.1, m / 1000);
  return t("unit.km", { n: new Intl.NumberFormat(locale, { maximumFractionDigits: km < 10 ? 1 : 0 }).format(km) });
}

// дальше этого от центра — значит, человек не в Оше, и маршрут от него не нужен
const NEAR_OSH_KM = 40;
const CENTER = [CITY.lng, CITY.lat];

// nav — маршрут дня из вкладки «Маршрут»: { stops: [{ lng, lat, label }] }; onNavEnd — его закрыли
export function ExploreMap({ items, onOpen, nav, onNavEnd }) {
  const { t, loc, lang, locale, fmtDuration } = useSettings();
  const ref = useRef(null);
  const [query, setQuery] = useState("");
  const [cat, setCat] = useState("all");
  const [picked, setPicked] = useState(null);
  const [locating, setLocating] = useState(false);
  const [locateError, setLocateError] = useState(false);
  const [me, setMe] = useState(null); // [lng, lat] — для расстояний
  const [searchOpen, setSearchOpen] = useState(false);
  const userPos = useRef(null);
  const watchId = useRef(null);
  useEffect(() => () => watchId.current != null && navigator.geolocation?.clearWatch(watchId.current), []);
  // активный маршрут: { title, stops, start, startIsMe, note, mode, ready, data, loading }
  // ready — точка старта уже выбрана (ждём геолокацию), только тогда прокладываем
  const [route, setRoute] = useState(null);
  const routeRef = useRef(null);
  // пошаговое ведение: null | "live" | "demo"
  const [navMode, setNavMode] = useState(null);
  const navModeRef = useRef(null);
  useEffect(() => {
    routeRef.current = route;
    navModeRef.current = navMode;
  });
  const onOpenRef = useRef(onOpen);
  const itemsRef = useRef(items);
  useEffect(() => {
    onOpenRef.current = onOpen;
    itemsRef.current = items;
  });

  const placeName = useCallback(
    (p) => (fallbackOf(lang) === "ru" ? p.name : p.name_en || p.name) || t("map.poi.noName"),
    [lang, t],
  );

  // что видно с учётом чипа и поиска
  const { tourFeatures, placeFeatures, count } = useMemo(() => {
    const q = query.trim().toLowerCase();
    const showTours = cat === "all" || cat === "tours";
    const tours = showTours
      ? items.filter((raw) => {
          if (raw.lat == null || raw.lng == null) return false;
          if (!q) return true;
          const e = loc(raw);
          return `${e.title} ${e.place} ${e.type} ${raw.title} ${raw.place}`.toLowerCase().includes(q);
        })
      : [];
    const places =
      cat === "tours"
        ? []
        : PLACES.filter((p) => {
            if (cat !== "all" && p.cat !== cat) return false;
            if (!q) return true;
            return `${p.name} ${p.name_en || ""} ${t(`map.cat.${p.cat}`)}`.toLowerCase().includes(q);
          });
    return {
      tourFeatures: tours.map((raw) => point(raw.lng, raw.lat, { id: raw.id, label: loc(raw).title })),
      placeFeatures: places.map((p) =>
        point(p.lng, p.lat, { id: p.id, cat: p.cat, icon: `pin-${p.cat}`, prio: CAT[p.cat]?.prio ?? 9, label: placeName(p) }),
      ),
      count: tours.length + places.length,
    };
  }, [items, query, cat, loc, t, placeName]);

  const dataRef = useRef({ tourFeatures, placeFeatures });
  useEffect(() => {
    dataRef.current = { tourFeatures, placeFeatures };
  });

  const onStyle = useCallback((map) => {
    const font = styleFont(map);
    const dark = document.documentElement.dataset.theme === "dark";
    const text = dark ? "#EDE7DD" : "#1E2638";
    const halo = dark ? "#12161F" : "#FFFFFF";

    // линия маршрута — под метками
    const r = routeRef.current;
    map.addSource("route", { type: "geojson", data: routeLine(r) });
    map.addSource("route-stops", { type: "geojson", data: routeStops(r) });
    map.addLayer({
      id: "route-casing",
      type: "line",
      source: "route",
      layout: { "line-join": "round", "line-cap": "round" },
      paint: { "line-color": "#FFFFFF", "line-width": 9, "line-opacity": dark ? 0.25 : 0.9 },
    });
    map.addLayer({
      id: "route-line",
      type: "line",
      source: "route",
      layout: { "line-join": "round", "line-cap": "round" },
      paint: { "line-color": "#D4532B", "line-width": 5 },
    });
    // прямые линии (сервис маршрутов не ответил) — пунктиром
    map.addLayer({
      id: "route-approx",
      type: "line",
      source: "route",
      filter: ["==", ["get", "approx"], true],
      layout: { "line-join": "round" },
      paint: { "line-color": dark ? "#12161F" : "#FAF6F0", "line-width": 3, "line-dasharray": [1, 2] },
    });

    map.addSource("places", { type: "geojson", data: fc(dataRef.current.placeFeatures) });
    map.addSource("tours", { type: "geojson", data: fc(dataRef.current.tourFeatures) });
    map.addSource("me", { type: "geojson", data: fc(userPos.current ? [point(userPos.current[0], userPos.current[1], {})] : []) });

    map.addLayer({
      id: "places",
      type: "symbol",
      source: "places",
      layout: {
        "icon-image": ["get", "icon"],
        "icon-size": ["interpolate", ["linear"], ["zoom"], 12, 0.7, 16, 1],
        "symbol-sort-key": ["get", "prio"],
        "text-field": ["step", ["zoom"], "", 15, ["get", "label"]],
        "text-font": font,
        "text-size": 11,
        "text-offset": [0, 1.3],
        "text-anchor": "top",
        "text-optional": true,
        "text-max-width": 9,
      },
      paint: { "text-color": text, "text-halo-color": halo, "text-halo-width": 1.4 },
    });
    map.addLayer({
      id: "tours",
      type: "symbol",
      source: "tours",
      layout: {
        "icon-image": "pin-tours",
        "icon-allow-overlap": true,
        "text-field": ["step", ["zoom"], "", 13, ["get", "label"]],
        "text-font": font,
        "text-size": 12,
        "text-offset": [0, 1.6],
        "text-anchor": "top",
        "text-optional": true,
        "text-max-width": 10,
      },
      paint: { "text-color": text, "text-halo-color": halo, "text-halo-width": 1.6 },
    });
    // «я»: точка, а в навигации (есть heading) — стрелка по ходу движения
    map.addLayer({
      id: "me",
      type: "circle",
      source: "me",
      filter: ["!", ["has", "heading"]],
      paint: { "circle-radius": 8, "circle-color": "#1E2638", "circle-stroke-color": "#FFFFFF", "circle-stroke-width": 3 },
    });
    map.addLayer({
      id: "me-arrow",
      type: "symbol",
      source: "me",
      filter: ["has", "heading"],
      layout: {
        "icon-image": "nav-arrow",
        "icon-rotate": ["get", "heading"],
        "icon-rotation-alignment": "map",
        "icon-pitch-alignment": "map",
        "icon-allow-overlap": true,
        "icon-ignore-placement": true,
      },
    });
    // номера остановок маршрута — поверх всех меток
    map.addLayer({
      id: "route-stops",
      type: "circle",
      source: "route-stops",
      paint: { "circle-radius": 11, "circle-color": "#1E2638", "circle-stroke-color": "#FFFFFF", "circle-stroke-width": 2.5 },
    });
    map.addLayer({
      id: "route-stops-num",
      type: "symbol",
      source: "route-stops",
      layout: { "text-field": ["get", "n"], "text-font": font, "text-size": 12, "text-allow-overlap": true },
      paint: { "text-color": "#FFFFFF" },
    });

    // обработчики вешаем один раз на карту (слои с этими id появляются после каждой смены стиля)
    if (!map.__oshHandlers) {
      map.__oshHandlers = true;
      map.on("click", () => setSearchOpen(false));
      map.on("dragstart", () => setSearchOpen(false));
      map.on("click", "tours", (ev) => {
        const id = ev.features?.[0]?.properties?.id;
        const raw = itemsRef.current.find((x) => String(x.id) === String(id));
        if (raw) onOpenRef.current(raw);
      });
      map.on("click", "places", (ev) => {
        const id = ev.features?.[0]?.properties?.id;
        const p = PLACES.find((x) => x.id === id);
        if (!p) return;
        setPicked(p);
        map.easeTo({ center: [p.lng, p.lat], duration: 400 });
      });
      for (const layer of ["tours", "places"]) {
        map.on("mouseenter", layer, () => (map.getCanvas().style.cursor = "pointer"));
        map.on("mouseleave", layer, () => (map.getCanvas().style.cursor = ""));
      }
    }
  }, []);

  const { mapRef, failed, ready } = useMapLibre(ref, EXPLORE_OPTS, onStyle);

  // фильтр/поиск поменялись — обновляем данные слоёв, карту не трогаем
  useEffect(() => {
    const map = mapRef.current;
    if (!ready || !map) return;
    map.getSource("places")?.setData(fc(placeFeatures));
    map.getSource("tours")?.setData(fc(tourFeatures));
  }, [placeFeatures, tourFeatures, ready, mapRef]);

  // выбрали категорию — показываем все её места в кадре
  function pickCat(id) {
    setCat(id);
    setPicked(null);
    const map = mapRef.current;
    if (!map || id === "all") return;
    const pts =
      id === "tours" ? items.filter((x) => x.lat != null).map((x) => [x.lng, x.lat]) : PLACES.filter((p) => p.cat === id).map((p) => [p.lng, p.lat]);
    if (pts.length === 0) return;
    const b = pts.reduce((acc, c) => acc.extend(c), new maplibregl.LngLatBounds(pts[0], pts[0]));
    map.fitBounds(b, { padding: { top: 150, bottom: 140, left: 40, right: 40 }, maxZoom: 16, duration: 600 });
  }

  // ── маршрут внутри приложения ──
  // Старт: где человек сейчас (если он в Оше). Иначе для одной цели — центр города,
  // а маршрут дня — просто от первой остановки.
  const startRoute = useCallback(
    async (stops, title) => {
      setPicked(null);
      const mode = routeRef.current?.mode || "foot";
      setRoute({ title, stops, start: null, startIsMe: false, note: null, mode, ready: false, data: null, loading: true });
      const me = await getPosition();
      if (me) {
        userPos.current = me;
        mapRef.current?.getSource("me")?.setData(fc([point(me[0], me[1], {})]));
      }
      const near = Boolean(me) && distKm(me, CENTER) < NEAR_OSH_KM;
      let start = null;
      let note = null;
      if (near) start = me;
      else if (stops.length === 1) {
        start = CENTER;
        note = me ? "map.nav.fromCenter" : "map.nav.noGeo";
      }
      // пока ждали геолокацию, маршрут могли закрыть или начать другой
      setRoute((r) => (r && r.stops === stops ? { ...r, start, startIsMe: near, note, ready: true } : r));
    },
    [mapRef],
  );

  // старт выбран / сменились точки или способ — прокладываем заново
  const routeKey = route?.ready ? JSON.stringify([route.start, route.stops.map((s) => [s.lng, s.lat]), route.mode]) : "";
  useEffect(() => {
    const r = routeRef.current;
    if (!routeKey || !r) return undefined;
    const pts = [...(r.start ? [r.start] : []), ...r.stops.map((s) => [s.lng, s.lat])];
    const ctrl = new AbortController();
    fetchRoute(pts, r.mode, ctrl.signal)
      .then((data) => setRoute((x) => (x ? { ...x, data, loading: false } : x)))
      .catch(() => {});
    return () => ctrl.abort();
  }, [routeKey]);

  // нарисовать маршрут и показать его целиком
  const routeData = route?.data;
  const routeOn = Boolean(route);
  useEffect(() => {
    const map = mapRef.current;
    if (!ready || !map) return;
    const r = routeRef.current;
    map.getSource("route")?.setData(routeLine(r));
    map.getSource("route-stops")?.setData(routeStops(r));
    const coords = routeData?.coords;
    // в навигации камерой управляет Navigator — весь маршрут в кадр не показываем
    if (coords?.length > 1 && !navModeRef.current) {
      const b = coords.reduce((acc, c) => acc.extend(c), new maplibregl.LngLatBounds(coords[0], coords[0]));
      map.fitBounds(b, { padding: { top: 170, bottom: 270, left: 56, right: 56 }, maxZoom: 17, duration: 700 });
    }
  }, [routeData, routeOn, ready, mapRef]);

  // маршрут дня пришёл из вкладки «Маршрут»
  useEffect(() => {
    if (!nav?.stops?.length) return undefined;
    // старт — не прямо в эффекте, а следующим тиком (без лишнего каскада рендеров)
    const id = setTimeout(() => startRoute(nav.stops, t("map.nav.dayTitle")), 0);
    return () => clearTimeout(id);
    // заголовок берём на момент открытия, язык здесь не меняется
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [nav, startRoute]);

  function setMode(mode) {
    setRoute((r) => (r && r.mode !== mode ? { ...r, mode, loading: true } : r));
  }

  function endRoute() {
    setNavMode(null);
    setRoute(null);
    onNavEnd?.();
  }

  // ── пошаговая навигация ──
  // "live" — по GPS (человек в Оше), "demo" — стрелка сама едет по маршруту
  function startNav(kind) {
    primeSpeech();
    setNavMode(kind);
  }

  // сошли с пути — Navigator проложил новый маршрут от текущей точки до оставшихся остановок
  function onReroute(data, from, restStops) {
    setRoute((r) => (r ? { ...r, start: from, startIsMe: true, stops: restStops, data, loading: false } : r));
  }

  function stopNav() {
    setNavMode(null);
    // обратно к обзору маршрута целиком
    const coords = routeRef.current?.data?.coords;
    const map = mapRef.current;
    if (map && coords?.length > 1) {
      const b = coords.reduce((acc, c) => acc.extend(c), new maplibregl.LngLatBounds(coords[0], coords[0]));
      setTimeout(() => map.fitBounds(b, { padding: { top: 170, bottom: 270, left: 56, right: 56 }, maxZoom: 17, duration: 700 }), 650);
    }
  }

  function locateMe() {
    if (!navigator.geolocation) {
      setLocateError(true);
      return;
    }
    setLocating(true);
    setLocateError(false);
    // уже следим — просто возвращаем карту к точке
    if (watchId.current != null && userPos.current) {
      setLocating(false);
      mapRef.current?.flyTo({ center: userPos.current, zoom: 16 });
      return;
    }
    let first = true;
    watchId.current = navigator.geolocation.watchPosition(
      (pos) => {
        const { latitude, longitude } = pos.coords;
        userPos.current = [longitude, latitude];
        setMe([longitude, latitude]);
        const map = mapRef.current;
        map?.getSource("me")?.setData(fc([point(longitude, latitude, {})]));
        if (first) {
          first = false;
          setLocating(false);
          map?.flyTo({ center: [longitude, latitude], zoom: 16 });
        }
      },
      () => {
        if (watchId.current != null) navigator.geolocation.clearWatch(watchId.current);
        watchId.current = null;
        setLocating(false);
        setLocateError(true);
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 5000 },
    );
  }

  function distLabel(lat, lng) {
    if (!me) return null;
    const m = distanceM(me, [lng, lat]);
    const d = m < 1000 ? t("map.m", { n: Math.round(m / 10) * 10 }) : t("map.km", { n: (m / 1000).toFixed(1) });
    return m > 15000 ? d : `${d} · ${t("map.walk", { n: walkMinutes(m) })}`;
  }

  function openPlace(p) {
    setPicked(p);
    setSearchOpen(false);
    setQuery("");
    mapRef.current?.flyTo({ center: [p.lng, p.lat], zoom: Math.max(mapRef.current.getZoom(), 16), duration: 600 });
  }

  function openTour(raw) {
    setSearchOpen(false);
    setQuery("");
    mapRef.current?.flyTo({ center: [raw.lng, raw.lat], zoom: Math.max(mapRef.current.getZoom(), 15), duration: 600 });
    onOpenRef.current(raw);
  }

  // список под поиском: сначала туры (их ищут чаще всего), потом места — ближайшие сверху.
  // Пустой запрос — подсказки «что посмотреть»: туры в черте Оша.
  const q = query.trim().toLowerCase();
  const { tourHits, placeHits } = useMemo(() => {
    const showTours = cat === "all" || cat === "tours";
    const inOsh = (raw) => raw.lat != null && raw.lng != null && distanceM(CENTER, [raw.lng, raw.lat]) < 15000;
    if (!q) return { tourHits: showTours ? items.filter(inOsh).slice(0, 5) : [], placeHits: [] };
    const tourHits = showTours
      ? items
          .filter((raw) => {
            if (!inOsh(raw)) return false;
            const e = loc(raw);
            return `${e.title} ${e.place} ${raw.title} ${raw.place} ${raw.en?.title || ""}`.toLowerCase().includes(q);
          })
          .slice(0, 3)
      : [];
    const list =
      cat === "tours"
        ? []
        : PLACES.filter(
            (p) => (cat === "all" || p.cat === cat) && `${p.name} ${p.name_en || ""} ${t(`map.cat.${p.cat}`)}`.toLowerCase().includes(q),
          );
    if (me) list.sort((a, b) => distanceM(me, [a.lng, a.lat]) - distanceM(me, [b.lng, b.lat]));
    return { tourHits, placeHits: list.slice(0, 8) };
  }, [q, cat, me, t, items, loc]);
  const tourCat = CAT.tours;

  const pickedCat = picked ? CAT[picked.cat] : null;

  if (navMode && route?.data) {
    return (
      <div className="map-wrap">
        <div ref={ref} className="map-canvas" />
        <Navigator mapRef={mapRef} route={route} demo={navMode === "demo"} onReroute={onReroute} onExit={stopNav} />
      </div>
    );
  }

  return (
    <div className="map-wrap">
      <div ref={ref} className="map-canvas" />

      <div className="map-search-bar">
        <div className="search map-search-input">
          <Search size={18} color="var(--muted-2)" />
          <input
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setSearchOpen(true);
            }}
            onFocus={() => setSearchOpen(true)}
            onKeyDown={(e) => {
              if (e.key !== "Enter" || !q) return;
              if (tourHits[0]) openTour(tourHits[0]);
              else if (placeHits[0]) openPlace(placeHits[0]);
            }}
            placeholder={t("map.search")}
            enterKeyHint="search"
          />
          {query && (
            <button type="button" className="map-search-clear" onClick={() => setQuery("")} aria-label={t("map.poi.close")}>
              <X size={16} />
            </button>
          )}
        </div>
        {searchOpen && (q || tourHits.length > 0) && (
          <ul className="map-results card">
            {!q && <li className="map-results-label">{t("map.ideas")}</li>}
            {tourHits.map((raw) => {
              const e = loc(raw);
              return (
                <li key={raw.id}>
                  <button type="button" onClick={() => openTour(raw)}>
                    <span className="map-sheet-icon is-sm" style={{ background: tourCat.color }}>
                      <tourCat.Icon size={14} color="#fff" />
                    </span>
                    <span className="map-result-text">
                      <b>{e.title}</b>
                      <small>
                        {e.type || e.place}
                        {me && ` · ${distLabel(raw.lat, raw.lng)}`}
                      </small>
                    </span>
                  </button>
                </li>
              );
            })}
            {q && tourHits.length === 0 && placeHits.length === 0 && <li className="map-results-empty">{t("common.nothing")}</li>}
            {placeHits.map((p) => {
              const c = CAT[p.cat];
              return (
                <li key={p.id}>
                  <button type="button" onClick={() => openPlace(p)}>
                    <span className="map-sheet-icon is-sm" style={{ background: c.color }}>
                      <c.Icon size={14} color="#fff" />
                    </span>
                    <span className="map-result-text">
                      <b>{placeName(p)}</b>
                      <small>
                        {t(`map.cat.${p.cat}`)}
                        {me && ` · ${distLabel(p.lat, p.lng)}`}
                      </small>
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        )}
        <div className="map-chips" role="tablist">
          {[{ id: "all" }, ...MAP_CATS].map((c) => (
            <button
              key={c.id}
              type="button"
              role="tab"
              aria-selected={cat === c.id}
              className={`map-chip ${cat === c.id ? "is-on" : ""}`}
              onClick={() => pickCat(c.id)}
            >
              {/* тёмно-синий значок культуры на тёмном фоне не виден — тогда цвет текста */}
              {c.Icon && <c.Icon size={14} color={cat === c.id || c.color === C_CULTURE ? "currentColor" : c.color} />}
              {t(`map.cat.${c.id}`)}
            </button>
          ))}
        </div>
      </div>

      <button className="icon-btn map-locate-btn" onClick={locateMe} aria-label={t("map.locate")} disabled={locating}>
        <Navigation size={18} color={locating ? "var(--muted-2)" : "var(--terracotta)"} />
      </button>

      <AnimatePresence>
        {route && (
          <motion.div key="route" className="map-sheet map-route" {...SHEET}>
            <div className="map-sheet-head">
              <span className="map-sheet-icon" style={{ background: C_TOUR }}>
                <Route size={18} color="#fff" />
              </span>
              <span className="map-sheet-title">
                <b>{route.title}</b>
                <small>
                  {route.loading || !route.data
                    ? t("map.nav.loading")
                    : `${fmtKm(route.data.distance, locale, t)} ·${fmtDuration(Math.max(1, Math.round(route.data.duration / 60)))}`}
                  {route.stops.length > 1 && ` · ${t("map.nav.stops", { n: route.stops.length })}`}
                </small>
              </span>
              <button type="button" className="map-sheet-close" onClick={endRoute} aria-label={t("map.nav.end")}>
                <X size={18} />
              </button>
            </div>
            <div className="map-route-modes" role="tablist">
              {[
                { id: "foot", Icon: Footprints, label: t("map.nav.walk") },
                { id: "car", Icon: Car, label: t("map.nav.car") },
              ].map((m) => (
                <button
                  key={m.id}
                  type="button"
                  role="tab"
                  aria-selected={route.mode === m.id}
                  className={`map-chip ${route.mode === m.id ? "is-on" : ""}`}
                  onClick={() => setMode(m.id)}
                >
                  <m.Icon size={14} /> {m.label}
                </button>
              ))}
            </div>
            <ol className="map-route-stops">
              {route.start && <li className="is-start">{route.startIsMe ? t("map.nav.fromMe") : t("home.city")}</li>}
              {route.stops.map((s, i) => (
                <li key={`${s.lng},${s.lat},${i}`}>
                  <b>{i + 1}</b>
                  <span>{s.label}</span>
                </li>
              ))}
            </ol>
            {(route.note || route.data?.approx) && (
              <div className="map-sheet-row">{t(route.data?.approx ? "map.nav.failed" : route.note)}</div>
            )}
            {route.data && !route.loading && !route.startIsMe && !route.note && (
              <div className="map-sheet-row">{t("nav.demoHint")}</div>
            )}
            {route.data && !route.loading && (
              <div className="map-route-go">
                {route.startIsMe ? (
                  <button type="button" className="map-sheet-btn is-main" onClick={() => startNav("live")}>
                    <Navigation size={18} /> {t("nav.start")}
                  </button>
                ) : (
                  <button type="button" className="map-sheet-btn is-main" onClick={() => startNav("demo")} title={t("nav.demoHint")}>
                    <Navigation size={18} /> {t("nav.demo")}
                  </button>
                )}
              </div>
            )}
          </motion.div>
        )}
        {picked && pickedCat && !route && (
          <motion.div key={picked.id} className="map-sheet" {...SHEET}>
            <div className="map-sheet-head">
              <span className="map-sheet-icon" style={{ background: pickedCat.color }}>
                <pickedCat.Icon size={18} color="#fff" />
              </span>
              <span className="map-sheet-title">
                <b>{placeName(picked)}</b>
                <small>
                  {t(`map.cat.${picked.cat}`)}
                  {me && ` · ${distLabel(picked.lat, picked.lng)}`}
                </small>
              </span>
              <button type="button" className="map-sheet-close" onClick={() => setPicked(null)} aria-label={t("map.poi.close")}>
                <X size={18} />
              </button>
            </div>
            {PLACE_TIP[picked.cat] && (
              <div className="map-sheet-row map-sheet-tip">
                <Lightbulb size={14} /> <span>{loc(TIPS.find((x) => x.id === PLACE_TIP[picked.cat])).title}</span>
              </div>
            )}
            {picked.hours && (
              <div className="map-sheet-row">
                <Clock size={14} /> <span>{picked.hours}</span>
              </div>
            )}
            <div className="map-sheet-actions">
              <button
                type="button"
                className="map-sheet-btn is-main"
                onClick={() => startRoute([{ lng: picked.lng, lat: picked.lat, label: placeName(picked) }], t("map.nav.title"))}
              >
                <Route size={16} /> {t("map.poi.route")}
              </button>
              <a className="map-sheet-btn" href={twoGisPlace(picked.lat, picked.lng)} target="_blank" rel="noreferrer">
                <MapIcon size={16} /> {t("map.poi.open2gis")}
              </a>
              {picked.phone && (
                <a className="map-sheet-btn" href={`tel:${picked.phone.split(/[;,]/)[0].replace(/\s/g, "")}`} aria-label={t("map.poi.call")}>
                  <Phone size={16} />
                </a>
              )}
              {picked.web && /^https?:\/\//.test(picked.web) && (
                <a className="map-sheet-btn" href={picked.web} target="_blank" rel="noreferrer" aria-label={t("map.poi.site")}>
                  <Globe size={16} />
                </a>
              )}
            </div>
          </motion.div>
        )}
        {locateError && (
          <motion.div key="locate" className="map-locate-toast" {...SHEET}>
            {t("map.locateError")}
          </motion.div>
        )}
        {!failed && count === 0 && !(searchOpen && q) && (
          <motion.div key="nothing" className="map-locate-toast is-top" {...SHEET}>
            {t("common.nothing")}
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {!ready && !failed && (
          <motion.div key="loading" className="map-loading" initial={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.35 }}>
            <Loader />
          </motion.div>
        )}
      </AnimatePresence>

      {failed && (
        <motion.div className="map-failed" initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }} transition={SPRING}>
          <MapIcon size={32} color="var(--indigo)" />
          <b>{t("map.failedTitle")}</b>
          <span className="muted">{t("map.failedText")}</span>
          <a className="cta ghost cta-sm" href={twoGisPlace(CITY.lat, CITY.lng)} target="_blank" rel="noreferrer">
            <MapIcon size={16} /> {t("map.poi.open2gis")}
          </a>
        </motion.div>
      )}
    </div>
  );
}
