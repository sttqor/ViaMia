// Данные и логика главной — общие для сайта (src/HomeBlocks.jsx) и телефона (mobile/):
// погода Оша (Open-Meteo), восход/закат, SOS-номера, фразы на кыргызском.
import { useCallback, useEffect, useRef, useState } from "react";
import { Cloud, CloudDrizzle, CloudFog, CloudLightning, CloudRain, CloudSun, Moon, Snowflake, Sun } from "lucide-react";

export const OSH = { lat: 40.5283, lng: 72.7985, tz: "Asia/Bishkek" };

// ── шапка: «Ош» и погода ─────────────────────────────────────────

// Коды погоды WMO → значок и подпись
// key — ключ подписи в словаре: t(`wx.c.${key}`)
export function weatherKind(code, isDay) {
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
export const WX_KEY = "osh-weather-v3";
export const WX_TTL = 10 * 60 * 1000;

// "2026-11-17" — сегодняшняя дата в Оше
export const oshDay = (d = new Date()) => new Intl.DateTimeFormat("sv-SE", { timeZone: OSH.tz }).format(d);

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
export function useOshWeather() {
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
      if (typeof document === "undefined" || document.visibilityState === "visible") refresh();
    }, 60 * 1000);
    if (typeof document === "undefined") return () => (clearTimeout(first), clearInterval(id)); // мобильная версия (mobile/)
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

// "2026-11-15T07:12" (время Оша) → минуты от полуночи
export const minutesOf = (iso) => {
  const [h, m] = iso.slice(11, 16).split(":").map(Number);
  return h * 60 + m;
};

export const deg = (n) => `${n > 0 ? "+" : n < 0 ? "−" : ""}${Math.abs(Math.round(n))}°`;

export function updatedText(t, at, nowMs) {
  if (!at) return "";
  const min = Math.max(0, Math.round((nowMs - at) / 60000));
  if (min < 1) return t("wx.justNow");
  if (min < 60) return t("wx.minAgo", { n: min });
  return t("wx.hAgo", { n: Math.round(min / 60) });
}

export const SOS = [
  { num: "112", key: "sos.112" },
  { num: "103", key: "sos.103" },
  { num: "102", key: "sos.102" },
  { num: "101", key: "sos.101" },
];

// Фразы на кыргызском: задел под быстрый переводчик.
// tr — транскрипция для своего языка, ударный слог заглавными (в кыргызском ударение почти всегда на последнем слоге).
export const PHRASES = [
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

// кыргызского голоса почти нигде нет — для русского голоса ң ө ү меняем на близкие звуки
export const toRussianSounds = (s) =>
  s.replace(/ң/g, "нг").replace(/Ң/g, "Нг").replace(/ө/g, "о").replace(/Ө/g, "О").replace(/ү/g, "у").replace(/Ү/g, "У");
