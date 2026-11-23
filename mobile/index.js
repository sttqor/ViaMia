// синхронный localStorage (на SQLite) — до загрузки общего кода из ../src, он читает его при старте
import "expo-sqlite/localStorage/install";
import { getRandomValues } from "expo-crypto";
import { getLocales } from "expo-localization";

// в Hermes нет crypto.getRandomValues — им делается код брони (makeCode в src/data.js)
globalThis.crypto ??= {};
globalThis.crypto.getRandomValues ??= getRandomValues;
// язык телефона для первого запуска (detectLang в src/SettingsProvider.jsx читает navigator.language)
try {
  if (!globalThis.navigator?.language) globalThis.navigator = { ...globalThis.navigator, language: getLocales()[0]?.languageTag || "" };
} catch {
  /* язык по умолчанию — русский */
}
import "expo-router/entry";
