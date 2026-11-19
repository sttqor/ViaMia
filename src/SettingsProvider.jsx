import { useCallback, useEffect, useMemo, useState } from "react";
import { SettingsContext, THEMES, cleanSettings } from "./settings-context";
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
  const [lang, setLangRaw] = useState(() => (DICT[initial.lang] ? initial.lang : detectLang()));
  const [currency, setCurrencyRaw] = useState(() =>
    CURRENCIES.some((c) => c.code === initial.currency) ? initial.currency : "USD"
  );
  const [notifs, setNotifsRaw] = useState(() => initial.notifs ?? true);
  // тема: "light" | "dark" | "system" (по умолчанию — как в телефоне)
  const [theme, setThemeRaw] = useState(() => (THEMES.includes(initial.theme) ? initial.theme : "system"));
  // "self" — сам, "guided" — с гидом, null — ещё не выбрал (покажем онбординг)
  const [travelMode, setTravelModeRaw] = useState(() =>
    initial.travelMode === "self" || initial.travelMode === "guided" ? initial.travelMode : null
  );
  // Какие настройки человек поменял сам на этом устройстве (а не стоят по умолчанию).
  // При входе в аккаунт именно они перекрывают облако; после слияния список очищается.
  const [touched, setTouched] = useState(() => new Set(Array.isArray(initial.touched) ? initial.touched : []));

  const touch = useCallback((key) => setTouched((s) => (s.has(key) ? s : new Set(s).add(key))), []);
  const setLang = useCallback((v) => (setLangRaw(v), touch("lang")), [touch]);
  const setCurrency = useCallback((v) => (setCurrencyRaw(v), touch("currency")), [touch]);
  const setNotifs = useCallback((v) => (setNotifsRaw(v), touch("notifs")), [touch]);
  const setTheme = useCallback((v) => (setThemeRaw(v), touch("theme")), [touch]);
  const setTravelMode = useCallback((v) => (setTravelModeRaw(v), touch("travelMode")), [touch]);

  // значения из аккаунта: ставятся без отметки «менял сам»
  const applySynced = useCallback((obj) => {
    const s = cleanSettings(obj);
    if ("lang" in s) setLangRaw(s.lang);
    if ("currency" in s) setCurrencyRaw(s.currency);
    if ("notifs" in s) setNotifsRaw(s.notifs);
    if ("theme" in s) setThemeRaw(s.theme);
    if ("travelMode" in s) setTravelModeRaw(s.travelMode);
  }, []);
  const clearTouched = useCallback(() => setTouched(new Set()), []);

  // живые курсы валют (null, пока не пришли — тогда примерные)
  const live = useLiveRates();
  const rates = live.rates;

  useEffect(() => {
    try {
      localStorage.setItem(
        KEY,
        JSON.stringify({ lang, currency, notifs, travelMode, theme, touched: [...touched] })
      );
    } catch {
      /* хранилище недоступно */
    }
  }, [lang, currency, notifs, travelMode, theme, touched]);

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
      // для синхронизации с аккаунтом (useAccountSync)
      touched,
      applySynced,
      clearTouched,
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
    [
      lang,
      currency,
      notifs,
      travelMode,
      theme,
      touched,
      setLang,
      setCurrency,
      setNotifs,
      setTheme,
      setTravelMode,
      applySynced,
      clearTouched,
      rates,
      live.date,
    ]
  );

  return <SettingsContext.Provider value={value}>{children}</SettingsContext.Provider>;
}
