import { useCallback, useEffect, useMemo, useState } from "react";
import { AuthContext } from "./auth-context";
import { supabase } from "./supabase";

// Вход по почте без пароля: Supabase шлёт на адрес шестизначный код (OTP),
// verifyCode превращает его в сессию. Сессия хранится в localStorage самим
// supabase-js и переживает перезапуск. Без ключей Supabase enabled=false —
// профиль показывает гостевой режим, как раньше.
export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);

  useEffect(() => {
    if (!supabase) return;
    // сначала — сохранённая сессия, дальше — все изменения (вход, выход, другая вкладка)
    supabase.auth.getSession().then(({ data }) => setUser(data.session?.user ?? null));
    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  const sendCode = useCallback(async (email) => {
    const { error } = await supabase.auth.signInWithOtp({ email });
    if (error) throw error;
  }, []);

  const verifyCode = useCallback(async (email, token) => {
    const { error } = await supabase.auth.verifyOtp({ email, token, type: "email" });
    if (error) throw error;
  }, []);

  const signOut = useCallback(async () => {
    try {
      await supabase.auth.signOut();
    } catch {
      /* нет сети — локальная сессия всё равно стёрта supabase-js */
    }
  }, []);

  const value = useMemo(
    () => ({ enabled: !!supabase, user, sendCode, verifyCode, signOut }),
    [user, sendCode, verifyCode, signOut]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
