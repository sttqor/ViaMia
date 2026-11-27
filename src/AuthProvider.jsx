import { useCallback, useEffect, useMemo, useState } from "react";
import { AuthContext } from "./auth-context";
import { supabase } from "./supabase";

// Вход по почте или кыргызскому номеру одноразовым кодом (OTP); пароль — по желанию.
// Аккаунта нет — Supabase создаёт его при первом верном коде (регистрация без форм),
// профиль в public.profiles создаёт триггер handle_new_user.
// Сессию хранит сам supabase-js (localStorage), она переживает перезапуск.
// Без ключей Supabase enabled=false — профиль показывает гостевой режим.

// { email } | { phone } → тип кода для verifyOtp
const otpType = (id, change) => (id.phone ? (change ? "phone_change" : "sms") : change ? "email_change" : "email");

// Вход через Google / Apple. На сайте — переход к провайдеру и обратно на эту же страницу
// (supabase-js сам подхватит сессию из адреса). Телефон передаёт свой способ (mobile/lib/oauth.js).
async function webOAuth(provider) {
  const { error } = await supabase.auth.signInWithOAuth({
    provider,
    options: { redirectTo: window.location.origin + window.location.pathname },
  });
  if (error) throw error;
}

// beforeSignOut — что сделать, пока вход ещё есть (сайт: отписать push этого браузера, src/push.js)
export function AuthProvider({ children, oauth = webOAuth, beforeSignOut }) {
  const [user, setUser] = useState(null);
  // какие входы через Google / Apple включены в Supabase — выключенные кнопки не показываем
  const [providers, setProviders] = useState({});
  useEffect(() => {
    if (!supabase) return;
    fetch(`${supabase.supabaseUrl}/auth/v1/settings`, { headers: { apikey: supabase.supabaseKey } })
      .then((r) => (r.ok ? r.json() : null))
      .then((s) => s?.external && setProviders({ google: !!s.external.google, apple: !!s.external.apple }))
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (!supabase) return;
    // сначала — сохранённая сессия, дальше — все изменения (вход, выход, другая вкладка)
    supabase.auth.getSession().then(({ data }) => setUser(data.session?.user ?? null));
    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  const sendCode = useCallback(async (id) => {
    const { error } = await supabase.auth.signInWithOtp(id);
    if (error) throw error;
  }, []);

  const verifyCode = useCallback(async (id, token) => {
    const { error } = await supabase.auth.verifyOtp({ ...id, token, type: otpType(id) });
    if (error) throw error;
  }, []);

  const signInWithPassword = useCallback(async (id, password) => {
    const { error } = await supabase.auth.signInWithPassword({ ...id, password });
    if (error) throw error;
  }, []);

  // Пароль задаётся уже вошедшим пользователем. Отметка в user_metadata — только для
  // интерфейса («задать» или «сменить»): сам пароль Supabase наружу не отдаёт.
  const setPassword = useCallback(async (password) => {
    const { data, error } = await supabase.auth.updateUser({ password, data: { has_password: true } });
    if (error) throw error;
    if (data?.user) setUser(data.user);
  }, []);

  // Привязать почту или телефон к текущему аккаунту: Supabase шлёт код на новый адрес/номер
  const startLink = useCallback(async (id) => {
    const { error } = await supabase.auth.updateUser(id);
    if (error) throw error;
  }, []);

  const confirmLink = useCallback(async (id, token) => {
    const { data, error } = await supabase.auth.verifyOtp({ ...id, token, type: otpType(id, true) });
    if (error) throw error;
    // свежие email/phone, не дожидаясь события
    const fresh = data?.user ?? (await supabase.auth.getUser()).data.user;
    if (fresh) setUser(fresh);
  }, []);

  const signOut = useCallback(async () => {
    try {
      await beforeSignOut?.();
    } catch {
      /* не мешаем выходу */
    }
    try {
      await supabase.auth.signOut();
    } catch {
      /* нет сети — локальная сессия всё равно стёрта supabase-js */
    }
  }, [beforeSignOut]);

  const value = useMemo(
    () => ({
      enabled: !!supabase,
      user,
      hasPassword: !!user?.user_metadata?.has_password,
      sendCode,
      verifyCode,
      signInWithPassword,
      setPassword,
      startLink,
      confirmLink,
      signOut,
      signInWithProvider: oauth,
      providers,
    }),
    [user, sendCode, verifyCode, signInWithPassword, setPassword, startLink, confirmLink, signOut, oauth, providers]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
