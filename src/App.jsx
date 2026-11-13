import { useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  Bell,
  Calendar,
  Check,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  Clock,
  Compass,
  DollarSign,
  Globe,
  Heart,
  HelpCircle,
  Map as MapIcon,
  MapPin,
  Navigation,
  Route as RouteIcon,
  Search,
  Sparkles,
  Star,
  Ticket,
  Trash2,
  User,
  Users,
} from "lucide-react";
import { CATEGORIES, CITY, EXPERIENCES, loadLeaflet, makeCode, upcomingDates } from "./data";
import { useContent } from "./content-context";
import { cancelBookingRequest, submitBookingRequest } from "./api";
import { CURRENCIES, LANGUAGES, currencySymbol, displayName, durationMinutes, weekdayShort } from "./i18n";
import { useSettings } from "./settings-context";
import { FactsSection } from "./Facts";
import { TabBar } from "./TabBar";
import { Segmented } from "./Segmented";
import { useMinimizeOnScroll } from "./useMinimizeOnScroll";
import { Onboarding } from "./Onboarding";
import splashVideo from "./splash.mp4";

// Заставка при запуске: ролик с иконкой-дорогой. Пропускается тапом,
// при prefers-reduced-motion не показывается вовсе.
function Splash({ onDone }) {
  const [hide, setHide] = useState(false);
  const doneRef = useRef(false);
  const finish = () => {
    if (doneRef.current) return;
    doneRef.current = true;
    setHide(true);
    setTimeout(onDone, 320);
  };
  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      doneRef.current = true;
      onDone();
      return;
    }
    const safety = setTimeout(finish, 7000); // если видео не загрузилось
    return () => clearTimeout(safety);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return (
    <div className={`splash ${hide ? "splash-hide" : ""}`} onClick={finish}>
      <video src={splashVideo} autoPlay muted playsInline onEnded={finish} onError={finish} />
    </div>
  );
}

const TABS = [
  { id: "home", key: "nav.home", Icon: Compass },
  { id: "map", key: "nav.map", Icon: MapIcon },
  { id: "route", key: "nav.route", Icon: RouteIcon, accent: true },
  { id: "tours", key: "nav.tours", Icon: Sparkles },
  { id: "profile", key: "nav.profile", Icon: User },
];

// Движение: пружина для перемещений, easeOut для появления. Только transform и opacity.
const SPRING = { type: "spring", stiffness: 400, damping: 32 };
const EASE_OUT = [0.22, 1, 0.36, 1];
// Появление карточки при прокрутке: один раз, лёгкий подъём; задержка по кругу из 6,
// чтобы длинный список не «ехал» секундами
const inView = (index) => ({
  initial: { opacity: 0, y: 12 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, amount: 0.2 },
  transition: { duration: 0.3, delay: (index % 6) * 0.05, ease: EASE_OUT },
});

// Переключатель режима «сам | с гидом» — один и тот же на главной, в маршруте и в профиле
function ModeSwitch() {
  const { t, travelMode, setTravelMode } = useSettings();
  return (
    <Segmented
      label={t("mode.label")}
      value={travelMode}
      onChange={setTravelMode}
      options={[
        { value: "self", label: t("mode.self") },
        { value: "guided", label: t("mode.guided") },
      ]}
    />
  );
}

// Чипы категорий: тёмная подложка переезжает к выбранному чипу
function ChipRow({ items, value, onChange, layoutId }) {
  const { loc } = useSettings();
  return (
    <div className="h-scroll">
      {items.map((c) => {
        const on = value === c.id;
        return (
          <button key={c.id} type="button" className={`pill chip ${on ? "is-on" : ""}`} aria-pressed={on} onClick={() => onChange(c.id)}>
            {on && <motion.span layoutId={layoutId} className="chip-thumb" transition={SPRING} />}
            <span className="chip-label"><c.Icon size={14} /> {loc(c).label}</span>
          </button>
        );
      })}
    </div>
  );
}

function StarRow({ rating }) {
  if (rating == null) return null; // своих отзывов пока нет
  return (
    <span className="row" style={{ gap: 4 }}>
      <Star size={14} fill="var(--gold)" color="var(--gold)" />
      <b style={{ fontSize: 13 }}>{rating.toFixed(1)}</b>
    </span>
  );
}

// «от $17» или «цена по запросу»
function priceText(exp, t, money) {
  return exp.price == null ? t("price.request") : t("price.from", { price: money(exp.price) });
}

function ExperienceCard({ exp: raw, saved, inRoute, onOpen, onToggleSave, onToggleRoute }) {
  const { t, loc, money, fmtDuration } = useSettings();
  const exp = loc(raw);
  return (
    <article className="card exp-card">
      <div style={{ position: "relative" }}>
        <img className="cover" src={exp.image} alt="" loading="lazy" onClick={() => onOpen(raw)} />
        {exp.badge && <div className="badge">{exp.badge}</div>}
        <button
          className="save-btn"
          aria-label={saved ? t("common.unsave") : t("common.save")}
          onClick={() => onToggleSave(exp.id)}
        >
          <Heart size={18} fill={saved ? "var(--terracotta)" : "none"} color={saved ? "var(--terracotta)" : "var(--ink)"} />
        </button>
      </div>
      <div style={{ padding: 14 }}>
        <div className="muted" style={{ fontSize: 11, fontWeight: 700, marginBottom: 4 }}>
          {exp.type} · {fmtDuration(durationMinutes(exp.duration))}
        </div>
        <button className="exp-title" onClick={() => onOpen(raw)}>
          {exp.title}
        </button>
        <div className="row" style={{ justifyContent: "space-between", marginBottom: 12 }}>
          {exp.agencyName ? (
            <span className="mode-label guided">{t("label.guided", { agency: exp.agencyName })}</span>
          ) : (
            <StarRow rating={exp.rating} />
          )}
          <div className="price">{priceText(exp, t, money)}</div>
        </div>
        <div className="row" style={{ gap: 8 }}>
          <button
            className={`pill ${inRoute ? "on" : ""}`}
            style={{ flex: 1, padding: "10px 0", textAlign: "center", fontSize: 12 }}
            onClick={() => onToggleRoute(raw)}
          >
            {inRoute ? t("card.inRoute") : t("card.addRoute")}
          </button>
          <button className="cta" style={{ flex: 1.2, padding: "10px 0", fontSize: 12 }} onClick={() => onOpen(raw)}>
            {t("common.details")}
          </button>
        </div>
      </div>
    </article>
  );
}

// Текст подсказки как текст, а не html (защита от xss, если данные придут из api)
function tipText(text) {
  const el = document.createElement("span");
  el.textContent = text;
  return el;
}

function MiniMap({ lat, lng, label }) {
  const ref = useRef(null);
  const mapRef = useRef(null);

  useEffect(() => {
    let cancelled = false;
    let timer;
    loadLeaflet().then((L) => {
      if (cancelled || !ref.current) return;
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
      const map = L.map(ref.current, { zoomControl: false, attributionControl: false }).setView([lat, lng], 15);
      L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", { maxZoom: 19 }).addTo(map);
      L.marker([lat, lng]).addTo(map).bindTooltip(tipText(label), { permanent: true, direction: "top" });
      mapRef.current = map;
      timer = setTimeout(() => map.invalidateSize(), 80);
    }).catch(() => { });
    return () => {
      cancelled = true;
      clearTimeout(timer);
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  }, [lat, lng, label]);

  return <div ref={ref} className="mini-map" />;
}

function ExploreMap({ items, onOpen }) {
  const { t, loc } = useSettings();
  const ref = useRef(null);
  const mapRef = useRef(null);
  const userMarkerRef = useRef(null);
  const markersRef = useRef([]);
  const [failed, setFailed] = useState(false);
  const [query, setQuery] = useState("");
  const [locating, setLocating] = useState(false);
  const [locateError, setLocateError] = useState(false);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return items;
    return items.filter((raw) => {
      const e = loc(raw);
      return `${e.title} ${e.place} ${e.type} ${raw.title} ${raw.place}`.toLowerCase().includes(q);
    });
  }, [items, query, loc]);

  // Карта создаётся один раз при монтировании
  useEffect(() => {
    let cancelled = false;
    let timer;
    loadLeaflet().then((L) => {
      if (cancelled || !ref.current) return;
      const map = L.map(ref.current, { zoomControl: false }).setView([CITY.lat, CITY.lng], 14);
      L.control.zoom({ position: "bottomleft" }).addTo(map);
      L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
        maxZoom: 19,
        attribution: "&copy; OpenStreetMap",
      }).addTo(map);
      mapRef.current = map;
      timer = setTimeout(() => map.invalidateSize(), 120);
    }).catch(() => {
      if (!cancelled) setFailed(true);
    });
    return () => {
      cancelled = true;
      clearTimeout(timer);
      userMarkerRef.current = null;
      markersRef.current = [];
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  }, []);

  // Маркеры пересобираются при поиске и смене языка, не трогая саму карту.
  // Тап по метке сразу открывает карточку места на весь экран.
  useEffect(() => {
    let cancelled = false;
    loadLeaflet().then((L) => {
      const map = mapRef.current;
      if (cancelled || !map) return;
      markersRef.current.forEach((m) => map.removeLayer(m));
      markersRef.current = filtered.map((raw) =>
        L.marker([raw.lat, raw.lng])
          .addTo(map)
          .bindTooltip(tipText(loc(raw).place), { permanent: false })
          .on("click", () => onOpen(raw))
      );
    }).catch(() => { /* ошибку загрузки показывает эффект создания карты */ });
    return () => {
      cancelled = true;
    };
  }, [filtered, onOpen, loc]);

  function locateMe() {
    if (!navigator.geolocation) {
      setLocateError(true);
      return;
    }
    setLocating(true);
    setLocateError(false);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude, longitude } = pos.coords;
        loadLeaflet().then((L) => {
          const map = mapRef.current;
          setLocating(false);
          if (!map) return;
          if (userMarkerRef.current) {
            userMarkerRef.current.setLatLng([latitude, longitude]);
          } else {
            userMarkerRef.current = L.circleMarker([latitude, longitude], {
              radius: 8,
              color: "#fff",
              weight: 3,
              fillColor: "#1e2638",
              fillOpacity: 1,
            })
              .addTo(map)
              .bindTooltip(tipText(t("map.youAreHere")));
          }
          map.setView([latitude, longitude], 15);
        }).catch(() => {
          setLocating(false);
          setLocateError(true);
        });
      },
      () => {
        setLocating(false);
        setLocateError(true);
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  }

  return (
    <div className="map-wrap">
      <div ref={ref} className="map-canvas" />

      <div className="map-search-bar">
        <div className="search map-search-input">
          <Search size={18} color="var(--muted-2)" />
          <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder={t("map.search")} />
        </div>
      </div>

      <button className="icon-btn map-locate-btn" onClick={locateMe} aria-label={t("map.locate")} disabled={locating}>
        <Navigation size={18} color={locating ? "var(--muted-2)" : "var(--terracotta)"} />
      </button>

      {locateError && <div className="map-locate-toast">{t("map.locateError")}</div>}

      {!failed && filtered.length === 0 && (
        <div className="map-locate-toast" style={{ bottom: "auto", top: 76 }}>{t("common.nothing")}</div>
      )}

      {failed && (
        <div className="map-failed">
          <MapIcon size={32} color="var(--indigo)" />
          <b>{t("map.failedTitle")}</b>
          <span className="muted">{t("map.failedText")}</span>
        </div>
      )}
    </div>
  );
}

// 1. ГЛАВНАЯ: два режима. «Сам» — маршрут, карта и факты; «с гидом» — туры и агентства.
// Логика общая, меняется только порядок и акцент блоков.
function SelfHome({ onGoToRoute, onGoTo, onOpenExp }) {
  const { t } = useSettings();
  return (
    <>
      <section className="home-hero">
        <img src="https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=1200&q=85" alt={t("home.heroAlt")} />
        <div className="home-hero-fade" />
        <div className="home-hero-text">
          <span className="fact-tag">{t("home.tag")}</span>
          <h1>{t("home.title")}</h1>
          <p>{t("home.text")}</p>
          <div className="row" style={{ gap: 8, flexWrap: "wrap" }}>
            <button className="cta home-route-cta" onClick={onGoToRoute}>{t("home.cta")}</button>
            <button className="cta ghost home-route-cta" onClick={() => onGoTo("map")}>
              <MapIcon size={16} /> {t("home.mapCta")}
            </button>
          </div>
        </div>
      </section>

      <FactsSection MiniMap={MiniMap} onGoTo={onGoTo} onOpenExp={onOpenExp} />
    </>
  );
}

const GUIDED_CATS = ["all", "tours", "trips", "trekking"];

function siteOf(url) {
  try {
    return new URL(url).origin;
  } catch {
    return null;
  }
}

function GuidedHome({ cards, onSeeAll }) {
  const { t, plural } = useSettings();
  const { tours } = useContent();
  const [cat, setCat] = useState("all");
  const cats = CATEGORIES.filter((c) => GUIDED_CATS.includes(c.id));
  const picks = tours.filter((x) => cat === "all" || x.category === cat).slice(0, 4);
  const hero = tours.find((x) => x.id === "pamir") || tours[0];

  const agencies = useMemo(() => {
    const map = new Map();
    for (const x of tours) {
      if (!x.agencyName) continue;
      const a = map.get(x.agencyName) || { name: x.agencyName, count: 0, site: siteOf(x.url) };
      a.count += 1;
      map.set(x.agencyName, a);
    }
    return [...map.values()];
  }, [tours]);

  return (
    <>
      <section className="home-hero">
        {hero && <img src={hero.image} alt="" />}
        <div className="home-hero-fade" />
        <div className="home-hero-text">
          <span className="fact-tag">{t("home.guidedTag")}</span>
          <h1>{t("home.guidedTitle")}</h1>
          <p>{t("home.guidedText")}</p>
          <button className="cta home-route-cta" onClick={() => onSeeAll("all")}>{t("home.guidedCta")}</button>
        </div>
      </section>

      <div className="row" style={{ justifyContent: "space-between", padding: "18px 16px 4px" }}>
        <b style={{ fontSize: 17 }}>{t("home.picks")}</b>
        <button className="route-link" onClick={() => onSeeAll(cat)}>{t("home.seeAll")} →</button>
      </div>
      <ChipRow items={cats} value={cat} onChange={setCat} layoutId="cat-pill-home" />

      <div style={{ padding: "0 16px", display: "grid", gap: 14 }}>
        <AnimatePresence initial={false} mode="popLayout">
          {picks.map((exp) => (
            <motion.div
              key={exp.id}
              layout
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              transition={{ ...SPRING, opacity: { duration: 0.2, ease: "easeOut" } }}
            >
              <ExperienceCard
                exp={exp}
                saved={cards.saved.has(exp.id)}
                inRoute={cards.routeItems.some((r) => r.id === exp.id)}
                onOpen={cards.onOpen}
                onToggleSave={cards.onToggleSave}
                onToggleRoute={cards.onToggleRoute}
              />
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {agencies.length > 0 && (
        <div style={{ padding: "22px 16px 24px" }}>
          <b style={{ fontSize: 17, display: "block", marginBottom: 12 }}>{t("home.agencies")}</b>
          <div style={{ display: "grid", gap: 10 }}>
            {agencies.map((a, i) => (
              <motion.div key={a.name} className="card agency-card" {...inView(i)}>
                <div className="agency-logo">{a.name.slice(0, 1)}</div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 800, fontSize: 15 }}>{a.name}</div>
                  <div className="muted" style={{ fontSize: 12 }}>
                    {t("home.agencyTours", { n: plural("pl.tours", a.count) })}
                  </div>
                  <div className="row" style={{ gap: 14, marginTop: 8 }}>
                    <button className="route-link" onClick={() => onSeeAll("all")}>{t("home.agencyOpen")}</button>
                    {a.site && (
                      <a className="route-link" href={a.site} target="_blank" rel="noopener noreferrer">
                        {a.site.replace(/^https?:\/\//, "")} ↗
                      </a>
                    )}
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      )}
    </>
  );
}

function HomeView({ onGoToRoute, onGoTo, onOpenExp, cards, onSeeAll }) {
  const { travelMode } = useSettings();
  return (
    <div className="gyg-scroll">
      <div className="home-mode-bar">
        <ModeSwitch />
      </div>
      <AnimatePresence mode="wait">
        <motion.div
          key={travelMode}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          transition={{ duration: 0.2, ease: "easeOut" }}
        >
          {travelMode === "guided" ? (
            <GuidedHome cards={cards} onSeeAll={onSeeAll} />
          ) : (
            <SelfHome onGoToRoute={onGoToRoute} onGoTo={onGoTo} onOpenExp={onOpenExp} />
          )}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}

// 2. МАРШРУТ: ЧИСТЫЙ ПЛАНИРОВЩИК (БЕЗ ВЫБОРА МЕСТ СНИЗУ)
function minutesToClock(mins) {
  const h = Math.floor(mins / 60) % 24;
  const m = Math.round(mins % 60);
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

// Расстояние между точками по прямой (км), с поправкой на улицы ×1.3
function walkKm(a, b) {
  const R = 6371;
  const toRad = (d) => (d * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h)) * 1.3;
}

const WALK_KMH = 4.5;

function openNavigation(items) {
  if (items.length === 0) return;
  const pts = items.map((i) => `${i.lat},${i.lng}`);
  const destination = pts[pts.length - 1];
  const waypoints = pts.slice(0, -1).join("|");
  const url =
    `https://www.google.com/maps/dir/?api=1&travelmode=walking&destination=${encodeURIComponent(destination)}` +
    (waypoints ? `&waypoints=${encodeURIComponent(waypoints)}` : "");
  window.open(url, "_blank", "noopener");
}

function RouteView({ items, setItems, onGoToTours, onOpen }) {
  const { t, plural, loc, money, fmtDuration, locale, travelMode: mode } = useSettings();
  const [expandedId, setExpandedId] = useState(null);

  const legs = useMemo(
    () => items.map((item, i) => (i === 0 ? 0 : walkKm(items[i - 1], item))),
    [items]
  );

  const fmtKm = (km) => t("unit.km", { n: km.toLocaleString(locale, { maximumFractionDigits: 1, minimumFractionDigits: 1 }) });

  const totalKm = legs.reduce((a, b) => a + b, 0);
  const totalMin = useMemo(() => {
    const visit = items.reduce((a, it) => a + durationMinutes(it.duration), 0);
    return visit + (totalKm / WALK_KMH) * 60;
  }, [items, totalKm]);

  const times = useMemo(() => {
    const result = [];
    let cursor = 9 * 60;
    for (let i = 0; i < items.length; i++) {
      cursor += (legs[i] / WALK_KMH) * 60;
      result.push(minutesToClock(cursor));
      cursor += durationMinutes(items[i].duration);
    }
    return result;
  }, [items, legs]);

  const guideTotal = items.reduce((a, it) => a + (it.price || 0), 0);

  const moveItem = (index, dir) => {
    const target = index + dir;
    if (target < 0 || target >= items.length) return;
    const copy = [...items];
    const [it] = copy.splice(index, 1);
    copy.splice(target, 0, it);
    setItems(copy);
  };

  const removeItem = (id) => {
    setItems(items.filter((x) => x.id !== id));
  };

  return (
    <div className="gyg-scroll">
      <div style={{ background: "#fff", padding: "18px 16px 12px", borderBottom: "1px solid var(--line)" }}>
        <div className="muted" style={{ fontWeight: 700, fontSize: 11 }}>{t("route.kicker")}</div>
        <h1 style={{ fontSize: 24, fontWeight: 900, margin: "2px 0 10px" }}>{t("route.title")}</h1>
        <p className="muted" style={{ margin: 0, fontSize: 13 }}>{t("route.subtitle")}</p>
        <div style={{ marginTop: 12 }}>
          <ModeSwitch />
        </div>
        {mode === "guided" && items.length > 0 && (
          <div className="route-guide-note">
            {t("route.guideNote", { n: items.length, price: money(guideTotal) })}
          </div>
        )}
      </div>

      <div style={{ padding: "12px 16px" }}>
        <div className="route-stats-pill">
          <div className="route-stat">
            <div className="route-stat-value">
              <MapPin size={16} color="var(--terracotta)" />
              {items.length === 0 ? t("unit.km", { n: 0 }) : fmtKm(totalKm)}
            </div>
            <span className="route-stat-label">{t("route.walk")}</span>
          </div>
          <div className="route-stat-divider" />
          <div className="route-stat">
            <div className="route-stat-value">
              <Clock size={16} color="var(--terracotta)" />
              {fmtDuration(items.length === 0 ? 0 : totalMin)}
            </div>
            <span className="route-stat-label">{t("route.time")}</span>
          </div>
          <div className="route-stat-divider" />
          <div className="route-stat">
            <div className="route-stat-value">
              <RouteIcon size={16} color="var(--terracotta)" />
              {items.length}
            </div>
            <span className="route-stat-label">{t("route.points")}</span>
          </div>
        </div>
      </div>

      <div style={{ padding: "0 16px 20px" }}>
        <div className="row" style={{ justifyContent: "space-between", marginBottom: 14 }}>
          <b style={{ fontSize: 16 }}>{t("route.listTitle")}</b>
          <button
            onClick={onGoToTours}
            style={{ border: "none", background: "none", color: "var(--terracotta)", fontWeight: 800, fontSize: 13, cursor: "pointer" }}
          >
            {t("route.addPlace")}
          </button>
        </div>

        {items.length === 0 ? (
          <div className="card ornament-accent" style={{ padding: "36px 20px", textAlign: "center" }}>
            <Compass size={40} color="var(--terracotta)" />
            <h3 style={{ margin: "12px 0 6px" }}>{t("route.emptyTitle")}</h3>
            <p className="muted" style={{ margin: "0 0 16px", fontSize: 13 }}>{t("route.emptyText")}</p>
            <button className="cta" onClick={onGoToTours}>{t("route.goTours")}</button>
          </div>
        ) : (
          <>
            <div className="route-timeline">
              <AnimatePresence initial={false} mode="popLayout">
              {items.map((raw, idx) => {
                const item = loc(raw);
                const isOpen = expandedId === item.id;
                const leg = legs[idx];
                const legText = leg < 1 ? t("unit.m", { n: Math.round(leg * 1000) }) : fmtKm(leg);
                return (
                  <motion.div
                    key={item.id}
                    layout
                    className="route-timeline-row"
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    transition={SPRING}
                  >
                    <div className="route-timeline-rail">
                      <span className="route-timeline-time">{times[idx]}</span>
                      <span className="route-timeline-dot" />
                      {idx < items.length - 1 && <span className="route-timeline-line" />}
                    </div>

                    <div className="card route-place-card">
                      {idx > 0 && <div className="route-leg">{t("route.leg", { dist: legText })}</div>}
                      <div className="row" style={{ alignItems: "flex-start", gap: 10 }}>
                        <img src={item.image} alt="" className="route-place-thumb" />
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontWeight: 800, fontSize: 14, lineHeight: 1.25 }}>{item.title}</div>
                          <div className="muted" style={{ fontSize: 11, margin: "3px 0 6px" }}>
                            {item.type} · {item.place}
                          </div>
                          <div className={`mode-label ${mode === "guided" && item.agencyName ? "guided" : "self"}`} style={{ marginBottom: 6 }}>
                            {mode === "guided" && item.agencyName
                              ? t("label.guided", { agency: item.agencyName })
                              : t("label.self")}
                          </div>
                          {isOpen && (
                            <p style={{ margin: "0 0 8px", fontSize: 12, lineHeight: 1.5, color: "var(--ink-soft)" }}>
                              {item.description}
                            </p>
                          )}
                          <div className="row" style={{ gap: 14 }}>
                            <button className="route-link" onClick={() => setExpandedId(isOpen ? null : item.id)}>
                              {isOpen ? t("route.hide") : t("common.details")}
                            </button>
                          </div>
                        </div>
                        <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                          <button className="icon-btn icon-btn-sm" aria-label={t("route.up")} disabled={idx === 0} onClick={() => moveItem(idx, -1)}>
                            <ChevronUp size={14} />
                          </button>
                          <button className="icon-btn icon-btn-sm" aria-label={t("route.down")} disabled={idx === items.length - 1} onClick={() => moveItem(idx, 1)}>
                            <ChevronDown size={14} />
                          </button>
                          <button className="icon-btn icon-btn-sm" aria-label={t("route.remove")} style={{ color: "var(--terracotta)" }} onClick={() => removeItem(item.id)}>
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </div>
                      {mode === "self" && raw.agencyName && (
                        <motion.button
                          type="button"
                          className="route-bridge"
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          transition={{ duration: 0.25, ease: "easeOut" }}
                          onClick={() => onOpen(raw)}
                        >
                          <span>{t("route.bridge")}</span>
                          <b>{item.agencyName} · {priceText(item, t, money)} →</b>
                        </motion.button>
                      )}
                    </div>
                  </motion.div>
                );
              })}
              </AnimatePresence>
            </div>
            <button
              className="cta"
              style={{ marginTop: 16 }}
              onClick={() => (mode === "guided" ? onGoToTours() : openNavigation(items))}
            >
              {mode === "guided" ? t("route.pickGuide") : t("route.navigate", { stops: plural("pl.stops", items.length) })}
            </button>
          </>
        )}
      </div>
    </div>
  );
}

// 3. ТУРЫ: ПОЛНЫЙ КАТАЛОГ С ПОИСКОМ И КНОПКАМИ «В МАРШРУТ»
function ToursView({
  query,
  setQuery,
  category,
  setCategory,
  saved,
  routeItems,
  onOpen,
  onToggleSave,
  onToggleRoute,
}) {
  const { t, loc } = useSettings();
  const q = query.trim().toLowerCase();
  const { tours } = useContent();
  const filtered = tours.filter((raw) => {
    const byCat = category === "all" || raw.category === category;
    if (!byCat) return false;
    if (!q) return true;
    const e = loc(raw);
    // ищем и по переводу, и по русскому тексту
    return `${e.title} ${e.place} ${e.type} ${raw.title} ${raw.place} ${raw.type}`.toLowerCase().includes(q);
  });

  return (
    <div className="gyg-scroll">
      <div style={{ background: "#fff", padding: "18px 16px 12px", borderBottom: "1px solid var(--line)" }}>
        <div className="muted" style={{ fontWeight: 700, fontSize: 11 }}>{t("tours.kicker")}</div>
        <h1 style={{ fontSize: 24, fontWeight: 900, margin: "2px 0 10px" }}>{t("tours.title")}</h1>
        <div className="search">
          <Search size={18} color="var(--muted-2)" />
          <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder={t("tours.search")} />
        </div>
      </div>

      <div style={{ paddingTop: 14 }}>
        <ChipRow items={CATEGORIES} value={category} onChange={setCategory} layoutId="cat-pill" />
      </div>

      <AnimatePresence mode="wait">
        <motion.div
          key={`${category}-${query.trim()}`}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          transition={{ duration: 0.2, ease: "easeOut" }}
          style={{ padding: "0 16px 20px", display: "grid", gap: 14, marginTop: 10 }}
        >
          {filtered.length === 0 && (
            <div className="card ornament-accent empty">
              <Search size={32} color="var(--indigo)" />
              <b>{t("tours.emptyTitle")}</b>
              <span>{t("tours.emptyText")}</span>
            </div>
          )}
          {filtered.map((exp, index) => (
            <motion.div key={exp.id} {...inView(index)}>
              <ExperienceCard
                exp={exp}
                saved={saved.has(exp.id)}
                inRoute={routeItems.some((r) => r.id === exp.id)}
                onOpen={onOpen}
                onToggleSave={onToggleSave}
                onToggleRoute={onToggleRoute}
              />
            </motion.div>
          ))}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}

// 4. ПРОФИЛЬ: НАСТРОЙКИ, ЯЗЫК, ВАЛЮТА, ПОДДЕРЖКА
function PickerScreen({ title, items, activeCode, onSelect, onBack }) {
  const { t } = useSettings();
  const [q, setQ] = useState("");
  const filtered = items.filter((it) => {
    const s = q.trim().toLowerCase();
    if (!s) return true;
    return `${it.label} ${it.sub || ""} ${it.code}`.toLowerCase().includes(s);
  });

  return (
    <div className="gyg-scroll" style={{ background: "#fff", minHeight: "100svh" }}>
      <div className="screen-head">
        <button className="icon-btn" onClick={onBack} aria-label={t("common.back")}>
          <ChevronLeft size={20} />
        </button>
        <b>{title}</b>
      </div>
      <div style={{ padding: 16 }}>
        <div className="search" style={{ marginBottom: 14 }}>
          <Search size={18} color="var(--muted-2)" />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder={t("common.search")} />
        </div>
        <div className="card" style={{ overflow: "hidden" }}>
          {filtered.map((it, idx) => (
            <div
              key={it.code}
              role="button"
              tabIndex={0}
              onClick={() => onSelect(it.code)}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") onSelect(it.code);
              }}
              className="row"
              style={{
                justifyContent: "space-between",
                padding: "14px 16px",
                borderTop: idx === 0 ? "none" : "1px solid var(--line)",
                cursor: "pointer",
              }}
            >
              <div>
                <div style={{ fontWeight: 700, fontSize: 14 }}>{it.label}</div>
                {it.sub && it.sub !== it.label && (
                  <div className="muted" style={{ fontSize: 11 }}>{it.sub}</div>
                )}
              </div>
              <div className="row" style={{ gap: 10 }}>
                {it.symbol && it.symbol !== it.code && <span className="muted" style={{ fontSize: 12 }}>{it.symbol}</span>}
                <span className="muted" style={{ fontSize: 12, fontWeight: 700 }}>{it.code.toUpperCase()}</span>
                {activeCode === it.code && <Check size={18} color="var(--terracotta)" />}
              </div>
            </div>
          ))}
          {filtered.length === 0 && (
            <div className="muted" style={{ padding: 16, textAlign: "center" }}>{t("common.nothing")}</div>
          )}
        </div>
      </div>
    </div>
  );
}

function ProfileView({ bookings, onOpenTicket, saved, onOpenSaved, onGoToTours }) {
  const { t, loc, money, fmtDate, plural, lang, setLang, currency, setCurrency, notifs, setNotifs, setTravelMode } = useSettings();
  const [screen, setScreen] = useState(null); // null | "lang" | "currency"
  const [helpToast, setHelpToast] = useState(false);
  useEffect(() => {
    if (!helpToast) return;
    const timer = setTimeout(() => setHelpToast(false), 2500);
    return () => clearTimeout(timer);
  }, [helpToast]);

  const currentLang = LANGUAGES.find((l) => l.code === lang);
  const { tours } = useContent();
  const savedRaw = tours.filter((e) => saved.has(e.id));

  if (screen === "lang") {
    return (
      <PickerScreen
        title={t("profile.language")}
        items={LANGUAGES.map((l) => ({ code: l.code, label: l.native, sub: displayName("language", l.code, lang) }))}
        activeCode={lang}
        onSelect={(code) => {
          setLang(code);
          setScreen(null);
        }}
        onBack={() => setScreen(null)}
      />
    );
  }

  if (screen === "currency") {
    return (
      <PickerScreen
        title={t("profile.currency")}
        items={CURRENCIES.map((c) => ({
          code: c.code,
          label: displayName("currency", c.code, lang),
          symbol: currencySymbol(c.code, lang),
        }))}
        activeCode={currency}
        onSelect={(code) => {
          setCurrency(code);
          setScreen(null);
        }}
        onBack={() => setScreen(null)}
      />
    );
  }

  return (
    <div className="gyg-scroll" style={{ padding: 16 }}>
      <h2 style={{ margin: "8px 0 14px", fontWeight: 900 }}>{t("profile.title")}</h2>

      <div className="card" style={{ padding: 16, marginBottom: 14 }}>
        <div className="row" style={{ gap: 12 }}>
          <div
            style={{
              width: 44,
              height: 44,
              borderRadius: 22,
              background: "var(--terracotta-glow)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <User size={22} color="var(--terracotta)" />
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 800, fontSize: 15 }}>{t("profile.guest")}</div>
            <div className="muted" style={{ fontSize: 11 }}>{t("profile.guestNote")}</div>
          </div>
          <button className="pill" style={{ padding: "6px 12px", fontSize: 12 }} disabled>
            {t("profile.soon")}
          </button>
        </div>
      </div>

      <div className="card" style={{ padding: 16, marginBottom: 14 }}>
        <div className="row" style={{ gap: 8, marginBottom: 10 }}>
          <Ticket size={16} color="var(--terracotta)" />
          <b>{t("profile.tickets", { n: bookings.length })}</b>
        </div>
        {bookings.length === 0 ? (
          <div className="empty-cta">
            <div className="muted" style={{ fontSize: 13 }}>{t("profile.noTickets")}</div>
            <button className="cta cta-sm" onClick={onGoToTours}>{t("profile.seeTours")}</button>
          </div>
        ) : (
          <div style={{ display: "grid", gap: 8 }}>
            {bookings.map((b) => {
              const exp = loc(b.exp);
              return (
                <button key={b.code} className="booking-row" onClick={() => onOpenTicket(b)}>
                  <img src={exp.image} alt="" />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 800, fontSize: 13 }}>{exp.title}</div>
                    <div className="muted" style={{ fontSize: 11 }}>
                      {fmtDate(b.date)} · {plural("pl.guests", b.guests)} · {b.code}
                    </div>
                  </div>
                  <ChevronRight size={16} color="var(--muted-2)" />
                </button>
              );
            })}
          </div>
        )}
      </div>

      <div className="card" style={{ padding: 16, marginBottom: 14 }}>
        <div className="row" style={{ gap: 8, marginBottom: 10 }}>
          <Heart size={16} color="var(--terracotta)" />
          <b>{t("profile.saved", { n: savedRaw.length })}</b>
        </div>
        {savedRaw.length === 0 ? (
          <div className="empty-cta">
            <div className="muted" style={{ fontSize: 13 }}>{t("profile.noSaved")}</div>
            <button className="cta cta-sm" onClick={onGoToTours}>{t("profile.seeTours")}</button>
          </div>
        ) : (
          <div className="h-scroll" style={{ padding: "2px 0 0", margin: "0 -16px", paddingLeft: 16, paddingRight: 16 }}>
            {savedRaw.map((raw) => {
              const exp = loc(raw);
              return (
              <button
                key={exp.id}
                onClick={() => onOpenSaved(raw)}
                style={{
                  minWidth: 132,
                  textAlign: "left",
                  border: "1px solid var(--line)",
                  borderRadius: 14,
                  background: "#fff",
                  padding: 0,
                  overflow: "hidden",
                  cursor: "pointer",
                  flexShrink: 0,
                }}
              >
                <img src={exp.image} alt="" style={{ width: "100%", height: 72, objectFit: "cover" }} />
                <div style={{ padding: 8 }}>
                  <div style={{ fontWeight: 800, fontSize: 12, lineHeight: 1.25 }}>{exp.title}</div>
                  <div className="muted" style={{ fontSize: 10.5, marginTop: 2 }}>{priceText(exp, t, money)}</div>
                </div>
              </button>
              );
            })}
          </div>
        )}
      </div>

      <div className="card" style={{ padding: 16, marginBottom: 14 }}>
        <div className="row" style={{ gap: 8, marginBottom: 12 }}>
          <Compass size={16} color="var(--terracotta)" />
          <b>{t("profile.mode")}</b>
        </div>
        <ModeSwitch />
        <button className="route-link" style={{ marginTop: 12 }} onClick={() => setTravelMode(null)}>
          {t("profile.modeAgain")}
        </button>
      </div>

      <div className="card" style={{ padding: 16, marginBottom: 14 }}>
        <button className="row row-btn" style={{ justifyContent: "space-between" }} onClick={() => setScreen("lang")}>
          <div className="row" style={{ gap: 8 }}>
            <Globe size={16} color="var(--terracotta)" />
            <b>{t("profile.language")}</b>
          </div>
          <div className="row" style={{ gap: 6 }}>
            <span className="muted" style={{ fontSize: 12 }}>{currentLang?.native || lang}</span>
            <ChevronRight size={18} color="var(--muted-2)" />
          </div>
        </button>
      </div>

      <div className="card" style={{ padding: 16, marginBottom: 14 }}>
        <button className="row row-btn" style={{ justifyContent: "space-between" }} onClick={() => setScreen("currency")}>
          <div className="row" style={{ gap: 8 }}>
            <DollarSign size={16} color="var(--terracotta)" />
            <b>{t("profile.currency")}</b>
          </div>
          <div className="row" style={{ gap: 6 }}>
            <span className="muted" style={{ fontSize: 12 }}>
              {currencySymbol(currency, lang)} {currency}
            </span>
            <ChevronRight size={18} color="var(--muted-2)" />
          </div>
        </button>
        {currency !== "USD" && (
          <div className="muted" style={{ fontSize: 11, marginTop: 8 }}>{t("profile.ratesNote")}</div>
        )}
      </div>

      <div className="card" style={{ padding: 16 }}>
        <div className="row" style={{ justifyContent: "space-between", marginBottom: 12 }}>
          <div className="row" style={{ gap: 8 }}>
            <Bell size={16} color="var(--terracotta)" />
            <span>{t("profile.notifs")}</span>
          </div>
          <input
            type="checkbox"
            checked={notifs}
            onChange={(e) => setNotifs(e.target.checked)}
            className="switch"
            aria-label={t("profile.notifs")}
          />
        </div>
        <button
          className="row row-btn"
          style={{ justifyContent: "space-between", borderTop: "1px solid var(--line)", paddingTop: 12 }}
          onClick={() => setHelpToast(true)}
        >
          <div className="row" style={{ gap: 8 }}>
            <HelpCircle size={16} color="var(--terracotta)" />
            <span>{t("profile.help")}</span>
          </div>
          <ChevronRight size={16} color="var(--muted-2)" />
        </button>
      </div>

      {helpToast && <div className="toast-note" role="status">{t("profile.helpSoon")}</div>}
    </div>
  );
}

// 5. ДЕТАЛЬНЫЙ ЭКРАН И БРОНИРОВАНИЕ
function Detail({ exp: raw, saved, onBack, onToggleSave, onBook }) {
  const { t, loc, money, plural, fmtDuration } = useSettings();
  const exp = loc(raw);
  return (
    <div className="gyg-scroll" style={{ background: "#fff", minHeight: "100svh" }}>
      <div style={{ position: "relative" }}>
        <img src={exp.image} alt="" style={{ height: 240, width: "100%", objectFit: "cover" }} />
        <button className="icon-btn" style={{ position: "absolute", top: 12, left: 12 }} onClick={onBack} aria-label={t("common.back")}>
          <ChevronLeft size={20} />
        </button>
        <button className="save-btn" style={{ position: "absolute", top: 12, right: 12 }} onClick={() => onToggleSave(exp.id)} aria-label={saved ? t("common.unsave") : t("common.save")}>
          <Heart size={18} fill={saved ? "var(--terracotta)" : "none"} color={saved ? "var(--terracotta)" : "var(--ink)"} />
        </button>
      </div>
      <div style={{ padding: 16 }}>
        <div className="muted" style={{ fontWeight: 700 }}>{exp.type} · {exp.place}</div>
        <h2 style={{ fontSize: 22, fontWeight: 900, margin: "6px 0 10px", lineHeight: 1.25 }}>{exp.title}</h2>
        <div className="row" style={{ gap: 14, marginBottom: 12, flexWrap: "wrap" }}>
          <StarRow rating={exp.rating} />
          {exp.reviews > 0 && <span className="muted">{plural("pl.reviews", exp.reviews)}</span>}
          {exp.agencyName && <span className="muted" style={{ fontWeight: 700 }}>{exp.agencyName}</span>}
          <span className="row muted"><Clock size={14} /> {fmtDuration(durationMinutes(exp.duration))}</span>
        </div>
        <div className="detail-chips">
          {exp.freeCancel && <span className="detail-chip green">{t("detail.freeCancel")}</span>}
          {exp.group && <span className="detail-chip"><Users size={13} /> {exp.group}</span>}
          {exp.lang && <span className="detail-chip"><Globe size={13} /> {exp.lang}</span>}
        </div>
        <p style={{ margin: "0 0 16px", color: "var(--ink-soft)", lineHeight: 1.5 }}>{exp.description}</p>
        {exp.highlights?.length > 0 && (
          <>
            <b>{t("detail.whatsOn")}</b>
            <ul className="check-list">
              {exp.highlights.map((h) => <li key={h}><Check size={15} color="var(--terracotta)" /> {h}</li>)}
            </ul>
          </>
        )}
        {exp.includes?.length > 0 && (
          <>
            <b>{t("detail.includes")}</b>
            <div className="detail-chips" style={{ margin: "8px 0 16px" }}>
              {exp.includes.map((i) => <span key={i} className="detail-chip">{i}</span>)}
            </div>
          </>
        )}
        <div className="row" style={{ marginBottom: 8 }}><MapPin size={16} /> <b>{t("detail.meeting")}</b></div>
        <div className="muted" style={{ marginBottom: 10 }}>{exp.meeting}</div>
        <MiniMap lat={exp.lat} lng={exp.lng} label={exp.place} />
        {exp.url && (
          <a className="route-link" style={{ display: "inline-block", marginTop: 14 }} href={exp.url} target="_blank" rel="noopener noreferrer">
            {t("detail.agencySite", { name: exp.agencyName || "" })} →
          </a>
        )}
      </div>
      <div className="sticky-buy">
        <div>
          {exp.price == null ? (
            <div className="price" style={{ fontSize: 15 }}>{t("price.request")}</div>
          ) : (
            <>
              <div className="muted" style={{ fontSize: 11 }}>{t("common.from")}</div>
              <div className="price" style={{ fontSize: 20 }}>{money(exp.price)}</div>
            </>
          )}
        </div>
        <button className="cta" onClick={() => onBook(raw)}>{t("detail.pickDate")}</button>
      </div>
    </div>
  );
}

function Booking({ exp: raw, onBack, onConfirm }) {
  const { t, loc, money, plural, fmtDuration, lang } = useSettings();
  const exp = loc(raw);
  const dates = useMemo(() => upcomingDates(), []);
  const [date, setDate] = useState(dates[1]?.key || dates[0].key);
  const [guests, setGuests] = useState(2);
  const [name, setName] = useState("");
  const [contact, setContact] = useState("");
  const total = exp.price == null ? null : exp.price * guests; // в USD; null — цена по запросу
  const canSubmit = name.trim().length >= 2 && contact.trim().length >= 5;
  const [sending, setSending] = useState(false);
  const [sendError, setSendError] = useState(false);

  async function submit() {
    setSending(true);
    setSendError(false);
    try {
      await onConfirm({
        exp: raw,
        date,
        guests,
        total,
        name: name.trim(),
        contact: contact.trim(),
        status: "pending",
        createdAt: new Date().toISOString(),
        code: makeCode(),
      });
    } catch (err) {
      console.warn("Заявка не отправилась", err);
      setSendError(true);
      setSending(false);
    }
  }

  const dayLabel = (d, i) => (i === 0 ? t("booking.today") : i === 1 ? t("booking.tomorrow") : weekdayShort(d.date, lang));

  return (
    <div className="gyg-scroll" style={{ background: "#fff", minHeight: "100svh" }}>
      <div className="screen-head">
        <button className="icon-btn" onClick={onBack} aria-label={t("common.back")}><ChevronLeft size={20} /></button>
        <b>{t("booking.title")}</b>
      </div>
      <div style={{ padding: 16 }}>
        <div className="booking-summary">
          <img src={exp.image} alt="" />
          <div>
            <div style={{ fontWeight: 800, fontSize: 14, lineHeight: 1.3 }}>{exp.title}</div>
            <div className="muted" style={{ fontSize: 12, marginTop: 2 }}>{fmtDuration(durationMinutes(exp.duration))} · {exp.place}</div>
          </div>
        </div>
        <b>{t("booking.when")}</b>
        <div className="h-scroll" style={{ padding: "12px 0" }}>
          {dates.map((d, i) => (
            <button key={d.key} className={`date-chip ${date === d.key ? "on" : ""}`} onClick={() => setDate(d.key)}>
              <div style={{ fontSize: 11, color: "var(--muted)" }}>{dayLabel(d, i)}</div>
              <div style={{ fontWeight: 800 }}>{d.date.getDate()}</div>
            </button>
          ))}
        </div>

        <b>{t("booking.guests")}</b>
        <div className="row" style={{ justifyContent: "space-between", margin: "12px 0 20px", background: "var(--sand-100)", borderRadius: 14, padding: 12 }}>
          <span className="row"><Users size={16} /> {plural("pl.guests", guests)}</span>
          <div className="row">
            <button className="icon-btn" aria-label={t("booking.fewer")} disabled={guests <= 1} onClick={() => setGuests((g) => Math.max(1, g - 1))}>−</button>
            <button className="icon-btn" aria-label={t("booking.more")} disabled={guests >= 10} onClick={() => setGuests((g) => Math.min(10, g + 1))}>+</button>
          </div>
        </div>

        <div className="row" style={{ justifyContent: "space-between", marginBottom: 16 }}>
          {total == null ? (
            <>
              <span className="muted">{plural("pl.guests", guests)}</span>
              <b style={{ fontSize: 15 }}>{t("price.request")}</b>
            </>
          ) : (
            <>
              <span className="muted">{money(exp.price)} × {plural("pl.guests", guests)}</span>
              <b style={{ fontSize: 18 }}>{money(total)}</b>
            </>
          )}
        </div>

        <b>{t("booking.contacts")}</b>
        <div style={{ display: "grid", gap: 10, margin: "12px 0 6px" }}>
          <div className="search">
            <User size={18} color="var(--muted-2)" />
            <input value={name} onChange={(e) => setName(e.target.value)} placeholder={t("booking.name")} autoComplete="name" />
          </div>
          <div className="search">
            <Bell size={18} color="var(--muted-2)" />
            <input
              value={contact}
              onChange={(e) => setContact(e.target.value)}
              placeholder={t("booking.contact")}
              autoComplete="tel"
            />
          </div>
        </div>
        <div className="muted" style={{ fontSize: 12, marginBottom: 16 }}>{t("booking.note")}</div>

        {sendError && (
          <div className="form-error" role="alert">{t("booking.error")}</div>
        )}

        <button className="cta" disabled={!canSubmit || sending} onClick={submit}>
          {sending
            ? t("booking.sending")
            : total == null
              ? t("booking.submitRequest")
              : t("booking.submit", { total: money(total) })}
        </button>
      </div>
    </div>
  );
}

function TicketView({ booking, onClose, onCancel }) {
  const { t, loc, money, plural, fmtDate } = useSettings();
  const exp = loc(booking.exp);
  const [confirmCancel, setConfirmCancel] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const [cancelError, setCancelError] = useState(false);

  async function doCancel() {
    setCancelling(true);
    setCancelError(false);
    try {
      await onCancel(booking);
    } catch (err) {
      console.warn("Отмена не прошла", err);
      setCancelError(true);
      setCancelling(false);
    }
  }

  return (
    <div className="gyg-scroll" style={{ background: "#fff", minHeight: "100svh" }}>
      <div className="screen-head">
        <button className="icon-btn" onClick={onClose} aria-label={t("common.back")}><ChevronLeft size={20} /></button>
        <b>{t("ticket.title")}</b>
      </div>
      <div style={{ padding: 16 }}>
        <div className="ticket">
          <img className="ticket-cover" src={exp.image} alt="" />
          <div className="ticket-body">
            {booking.status === "confirmed" ? (
              <div className="row" style={{ color: "var(--green)", fontWeight: 800, marginBottom: 8 }}>
                <Check size={16} /> {t("ticket.confirmed")}
              </div>
            ) : (
              <div className="row" style={{ color: "var(--terracotta)", fontWeight: 800, marginBottom: 8 }}>
                <Clock size={16} /> {t("ticket.pending")}
              </div>
            )}
            <div style={{ fontWeight: 900, fontSize: 18, marginBottom: 10, lineHeight: 1.25 }}>{exp.title}</div>
            <div className="row muted"><Calendar size={14} /> {fmtDate(booking.date)} · {plural("pl.guests", booking.guests)}</div>
            <div className="row muted" style={{ margin: "8px 0", alignItems: "flex-start" }}><MapPin size={14} style={{ flexShrink: 0, marginTop: 2 }} /> {exp.meeting}</div>
            {booking.name && (
              <div className="row muted" style={{ marginBottom: 8 }}><User size={14} /> {booking.name} · {booking.contact}</div>
            )}
            <div className="row muted"><Ticket size={14} /> {t("ticket.payOnSite")} <b style={{ color: "var(--ink)" }}>{booking.total == null ? t("price.request") : money(booking.total)}</b></div>
          </div>
          <div className="ticket-cut" />
          <div className="ticket-code">
            <span className="muted" style={{ fontSize: 11 }}>{t("ticket.code")}</span>
            <div>{booking.code}</div>
          </div>
        </div>

        {cancelError && (
          <div className="form-error" role="alert" style={{ marginTop: 16 }}>{t("ticket.cancelError")}</div>
        )}

        {onCancel && (
          confirmCancel ? (
            <div className="row" style={{ gap: 8, marginTop: 16 }}>
              <button className="pill" style={{ flex: 1, textAlign: "center" }} disabled={cancelling} onClick={() => setConfirmCancel(false)}>
                {t("ticket.keep")}
              </button>
              <button className="cta" style={{ flex: 1 }} disabled={cancelling} onClick={doCancel}>
                {t("ticket.confirmCancel")}
              </button>
            </div>
          ) : (
            <button
              onClick={() => setConfirmCancel(true)}
              style={{ marginTop: 16, width: "100%", border: "none", background: "none", color: "var(--muted)", fontWeight: 700, cursor: "pointer", padding: 12 }}
            >
              {t("ticket.cancel")}
            </button>
          )
        )}
      </div>
    </div>
  );
}

// Сохранение на устройстве (localStorage может быть недоступен — тогда просто работаем в памяти).
// Избранное и маршрут храним как id туров (туры могут прийти из Supabase позже),
// а в брони — копию тура на момент бронирования, чтобы билет не пропал, если тур снимут.
const STORE_KEY = "osh-guide-v1";
const legacyTour = (id) => EXPERIENCES.find((e) => e.id === id);

function loadStore() {
  try {
    const raw = JSON.parse(localStorage.getItem(STORE_KEY) || "null");
    if (!raw) return null;
    return {
      saved: new Set(raw.saved || []),
      route: raw.route || [],
      bookings: (raw.bookings || [])
        .map((b) => (b.exp ? b : { ...b, exp: legacyTour(b.expId) })) // старый формат: только expId
        .filter((b) => b.exp),
    };
  } catch {
    return null;
  }
}

const initialStore = loadStore();
const DEFAULT_ROUTE = ["sulaiman", "walking", "food-tour"];

// ГЛАВНЫЙ ЭКСПОРТ
export default function App() {
  const { t, lang, travelMode, setTravelMode } = useSettings();
  const { tours, byId } = useContent();
  const [tab, setTab] = useState("home");
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("all");
  const [saved, setSaved] = useState(() => initialStore?.saved || new Set());
  const [selected, setSelected] = useState(null);
  const [bookingExp, setBookingExp] = useState(null);
  const [ticket, setTicket] = useState(null);
  const [bookings, setBookings] = useState(() => initialStore?.bookings || []);
  const [navMin, setNavMin] = useMinimizeOnScroll();
  const [splash, setSplash] = useState(true);

  const [routeIds, setRouteIds] = useState(() => initialStore?.route || DEFAULT_ROUTE);
  const routeItems = useMemo(() => routeIds.map(byId).filter(Boolean), [routeIds, byId]);
  const setRouteItems = (items) => setRouteIds(items.map((x) => x.id));

  useEffect(() => {
    try {
      localStorage.setItem(
        STORE_KEY,
        JSON.stringify({ saved: [...saved], route: routeIds, bookings })
      );
    } catch {
      /* хранилище недоступно */
    }
  }, [saved, routeIds, bookings]);

  // При смене экрана — наверх
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [tab, selected, bookingExp, ticket]);

  // Системная «назад» закрывает верхний экран, а не приложение:
  // каждое открытие кладёт запись в history, popstate снимает её.
  const depth = (selected ? 1 : 0) + (bookingExp ? 1 : 0) + (ticket ? 1 : 0);
  const prevDepth = useRef(0);
  useEffect(() => {
    if (depth > prevDepth.current) window.history.pushState({ screen: depth }, "");
    prevDepth.current = depth;
  }, [depth]);
  useEffect(() => {
    function onPop() {
      if (ticket) setTicket(null);
      else if (bookingExp) setBookingExp(null);
      else if (selected) setSelected(null);
      // экран уже закрыт кодом (бронь подтверждена/отменена) — запись лишняя, идём дальше назад
      else window.history.back();
    }
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, [ticket, bookingExp, selected]);
  // Кнопки «назад» в интерфейсе идут через history, чтобы стек не расходился
  const closeScreen = () => window.history.back();

  function toggleSave(id) {
    setSaved((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleRoute(exp) {
    setRouteIds((prev) => (prev.includes(exp.id) ? prev.filter((id) => id !== exp.id) : [...prev, exp.id]));
  }

  // Заявка уходит в Supabase (если он настроен). Ошибка пробрасывается — экран брони её покажет.
  async function confirmBooking(entry) {
    const { synced } = await submitBookingRequest(entry, lang);
    const record = { ...entry, synced };
    setBookings((b) => [record, ...b]);
    setBookingExp(null);
    setSelected(null);
    setTicket(record);
    setTab("profile");
  }

  async function cancelBooking(entry) {
    if (entry.synced) await cancelBookingRequest(entry.code);
    setBookings((b) => b.filter((x) => x.code !== entry.code));
    setTicket(null);
  }

  if (splash) return <Splash onDone={() => setSplash(false)} />;
  if (travelMode === null) {
    return (
      <Onboarding
        onPick={(mode) => {
          setTravelMode(mode);
          setTab("home");
        }}
      />
    );
  }
  if (ticket) return <TicketView booking={ticket} onClose={closeScreen} onCancel={cancelBooking} />;
  if (bookingExp) return <Booking exp={bookingExp} onBack={closeScreen} onConfirm={confirmBooking} />;
  if (selected) {
    return (
      <Detail
        exp={selected}
        saved={saved.has(selected.id)}
        onBack={closeScreen}
        onToggleSave={toggleSave}
        onBook={setBookingExp}
      />
    );
  }

  return (
    <div className="gyg-app ornament-bg">
      {tab === "home" && (
        <HomeView
          onGoToRoute={() => setTab("route")}
          onGoTo={setTab}
          onOpenExp={setSelected}
          cards={{ saved, routeItems, onOpen: setSelected, onToggleSave: toggleSave, onToggleRoute: toggleRoute }}
          onSeeAll={(cat) => {
            setCategory(cat);
            setQuery("");
            setTab("tours");
          }}
        />
      )}

      {tab === "map" && <ExploreMap items={tours} onOpen={setSelected} />}

      {tab === "route" && (
        <RouteView items={routeItems} setItems={setRouteItems} onGoToTours={() => setTab("tours")} onOpen={setSelected} />
      )}

      {tab === "tours" && (
        <ToursView
          query={query}
          setQuery={setQuery}
          category={category}
          setCategory={setCategory}
          saved={saved}
          routeItems={routeItems}
          onOpen={setSelected}
          onToggleSave={toggleSave}
          onToggleRoute={toggleRoute}
        />
      )}

      {tab === "profile" && (
        <ProfileView
          bookings={bookings}
          onOpenTicket={setTicket}
          saved={saved}
          onOpenSaved={setSelected}
          onGoToTours={() => setTab("tours")}
        />
      )}

      <TabBar
        tabs={TABS.map((tb) => ({ id: tb.id, Icon: tb.Icon, accent: tb.accent, label: t(tb.key) }))}
        activeId={tab}
        label={t("nav.label")}
        minimized={navMin}
        onExpand={() => setNavMin(false)}
        onSelect={(id) => {
          setNavMin(false);
          setTab(id);
        }}
        onReselect={() => {
          setNavMin(false);
          window.scrollTo({ top: 0, behavior: "smooth" });
        }}
      />
    </div>
  );
}
