import { useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { ChevronDown, ChevronUp, Clock, Compass, MapPin, MoreHorizontal, Route as RouteIcon, Trash2 } from "lucide-react";
import { planRoute } from "../route-plan";
import { useSettings } from "../settings-context";
import { SPRING, EASE_OUT, TAP } from "../components/shared";
import { Reveal, Ticker } from "../components/ui.jsx";

// 2. МАРШРУТ: ЧИСТЫЙ ПЛАНИРОВЩИК (БЕЗ ВЫБОРА МЕСТ СНИЗУ)
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

// onNavigate(stops) — открыть маршрут дня на карте приложения (не во внешних картах)
export function RouteView({ items, setItems, onGoToTours, onNavigate }) {
  const { t, plural, loc, fmtDuration, locale } = useSettings();
  const [expandedId, setExpandedId] = useState(null);
  const [menuId, setMenuId] = useState(null);

  const { legs, totalKm, totalMin, times } = useMemo(() => planRoute(items), [items]);

  const fmtKm = (km) => t("unit.km", { n: km.toLocaleString(locale, { maximumFractionDigits: 1, minimumFractionDigits: 1 }) });

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
              onClick={() =>
                onNavigate(
                  items
                    .filter((i) => i.lat != null && i.lng != null)
                    .map((i) => ({ lng: i.lng, lat: i.lat, label: loc(i).title })),
                )
              }
            >
              {t("route.navigate", { stops: plural("pl.stops", items.length) })}
            </motion.button>
          </>
        )}
      </div>
    </div>
  );
}
