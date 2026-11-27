import { Suspense, lazy } from "react";
import { AnimatePresence, motion } from "motion/react";
import { BadgeCheck, Check, Heart, Plus, Star } from "lucide-react";
import { durationMinutes } from "../i18n";
import { useSettings } from "../settings-context";
import { flyToRoute } from "../flyToRoute";
import { Segmented } from "../Segmented";
import { ErrorBoundary, Loader } from "../Status.jsx";
import { SPRING, EASE_OUT, TAP } from "./shared";

// Карта (maplibre, ~1 МБ) грузится отдельным файлом — только когда её открыли
const ExploreMapLazy = lazy(() => import("../OshMap").then((m) => ({ default: m.ExploreMap })));
const MiniMapLazy = lazy(() => import("../OshMap").then((m) => ({ default: m.MiniMap })));
export function ExploreMap(props) {
  return (
    <ErrorBoundary>
      <Suspense fallback={<div className="map-wrap"><Loader /></div>}>
        <ExploreMapLazy {...props} />
      </Suspense>
    </ErrorBoundary>
  );
}
export function MiniMap(props) {
  return (
    <ErrorBoundary>
      <Suspense fallback={<div className="mini-map" />}>
        <MiniMapLazy {...props} />
      </Suspense>
    </ErrorBoundary>
  );
}

// Сердечко: при добавлении в избранное — короткий «прыжок»
export function SaveHeart({ saved }) {
  return (
    <motion.span
      key={saved ? "on" : "off"}
      className="ico"
      initial={saved ? { scale: 0.5 } : false}
      animate={{ scale: 1 }}
      transition={{ type: "spring", bounce: 0, duration: 0.3 }}
    >
      <Heart size={18} fill={saved ? "var(--terracotta)" : "none"} color={saved ? "var(--terracotta)" : "var(--ink)"} />
    </motion.span>
  );
}

// Плавное раскрытие по высоте (короткие блоки)
export function Reveal({ show, children, ...rest }) {
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
export function Ticker({ value }) {
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
export function ModeSwitch() {
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
export function ChipRow({ items, value, onChange, layoutId }) {
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

export function StarRow({ rating }) {
  if (rating == null) return null; // своих отзывов пока нет
  return (
    <span className="row gap-4 t-sm">
      <Star size={14} fill="var(--gold)" color="var(--gold)" />
      <b>{rating.toFixed(1)}</b>
    </span>
  );
}

export function ExperienceCard({ exp: raw, saved, inRoute, onOpen, onToggleSave, onToggleRoute }) {
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
          {exp.place ? ` · ${exp.place}` : ""}
        </div>
        <button className="exp-title" onClick={() => onOpen(raw)}>
          {exp.title}
        </button>
        {exp.selfGuided ? null : exp.agencyName ? (
          <span className={`exp-org ${raw.agencyVerified ? "is-verified" : ""}`}>
            {raw.agencyVerified && <BadgeCheck size={14} aria-label={t("label.verified")} />}
            {raw.agencyVerified ? `${t("label.verified")} · ${exp.agencyName}` : exp.agencyName}
          </span>
        ) : (
          <StarRow rating={exp.rating} />
        )}
      </div>
      {/* отрывная линия, как у билета: бронь в приложении и есть билет */}
      <div className="exp-perf" aria-hidden />
      <div className="exp-stub">
        <div className="exp-price">
          {exp.selfGuided ? (
            <b>{t("price.free")}</b>
          ) : exp.price == null ? (
            <b className="t-md">{t("price.request")}</b>
          ) : (
            <>
              <span className="muted t-xs">{t("common.from")}</span>
              <b>{money(exp.price)}</b>
            </>
          )}
        </div>
        <motion.button
          className={`icon-btn exp-route ${inRoute ? "on" : ""}`}
          whileTap={TAP}
          aria-label={inRoute ? t("card.inRoute") : t("card.addRoute")}
          aria-pressed={inRoute}
          onClick={(e) => {
            if (!inRoute) flyToRoute({ from: e.currentTarget, image: exp.image });
            onToggleRoute(raw);
          }}
        >
          {inRoute ? <Check size={18} /> : <Plus size={18} />}
        </motion.button>
        <motion.button className="cta cta-sm" whileTap={TAP} onClick={() => onOpen(raw)}>
          {t("common.details")}
        </motion.button>
      </div>
    </article>
  );
}
