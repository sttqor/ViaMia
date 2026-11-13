import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import { Compass, Users } from "lucide-react";
import { useSettings } from "./settings-context";

const SPRING = { type: "spring", stiffness: 400, damping: 32 };
const EASE_OUT = [0.22, 1, 0.36, 1];

// Первый экран: «как путешествуешь?» — сам или с гидом.
// Сначала появляется заголовок, потом карточки по очереди. Выбранная чуть
// увеличивается, вторая гаснет, и только после этого открывается главная.
export function Onboarding({ onPick }) {
  const { t } = useSettings();
  const [picked, setPicked] = useState(null);
  const timer = useRef();
  useEffect(() => () => clearTimeout(timer.current), []);

  const options = [
    { id: "self", Icon: Compass, title: t("onb.selfTitle"), text: t("onb.selfText"), tag: t("onb.selfTag") },
    { id: "guided", Icon: Users, title: t("onb.guidedTitle"), text: t("onb.guidedText"), tag: t("onb.guidedTag") },
  ];

  function pick(id) {
    if (picked) return;
    setPicked(id);
    timer.current = setTimeout(() => onPick(id), 280);
  }

  return (
    <div className="onb">
      <motion.div
        className="onb-head"
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, ease: EASE_OUT }}
      >
        <span className="onb-kicker">{t("onb.kicker")}</span>
        <h1>{t("onb.title")}</h1>
        <p>{t("onb.text")}</p>
      </motion.div>

      <div className="onb-cards" role="radiogroup" aria-label={t("mode.label")}>
        {options.map((o, i) => {
          const isPicked = picked === o.id;
          const target = !picked
            ? { opacity: 1, y: 0, scale: 1 }
            : isPicked
              ? { opacity: 1, y: 0, scale: 1.02 }
              : { opacity: 0.35, y: 0, scale: 1 };
          return (
            <motion.button
              key={o.id}
              type="button"
              role="radio"
              aria-checked={isPicked}
              className={`onb-card ${isPicked ? "is-on" : ""}`}
              initial={{ opacity: 0, y: 16 }}
              animate={target}
              transition={picked ? SPRING : { ...SPRING, delay: 0.14 + i * 0.08 }}
              whileTap={picked ? undefined : { scale: 0.97 }}
              onClick={() => pick(o.id)}
            >
              <span className="onb-icon"><o.Icon size={24} /></span>
              <span className="onb-card-title">{o.title}</span>
              <span className="onb-card-text">{o.text}</span>
              <span className="onb-card-tag">{o.tag}</span>
            </motion.button>
          );
        })}
      </div>
    </div>
  );
}
