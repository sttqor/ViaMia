import { useEffect, useMemo, useState } from "react";
import { SettingsContext } from "./settings-context";
import {
  BASE_LANG,
  CURRENCIES,
  DICT,
  formatDate,
  formatDuration,
  formatMoney,
  formatRate,
  isRtl,
  localeOf,
  localize,
  pluralize,
  translate,
} from "./i18n";
import { useLiveRates } from "./rates";

const KEY = "osh-guide-settings";
const THEMES = ["light", "dark", "system"];

// "system" → смотрим на настройку телефона
const systemDark = () => {
  try {
    return window.matchMedia("(prefers-color-scheme: dark)").matches;
  } catch {
    return false;
  }
};
const resolveTheme = (theme) => (theme === "system" ? (systemDark() ? "dark" : "light") : theme);

function loadSettings() {
  try {
    return JSON.parse(localStorage.getItem(KEY) || "{}") || {};
  } catch {
    return {};
  }
}

function detectLang() {
  try {
    const code = (navigator.language || "").slice(0, 2).toLowerCase();
    return DICT[code] ? code : BASE_LANG;
  } catch {
    return BASE_LANG;
  }
}

export function SettingsProvider({ children }) {
  const [initial] = useState(loadSettings);
  const [lang, setLang] = useState(() => (DICT[initial.lang] ? initial.lang : detectLang()));
  const [currency, setCurrency] = useState(() =>
    CURRENCIES.some((c) => c.code === initial.currency) ? initial.currency : "USD"
  );
  const [notifs, setNotifs] = useState(() => initial.notifs ?? true);
  // тема: "light" | "dark" | "system" (по умолчанию — как в телефоне)
  const [theme, setTheme] = useState(() => (THEMES.includes(initial.theme) ? initial.theme : "system"));
  // "self" — сам, "guided" — с гидом, null — ещё не выбрал (покажем онбординг)
  const [travelMode, setTravelMode] = useState(() =>
    initial.travelMode === "self" || initial.travelMode === "guided" ? initial.travelMode : null
  );

  // живые курсы валют (null, пока не пришли — тогда примерные)
  const live = useLiveRates();
  const rates = live.rates;

  useEffect(() => {
    try {
      localStorage.setItem(KEY, JSON.stringify({ lang, currency, notifs, travelMode, theme }));
    } catch {
      /* хранилище недоступно */
    }
  }, [lang, currency, notifs, travelMode, theme]);

  // Тема: атрибут data-theme на <html> (index.css), при "system" следим за сменой в телефоне
  useEffect(() => {
    const apply = () => {
      document.documentElement.dataset.theme = resolveTheme(theme);
    };
    apply();
    if (theme !== "system") return undefined;
    let mq;
    try {
      mq = window.matchMedia("(prefers-color-scheme: dark)");
    } catch {
      return undefined;
    }
    mq.addEventListener?.("change", apply);
    return () => mq.removeEventListener?.("change", apply);
  }, [theme]);

  useEffect(() => {
    document.documentElement.lang = lang;
    document.documentElement.dir = isRtl(lang) ? "rtl" : "ltr";
  }, [lang]);

  const value = useMemo(
    () => ({
      lang,
      setLang,
      currency,
      setCurrency,
      notifs,
      setNotifs,
      travelMode,
      setTravelMode,
      theme,
      setTheme,
      locale: localeOf(lang),
      t: (key, vars) => translate(lang, key, vars),
      plural: (key, n) => pluralize(lang, key, n),
      loc: (item) => localize(item, lang),
      money: (usd) => formatMoney(usd, currency, lang, rates),
      // «87,45 сом» за 1 USD; ratesDate — дата курса ("2026-11-17") или null, если курс примерный
      fmtRate: (code) => formatRate(code, rates, lang),
      ratesDate: rates ? live.date : null,
      fmtDate: (key) => formatDate(key, lang),
      fmtDuration: (mins) => formatDuration(mins, lang),
    }),
    [lang, currency, notifs, travelMode, theme, rates, live.date]
  );

  return <SettingsContext.Provider value={value}>{children}</SettingsContext.Provider>;
}
