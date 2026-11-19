import { createContext, useContext } from "react";

export const AuthContext = createContext(null);

// Аккаунт: enabled (настроен ли Supabase), user, hasPassword,
// sendCode / verifyCode / signInWithPassword — вход по почте или телефону,
// setPassword, startLink / confirmLink — привязать второй способ входа, signOut.
// «id» везде — { email } или { phone: "+996…" }.
export function useAuth() {
  const value = useContext(AuthContext);
  if (!value) throw new Error("useAuth нужно вызывать внутри <AuthProvider>");
  return value;
}

// Ошибка Supabase Auth → ключ перевода (login.err*). fallback — если причина непонятна.
export function authErrorKey(err, fallback = "login.errSend") {
  const code = err?.code || "";
  const msg = String(err?.message || "").toLowerCase();
  if (code === "otp_expired" || /expired|invalid.*(otp|token)/.test(msg)) return "login.errCode";
  if (code === "invalid_credentials" || /invalid login/.test(msg)) return "login.errPassword";
  if (/rate_limit/.test(code) || /rate limit|security purposes/.test(msg)) return "login.errRate";
  if (code === "email_address_invalid" || /email address .* is invalid/.test(msg)) return "login.errEmail";
  if (code === "email_exists" || /email.*(already|registered)/.test(msg)) return "login.errEmailTaken";
  if (code === "phone_exists" || /phone.*(already|registered)/.test(msg)) return "login.errPhoneTaken";
  if (code === "weak_password" || /password.*(at least|weak|short)/.test(msg)) return "login.errWeak";
  if (code === "same_password") return "login.errSamePassword";
  if (code === "phone_provider_disabled" || code === "sms_send_failed" || /sms|phone provider/.test(msg))
    return "login.errSms";
  if (/fetch|network/.test(msg)) return "login.errNetwork";
  return fallback;
}
