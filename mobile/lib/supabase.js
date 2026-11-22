import { AppState } from "react-native";
import { createClient } from "@supabase/supabase-js";

// anon-ключ публичный — доступ ограничивают RLS в базе
const url = process.env.EXPO_PUBLIC_SUPABASE_URL;
const anonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

// сессия — в localStorage (expo-sqlite, см. index.js), переживает перезапуск
export const supabase =
  url && anonKey
    ? createClient(url, anonKey, { auth: { storage: globalThis.localStorage, detectSessionInUrl: false } })
    : null;

// в фоне токен не обновляем, при возврате — снова
if (supabase)
  AppState.addEventListener("change", (s) =>
    s === "active" ? supabase.auth.startAutoRefresh() : supabase.auth.stopAutoRefresh()
  );
