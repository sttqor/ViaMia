import { useCallback, useEffect, useRef, useState } from "react";
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
  Droplets,
  Languages,
  Lightbulb,
  Map as MapIcon,
  Moon,
  Phone,
  RefreshCw,
  Snowflake,
  Sun,
  Sunrise,
  Sunset,
  Volume2,
  Wind,
  X,
} from "lucide-react";
import { fallbackOf } from "./i18n";
import { useSettings } from "./settings-context";
import { Toast } from "./Toast";
import "./HomeBlocks.css";

const SPRING = { type: "spring", stiffness: 400, damping: 32 };
const OSH = { lat: 40.5283, lng: 72.7985, tz: "Asia/Bishkek" };

// ── шапка: «Ош» и погода ─────────────────────────────────────────

// Коды погоды WMO → значок и подпись
// key — ключ подписи в словаре: t(`wx.c.${key}`)
function weatherKind(code, isDay) {
  if (code === 0) return { Icon: isDay ? Sun : Moon, key: "clear" };
  if (code <= 2) return { Icon: isDay ? CloudSun : Moon, key: "partly" };
  if (code === 3) return { Icon: Cloud, key: "cloudy" };
  if (code === 45 || code === 48) return { Icon: CloudFog, key: "fog" };
  if (code >= 51 && code <= 57) return { Icon: CloudDrizzle, key: "drizzle" };
  if ((code >= 61 && code <= 67) || (code >= 80 && code <= 82)) return { Icon: CloudRain, key: "rain" };
  if ((code >= 71 && code <= 77) || code === 85 || code === 86) return { Icon: Snowflake, key: "snow" };
  if (code >= 95) return { Icon: CloudLightning, key: "storm" };
  return { Icon: Cloud, key: "cloudy" };
}

// Open-Meteo обновляет «сейчас» раз в 15 минут — чаще спрашивать нет смысла
const WX_KEY = "osh-weather-v3";
const WX_TTL = 10 * 60 * 1000;

// "2026-11-17" — сегодняшняя дата в Оше
const oshDay = (d = new Date()) => new Intl.DateTimeFormat("sv-SE", { timeZone: OSH.tz }).format(d);

function readWxCache() {
  try {
    const c = JSON.parse(localStorage.getItem(WX_KEY));
    return c?.data?.sun?.length ? c : null;
  } catch {
    return null;
  }
}

async function fetchWeather(signal) {
  const url =
    `https://api.open-meteo.com/v1/forecast?latitude=${OSH.lat}&longitude=${OSH.lng}` +
    "&current=temperature_2m,apparent_temperature,weather_code,wind_speed_10m,is_day" +
    "&hourly=temperature_2m,weather_code,precipitation_probability,is_day&forecast_hours=13" +
    "&daily=sunrise,sunset,temperature_2m_max,temperature_2m_min&forecast_days=2" +
    `&wind_speed_unit=ms&timezone=${encodeURIComponent(OSH.tz)}`;
  const r = await fetch(url, { signal, cache: "no-store" });
  if (!r.ok) throw new Error(String(r.status));
  const j = await r.json();
  const h = j.hourly;
  return {
    temp: j.current.temperature_2m,
    feels: j.current.apparent_temperature,
    code: j.current.weather_code,
    wind: j.current.wind_speed_10m,
    isDay: j.current.is_day === 1,
    // сегодня и завтра: после заката показываем завтрашний рассвет
    sun: j.daily.sunrise.map((rise, i) => ({ rise, set: j.daily.sunset[i] })),
    max: j.daily.temperature_2m_max[0],
    min: j.daily.temperature_2m_min[0],
    // первый час — текущий, его уже показывает крупная цифра
    hours: h.time.slice(1).map((time, i) => ({
      time,
      temp: h.temperature_2m[i + 1],
      code: h.weather_code[i + 1],
      rain: h.precipitation_probability?.[i + 1] ?? 0,
      isDay: h.is_day[i + 1] === 1,
    })),
  };
}

// Погода держится свежей сама: раз в 10 минут, при возврате в приложение и при появлении сети.
function useOshWeather() {
  const [state, setState] = useState(() => {
    const c = readWxCache();
    return { data: c?.data ?? null, at: c?.at ?? 0, loading: false, failed: false };
  });
  const busy = useRef(false);

  const refresh = useCallback(async (force = false) => {
    const c = readWxCache();
    // свежий кэш берём, только если восход/закат в нём на сегодня
    if (!force && c && Date.now() - c.at < WX_TTL && c.data.sun[0].rise.startsWith(oshDay())) return;
    if (busy.current) return;
    busy.current = true;
    setState((s) => ({ ...s, loading: true }));
    try {
      const data = await fetchWeather();
      const at = Date.now();
      setState({ data, at, loading: false, failed: false });
      try {
        localStorage.setItem(WX_KEY, JSON.stringify({ at, data }));
      } catch {
        /* хранилище недоступно — просто не кэшируем */
      }
    } catch {
      // без сети остаётся последняя погода, но с пометкой
      setState((s) => ({ ...s, loading: false, failed: true }));
    } finally {
      busy.current = false;
    }
  }, []);

  useEffect(() => {
    const first = setTimeout(refresh, 0);
    const id = setInterval(() => {
      if (document.visibilityState === "visible") refresh();
    }, 60 * 1000);
    const onVisible = () => {
      if (document.visibilityState === "visible") refresh();
    };
    const onOnline = () => refresh(true);
    document.addEventListener("visibilitychange", onVisible);
    window.addEventListener("online", onOnline);
    return () => {
      clearTimeout(first);
      clearInterval(id);
      document.removeEventListener("visibilitychange", onVisible);
      window.removeEventListener("online", onOnline);
    };
  }, [refresh]);

  return { ...state, refresh: () => refresh(true) };
}

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

// "2026-11-15T07:12" (время Оша) → минуты от полуночи
const minutesOf = (iso) => {
  const [h, m] = iso.slice(11, 16).split(":").map(Number);
  return h * 60 + m;
};

const deg = (n) => `${n > 0 ? "+" : n < 0 ? "−" : ""}${Math.abs(Math.round(n))}°`;

function updatedText(t, at, nowMs) {
  if (!at) return "";
  const min = Math.max(0, Math.round((nowMs - at) / 60000));
  if (min < 1) return t("wx.justNow");
  if (min < 60) return t("wx.minAgo", { n: min });
  return t("wx.hAgo", { n: Math.round(min / 60) });
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
  const nowMin = minutesOf(
    new Intl.DateTimeFormat("sv-SE", { timeZone: OSH.tz, hour: "2-digit", minute: "2-digit", hourCycle: "h23" })
      .format(now)
      .padStart(16, "0000-00-00T"),
  );

  const kind = wx ? weatherKind(wx.code, wx.isDay) : null;
  // восход/закат на сегодня (если кэш с прошлого дня — берём «завтра» из него, это и есть сегодня)
  const today = oshDay(now);
  const sunToday = wx ? wx.sun.find((d) => d.rise.startsWith(today)) || wx.sun[0] : null;
  const sunNext = wx ? wx.sun[wx.sun.indexOf(sunToday) + 1] : null;
  const rise = sunToday ? minutesOf(sunToday.rise) : 0;
  const set = sunToday ? minutesOf(sunToday.set) : 0;
  const isDay = wx ? nowMin >= rise && nowMin < set : true;
  const afterSet = wx ? nowMin >= set : false;
  // после заката в строке — завтрашний рассвет
  const shownRise = afterSet && sunNext ? sunNext.rise : sunToday?.rise;
  // сколько осталось до ближайшего события
  const untilMin = !wx ? 0 : isDay ? set - nowMin : afterSet ? 24 * 60 - nowMin + (sunNext ? minutesOf(sunNext.rise) : rise) : rise - nowMin;
  const nextText = wx ? t(isDay ? "wx.sunsetIn" : "wx.sunriseIn", { t: fmtDuration(Math.max(1, untilMin)) }) : "";
  // днём по дуге идёт солнце (восход → закат), ночью — луна (закат → рассвет)
  const nightLen = 24 * 60 - set + rise;
  const nightPassed = afterSet ? nowMin - set : 24 * 60 - set + nowMin;
  const share = !wx ? 0 : isDay ? (nowMin - rise) / (set - rise) : nightPassed / nightLen;
  const dayShare = Math.min(1, Math.max(0, share));
  // угол от 180° (восход) до 0° (закат)
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
            {kind ? t(`wx.c.${kind.key}`) : t(weather.failed ? "wx.noData" : "wx.loading")}
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

      <Toast show={soon} onHide={hideSoon} ms={2200}>
        {t("quick.soon")}
      </Toast>
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

// Фразы на кыргызском: задел под быстрый переводчик.
// tr — транскрипция для своего языка, ударный слог заглавными (в кыргызском ударение почти всегда на последнем слоге).
const PHRASES = [
  { ky: "Салам!", ru: "Привет!", en: "Hello!", tr: { ru: "са-ЛАМ", en: "sa-LAHM" } },
  { ky: "Рахмат", ru: "Спасибо", en: "Thank you", tr: { ru: "рах-МАТ", en: "rakh-MAHT" } },
  { ky: "Кандайсыз?", ru: "Как дела?", en: "How are you?", tr: { ru: "кан-дай-СЫЗ", en: "kahn-dai-SUHZ" } },
  { ky: "Канча турат?", ru: "Сколько стоит?", en: "How much is it?", tr: { ru: "кан-ЧА ту-РАТ", en: "kahn-CHAH too-RAHT" } },
  { ky: "Кечиресиз", ru: "Извините", en: "Excuse me", tr: { ru: "ке-чи-ре-СИЗ", en: "keh-chee-reh-SEEZ" } },
  { ky: "Даамдуу!", ru: "Вкусно!", en: "Delicious!", tr: { ru: "даам-ДУУ", en: "dahm-DOO" } },
  { ky: "Базар кайда?", ru: "Где базар?", en: "Where is the bazaar?", tr: { ru: "ба-ЗАР кай-ДА", en: "bah-ZAHR kai-DAH" } },
  { ky: "Жардам бериңизчи", ru: "Помогите, пожалуйста", en: "Please help me", tr: { ru: "жар-ДАМ бе-ри-нгиз-ЧИ", en: "jar-DAHM beh-ring-iz-CHEE" } },
  { ky: "Ооба / Жок", ru: "Да / Нет", en: "Yes / No", tr: { ru: "оо-БА / ЖОК", en: "oh-BAH / JOHK" } },
  { ky: "Жакшы калыңыз", ru: "До свидания", en: "Goodbye", tr: { ru: "жак-ШЫ ка-лы-НГЫЗ", en: "jahk-SHUH kah-luh-NGUHZ" } },
];

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

const toRussianSounds = (s) =>
  s.replace(/ң/g, "нг").replace(/Ң/g, "Нг").replace(/ө/g, "о").replace(/Ө/g, "О").replace(/ү/g, "у").replace(/Ү/g, "У");

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
