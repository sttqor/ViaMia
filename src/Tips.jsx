import { useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { ChevronDown, ChevronLeft, Shuffle } from "lucide-react";
import { useSettings } from "./settings-context";
import { TIP_TOPICS, TIPS } from "./tips-data.js";
import "./Tips.css";

const SPRING = { type: "spring", stiffness: 400, damping: 32 };
const EASE_OUT = [0.22, 1, 0.36, 1];
const topicOf = (id) => TIP_TOPICS.find((x) => x.id === id) || TIP_TOPICS[0];

function dayIndex() {
  const now = new Date();
  return Math.floor((now - new Date(now.getFullYear(), 0, 0)) / 86400000);
}

function KindTag({ kind }) {
  const { t } = useSettings();
  return <span className={`tip-tag is-${kind}`}>{t(`tips.kind.${kind}`)}</span>;
}

// Совет дня: меняется раз в сутки, кнопкой можно пролистать дальше
function TipOfDay() {
  const { t, loc } = useSettings();
  const [i, setI] = useState(() => dayIndex() % TIPS.length);
  const tip = loc(TIPS[i]);
  const Icon = topicOf(tip.topic).Icon;

  return (
    <motion.section
      className="tip-hero"
      initial={{ opacity: 0, y: 16, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.45, ease: EASE_OUT }}
    >
      <span className="tip-hero-glow" aria-hidden />
      <div className="tip-hero-top">
        <span className="tip-hero-kicker">{t("tips.ofDay")}</span>
        <motion.button
          type="button"
          className="tip-hero-next"
          aria-label={t("tips.another")}
          whileTap={{ scale: 0.9, rotate: -20 }}
          onClick={() => setI((n) => (n + 1) % TIPS.length)}
        >
          <Shuffle size={18} />
        </motion.button>
      </div>
      <AnimatePresence mode="wait" initial={false}>
        <motion.div
          key={tip.id}
          initial={{ opacity: 0, x: 24 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -24 }}
          transition={{ duration: 0.22, ease: "easeOut" }}
        >
          <div className="tip-hero-icon">
            <Icon size={22} />
          </div>
          <h2 className="tip-hero-title">{tip.title}</h2>
          <p className="tip-hero-text">{tip.text}</p>
        </motion.div>
      </AnimatePresence>
    </motion.section>
  );
}

// ref нужен AnimatePresence mode="popLayout" (в React 19 приходит обычным пропом)
function TipCard({ tip: raw, open, onToggle, ref }) {
  const { loc } = useSettings();
  const tip = loc(raw);
  const Icon = topicOf(tip.topic).Icon;
  return (
    <motion.article
      ref={ref}
      layout
      className={`card tip-card ${open ? "is-open" : ""}`}
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.96 }}
      transition={{ duration: 0.28, ease: EASE_OUT, layout: SPRING }}
    >
      <motion.button layout="position" type="button" className="tip-row" aria-expanded={open} onClick={onToggle}>
        <span className="tip-icon">
          <Icon size={20} />
        </span>
        <span className="tip-head">
          <KindTag kind={tip.kind} />
          <span className="tip-title">{tip.title}</span>
        </span>
        <motion.span className="tip-chev" animate={{ rotate: open ? 180 : 0 }} transition={SPRING}>
          <ChevronDown size={18} />
        </motion.span>
      </motion.button>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            key="body"
            className="tip-body"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.28, ease: EASE_OUT }}
          >
            <p>{tip.text}</p>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.article>
  );
}

export function TipsScreen({ onBack }) {
  const { t, loc, plural } = useSettings();
  const [topic, setTopic] = useState("all");
  const [openIds, setOpenIds] = useState(() => new Set());
  const list = topic === "all" ? TIPS : TIPS.filter((x) => x.topic === topic);

  const toggle = (id) =>
    setOpenIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  return (
    <motion.div
      className="gyg-scroll screen tips-screen"
      initial={{ opacity: 0, x: 40 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.32, ease: EASE_OUT }}
    >
      <div className="screen-head">
        <button className="icon-btn" onClick={onBack} aria-label={t("common.back")}>
          <ChevronLeft size={20} />
        </button>
        <span className="grow">
          <b>{t("tips.title")}</b>
          <span className="muted t-xs">{t("tips.subtitle")}</span>
        </span>
      </div>

      <div className="screen-body">
        <TipOfDay />

        <div className="h-scroll tip-chips">
          {TIP_TOPICS.map((c) => {
            const on = topic === c.id;
            return (
              <button
                key={c.id}
                type="button"
                className={`pill chip ${on ? "is-on" : ""}`}
                aria-pressed={on}
                onClick={() => setTopic(c.id)}
              >
                {on && <motion.span layoutId="tip-pill" className="chip-thumb" transition={SPRING} />}
                <span className="chip-label">
                  <c.Icon size={14} /> {loc(c).label}
                </span>
              </button>
            );
          })}
        </div>

        <div className="tip-count muted t-sm">{plural("pl.tips", list.length)}</div>

        <motion.div layout className="tip-list">
          <AnimatePresence mode="popLayout">
            {list.map((tip) => (
              <TipCard key={tip.id} tip={tip} open={openIds.has(tip.id)} onToggle={() => toggle(tip.id)} />
            ))}
          </AnimatePresence>
        </motion.div>

        <p className="tip-foot muted t-xs">{t("tips.note")}</p>
      </div>
    </motion.div>
  );
}
