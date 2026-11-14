import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion } from "framer-motion";
import { Languages, Lightbulb, Map as MapIcon, Phone, RefreshCw, X } from "lucide-react";
import { useSettings } from "./settings-context";
import "./HomeBlocks.css";

const SPRING = { type: "spring", stiffness: 400, damping: 32 };

// Экстренные номера Кыргызстана
const SOS = [
  { num: "112", key: "sos.112" },
  { num: "103", key: "sos.103" },
  { num: "102", key: "sos.102" },
  { num: "101", key: "sos.101" },
];

// Быстрые кнопки: переводчик и советы пока «скоро», карта и SOS работают
export function QuickActions({ onGoTo }) {
  const { t } = useSettings();
  const [sos, setSos] = useState(false);
  const [soon, setSoon] = useState(false);

  useEffect(() => {
    if (!soon) return;
    const id = setTimeout(() => setSoon(false), 2200);
    return () => clearTimeout(id);
  }, [soon]);

  const items = [
    { id: "translator", Icon: Languages, label: t("quick.translator"), soon: true, onClick: () => setSoon(true) },
    { id: "tips", Icon: Lightbulb, label: t("quick.tips"), soon: true, onClick: () => setSoon(true) },
    { id: "map", Icon: MapIcon, label: t("quick.map"), onClick: () => onGoTo("map") },
    { id: "sos", Icon: Phone, label: t("quick.sos"), onClick: () => setSos(true) },
  ];

  return (
    <section className="quick">
      {items.map((it, i) => (
        <motion.button
          key={it.id}
          type="button"
          className={`quick-item ${it.id === "sos" ? "is-sos" : ""}`}
          initial={{ opacity: 0, y: 12 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.3, delay: i * 0.05, ease: "easeOut" }}
          whileTap={{ scale: 0.94 }}
          onClick={it.onClick}
        >
          <span className="quick-circle">
            <it.Icon size={22} />
            {it.soon && <span className="quick-soon">{t("quick.soonBadge")}</span>}
          </span>
          <span className="quick-label">{it.label}</span>
        </motion.button>
      ))}

      {soon && <div className="toast-note" role="status">{t("quick.soon")}</div>}

      {createPortal(
        <AnimatePresence>
          {sos && (
            <motion.div
              className="sos-overlay"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSos(false)}
            >
              <motion.div
                className="sos-sheet"
                role="dialog"
                aria-modal="true"
                aria-label={t("sos.title")}
                initial={{ y: "100%" }}
                animate={{ y: 0 }}
                exit={{ y: "100%" }}
                transition={SPRING}
                onClick={(e) => e.stopPropagation()}
              >
                <div className="sos-head">
                  <b>{t("sos.title")}</b>
                  <button className="icon-btn" onClick={() => setSos(false)} aria-label={t("facts.close")}>
                    <X size={18} />
                  </button>
                </div>
                {SOS.map((s) => (
                  <a key={s.num} className="sos-row" href={`tel:${s.num}`}>
                    <span className="sos-num">{s.num}</span>
                    <span>{t(s.key)}</span>
                    <Phone size={16} />
                  </a>
                ))}
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>,
        document.body
      )}
    </section>
  );
}

// Фразы на кыргызском: задел под быстрый переводчик
const PHRASES = [
  { ky: "Салам!", ru: "Привет!", en: "Hello!" },
  { ky: "Рахмат", ru: "Спасибо", en: "Thank you" },
  { ky: "Кандайсыз?", ru: "Как дела?", en: "How are you?" },
  { ky: "Канча турат?", ru: "Сколько стоит?", en: "How much is it?" },
  { ky: "Кечиресиз", ru: "Извините", en: "Excuse me" },
  { ky: "Даамдуу!", ru: "Вкусно!", en: "Delicious!" },
  { ky: "Базар кайда?", ru: "Где базар?", en: "Where is the bazaar?" },
  { ky: "Жардам бериңизчи", ru: "Помогите, пожалуйста", en: "Please help me" },
  { ky: "Ооба / Жок", ru: "Да / Нет", en: "Yes / No" },
  { ky: "Жакшы калыңыз", ru: "До свидания", en: "Goodbye" },
];

function dayIndex() {
  const now = new Date();
  const start = new Date(now.getFullYear(), 0, 0);
  return Math.floor((now - start) / 86400000);
}

// Фраза дня: тап переворачивает карточку и показывает перевод
export function PhraseCard() {
  const { t, lang } = useSettings();
  const [i, setI] = useState(() => dayIndex() % PHRASES.length);
  const [flipped, setFlipped] = useState(false);
  const p = PHRASES[i];
  const translation = lang === "ru" ? p.ru : p.en;

  return (
    <section className="phrase-wrap">
      <div className="phrase" style={{ perspective: 800 }}>
        <div className="phrase-top">
          <span className="phrase-kicker">{t("phrase.kicker")}</span>
          <button
            type="button"
            className="phrase-next"
            aria-label={t("phrase.next")}
            onClick={() => {
              setFlipped(false);
              setI((i + 1) % PHRASES.length);
            }}
          >
            <RefreshCw size={14} /> {t("phrase.next")}
          </button>
        </div>
        <button type="button" className="phrase-face" aria-live="polite" onClick={() => setFlipped(!flipped)}>
          <AnimatePresence mode="wait" initial={false}>
            <motion.span
              key={`${i}-${flipped}`}
              className="phrase-inner"
              initial={{ opacity: 0, rotateX: -80 }}
              animate={{ opacity: 1, rotateX: 0 }}
              exit={{ opacity: 0, rotateX: 80 }}
              transition={{ duration: 0.18, ease: "easeOut" }}
            >
              <span className="phrase-text">{flipped ? translation : p.ky}</span>
              <span className="phrase-hint">{flipped ? p.ky : t("phrase.tap")}</span>
            </motion.span>
          </AnimatePresence>
        </button>
      </div>
    </section>
  );
}
