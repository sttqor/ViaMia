import { useCallback, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { ChevronLeft, Heart, Route as RouteIcon, Search, Undo2 } from "lucide-react";
import { CATEGORIES } from "../data";
import { useContent } from "../content-context";
import { useSettings } from "../settings-context";
import { flyToRoute } from "../flyToRoute";
import { Toast } from "../Toast";
import { SPRING, EASE_OUT, SCREEN_IN, TAP } from "../components/shared";
import { Ticker, ChipRow, ExperienceCard } from "../components/ui.jsx";

// ИЗБРАННОЕ: отдельный экран из профиля, устроен как вкладка «Туры»
export function SavedView({ saved, routeItems, onBack, onOpen, onToggleSave, onToggleRoute, onGoToTours }) {
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
            onClick={(e) => {
              const from = e.currentTarget;
              notInRoute.slice(0, 4).forEach((x, i) => flyToRoute({ from, image: x.image, delay: i * 0.08 }));
              notInRoute.forEach(onToggleRoute);
            }}
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
