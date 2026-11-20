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
  Banknote,
  BedDouble,
  Camera,
  Clock,
  Coffee,
  Compass,
  Cross,
  Globe,
  Landmark,
  Map as MapIcon,
  MoonStar,
  Navigation,
  Phone,
  Pill,
  Route,
  Search,
  ShoppingBasket,
  Trees,
  UtensilsCrossed,
  X,
} from "lucide-react";
import PLACES from "./places-osm.json";
import { CITY } from "./data";
import { fallbackOf } from "./i18n";
import { useSettings } from "./settings-context";
import "./OshMap.css";

maplibregl.setWorkerUrl(workerUrl);

const SPRING = { type: "spring", stiffness: 400, damping: 32 };
const SHEET = { initial: { opacity: 0, y: 24 }, animate: { opacity: 1, y: 0 }, exit: { opacity: 0, y: 24 }, transition: SPRING };

// ── категории и метки ────────────────────────────────────────────

// Цвет метки — по группе: туры (акцент), культура, еда, природа, сервисы.
const C_TOUR = "#D4532B";
const C_CULTURE = "#1E2638";
const C_FOOD = "#C98A1E";
const C_NATURE = "#4F7A55";
const C_SERVICE = "#6B6459";
const C_MED = "#C8102E";

// prio — кто важнее при наложении меток (меньше — важнее)
const MAP_CATS = [
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

async function addPins(map) {
  await Promise.all(
    MAP_CATS.map(async (cat) => {
      const size = cat.id === "tours" ? 38 : 28;
      const img = await loadPin(cat, size);
      if (!map.hasImage(`pin-${cat.id}`)) map.addImage(`pin-${cat.id}`, img, { pixelRatio: 2 });
    }),
  );
}

// ── стиль карты в цветах приложения ─────────────────────────────

const PALETTE = {
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

const styleCache = new Map();

function recolor(style, theme, lang) {
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
  return { ...style, layers };
}

async function loadStyle(theme, lang) {
  const base = PALETTE[theme].base;
  if (!styleCache.has(base)) {
    styleCache.set(
      base,
      fetch(`https://tiles.openfreemap.org/styles/${base}`).then((r) => {
        if (!r.ok) throw new Error(String(r.status));
        return r.json();
      }),
    );
  }
  try {
    return recolor(await styleCache.get(base), theme, lang);
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

export function ExploreMap({ items, onOpen }) {
  const { t, loc, lang } = useSettings();
  const ref = useRef(null);
  const [query, setQuery] = useState("");
  const [cat, setCat] = useState("all");
  const [picked, setPicked] = useState(null);
  const [locating, setLocating] = useState(false);
  const [locateError, setLocateError] = useState(false);
  const userPos = useRef(null);
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
    map.addLayer({
      id: "me",
      type: "circle",
      source: "me",
      paint: { "circle-radius": 8, "circle-color": "#1E2638", "circle-stroke-color": "#FFFFFF", "circle-stroke-width": 3 },
    });

    // обработчики вешаем один раз на карту (слои с этими id появляются после каждой смены стиля)
    if (!map.__oshHandlers) {
      map.__oshHandlers = true;
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

  function locateMe() {
    if (!navigator.geolocation) {
      setLocateError(true);
      return;
    }
    setLocating(true);
    setLocateError(false);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLocating(false);
        const { latitude, longitude } = pos.coords;
        userPos.current = [longitude, latitude];
        const map = mapRef.current;
        if (!map) return;
        map.getSource("me")?.setData(fc([point(longitude, latitude, {})]));
        map.flyTo({ center: [longitude, latitude], zoom: 16 });
      },
      () => {
        setLocating(false);
        setLocateError(true);
      },
      { enableHighAccuracy: true, timeout: 10000 },
    );
  }

  const pickedCat = picked ? CAT[picked.cat] : null;

  return (
    <div className="map-wrap">
      <div ref={ref} className="map-canvas" />

      <div className="map-search-bar">
        <div className="search map-search-input">
          <Search size={18} color="var(--muted-2)" />
          <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder={t("map.search")} />
        </div>
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
        {picked && pickedCat && (
          <motion.div key={picked.id} className="map-sheet" {...SHEET}>
            <div className="map-sheet-head">
              <span className="map-sheet-icon" style={{ background: pickedCat.color }}>
                <pickedCat.Icon size={18} color="#fff" />
              </span>
              <span className="map-sheet-title">
                <b>{placeName(picked)}</b>
                <small>{t(`map.cat.${picked.cat}`)}</small>
              </span>
              <button type="button" className="map-sheet-close" onClick={() => setPicked(null)} aria-label={t("map.poi.close")}>
                <X size={18} />
              </button>
            </div>
            {picked.hours && (
              <div className="map-sheet-row">
                <Clock size={14} /> <span>{picked.hours}</span>
              </div>
            )}
            <div className="map-sheet-actions">
              <a
                className="map-sheet-btn is-main"
                href={`https://www.google.com/maps/dir/?api=1&destination=${picked.lat},${picked.lng}`}
                target="_blank"
                rel="noreferrer"
              >
                <Route size={16} /> {t("map.poi.route")}
              </a>
              <a className="map-sheet-btn" href={`https://2gis.kg/osh/geo/${picked.lng}%2C${picked.lat}`} target="_blank" rel="noreferrer">
                <MapIcon size={16} /> 2GIS
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
        {!failed && count === 0 && (
          <motion.div key="nothing" className="map-locate-toast is-top" {...SHEET}>
            {t("common.nothing")}
          </motion.div>
        )}
      </AnimatePresence>

      {failed && (
        <motion.div className="map-failed" initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }} transition={SPRING}>
          <MapIcon size={32} color="var(--indigo)" />
          <b>{t("map.failedTitle")}</b>
          <span className="muted">{t("map.failedText")}</span>
        </motion.div>
      )}
    </div>
  );
}
