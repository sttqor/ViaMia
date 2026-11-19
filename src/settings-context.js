import { createContext, useContext } from "react";
import { CURRENCIES, DICT } from "./i18n";

export const SettingsContext = createContext(null);

// Язык, валюта и помощники форматирования: t, plural, loc, money, fmtDate, fmtDuration
export function useSettings() {
  const value = useContext(SettingsContext);
  if (!value) throw new Error("useSettings нужно вызывать внутри <SettingsProvider>");
  return value;
}

export const THEMES = ["light", "dark", "system"];

// Настройки, которые едут в аккаунт (profiles.settings). Чужие/битые значения отбрасываются.
export const SYNC_KEYS = ["lang", "currency", "theme", "notifs", "travelMode"];
const VALID = {
  lang: (v) => !!DICT[v],
  currency: (v) => CURRENCIES.some((c) => c.code === v),
  theme: (v) => THEMES.includes(v),
  notifs: (v) => typeof v === "boolean",
  travelMode: (v) => v === "self" || v === "guided",
};

export function cleanSettings(obj) {
  const out = {};
  for (const k of SYNC_KEYS) if (obj && VALID[k](obj[k])) out[k] = obj[k];
  return out;
}

// Слияние при входе: что человек менял сам на устройстве — главнее, остальное — из аккаунта
export function mergeSettings(remote, local, touched) {
  const r = cleanSettings(remote);
  const l = cleanSettings(local);
  const out = {};
  for (const k of SYNC_KEYS) {
    if (touched.has(k) && k in l) out[k] = l[k];
    else if (k in r) out[k] = r[k];
    else if (k in l) out[k] = l[k];
  }
  return out;
}
