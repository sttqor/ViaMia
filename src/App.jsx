import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
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
  LogOut,
  Map as MapIcon,
  MapPin,
  MoreHorizontal,
  Navigation,
  Route as RouteIcon,
  Search,
  Sparkles,
  Star,
  Ticket,
  Trash2,
  Undo2,
  User,
  Users,
} from "lucide-react";
import { CATEGORIES, CITY, EXPERIENCES, loadLeaflet, makeCode, upcomingDates } from "./data";
import { useContent } from "./content-context";
import { cancelBookingRequest, fetchMyBookings, fetchProfile, saveProfile, submitBookingRequest } from "./api";
import { CURRENCIES, LANGUAGES, currencySymbol, displayName, durationMinutes, weekdayShort } from "./i18n";
import { useSettings } from "./settings-context";
import { FactsSection } from "./Facts";
import { OshHeader, PhraseStack, QuickActions, SosCard } from "./HomeBlocks";
import { TabBar } from "./TabBar";
import { Toast } from "./Toast";
import { Segmented } from "./Segmented";
import { useMinimizeOnScroll } from "./useMinimizeOnScroll";
import { Onboarding } from "./Onboarding";
import { TipsScreen } from "./Tips.jsx";
import { LoginScreen } from "./Login.jsx";
import { useAuth } from "./auth-context";
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
// Экран поверх вкладок (тур, бронь, билет, выбор языка) въезжает справа
const SCREEN_IN = {
  initial: { opacity: 0, x: 32 },
  animate: { opacity: 1, x: 0 },
  transition: SPRING,
};
// Текст на обложке появляется по очереди
const STAGGER = { hidden: {}, show: { transition: { staggerChildren: 0.06, delayChildren: 0.08 } } };
const RISE = { hidden: { opacity: 0, y: 12 }, show: { opacity: 1, y: 0, transition: { duration: 0.35, ease: EASE_OUT } } };
// Фото обложки чуть «оседает» при открытии
const HERO_IMG = { initial: { scale: 1.08 }, animate: { scale: 1 }, transition: { duration: 1.1, ease: EASE_OUT } };
const TAP = { scale: 0.97 };
// Плашка-подсказка: всплывает снизу и уходит
const TOAST = {
  initial: { opacity: 0, y: 12 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: 8 },
  transition: { duration: 0.2, ease: EASE_OUT },
};

// Сердечко: при добавлении в избранное — короткий «прыжок»
function SaveHeart({ saved }) {
  return (
    <motion.span
      key={saved ? "on" : "off"}
      className="ico"
      initial={saved ? { scale: 0.5 } : false}
      animate={{ scale: 1 }}
      transition={{ type: "spring", stiffness: 520, damping: 14 }}
    >
      <Heart size={18} fill={saved ? "var(--terracotta)" : "none"} color={saved ? "var(--terracotta)" : "var(--ink)"} />
    </motion.span>
  );
}

// Плавное раскрытие по высоте (короткие блоки)
function Reveal({ show, children, ...rest }) {
  return (
    <AnimatePresence initial={false}>
      {show && (
        <motion.div
          key="reveal"
          initial={{ height: 0, opacity: 0 }}
          animate={{ height: "auto", opacity: 1 }}
          exit={{ height: 0, opacity: 0 }}
          transition={{ duration: 0.25, ease: EASE_OUT }}
          className="reveal"
          {...rest}
        >
          {children}
        </motion.div>
      )}
    </AnimatePresence>
  );
}

// Число, которое меняется: старое уходит вверх, новое приходит снизу
function Ticker({ value }) {
  return (
    <span className="ticker">
      <AnimatePresence initial={false} mode="popLayout">
        <motion.span
          key={value}
          initial={{ y: "100%", opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: "-100%", opacity: 0 }}
          transition={{ duration: 0.22, ease: EASE_OUT }}
        >
          {value}
        </motion.span>
      </AnimatePresence>
    </span>
  );
}

// Переключатель режима «сам | с гидом» — только во вкладке «Туры»
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
    <span className="row gap-4 t-sm">
      <Star size={14} fill="var(--gold)" color="var(--gold)" />
      <b>{rating.toFixed(1)}</b>
    </span>
  );
}

// «от $17» или «цена по запросу»
function priceText(exp, t, money) {
  if (exp.selfGuided) return t("price.free");
  return exp.price == null ? t("price.request") : t("price.from", { price: money(exp.price) });
}

function ExperienceCard({ exp: raw, saved, inRoute, onOpen, onToggleSave, onToggleRoute }) {
  const { t, loc, money, fmtDuration } = useSettings();
  const exp = loc(raw);
  return (
    <article className="card exp-card">
      <div className="exp-media">
        <img className="cover" src={exp.image} alt="" loading="lazy" onClick={() => onOpen(raw)} />
        {exp.badge && <div className="badge">{exp.badge}</div>}
        <button
          className="save-btn"
          aria-label={saved ? t("common.unsave") : t("common.save")}
          onClick={() => onToggleSave(exp.id)}
        >
          <SaveHeart saved={saved} />
        </button>
      </div>
      <div className="exp-body">
        <div className="kicker">
          {exp.type} · {fmtDuration(durationMinutes(exp.duration))}
        </div>
        <button className="exp-title" onClick={() => onOpen(raw)}>
          {exp.title}
        </button>
        <div className="row between mb-12">
          {exp.selfGuided ? (
            <span className="mode-label self">{t("label.self")}</span>
          ) : exp.agencyName ? (
            <span className="mode-label guided">{t("label.guided", { agency: exp.agencyName })}</span>
          ) : (
            <StarRow rating={exp.rating} />
          )}
          <div className="price">{priceText(exp, t, money)}</div>
        </div>
        <div className="row">
          <motion.button className={`pill exp-btn ${inRoute ? "on" : ""}`} whileTap={TAP} onClick={() => onToggleRoute(raw)}>
            <Ticker value={inRoute ? t("card.inRoute") : t("card.addRoute")} />
          </motion.button>
          <motion.button className="cta exp-btn exp-btn-main" whileTap={TAP} onClick={() => onOpen(raw)}>
            {t("common.details")}
          </motion.button>
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

      <AnimatePresence>
        {locateError && (
          <motion.div key="locate" className="map-locate-toast" {...TOAST}>
            {t("map.locateError")}
          </motion.div>
        )}
        {!failed && filtered.length === 0 && (
          <motion.div key="nothing" className="map-locate-toast is-top" {...TOAST}>
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

// 1. ГЛАВНАЯ: Ош и погода, факты-сторис, быстрые кнопки, фразы, SOS
function HomeView({ onGoTo, onOpenExp, onOpenTips }) {
  return (
    <div className="gyg-scroll">
      <OshHeader />
      <FactsSection MiniMap={MiniMap} onGoTo={onGoTo} onOpenExp={onOpenExp} />
      <QuickActions onGoTo={onGoTo} onOpenTips={onOpenTips} />
      <PhraseStack />
      <SosCard />
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

// Меню «…» у точки маршрута: выше / ниже / убрать.
// Одна кнопка вместо трёх — карточка не перегружена, цель нажатия 44px.
function PlaceMenu({ open, onToggle, onClose, canUp, canDown, onUp, onDown, onRemove }) {
  const { t } = useSettings();
  const ref = useRef(null);

  useEffect(() => {
    if (!open) return;
    const onOutside = (e) => {
      if (ref.current && !ref.current.contains(e.target)) onClose();
    };
    const onKey = (e) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("pointerdown", onOutside);
    window.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onOutside);
      window.removeEventListener("keydown", onKey);
    };
  }, [open, onClose]);

  const act = (fn) => () => {
    fn();
    onClose();
  };

  return (
    <div className="place-menu" ref={ref}>
      <button className="icon-btn icon-btn-ghost" aria-label={t("route.more")} aria-expanded={open} aria-haspopup="menu" onClick={onToggle}>
        <MoreHorizontal size={18} />
      </button>
      <AnimatePresence>
        {open && (
          <motion.div
            className="place-menu-list"
            role="menu"
            initial={{ opacity: 0, scale: 0.92, y: -4 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.15, ease: EASE_OUT }}
          >
            <button role="menuitem" disabled={!canUp} onClick={act(onUp)}>
              <ChevronUp size={16} /> {t("route.up")}
            </button>
            <button role="menuitem" disabled={!canDown} onClick={act(onDown)}>
              <ChevronDown size={16} /> {t("route.down")}
            </button>
            <button role="menuitem" className="is-danger" onClick={act(onRemove)}>
              <Trash2 size={16} /> {t("route.remove")}
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function RouteView({ items, setItems, onGoToTours }) {
  const { t, plural, loc, fmtDuration, locale } = useSettings();
  const [expandedId, setExpandedId] = useState(null);
  const [menuId, setMenuId] = useState(null);

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
      <div className="page-head">
        <div className="kicker">{t("route.kicker")}</div>
        <h1 className="page-title">{t("route.title")}</h1>
        <p className="muted">{t("route.subtitle")}</p>
      </div>

      <div className="section-pad">
        <div className="route-stats-pill">
          <div className="route-stat">
            <div className="route-stat-value">
              <MapPin size={16} color="var(--terracotta)" />
              <Ticker value={items.length === 0 ? t("unit.km", { n: 0 }) : fmtKm(totalKm)} />
            </div>
            <span className="route-stat-label">{t("route.walk")}</span>
          </div>
          <div className="route-stat-divider" />
          <div className="route-stat">
            <div className="route-stat-value">
              <Clock size={16} color="var(--terracotta)" />
              <Ticker value={fmtDuration(items.length === 0 ? 0 : totalMin)} />
            </div>
            <span className="route-stat-label">{t("route.time")}</span>
          </div>
          <div className="route-stat-divider" />
          <div className="route-stat">
            <div className="route-stat-value">
              <RouteIcon size={16} color="var(--terracotta)" />
              <Ticker value={items.length} />
            </div>
            <span className="route-stat-label">{t("route.points")}</span>
          </div>
        </div>
      </div>

      <div className="section-pad-bottom">
        <div className="row between mb-12">
          <b className="t-lg">{t("route.listTitle")}</b>
          <button className="text-btn" onClick={onGoToTours}>
            {t("route.addPlace")}
          </button>
        </div>

        {items.length === 0 ? (
          <motion.div
            className="card ornament-accent empty-state"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, ease: EASE_OUT }}
          >
            <motion.span
              className="ico"
              initial={{ rotate: -90, scale: 0.6 }}
              animate={{ rotate: 0, scale: 1 }}
              transition={{ type: "spring", stiffness: 260, damping: 16, delay: 0.1 }}
            >
              <Compass size={40} color="var(--terracotta)" />
            </motion.span>
            <h3>{t("route.emptyTitle")}</h3>
            <p className="muted">{t("route.emptyText")}</p>
            <motion.button className="cta" whileTap={TAP} onClick={onGoToTours}>{t("route.goTours")}</motion.button>
          </motion.div>
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
                    className={`route-timeline-row ${menuId === item.id ? "is-menu-open" : ""}`}
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
                      <div className="route-place-row">
                        <img src={item.image} alt="" className="route-place-thumb" />
                        <div className="route-place-info">
                          <div className="route-place-title">{item.title}</div>
                          <div className="route-place-meta">
                            {item.type} · {item.place}
                          </div>
                          <Reveal show={isOpen}>
                            <p className="route-place-desc">{item.description}</p>
                          </Reveal>
                          <button className="route-link" onClick={() => setExpandedId(isOpen ? null : item.id)}>
                            {isOpen ? t("route.hide") : t("common.details")}
                          </button>
                        </div>
                        <PlaceMenu
                          open={menuId === item.id}
                          onToggle={() => setMenuId(menuId === item.id ? null : item.id)}
                          onClose={() => setMenuId(null)}
                          canUp={idx > 0}
                          canDown={idx < items.length - 1}
                          onUp={() => moveItem(idx, -1)}
                          onDown={() => moveItem(idx, 1)}
                          onRemove={() => removeItem(item.id)}
                        />
                      </div>
                    </div>
                  </motion.div>
                );
              })}
              </AnimatePresence>
            </div>
            <motion.button
              layout="position"
              className="cta mt-16"
              whileTap={TAP}
              onClick={() => openNavigation(items)}
            >
              {t("route.navigate", { stops: plural("pl.stops", items.length) })}
            </motion.button>
          </>
        )}
      </div>
    </div>
  );
}

// 3. ТУРЫ: два списка. «Сам» — бесплатные самостоятельные туры (в маршрут),
// «с гидом» — туры агентств с бронью и сами агентства. Поиск и фильтры общие.
function siteOf(url) {
  try {
    return new URL(url).origin;
  } catch {
    return null;
  }
}

function AgencyBlock({ onPick }) {
  const { t, plural } = useSettings();
  const { tours } = useContent();
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
  if (agencies.length === 0) return null;
  return (
    <div className="agency-block">
      <h2 className="section-title">{t("home.agencies")}</h2>
      <div className="stack-10">
        {agencies.map((a, i) => (
          <motion.div key={a.name} className="card agency-card" {...inView(i)}>
            <div className="agency-logo">{a.name.slice(0, 1)}</div>
            <div className="grow">
              <div className="t-md b">{a.name}</div>
              <div className="muted">
                {t("home.agencyTours", { n: plural("pl.tours", a.count) })}
              </div>
              <div className="row gap-14 mt-8">
                <button className="route-link" onClick={() => onPick(a.name)}>{t("home.agencyOpen")}</button>
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
  );
}

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
  const { t, loc, travelMode } = useSettings();
  const q = query.trim().toLowerCase();
  const { tours, selfTours } = useContent();
  // «с гидом» — туры агентств, «сам» — бесплатные самостоятельные
  const pool = travelMode === "guided" ? tours : selfTours;
  // чипы — только категории, которые есть в текущем списке
  const cats = CATEGORIES.filter((c) => c.id === "all" || pool.some((x) => x.category === c.id));
  const activeCat = cats.some((c) => c.id === category) ? category : "all";
  const filtered = pool.filter((raw) => {
    const byCat = activeCat === "all" || raw.category === activeCat;
    if (!byCat) return false;
    if (!q) return true;
    const e = loc(raw);
    // ищем и по переводу, и по русскому тексту, и по агентству
    return `${e.title} ${e.place} ${e.type} ${raw.title} ${raw.place} ${raw.type} ${raw.agencyName || ""}`
      .toLowerCase()
      .includes(q);
  });

  return (
    <div className="gyg-scroll">
      <div className="tours-search">
        <div className="search">
          <Search size={18} color="var(--muted-2)" />
          <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder={t("tours.search")} />
        </div>
      </div>

      <div className="home-mode-bar">
        <ModeSwitch />
      </div>

      <div className="mt-12">
        <ChipRow items={cats} value={activeCat} onChange={setCategory} layoutId="cat-pill" />
      </div>

      <AnimatePresence mode="wait">
        <motion.div
          key={`${travelMode}-${activeCat}-${query.trim()}`}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          transition={{ duration: 0.2, ease: "easeOut" }}
          className="tours-list"
        >
          {filtered.length === 0 && (
            <motion.div
              className="card ornament-accent empty"
              initial={{ opacity: 0, scale: 0.97 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={SPRING}
            >
              <Search size={32} color="var(--indigo)" />
              <b>{t("tours.emptyTitle")}</b>
              <span>{t("tours.emptyText")}</span>
            </motion.div>
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

      {travelMode === "guided" && (
        <AgencyBlock
          onPick={(name) => {
            setCategory("all");
            setQuery(name);
            window.scrollTo({ top: 0, behavior: "smooth" });
          }}
        />
      )}
    </div>
  );
}

// ИЗБРАННОЕ: отдельный экран из профиля, устроен как вкладка «Туры»
function SavedView({ saved, routeItems, onBack, onOpen, onToggleSave, onToggleRoute, onGoToTours }) {
  const { t, loc, plural } = useSettings();
  const { allTours } = useContent();
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("all");
  const [undoId, setUndoId] = useState(null);
  const hideUndo = useCallback(() => setUndoId(null), []);

  const items = allTours.filter((e) => saved.has(e.id));
  const cats = CATEGORIES.filter((c) => c.id === "all" || items.some((x) => x.category === c.id));
  const activeCat = cats.some((c) => c.id === category) ? category : "all";
  const q = query.trim().toLowerCase();
  const filtered = items.filter((raw) => {
    if (activeCat !== "all" && raw.category !== activeCat) return false;
    if (!q) return true;
    const e = loc(raw);
    return `${e.title} ${e.place} ${e.type} ${raw.title} ${raw.place} ${raw.agencyName || ""}`.toLowerCase().includes(q);
  });
  const notInRoute = items.filter((e) => !routeItems.some((r) => r.id === e.id));

  const remove = (id) => {
    onToggleSave(id);
    setUndoId(id);
  };

  return (
    <motion.div className="gyg-scroll screen saved-screen" {...SCREEN_IN}>
      <div className="screen-head">
        <button className="icon-btn" onClick={onBack} aria-label={t("common.back")}>
          <ChevronLeft size={20} />
        </button>
        <span className="grow">
          <b>{t("saved.title")}</b>
          <span className="muted t-xs">
            <Ticker value={plural("pl.places", items.length)} />
          </span>
        </span>
        {notInRoute.length > 0 && (
          <motion.button
            className="pill pill-sm saved-route-all"
            whileTap={TAP}
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            onClick={() => notInRoute.forEach(onToggleRoute)}
          >
            <RouteIcon size={14} /> {t("saved.allToRoute")}
          </motion.button>
        )}
      </div>

      {items.length === 0 ? (
        <motion.div
          className="saved-empty"
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, ease: EASE_OUT }}
        >
          <motion.span
            className="saved-empty-heart"
            animate={{ scale: [1, 1.12, 1] }}
            transition={{ duration: 1.6, repeat: Infinity, ease: "easeInOut" }}
          >
            <Heart size={34} />
          </motion.span>
          <h3>{t("saved.emptyTitle")}</h3>
          <p className="muted">{t("saved.emptyText")}</p>
          <button className="cta" onClick={onGoToTours}>
            {t("profile.seeTours")}
          </button>
        </motion.div>
      ) : (
        <>
          <div className="tours-search saved-search">
            <div className="search">
              <Search size={18} color="var(--muted-2)" />
              <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder={t("saved.search")} />
            </div>
          </div>
          {cats.length > 2 && (
            <div className="mt-12">
              <ChipRow items={cats} value={activeCat} onChange={setCategory} layoutId="saved-pill" />
            </div>
          )}
          <motion.div layout className="tours-list saved-list">
            <AnimatePresence mode="popLayout">
              {filtered.map((exp, index) => (
                <motion.div
                  key={exp.id}
                  layout
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0, transition: { duration: 0.35, delay: Math.min(index, 6) * 0.05, ease: EASE_OUT } }}
                  exit={{ opacity: 0, x: -60, scale: 0.94, transition: { duration: 0.25, ease: "easeIn" } }}
                  transition={{ layout: SPRING }}
                >
                  <ExperienceCard
                    exp={exp}
                    saved
                    inRoute={routeItems.some((r) => r.id === exp.id)}
                    onOpen={onOpen}
                    onToggleSave={remove}
                    onToggleRoute={onToggleRoute}
                  />
                </motion.div>
              ))}
            </AnimatePresence>
            {filtered.length === 0 && (
              <div className="card empty">
                <Search size={32} color="var(--indigo)" />
                <b>{t("tours.emptyTitle")}</b>
                <span>{t("tours.emptyText")}</span>
              </div>
            )}
          </motion.div>
        </>
      )}

      <Toast show={!!undoId} onHide={hideUndo} ms={3500}>
        <span className="toast-row">
          {t("saved.removed")}
          <button
            className="toast-undo"
            onClick={() => {
              onToggleSave(undoId);
              setUndoId(null);
            }}
          >
            <Undo2 size={14} /> {t("saved.undo")}
          </button>
        </span>
      </Toast>
    </motion.div>
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
    <motion.div className="gyg-scroll screen" {...SCREEN_IN}>
      <div className="screen-head">
        <button className="icon-btn" onClick={onBack} aria-label={t("common.back")}>
          <ChevronLeft size={20} />
        </button>
        <b>{title}</b>
      </div>
      <div className="screen-body">
        <div className="search mb-12">
          <Search size={18} color="var(--muted-2)" />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder={t("common.search")} />
        </div>
        <div className="card">
          {filtered.map((it) => (
            <button key={it.code} className="list-row" aria-pressed={activeCode === it.code} onClick={() => onSelect(it.code)}>
              <span>
                <span className="list-row-title">{it.label}</span>
                {it.sub && it.sub !== it.label && <span className="list-row-sub">{it.sub}</span>}
              </span>
              <span className="row gap-10 muted">
                {it.symbol && it.symbol !== it.code && <span>{it.symbol}</span>}
                <b>{it.code.toUpperCase()}</b>
                {activeCode === it.code && (
                  <motion.span className="ico" initial={{ scale: 0 }} animate={{ scale: 1 }} transition={SPRING}>
                    <Check size={18} color="var(--terracotta)" />
                  </motion.span>
                )}
              </span>
            </button>
          ))}
          {filtered.length === 0 && <div className="muted list-empty">{t("common.nothing")}</div>}
        </div>
      </div>
    </motion.div>
  );
}

function ProfileView({ bookings, onOpenTicket, saved, onOpenSaved, onOpenSavedList, onOpenLogin, onGoToTours }) {
  const { t, loc, money, fmtDate, plural, lang, setLang, currency, setCurrency, notifs, setNotifs } = useSettings();
  const [screen, setScreen] = useState(null); // null | "lang" | "currency"
  const [helpToast, setHelpToast] = useState(false);
  const hideHelp = useCallback(() => setHelpToast(false), []);

  const { enabled: authOn, user: authUser, signOut } = useAuth();
  const currentLang = LANGUAGES.find((l) => l.code === lang);
  const { allTours } = useContent();
  const savedRaw = allTours.filter((e) => saved.has(e.id));

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
    <motion.div className="gyg-scroll profile" variants={STAGGER} initial="hidden" animate="show">
      <h1 className="page-title">{t("profile.title")}</h1>

      <motion.div className="card panel" variants={RISE}>
        <div className="row gap-12">
          <div className="avatar">
            <User size={22} color="var(--terracotta)" />
          </div>
          <div className="grow">
            <div className="t-md b">{authUser ? t("login.account") : t("profile.guest")}</div>
            <div className="muted t-xs login-email">{authUser ? authUser.email : t("profile.guestNote")}</div>
          </div>
          {!authUser &&
            (authOn ? (
              <motion.button className="pill pill-sm" whileTap={TAP} onClick={onOpenLogin}>
                {t("login.cta")}
              </motion.button>
            ) : (
              <button className="pill pill-sm" disabled>
                {t("profile.soon")}
              </button>
            ))}
        </div>
        {authUser && (
          <button className="row-btn row-btn-divided" onClick={signOut}>
            <span className="row">
              <LogOut size={16} color="var(--terracotta)" />
              <span>{t("login.out")}</span>
            </span>
            <ChevronRight size={16} color="var(--muted-2)" />
          </button>
        )}
      </motion.div>

      <motion.div className="card panel" variants={RISE}>
        <div className="panel-head">
          <Ticket size={16} color="var(--terracotta)" />
          <b>{t("profile.tickets", { n: bookings.length })}</b>
        </div>
        {bookings.length === 0 ? (
          <div className="empty-cta">
            <div className="muted">{t("profile.noTickets")}</div>
            <button className="cta cta-sm" onClick={onGoToTours}>{t("profile.seeTours")}</button>
          </div>
        ) : (
          <div className="stack-8">
            {bookings.map((b) => {
              const exp = loc(b.exp);
              return (
                <motion.button key={b.code} layout className="booking-row" whileTap={TAP} onClick={() => onOpenTicket(b)}>
                  <img src={exp.image} alt="" />
                  <span className="grow">
                    <span className="booking-row-title">{exp.title}</span>
                    <span className="muted t-xs">
                      {fmtDate(b.date)} · {plural("pl.guests", b.guests)} · {b.code}
                    </span>
                  </span>
                  <ChevronRight size={16} color="var(--muted-2)" />
                </motion.button>
              );
            })}
          </div>
        )}
      </motion.div>

      <motion.div className="card panel" variants={RISE}>
        <motion.button className="row-btn saved-open" whileTap={{ scale: 0.98 }} onClick={onOpenSavedList}>
          <span className="row">
            <Heart size={16} color="var(--terracotta)" />
            <b>{t("profile.saved", { n: savedRaw.length })}</b>
          </span>
          <span className="row gap-4 saved-open-all">
            {t("saved.all")}
            <ChevronRight size={18} />
          </span>
        </motion.button>
        {savedRaw.length === 0 ? (
          <div className="muted">{t("profile.noSaved")}</div>
        ) : (
          <div className="h-scroll saved-scroll">
            {savedRaw.map((raw) => {
              const exp = loc(raw);
              return (
                <button key={exp.id} className="saved-card" onClick={() => onOpenSaved(raw)}>
                  <img src={exp.image} alt="" />
                  <span className="saved-card-body">
                    <span className="saved-card-title">{exp.title}</span>
                    <span className="muted t-xs">{priceText(exp, t, money)}</span>
                  </span>
                </button>
              );
            })}
          </div>
        )}
      </motion.div>

      <motion.div className="card panel" variants={RISE}>
        <button className="row-btn" onClick={() => setScreen("lang")}>
          <span className="row">
            <Globe size={16} color="var(--terracotta)" />
            <b>{t("profile.language")}</b>
          </span>
          <span className="row gap-6 muted">
            {currentLang?.native || lang}
            <ChevronRight size={18} color="var(--muted-2)" />
          </span>
        </button>
      </motion.div>

      <motion.div className="card panel" variants={RISE}>
        <button className="row-btn" onClick={() => setScreen("currency")}>
          <span className="row">
            <DollarSign size={16} color="var(--terracotta)" />
            <b>{t("profile.currency")}</b>
          </span>
          <span className="row gap-6 muted">
            {currencySymbol(currency, lang)} {currency}
            <ChevronRight size={18} color="var(--muted-2)" />
          </span>
        </button>
        {currency !== "USD" && <div className="muted t-xs mt-8">{t("profile.ratesNote")}</div>}
      </motion.div>

      <motion.div className="card panel" variants={RISE}>
        <label className="row-btn">
          <span className="row">
            <Bell size={16} color="var(--terracotta)" />
            <span>{t("profile.notifs")}</span>
          </span>
          <input
            type="checkbox"
            checked={notifs}
            onChange={(e) => setNotifs(e.target.checked)}
            className="switch"
          />
        </label>
        <button className="row-btn row-btn-divided" onClick={() => setHelpToast(true)}>
          <span className="row">
            <HelpCircle size={16} color="var(--terracotta)" />
            <span>{t("profile.help")}</span>
          </span>
          <ChevronRight size={16} color="var(--muted-2)" />
        </button>
      </motion.div>

      <Toast show={helpToast} onHide={hideHelp}>
        {t("profile.helpSoon")}
      </Toast>
    </motion.div>
  );
}

// 5. ДЕТАЛЬНЫЙ ЭКРАН И БРОНИРОВАНИЕ
function Detail({ exp: raw, saved, inRoute, onBack, onToggleSave, onToggleRoute, onBook }) {
  const { t, loc, money, plural, fmtDuration } = useSettings();
  const exp = loc(raw);
  const self = !!raw.selfGuided;
  return (
    <motion.div className="gyg-scroll screen" {...SCREEN_IN}>
      <div className="detail-media">
        <motion.img src={exp.image} alt="" {...HERO_IMG} />
        <button className="icon-btn detail-back" onClick={onBack} aria-label={t("common.back")}>
          <ChevronLeft size={20} />
        </button>
        <button className="save-btn detail-save" onClick={() => onToggleSave(exp.id)} aria-label={saved ? t("common.unsave") : t("common.save")}>
          <SaveHeart saved={saved} />
        </button>
      </div>
      <motion.div className="screen-body" variants={STAGGER} initial="hidden" animate="show">
        <motion.div variants={RISE} className="kicker">{exp.type} · {exp.place}</motion.div>
        <motion.h1 variants={RISE} className="detail-title">{exp.title}</motion.h1>
        <motion.div variants={RISE} className="row wrap gap-14 mb-12 muted">
          <StarRow rating={exp.rating} />
          {exp.reviews > 0 && <span>{plural("pl.reviews", exp.reviews)}</span>}
          {exp.agencyName && <b>{exp.agencyName}</b>}
          <span className="row gap-4"><Clock size={14} /> {fmtDuration(durationMinutes(exp.duration))}</span>
        </motion.div>
        <motion.div variants={RISE} className="detail-chips">
          {exp.freeCancel && <span className="detail-chip green">{t("detail.freeCancel")}</span>}
          {exp.group && <span className="detail-chip"><Users size={13} /> {exp.group}</span>}
          {exp.lang && <span className="detail-chip"><Globe size={13} /> {exp.lang}</span>}
        </motion.div>
        <motion.p variants={RISE} className="body-text">{exp.description}</motion.p>
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
            <div className="detail-chips mt-8">
              {exp.includes.map((i) => <span key={i} className="detail-chip">{i}</span>)}
            </div>
          </>
        )}
        <div className="row mb-8"><MapPin size={16} /> <b>{t(self ? "detail.start" : "detail.meeting")}</b></div>
        <div className="muted mb-12">{exp.meeting}</div>
        <MiniMap lat={exp.lat} lng={exp.lng} label={exp.place} />
        {!self && exp.url && (
          <a className="route-link mt-12" href={exp.url} target="_blank" rel="noopener noreferrer">
            {t("detail.agencySite", { name: exp.agencyName || "" })} →
          </a>
        )}
      </motion.div>
      <motion.div
        className="sticky-buy"
        initial={{ y: "100%" }}
        animate={{ y: 0 }}
        transition={{ ...SPRING, delay: 0.15 }}
      >
        <div>
          {self ? (
            <div className="price price-lg">{t("price.free")}</div>
          ) : exp.price == null ? (
            <div className="price">{t("price.request")}</div>
          ) : (
            <>
              <div className="muted t-xs">{t("common.from")}</div>
              <div className="price price-lg">{money(exp.price)}</div>
            </>
          )}
        </div>
        {self ? (
          <motion.button className="cta" whileTap={TAP} onClick={() => onToggleRoute(raw)}>
            <Ticker value={inRoute ? t("card.inRoute") : t("card.addRoute")} />
          </motion.button>
        ) : (
          <motion.button className="cta" whileTap={TAP} onClick={() => onBook(raw)}>{t("detail.pickDate")}</motion.button>
        )}
      </motion.div>
    </motion.div>
  );
}

function Booking({ exp: raw, defaults, onBack, onConfirm }) {
  const { t, loc, money, plural, fmtDuration, lang } = useSettings();
  const exp = loc(raw);
  const dates = useMemo(() => upcomingDates(), []);
  const [date, setDate] = useState(dates[1]?.key || dates[0].key);
  const [guests, setGuests] = useState(2);
  const [name, setName] = useState(defaults?.name || "");
  const [contact, setContact] = useState(defaults?.contact || "");
  const total = exp.price == null ? null : exp.price * guests; // в USD; null — цена по запросу
  const nameOk = name.trim().length >= 2;
  const contactOk = contact.trim().length >= 5;
  const canSubmit = nameOk && contactOk;
  const [sending, setSending] = useState(false);
  const [sendError, setSendError] = useState(false);
  const [tried, setTried] = useState(false); // нажимали «отправить» с пустыми полями
  const nameRef = useRef(null);
  const contactRef = useRef(null);

  async function submit() {
    if (sending) return;
    if (!canSubmit) {
      setTried(true);
      (nameOk ? contactRef : nameRef).current?.focus();
      return;
    }
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
    <motion.div className="gyg-scroll screen" {...SCREEN_IN}>
      <div className="screen-head">
        <button className="icon-btn" onClick={onBack} aria-label={t("common.back")}><ChevronLeft size={20} /></button>
        <b>{t("booking.title")}</b>
      </div>
      <div className="screen-body">
        <div className="booking-summary">
          <img src={exp.image} alt="" />
          <div>
            <div className="booking-summary-title">{exp.title}</div>
            <div className="muted">{fmtDuration(durationMinutes(exp.duration))} · {exp.place}</div>
          </div>
        </div>
        <b>{t("booking.when")}</b>
        <div className="h-scroll date-row">
          {dates.map((d, i) => (
            <motion.button
              key={d.key}
              className={`date-chip ${date === d.key ? "on" : ""}`}
              aria-pressed={date === d.key}
              whileTap={TAP}
              onClick={() => setDate(d.key)}
            >
              {date === d.key && <motion.span layoutId="date-thumb" className="date-thumb" transition={SPRING} />}
              <span className="date-label date-day">{dayLabel(d, i)}</span>
              <span className="date-label date-num">{d.date.getDate()}</span>
            </motion.button>
          ))}
        </div>

        <b>{t("booking.guests")}</b>
        <div className="guests-box">
          <span className="row"><Users size={16} /> <Ticker value={plural("pl.guests", guests)} /></span>
          <div className="row">
            <button className="icon-btn" aria-label={t("booking.fewer")} disabled={guests <= 1} onClick={() => setGuests((g) => Math.max(1, g - 1))}>−</button>
            <button className="icon-btn" aria-label={t("booking.more")} disabled={guests >= 10} onClick={() => setGuests((g) => Math.min(10, g + 1))}>+</button>
          </div>
        </div>

        <div className="row between mb-16">
          {total == null ? (
            <>
              <span className="muted">{plural("pl.guests", guests)}</span>
              <b className="t-md">{t("price.request")}</b>
            </>
          ) : (
            <>
              <span className="muted">{money(exp.price)} × {plural("pl.guests", guests)}</span>
              <b className="t-lg"><Ticker value={money(total)} /></b>
            </>
          )}
        </div>

        <b>{t("booking.contacts")}</b>
        <div className="stack-10 form-fields">
          <div className={`search ${tried && !nameOk ? "is-invalid" : ""}`}>
            <User size={18} color="var(--muted-2)" />
            <input
              ref={nameRef}
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={t("booking.name")}
              autoComplete="name"
              aria-invalid={tried && !nameOk}
            />
          </div>
          <div className={`search ${tried && !contactOk ? "is-invalid" : ""}`}>
            <Bell size={18} color="var(--muted-2)" />
            <input
              ref={contactRef}
              value={contact}
              onChange={(e) => setContact(e.target.value)}
              placeholder={t("booking.contact")}
              autoComplete="tel"
              aria-invalid={tried && !contactOk}
            />
          </div>
        </div>
        <div className="muted mb-16">{t("booking.note")}</div>

        <Reveal show={sendError}>
          <div className="form-error" role="alert">{t("booking.error")}</div>
        </Reveal>

        <Reveal show={!canSubmit}>
          <div className={`form-hint ${tried ? "is-error" : ""}`} role={tried ? "alert" : undefined}>
            {t("booking.fillHint")}
          </div>
        </Reveal>

        <motion.button className="cta" disabled={sending} whileTap={TAP} onClick={submit}>
          {sending
            ? t("booking.sending")
            : total == null
              ? t("booking.submitRequest")
              : t("booking.submit", { total: money(total) })}
        </motion.button>
      </div>
    </motion.div>
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
    <motion.div className="gyg-scroll screen" {...SCREEN_IN}>
      <div className="screen-head">
        <button className="icon-btn" onClick={onClose} aria-label={t("common.back")}><ChevronLeft size={20} /></button>
        <b>{t("ticket.title")}</b>
      </div>
      <div className="screen-body">
        <motion.div
          className="ticket"
          initial={{ opacity: 0, y: 28, scale: 0.96 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ type: "spring", stiffness: 260, damping: 22, delay: 0.1 }}
        >
          <img className="ticket-cover" src={exp.image} alt="" />
          <div className="ticket-body">
            {booking.status === "confirmed" ? (
              <div className="row ticket-status is-ok">
                <motion.span
                  className="ico"
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ type: "spring", stiffness: 500, damping: 14, delay: 0.35 }}
                >
                  <Check size={16} />
                </motion.span>
                {t("ticket.confirmed")}
              </div>
            ) : (
              <div className="row ticket-status">
                <Clock size={16} /> {t("ticket.pending")}
              </div>
            )}
            <div className="ticket-title">{exp.title}</div>
            <div className="ticket-lines">
              <div className="row muted"><Calendar size={14} /> {fmtDate(booking.date)} · {plural("pl.guests", booking.guests)}</div>
              <div className="row top muted"><MapPin size={14} className="ico-top" /> {exp.meeting}</div>
              {booking.name && (
                <div className="row muted"><User size={14} /> {booking.name} · {booking.contact}</div>
              )}
              <div className="row muted"><Ticket size={14} /> {t("ticket.payOnSite")} <b className="ink">{booking.total == null ? t("price.request") : money(booking.total)}</b></div>
            </div>
          </div>
          <div className="ticket-cut" />
          <div className="ticket-code">
            <span className="muted t-xs">{t("ticket.code")}</span>
            <div>{booking.code}</div>
          </div>
        </motion.div>

        <Reveal show={cancelError}>
          <div className="form-error mt-16" role="alert">{t("ticket.cancelError")}</div>
        </Reveal>

        {onCancel && (
          <AnimatePresence mode="wait" initial={false}>
            {confirmCancel ? (
              <motion.div
                key="confirm"
                className="row mt-16"
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
                transition={{ duration: 0.18, ease: EASE_OUT }}
              >
                <motion.button className="pill grow-btn" whileTap={TAP} disabled={cancelling} onClick={() => setConfirmCancel(false)}>
                  {t("ticket.keep")}
                </motion.button>
                <motion.button className="cta grow-btn" whileTap={TAP} disabled={cancelling} onClick={doCancel}>
                  {t("ticket.confirmCancel")}
                </motion.button>
              </motion.div>
            ) : (
              <motion.button
                key="ask"
                className="text-btn text-btn-muted ticket-cancel"
                onClick={() => setConfirmCancel(true)}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.15 }}
              >
                {t("ticket.cancel")}
              </motion.button>
            )}
          </AnimatePresence>
        )}
      </div>
    </motion.div>
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
const DEFAULT_ROUTE = ["self-sulaiman", "self-center", "self-jayma"];

// При входе гостевые данные не теряются, а сливаются с тем, что лежит в аккаунте.
function mergeRoute(serverRoute, localRoute) {
  const local = localRoute || [];
  const server = serverRoute || [];
  if (server.length === 0) return local;
  // маршрут не трогали — просто берём свой из аккаунта
  const untouched = local.length === DEFAULT_ROUTE.length && local.every((id, i) => id === DEFAULT_ROUTE[i]);
  if (untouched) return server;
  return [...local, ...server.filter((id) => !local.includes(id))];
}

function mergeBookings(local, remote) {
  const byCode = new Map((local || []).map((b) => [b.code, b]));
  // с сервера приходит актуальный статус — он главнее сохранённого на устройстве
  for (const r of remote) byCode.set(r.code, { ...byCode.get(r.code), ...r });
  return [...byCode.values()].sort((a, b) => String(b.createdAt || "").localeCompare(String(a.createdAt || "")));
}

// ГЛАВНЫЙ ЭКСПОРТ
export default function App() {
  const { t, lang, travelMode, setTravelMode } = useSettings();
  const { allTours, byId } = useContent();
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
  // экран поверх вкладок без своего тура: "saved" | "tips" | null
  const [page, setPage] = useState(null);

  const [routeIds, setRouteIds] = useState(() => initialStore?.route || DEFAULT_ROUTE);
  const routeItems = useMemo(() => routeIds.map(byId).filter(Boolean), [routeIds, byId]);
  const setRouteItems = (items) => setRouteIds(items.map((x) => x.id));

  // ── Аккаунт ───────────────────────────────────────────────────
  // Вход — не косметика: избранное, маршрут и брони переезжают в аккаунт и
  // возвращаются на любом устройстве. Выход убирает личное с этого устройства.
  const { user: authUser } = useAuth();
  const [account, setAccount] = useState(null); // имя и контакт для подстановки в бронь
  const pulledFor = useRef(null); // чьи данные начали тянуть
  const readyFor = useRef(null);  // чьи данные уже слиты — только после этого можно писать

  useEffect(() => {
    const uid = authUser?.id ?? null;

    if (!uid) {
      // чистим устройство только если данные успели уехать в аккаунт:
      // иначе (вошли без сети и вышли) стёрли бы то, чего больше нигде нет
      const wasSynced = readyFor.current;
      pulledFor.current = null;
      readyFor.current = null;
      if (wasSynced) {
        setAccount(null);
        setSaved(new Set());
        setRouteIds(DEFAULT_ROUTE);
        setBookings([]);
        setTicket(null);
      }
      return;
    }
    if (pulledFor.current === uid) return;
    pulledFor.current = uid;

    let cancelled = false;
    (async () => {
      try {
        const [profile, remote] = await Promise.all([fetchProfile(uid), fetchMyBookings(uid, byId)]);
        if (cancelled) return;
        setAccount({ name: profile?.name || "", contact: profile?.contact || "" });
        setSaved((prev) => new Set([...(profile?.saved || []), ...prev]));
        setRouteIds((prev) => mergeRoute(profile?.route, prev));
        setBookings((prev) => mergeBookings(prev, remote));
        readyFor.current = uid; // слияние прошло — теперь можно писать в базу
      } catch (err) {
        // не смогли прочитать — ничего не пишем, чтобы не затереть аккаунт пустотой
        console.warn("Не удалось загрузить данные аккаунта", err);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [authUser, byId]);

  // Изменения уходят в аккаунт с задержкой, чтобы не писать на каждый тап
  useEffect(() => {
    const uid = authUser?.id;
    if (!uid || readyFor.current !== uid) return;
    const id = setTimeout(() => {
      saveProfile(uid, { saved: [...saved], route: routeIds }).catch((err) =>
        console.warn("Не удалось сохранить избранное в аккаунт", err),
      );
    }, 800);
    return () => clearTimeout(id);
  }, [saved, routeIds, authUser]);

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
  }, [tab, selected, bookingExp, ticket, page]);

  // Системная «назад» закрывает верхний экран, а не приложение:
  // каждое открытие кладёт запись в history, popstate снимает её.
  const depth = (page ? 1 : 0) + (selected ? 1 : 0) + (bookingExp ? 1 : 0) + (ticket ? 1 : 0);
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
      else if (page) setPage(null);
      // экран уже закрыт кодом (бронь подтверждена/отменена) — запись лишняя, идём дальше назад
      else window.history.back();
    }
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, [ticket, bookingExp, selected, page]);
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
    // контакты запоминаются в аккаунте — в следующий раз не вводить заново
    if (authUser && readyFor.current === authUser.id) {
      setAccount({ name: entry.name, contact: entry.contact });
      saveProfile(authUser.id, { name: entry.name, contact: entry.contact }).catch(() => {});
    }
    setBookingExp(null);
    setSelected(null);
    setPage(null);
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
  if (bookingExp)
    return <Booking exp={bookingExp} defaults={account} onBack={closeScreen} onConfirm={confirmBooking} />;
  if (selected) {
    return (
      <Detail
        exp={selected}
        saved={saved.has(selected.id)}
        onBack={closeScreen}
        onToggleSave={toggleSave}
        onBook={setBookingExp}
        inRoute={routeIds.includes(selected.id)}
        onToggleRoute={toggleRoute}
      />
    );
  }
  if (page === "saved") {
    return (
      <SavedView
        saved={saved}
        routeItems={routeItems}
        onBack={closeScreen}
        onOpen={setSelected}
        onToggleSave={toggleSave}
        onToggleRoute={toggleRoute}
        onGoToTours={() => {
          closeScreen();
          setTab("tours");
        }}
      />
    );
  }
  if (page === "tips") return <TipsScreen onBack={closeScreen} />;
  if (page === "login") return <LoginScreen onBack={closeScreen} />;

  return (
    <div className="gyg-app ornament-bg">
      {tab === "home" && <HomeView onGoTo={setTab} onOpenExp={setSelected} onOpenTips={() => setPage("tips")} />}

      {tab === "map" && <ExploreMap items={allTours} onOpen={setSelected} />}

      {tab === "route" && (
        <RouteView items={routeItems} setItems={setRouteItems} onGoToTours={() => setTab("tours")} />
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
          onOpenSavedList={() => setPage("saved")}
          onOpenLogin={() => setPage("login")}
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
