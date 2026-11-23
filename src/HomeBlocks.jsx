import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, animate, motion, useMotionValue, useTransform } from "motion/react";
import {
  ChevronRight,
  Cloud,
  Droplets,
  Languages,
  Lightbulb,
  Map as MapIcon,
  Phone,
  RefreshCw,
  Sunrise,
  Sunset,
  Volume2,
  Wind,
  X,
} from "lucide-react";
import { fallbackOf } from "./i18n";
import { OSH, PHRASES, SOS, deg, toRussianSounds, updatedText, useOshWeather, weatherKind, sunInfo } from "./home-data";
import { useSettings } from "./settings-context";
import { Toast } from "./Toast";
import "./HomeBlocks.css";

const SPRING = { type: "spring", bounce: 0, duration: 0.32 };
// Текущее время в Оше, обновляется раз в минуту
function useOshNow() {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const tick = () => setNow(new Date());
    const id = setInterval(tick, 30 * 1000);
    const onVisible = () => {
      if (document.visibilityState === "visible") tick();
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      clearInterval(id);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, []);
  return now;
}

export function OshHeader() {
  const { t, locale, fmtDuration } = useSettings();
  const weather = useOshWeather();
  const wx = weather.data;
  const now = useOshNow();

  const dateText = new Intl.DateTimeFormat(locale, {
    timeZone: OSH.tz,
    weekday: "long",
    day: "numeric",
    month: "long",
  }).format(now);
  const timeText = new Intl.DateTimeFormat(locale, { timeZone: OSH.tz, hour: "2-digit", minute: "2-digit" }).format(now);
  const { isDay, sunToday, shownRise, untilMin, sx, sy } = sunInfo(wx, now);
  const kind = wx ? weatherKind(wx.code, wx.isDay) : null;
  const nextText = wx ? t(isDay ? "wx.sunsetIn" : "wx.sunriseIn", { t: fmtDuration(Math.max(1, untilMin)) }) : "";

  return (
    <header className={`osh-head ${isDay ? "is-day" : "is-night"}`}>
      <motion.div
        className="osh-title"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
      >
        <h1>{t("home.city")}</h1>
        <span>
          {dateText} · {timeText}
        </span>
      </motion.div>

      <motion.div
        className="wx"
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.08, ease: [0.22, 1, 0.36, 1] }}
      >
        <div className="wx-live">
          <span className={`wx-live-dot ${weather.failed ? "is-off" : ""}`} aria-hidden />
          <span className="wx-live-text">
            {weather.failed ? t("wx.offline") : t("wx.now")}
            {weather.at > 0 && ` · ${updatedText(t, weather.at, now.getTime())}`}
          </span>
          <button
            type="button"
            className="wx-refresh"
            aria-label={t("wx.refresh")}
            disabled={weather.loading}
            onClick={weather.refresh}
          >
            <span className={`ico ${weather.loading ? "is-spinning" : ""}`}>
              <RefreshCw size={15} />
            </span>
          </button>
        </div>

        <div className="wx-main">
          <AnimatePresence mode="popLayout" initial={false}>
            <motion.span
              key={kind ? `${wx.code}-${wx.isDay}` : "none"}
              className="wx-icon"
              initial={{ opacity: 0, scale: 0.6, rotate: -30 }}
              animate={{ opacity: 1, scale: 1, rotate: 0 }}
              exit={{ opacity: 0, scale: 0.6 }}
              transition={SPRING}
            >
              {kind ? <kind.Icon size={30} strokeWidth={1.8} /> : <Cloud size={30} strokeWidth={1.8} />}
            </motion.span>
          </AnimatePresence>
          <span className="wx-temp-wrap">
            <AnimatePresence mode="popLayout" initial={false}>
              <motion.b
                key={wx ? Math.round(wx.temp) : "none"}
                className="wx-temp"
                initial={{ opacity: 0, y: 14 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -14 }}
                transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
              >
                {wx ? deg(wx.temp) : "—°"}
              </motion.b>
            </AnimatePresence>
          </span>
          <span className="wx-cond">
            {kind ? t(`wx.c.${kind.key}`) : t("wx.loading")}
            {wx && <small>{t("wx.feels", { t: deg(wx.feels) })}</small>}
          </span>
        </div>

        <div className="wx-sun" aria-hidden={!wx}>
          <svg viewBox="0 0 120 64" className="wx-arc">
            <path d="M10 58 A50 50 0 0 1 110 58" className="wx-arc-track" />
            {wx && (
              <path
                d={`M10 58 A50 50 0 0 1 ${sx.toFixed(1)} ${sy.toFixed(1)}`}
                className={isDay ? "wx-arc-done" : "wx-arc-done is-night"}
              />
            )}
            {wx && isDay && <circle cx={sx} cy={sy} r="6" className="wx-arc-sun" />}
            {wx && !isDay && (
              <g className="wx-arc-moon" transform={`translate(${sx.toFixed(1)} ${sy.toFixed(1)})`}>
                {/* полумесяц: внешняя дуга r=6, внутренняя r=4.5 */}
                <path d="M1 -6 A6 6 0 1 0 1 6 A4.5 4.5 0 1 1 1 -6 Z" />
              </g>
            )}
          </svg>
          {wx && <div className="wx-sun-next">{nextText}</div>}
          <div className="wx-sun-row">
            <span>
              <Sunrise size={14} /> {shownRise ? shownRise.slice(11, 16) : "—"}
            </span>
            <span>
              <Sunset size={14} /> {sunToday ? sunToday.set.slice(11, 16) : "—"}
            </span>
          </div>
        </div>

        {wx?.hours?.length > 0 && (
          <div className="wx-hours" aria-label={t("wx.hourly")}>
            {wx.hours.map((h, i) => {
              const k = weatherKind(h.code, h.isDay);
              return (
                <motion.div
                  key={h.time}
                  className="wx-hour"
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3, delay: 0.12 + i * 0.03, ease: "easeOut" }}
                >
                  <span className="wx-hour-time">{h.time.slice(11, 16)}</span>
                  <k.Icon size={18} strokeWidth={1.9} />
                  <b>{deg(h.temp)}</b>
                  <span className={`wx-hour-rain ${h.rain >= 20 ? "" : "is-dry"}`}>
                    <Droplets size={10} />
                    {h.rain}%
                  </span>
                </motion.div>
              );
            })}
          </div>
        )}

        <div className="wx-foot">
          <span>{wx ? t("wx.range", { max: deg(wx.max), min: deg(wx.min) }) : "—"}</span>
          <span>
            <Wind size={13} /> {wx ? t("wx.wind", { v: Math.round(wx.wind) }) : "—"}
          </span>
        </div>
      </motion.div>
    </header>
  );
}

// ── быстрые кнопки ──────────────────────────────────────────────

// Переводчик пока «скоро», советы и карта работают
export function QuickActions({ onGoTo, onOpenTips }) {
  const { t } = useSettings();
  const [soon, setSoon] = useState(false);
  const hideSoon = useCallback(() => setSoon(false), []);

  const items = [
    { id: "translator", Icon: Languages, label: t("quick.translator"), soon: true, onClick: () => setSoon(true) },
    { id: "tips", Icon: Lightbulb, label: t("quick.tips"), onClick: onOpenTips },
    { id: "map", Icon: MapIcon, label: t("quick.map"), onClick: () => onGoTo("map") },
  ];

  return (
    <section className="quick">
      {items.map((it, i) => (
        <motion.button
          key={it.id}
          type="button"
          className="quick-item"
          initial={{ opacity: 0, y: 12 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.3, delay: i * 0.03, ease: "easeOut" }}
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

      <Toast show={soon} onHide={hideSoon} ms={2200}>
        {t("quick.soon")}
      </Toast>
    </section>
  );
}

// ── SOS ─────────────────────────────────────────────────────────

// Экстренные номера Кыргызстана
export function SosCard() {
  const { t } = useSettings();
  const [open, setOpen] = useState(false);

  // Лист SOS: Esc закрывает, страница под ним не крутится
  useEffect(() => {
    if (!open) return;
    const onKey = (e) => {
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [open]);

  return (
    <section className="sos-wrap">
      <motion.button
        type="button"
        className="sos-card"
        initial={{ opacity: 0, y: 12 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, amount: 0.4 }}
        transition={{ duration: 0.3, ease: "easeOut" }}
        whileTap={{ scale: 0.98 }}
        onClick={() => setOpen(true)}
      >
        <span className="sos-badge">SOS</span>
        <span className="sos-copy">
          <b>{t("sos.cardTitle")}</b>
          <small>{t("sos.cardText")}</small>
        </span>
        <ChevronRight size={20} />
      </motion.button>

      {createPortal(
        <AnimatePresence>
          {open && (
            <motion.div
              className="sos-overlay"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setOpen(false)}
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
                  <button className="icon-btn" onClick={() => setOpen(false)} aria-label={t("facts.close")}>
                    <X size={18} />
                  </button>
                </div>
                <a className="sos-main" href="tel:112">
                  <Phone size={22} />
                  <span>
                    <b>112</b>
                    <small>{t("sos.112")}</small>
                  </span>
                </a>
                {SOS.slice(1).map((s) => (
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
        document.body,
      )}
    </section>
  );
}

// ── фразы: стопка карточек ──────────────────────────────────────

// ── озвучка: синтез речи браузера / системы ─────────────────────
// Кыргызского голоса почти нигде нет. Порядок: кыргызский → казахский (те же буквы ң ө ү)
// → русский с заменой кыргызских букв на близкие русские.
const canSpeak = typeof window !== "undefined" && "speechSynthesis" in window;

function pickVoice() {
  const voices = window.speechSynthesis.getVoices();
  const by = (re) => voices.find((v) => re.test(v.lang));
  const native = by(/^ky/i) || by(/^kk/i);
  if (native) return { voice: native, native: true };
  return { voice: by(/^ru/i) || null, native: false };
}

function useSpeak() {
  const [speaking, setSpeaking] = useState(null);

  useEffect(() => {
    if (!canSpeak) return;
    // голоса в Chrome приходят не сразу — прогреваем список
    window.speechSynthesis.getVoices();
    const synth = window.speechSynthesis;
    const warm = () => synth.getVoices();
    synth.addEventListener?.("voiceschanged", warm);
    return () => {
      synth.removeEventListener?.("voiceschanged", warm);
      synth.cancel();
    };
  }, []);

  const speak = useCallback((id, text) => {
    if (!canSpeak) return;
    const synth = window.speechSynthesis;
    synth.cancel();
    const { voice, native } = pickVoice();
    const u = new SpeechSynthesisUtterance(native ? text : toRussianSounds(text));
    if (voice) u.voice = voice;
    u.lang = voice?.lang || "ru-RU";
    u.rate = 0.82;
    u.onend = () => setSpeaking((s) => (s === id ? null : s));
    u.onerror = u.onend;
    setSpeaking(id);
    synth.speak(u);
  }, []);

  return { speaking, speak };
}

// Кнопка «послушать»: нажатие не должно начинать перетаскивание карточки,
// поэтому pointerdown гасится нативно — раньше, чем его увидит drag у родителя.
function SpeakButton({ active, label, onSpeak }) {
  const ref = useRef(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const stop = (e) => e.stopPropagation();
    el.addEventListener("pointerdown", stop);
    return () => el.removeEventListener("pointerdown", stop);
  }, []);
  return (
    <motion.button
      ref={ref}
      type="button"
      className={`phrase-speak ${active ? "is-on" : ""}`}
      aria-label={label}
      whileTap={{ scale: 0.88 }}
      onClick={onSpeak}
    >
      {active && (
        <>
          <span className="phrase-speak-ring" />
          <span className="phrase-speak-ring is-late" />
        </>
      )}
      <Volume2 size={20} />
    </motion.button>
  );
}

function dayIndex() {
  const now = new Date();
  const start = new Date(now.getFullYear(), 0, 0);
  return Math.floor((now - start) / 86400000);
}

const STACK = 3; // сколько карточек видно в стопке

// Верхняя карточка: тянется пальцем, наклоняется и перетекает из тёмного в оранжевый.
// Отпустили дальше порога — улетает и уходит в конец стопки.
function TopPhrase({ phrase, lang, t, onGone, speaking, onSpeak }) {
  const x = useMotionValue(0);
  const rotate = useTransform(x, [-240, 0, 240], [-10, 0, 10]);
  const glow = useTransform(x, [-160, 0, 160], [1, 0, 1]);
  const [flipped, setFlipped] = useState(false);
  const dragged = useRef(false);
  const leaving = useRef(false);
  // phrase.ky — сама фраза, перевод для кыргызского интерфейса — русский
  const translation = (lang !== "ky" && phrase[lang]) || phrase[fallbackOf(lang)];
  const sound = `[${phrase.tr[lang] || phrase.tr[fallbackOf(lang)]}]`;

  function fling(dir) {
    if (leaving.current) return;
    leaving.current = true;
    animate(x, dir * 420, { duration: 0.24, ease: "easeIn" }).then(onGone);
  }

  return (
    <motion.div
      className="phrase-card is-top"
      style={{ x, rotate, zIndex: STACK }}
      initial={{ scale: 0.95, y: 12, opacity: 0.75 }}
      animate={{ scale: 1, y: 0, opacity: 1 }}
      transition={SPRING}
      drag="x"
      dragSnapToOrigin
      dragElastic={0.9}
      onDragStart={() => {
        dragged.current = true;
      }}
      onDragEnd={(_, info) => {
        setTimeout(() => {
          dragged.current = false;
        }, 0);
        if (Math.abs(info.offset.x) > 90 || Math.abs(info.velocity.x) > 600) {
          fling(info.offset.x < 0 ? -1 : 1);
        }
      }}
    >
      <motion.span className="phrase-glow" style={{ opacity: glow }} />
      <button
        type="button"
        className="phrase-face"
        aria-live="polite"
        onClick={() => {
          if (!dragged.current) setFlipped((f) => !f);
        }}
      >
        <span className="phrase-kicker">{t("phrase.kicker")}</span>
        <AnimatePresence mode="wait" initial={false}>
          <motion.span
            key={String(flipped)}
            className="phrase-inner"
            initial={{ opacity: 0, rotateX: -70 }}
            animate={{ opacity: 1, rotateX: 0 }}
            exit={{ opacity: 0, rotateX: 70 }}
            transition={{ duration: 0.18, ease: "easeOut" }}
          >
            <span className="phrase-text">{flipped ? translation : phrase.ky}</span>
            <span className="phrase-sound">{flipped ? `${phrase.ky} ${sound}` : sound}</span>
            <span className="phrase-hint">{flipped ? t("phrase.tapBack") : t("phrase.tap")}</span>
          </motion.span>
        </AnimatePresence>
      </button>
      {canSpeak && (
        <SpeakButton
          active={speaking}
          label={t("phrase.listen")}
          onSpeak={() => {
            if (!dragged.current) onSpeak();
          }}
        />
      )}
    </motion.div>
  );
}

export function PhraseStack() {
  const { t, lang } = useSettings();
  const [start] = useState(() => dayIndex() % PHRASES.length);
  const [order, setOrder] = useState(() => PHRASES.map((_, i) => (start + i) % PHRASES.length));

  const { speaking, speak } = useSpeak();
  const next = () => setOrder((o) => [...o.slice(1), o[0]]);
  const visible = order.slice(0, STACK);
  const number = ((order[0] - start + PHRASES.length) % PHRASES.length) + 1;

  return (
    <section className="phrase-wrap">
      <div className="phrase-stack">
        {visible
          .map((idx, pos) =>
            pos === 0 ? (
              <TopPhrase
                key={idx}
                phrase={PHRASES[idx]}
                lang={lang}
                t={t}
                onGone={next}
                speaking={speaking === idx}
                onSpeak={() => speak(idx, PHRASES[idx].ky)}
              />
            ) : (
              <motion.div
                key={idx}
                className="phrase-card"
                style={{ zIndex: STACK - pos }}
                initial={{ scale: 1 - STACK * 0.05, y: STACK * 12, opacity: 0 }}
                animate={{ scale: 1 - pos * 0.05, y: pos * 12, opacity: 1 - pos * 0.25 }}
                transition={SPRING}
                aria-hidden
              />
            ),
          )
          .reverse()}
      </div>
      <div className="phrase-meta">
        <span>{t("phrase.swipe")}</span>
        <span>
          {number}/{PHRASES.length}
        </span>
      </div>
    </section>
  );
}
