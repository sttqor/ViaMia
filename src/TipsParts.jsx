// Части экрана «Советы»: дастархан, пиала-прогресс, ситуации по шагам, знаки орнамента.
// Рисунки — тонкая линия одной толщины, цвета только токенами (тёмная тема — сама).
import { useId, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { ChevronRight } from "lucide-react";
import { useSettings } from "./settings-context";
import { TABLE_ITEMS, TIPS } from "./tips-data.js";

const EASE_OUT = [0.22, 1, 0.36, 1];
const tipById = (id) => TIPS.find((x) => x.id === id);

// ── знаки вида совета: көз (ромб с точкой) — обязательно, кочкор мүйүз — принято, перечёркнутый ромб — не принято
export function KindGlyph({ kind }) {
  return (
    <svg className="kind-glyph" viewBox="0 0 10 10" aria-hidden="true">
      {kind === "do" ? (
        <path d="M1.2 9C1.2 4.6 3.6 1.4 6.4 2.2c2.4.7 2.2 4.2-.2 4.4-1.3.1-1.6-1.5-.4-1.8" />
      ) : (
        <>
          <path d="M5 .9 9.1 5 5 9.1.9 5Z" />
          {kind === "must" ? <circle cx="5" cy="5" r="1" className="fill" /> : <path d="M2.6 7.4 7.4 2.6" />}
        </>
      )}
    </svg>
  );
}

// ── пиала в шапке: наполняется по мере прочитанного
export function PialaProgress({ done, total }) {
  const { t } = useSettings();
  const clip = `piala${useId().replace(/[^w-]/g, "")}`; // в id из useId есть «:», url(#…) с ними не работает
  const pct = total ? Math.min(1, done / total) : 0;
  const top = 6 + 14 * (1 - pct);
  const full = pct >= 1;
  return (
    <div className={`piala-progress ${full ? "is-full" : ""}`} title={t("tips.progress", { n: done, total })}>
      <svg viewBox="0 0 30 24" aria-hidden="true">
        <defs>
          <clipPath id={clip}>
            <path d="M2 6h26c-1 9-7 14-13 14S3 15 2 6Z" />
          </clipPath>
        </defs>
        {/* маска на группе: motion двигает чай через transform, и маска на самом rect уехала бы вместе с ним */}
        <g clipPath={`url(#${clip})`}>
          <motion.rect
            className="piala-tea"
            x="0"
            width="30"
            height="24"
            initial={false}
            animate={{ y: top }}
            transition={{ duration: 0.6, ease: EASE_OUT }}
          />
        </g>
        <path className="piala-line" d="M2 6h26c-1 9-7 14-13 14S3 15 2 6Zm8 14 1 3h8l1-3" />
      </svg>
      <span className="t-xs">{full ? t("tips.ready") : `${done}/${total}`}</span>
    </div>
  );
}

// ── дастархан: стол сверху, предметы — кнопки, совет появляется под столом
const ITEM_POS = {
  tor: [160, 18],
  teapot: [70, 98],
  bread: [160, 100],
  plate: [250, 100],
  piala: [112, 158],
  hands: [208, 160],
};
const LABEL_DY = { tor: 30, teapot: 36, bread: 46, plate: 30, piala: 30, hands: 30 };

function ItemArt({ id }) {
  switch (id) {
    case "tor": // подушка на почётном месте
      return (
        <>
          <rect x="-42" y="-9" width="84" height="18" rx="9" />
          <path d="M-28 -9v18M28 -9v18M-14 0h28" />
        </>
      );
    case "teapot":
      return (
        <>
          <path d="M-20 2c0-14 8-20 20-20s20 6 20 20c0 12-8 18-20 18S-20 14-20 2Z" />
          <path d="M-9-15q9-7 18 0" />
          <circle cx="0" cy="-21" r="2.5" />
          <path d="M-19 4c-6 0-9-4-12-9M19-4c11-1 12 15 0 14" />
        </>
      );
    case "bread": // нан со штампом-узором в центре
      return (
        <>
          <circle r="30" />
          <circle r="15" />
          {Array.from({ length: 10 }, (_, i) => {
            const a = (i / 10) * Math.PI * 2;
            return <circle key={i} className="fill" cx={Math.cos(a) * 22.5} cy={Math.sin(a) * 22.5} r="1.3" />;
          })}
          <circle className="fill" r="1.3" cx="-5" />
          <circle className="fill" r="1.3" cx="5" />
          <circle className="fill" r="1.3" cy="-5" />
          <circle className="fill" r="1.3" cy="5" />
        </>
      );
    case "plate": // тарелка с горкой боорсоков
      return (
        <>
          <ellipse cy="8" rx="30" ry="11" />
          <ellipse cy="8" rx="21" ry="6.5" />
          <rect x="-14" y="-4" width="10" height="10" rx="3" />
          <rect x="-2" y="-6" width="10" height="10" rx="3" />
          <rect x="-8" y="-15" width="10" height="10" rx="3" />
          <rect x="7" y="-1" width="9" height="9" rx="3" />
        </>
      );
    case "piala":
      return (
        <>
          <path d="M-17-6h34c-1 12-9 17-17 17s-16-5-17-17Z" />
          <path d="M-6 11l1 3h10l1-3M-12 0l3 2 3-2 3 2 3-2 3 2 3-2 3 2" />
        </>
      );
    default: // две раскрытые ладони — бата
      return (
        <>
          <rect x="-7" y="-14" width="14" height="27" rx="7" transform="translate(-9 0) rotate(-14)" />
          <rect x="-7" y="-14" width="14" height="27" rx="7" transform="translate(9 0) rotate(14)" />
          <path d="M-14 4c-4-1-6-4-6-8M14 4c4-1 6-4 6-8" />
        </>
      );
  }
}

export function Dastarkhan({ onRead }) {
  const { t, loc } = useSettings();
  const [sel, setSel] = useState(null);
  const item = TABLE_ITEMS.find((x) => x.id === sel);
  const tip = item ? loc(tipById(item.tip)) : null;

  const pick = (it) => {
    setSel(it.id);
    onRead(it.tip);
  };

  return (
    <section className="dastarkhan">
      <svg className="dastarkhan-art" viewBox="0 0 320 214" role="group" aria-label={t("tips.table")}>
        <rect className="cloth" x="14" y="36" width="292" height="164" rx="28" />
        <rect className="cloth-inner" x="24" y="46" width="272" height="144" rx="20" />
        {TABLE_ITEMS.map((it) => {
          const [x, y] = ITEM_POS[it.id];
          const on = sel === it.id;
          const label = loc(tipById(it.tip)).title;
          return (
            <g
              key={it.id}
              className={`table-item ${on ? "is-on" : ""}`}
              transform={`translate(${x} ${y})`}
              role="button"
              tabIndex={0}
              aria-pressed={on}
              aria-label={`${it.word} — ${label}`}
              onClick={() => pick(it)}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  pick(it);
                }
              }}
            >
              <circle className="hit" r="34" />
              <g className="art">
                <ItemArt id={it.id} />
              </g>
              <text className="word" y={LABEL_DY[it.id]} textAnchor="middle">
                {it.word}
              </text>
            </g>
          );
        })}
      </svg>
      <AnimatePresence mode="wait" initial={false}>
        {tip ? (
          <motion.div
            key={tip.id}
            className="dastarkhan-tip"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.22, ease: EASE_OUT }}
          >
            <b>{tip.title}</b>
            <p>{tip.text}</p>
          </motion.div>
        ) : (
          <motion.p key="hint" className="dastarkhan-hint muted t-sm" exit={{ opacity: 0 }}>
            {t("tips.tableHint")}
          </motion.p>
        )}
      </AnimatePresence>
    </section>
  );
}

// ── ситуации: список и история по шагам
export function SceneList({ scenes, read, onOpen }) {
  const { loc } = useSettings();
  return (
    <div className="card scene-list">
      {scenes.map((raw) => {
        const s = loc(raw);
        return (
          <button key={s.id} type="button" className="scene-row" onClick={() => onOpen(raw)}>
            <s.Icon size={18} color="var(--terracotta)" />
            <span className="grow">{s.title}</span>
            {read.has(`scene:${s.id}`) && <KindGlyph kind="must" />}
            <ChevronRight size={16} color="var(--muted-2)" />
          </button>
        );
      })}
    </div>
  );
}

export function SceneView({ scene, onDone }) {
  const { t, loc } = useSettings();
  const [i, setI] = useState(0);
  const [dir, setDir] = useState(1);
  const steps = scene.steps.map((s) => loc(s));
  const last = i === steps.length - 1;
  const go = (d) => {
    setDir(d);
    setI((n) => n + d);
  };

  return (
    <section className="scene">
      <h2 className="scene-title">{loc(scene).title}</h2>
      <div className="scene-bars" aria-hidden="true">
        {steps.map((_, k) => (
          <span key={k} className={k <= i ? "is-on" : ""} />
        ))}
      </div>
      <div className="scene-step-wrap">
        <AnimatePresence mode="wait" initial={false} custom={dir}>
          <motion.div
            key={i}
            className="scene-step"
            initial={{ opacity: 0, x: 20 * dir }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 * dir }}
            transition={{ duration: 0.22, ease: EASE_OUT }}
          >
            <span className="muted t-xs">{t("tips.step", { i: i + 1, n: steps.length })}</span>
            <h3>{steps[i].title}</h3>
            <p>{steps[i].text}</p>
          </motion.div>
        </AnimatePresence>
      </div>
      <div className="scene-actions">
        <button type="button" className="cta ghost" disabled={i === 0} onClick={() => go(-1)}>
          {t("common.back")}
        </button>
        <button type="button" className="cta" onClick={() => (last ? onDone() : go(1))}>
          {last ? t("tips.done") : t("tips.next")}
        </button>
      </div>
    </section>
  );
}
