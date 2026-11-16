import { createContext, useContext } from "react";

export const AuthContext = createContext(null);

// Аккаунт: enabled (настроен ли Supabase), user, sendCode, verifyCode, signOut
export function useAuth() {
  const value = useContext(AuthContext);
  if (!value) throw new Error("useAuth нужно вызывать внутри <AuthProvider>");
  return value;
}
