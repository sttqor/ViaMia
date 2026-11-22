import { useMemo } from "react";
import { AnimatePresence, motion } from "motion/react";
import { BadgeCheck, Search } from "lucide-react";
import { CATEGORIES } from "../data";
import { agenciesOf } from "../agencies";
import { useContent } from "../content-context";
import { useSettings } from "../settings-context";
import { SPRING, inView } from "../components/shared";
import { ModeSwitch, ChipRow, ExperienceCard } from "../components/ui.jsx";

// 3. ТУРЫ: два списка. «Сам» — бесплатные самостоятельные туры (в маршрут),
// «с гидом» — туры агентств с бронью и сами агентства. Поиск и фильтры общие.
function AgencyBlock({ onPick }) {
  const { t, plural } = useSettings();
  const { tours } = useContent();
  const agencies = useMemo(() => agenciesOf(tours), [tours]);
  if (agencies.length === 0) return null;
  return (
    <div className="agency-block">
      <h2 className="section-title">{t("home.agencies")}</h2>
      <div className="stack-10">
        {agencies.map((a, i) => (
          <motion.div key={a.name} className="card agency-card" {...inView(i)}>
            {a.logo ? (
              <img className="agency-logo" src={a.logo} alt="" />
            ) : (
              <div className="agency-logo">{a.name.slice(0, 1)}</div>
            )}
            <div className="grow">
              <div className="row gap-6 t-md b">
                {a.name}
                {a.verified && <BadgeCheck size={15} color="var(--green)" aria-label={t("label.verified")} />}
              </div>
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

export function ToursView({
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
