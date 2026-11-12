import { createClient } from "@supabase/supabase-js";

// Ключи берутся из .env (локально) или из Environment Variables в Vercel:
//   VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY
// anon-ключ публичный — доступ ограничивают правила RLS в supabase/schema.sql.
// service_role ключ сюда НИКОГДА не класть.
const url = import.meta.env.VITE_SUPABASE_URL;
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

// null — Supabase не настроен, приложение работает на данных из data.js
export const supabase = url && anonKey ? createClient(url, anonKey) : null;
