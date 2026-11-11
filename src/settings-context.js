import { createContext, useContext } from "react";

export const SettingsContext = createContext(null);

// Язык, валюта и помощники форматирования: t, plural, loc, money, fmtDate, fmtDuration
export function useSettings() {
  const value = useContext(SettingsContext);
  if (!value) throw new Error("useSettings нужно вызывать внутри <SettingsProvider>");
  return value;
}
