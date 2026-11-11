import { useEffect, useMemo, useState } from "react";
import { SettingsContext } from "./settings-context";
import {
  BASE_LANG,
  CURRENCIES,
  DICT,
  formatDate,
  formatDuration,
  formatMoney,
  isRtl,
  localeOf,
  localize,
  pluralize,
  translate,
} from "./i18n";

const KEY = "osh-guide-settings";

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

  useEffect(() => {
    try {
      localStorage.setItem(KEY, JSON.stringify({ lang, currency, notifs }));
    } catch {
      /* хранилище недоступно */
    }
  }, [lang, currency, notifs]);

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
      locale: localeOf(lang),
      t: (key, vars) => translate(lang, key, vars),
      plural: (key, n) => pluralize(lang, key, n),
      loc: (item) => localize(item, lang),
      money: (usd) => formatMoney(usd, currency, lang),
      fmtDate: (key) => formatDate(key, lang),
      fmtDuration: (mins) => formatDuration(mins, lang),
    }),
    [lang, currency, notifs]
  );

  return <SettingsContext.Provider value={value}>{children}</SettingsContext.Provider>;
}
