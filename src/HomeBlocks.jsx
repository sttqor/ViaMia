import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, animate, motion, useMotionValue, useTransform } from "motion/react";
import {
  ChevronRight,
  Cloud,
  CloudDrizzle,
  CloudFog,
  CloudLightning,
  CloudRain,
  CloudSun,
  Languages,
  Lightbulb,
  Map as MapIcon,
  Moon,
  Phone,
  Snowflake,
  Sun,
  Sunrise,
  Sunset,
  Wind,
  X,
} from "lucide-react";
import { useSettings } from "./settings-context";
import "./HomeBlocks.css";

const SPRING = { type: "spring", stiffness: 400, damping: 32 };
const OSH = { lat: 40.5283, lng: 72.7985, tz: "Asia/Bishkek" };

// ── шапка: «Ош» и погода ─────────────────────────────────────────

// Коды погоды WMO → значок и подпись
function weatherKind(code, isDay) {
  if (code === 0) return { Icon: isDay ? Sun : Moon, ru: "Ясно", en: "Clear" };
  if (code <= 2) return { Icon: isDay ? CloudSun : Moon, ru: "Малооблачно", en: "Partly cloudy" };
  if (code === 3) return { Icon: Cloud, ru: "Облачно", en: "Cloudy" };
  if (code === 45 || code === 48) return { Icon: CloudFog, ru: "Туман", en: "Fog" };
  if (code >= 51 && code <= 57) return { Icon: CloudDrizzle, ru: "Морось", en: "Drizzle" };
  if ((code >= 61 && code <= 67) || (code >= 80 && code <= 82)) return { Icon: CloudRain, ru: "Дождь", en: "Rain" };
  if ((code >= 71 && code <= 77) || code === 85 || code === 86) return { Icon: Snowflake, ru: "Снег", en: "Snow" };
  if (code >= 95) return { Icon: CloudLightning, ru: "Гроза", en: "Thunderstorm" };
  return { Icon: Cloud, ru: "Облачно", en: "Cloudy" };
}

const WX_KEY = "osh-weather-v1";
const WX_TTL = 20 * 60 * 1000;

function useOshWeather() {
  const [data, setData] = useState(() => {
    try {
      const c = JSON.parse(localStorage.getItem(WX_KEY));
      return c?.data ?? null;
    } catch {
      return null;
    }
  });

  useEffect(() => {
    let fresh = false;
    try {
      const c = JSON.parse(localStorage.getItem(WX_KEY));
      fresh = c && Date.now() - c.at < WX_TTL;
    } catch {
      fresh = false;
    }
    if (fresh) return;
    const ctrl = new AbortController();
    const url =
      `https://api.open-meteo.com/v1/forecast?latitude=${OSH.lat}&longitude=${OSH.lng}` +
      "&current=temperature_2m,apparent_temperature,weather_code,wind_speed_10m,is_day" +
      "&daily=sunrise,sunset,temperature_2m_max,temperature_2m_min&forecast_days=1" +
      `&wind_speed_unit=ms&timezone=${encodeURIComponent(OSH.tz)}`;
    fetch(url, { signal: ctrl.signal })
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(String(r.status)))))
      .then((j) => {
        const d = {
          temp: j.current.temperature_2m,
          feels: j.current.apparent_temperature,
          code: j.current.weather_code,
          wind: j.current.wind_speed_10m,
          isDay: j.current.is_day === 1,
          sunrise: j.daily.sunrise[0],
          sunset: j.daily.sunset[0],
          max: j.daily.temperature_2m_max[0],
          min: j.daily.temperature_2m_min[0],
        };
        setData(d);
        try {
          localStorage.setItem(WX_KEY, JSON.stringify({ at: Date.now(), data: d }));
        } catch {
          /* хранилище недоступно — просто не кэшируем */
        }
      })
      .catch(() => {
        /* без сети остаётся кэш или пустая карточка */
      });
    return () => ctrl.abort();
  }, []);

  return data;
}

// Текущее время в Оше, обновляется раз в минуту
function useOshNow() {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 60 * 1000);
    return () => clearInterval(id);
  }, []);
  return now;
}

// "2026-11-15T07:12" (время Оша) → минуты от полуночи
const minutesOf = (iso) => {
  const [h, m] = iso.slice(11, 16).split(":").map(Number);
  return h * 60 + m;
};

const deg = (n) => `${n > 0 ? "+" : n < 0 ? "−" : ""}${Math.abs(Math.round(n))}°`;

export function OshHeader() {
  const { t, lang } = useSettings();
  const wx = useOshWeather();
  const now = useOshNow();
  const locale = lang === "ru" ? "ru-RU" : "en-GB";

  const dateText = new Intl.DateTimeFormat(locale, {
    timeZone: OSH.tz,
    weekday: "long",
    day: "numeric",
    month: "long",
  }).format(now);
  const timeText = new Intl.DateTimeFormat(locale, { timeZone: OSH.tz, hour: "2-digit", minute: "2-digit" }).format(now);
  const nowMin = minutesOf(
    new Intl.DateTimeFormat("sv-SE", { timeZone: OSH.tz, hour: "2-digit", minute: "2-digit", hourCycle: "h23" })
      .format(now)
      .padStart(16, "0000-00-00T"),
  );

  const kind = wx ? weatherKind(wx.code, wx.isDay) : null;
  const rise = wx ? minutesOf(wx.sunrise) : 0;
  const set = wx ? minutesOf(wx.sunset) : 0;
  const dayShare = wx ? Math.min(1, Math.max(0, (nowMin - rise) / (set - rise))) : 0;
  const isDay = wx ? nowMin >= rise && nowMin <= set : true;
  // солнце на дуге: угол от 180° (восход) до 0° (закат)
  const a = Math.PI * (1 - dayShare);
  const sx = 60 + 50 * Math.cos(a);
  const sy = 58 - 50 * Math.sin(a);

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
        <div className="wx-main">
          <span className="wx-icon">{kind ? <kind.Icon size={30} strokeWidth={1.8} /> : <Cloud size={30} strokeWidth={1.8} />}</span>
          <b className="wx-temp">{wx ? deg(wx.temp) : "—°"}</b>
          <span className="wx-cond">
            {kind ? (lang === "ru" ? kind.ru : kind.en) : t("wx.loading")}
            {wx && <small>{t("wx.feels", { t: deg(wx.feels) })}</small>}
          </span>
        </div>

        <div className="wx-sun" aria-hidden={!wx}>
          <svg viewBox="0 0 120 64" className="wx-arc">
            <path d="M10 58 A50 50 0 0 1 110 58" className="wx-arc-track" />
            {wx && isDay && (
              <path
                d={`M10 58 A50 50 0 0 1 ${sx.toFixed(1)} ${sy.toFixed(1)}`}
                className="wx-arc-done"
              />
            )}
            {wx && isDay && <circle cx={sx} cy={sy} r="6" className="wx-arc-sun" />}
          </svg>
          <div className="wx-sun-row">
            <span>
              <Sunrise size={14} /> {wx ? wx.sunrise.slice(11, 16) : "—"}
            </span>
            <span>
              <Sunset size={14} /> {wx ? wx.sunset.slice(11, 16) : "—"}
            </span>
          </div>
        </div>

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

// Переводчик и советы пока «скоро», карта работает
export function QuickActions({ onGoTo }) {
  const { t } = useSettings();
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

      <AnimatePresence>
        {soon && (
          <motion.div
            key="soon"
            className="toast-note"
            role="status"
            style={{ x: "-50%" }}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 8 }}
            transition={{ duration: 0.2, ease: "easeOut" }}
          >
            {t("quick.soon")}
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  );
}

// ── SOS ─────────────────────────────────────────────────────────

// Экстренные номера Кыргызстана
const SOS = [
  { num: "112", key: "sos.112" },
  { num: "103", key: "sos.103" },
  { num: "102", key: "sos.102" },
  { num: "101", key: "sos.101" },
];

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

const STACK = 3; // сколько карточек видно в стопке

// Верхняя карточка: тянется пальцем, наклоняется и перетекает из тёмного в оранжевый.
// Отпустили дальше порога — улетает и уходит в конец стопки.
function TopPhrase({ phrase, lang, t, onGone }) {
  const x = useMotionValue(0);
  const rotate = useTransform(x, [-240, 0, 240], [-10, 0, 10]);
  const glow = useTransform(x, [-160, 0, 160], [1, 0, 1]);
  const [flipped, setFlipped] = useState(false);
  const dragged = useRef(false);
  const leaving = useRef(false);
  const translation = lang === "ru" ? phrase.ru : phrase.en;

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
            <span className="phrase-hint">{flipped ? phrase.ky : t("phrase.tap")}</span>
          </motion.span>
        </AnimatePresence>
      </button>
    </motion.div>
  );
}

export function PhraseStack() {
  const { t, lang } = useSettings();
  const [start] = useState(() => dayIndex() % PHRASES.length);
  const [order, setOrder] = useState(() => PHRASES.map((_, i) => (start + i) % PHRASES.length));

  const next = () => setOrder((o) => [...o.slice(1), o[0]]);
  const visible = order.slice(0, STACK);
  const number = ((order[0] - start + PHRASES.length) % PHRASES.length) + 1;

  return (
    <section className="phrase-wrap">
      <div className="phrase-stack">
        {visible
          .map((idx, pos) =>
            pos === 0 ? (
              <TopPhrase key={idx} phrase={PHRASES[idx]} lang={lang} t={t} onGone={next} />
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
