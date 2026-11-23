import { useEffect, useRef, useState } from "react";
import { motion } from "motion/react";
import { AtSign, Eye, EyeOff, KeyRound, Lock, Phone } from "lucide-react";
import { authErrorKey, useAuth } from "./auth-context";
import { formatPhone, looksLikePhone } from "./phone";
import { useSettings } from "./settings-context";

// Общие куски экранов входа и привязки (Login.jsx, AccountMethods.jsx)

const RESEND_S = 60;

// Поле «почта или телефон». Цифры сразу оборачиваются в маску +996 (XXX) XX-XX-XX.
// mode: "any" | "email" | "phone"
export function IdField({ value, onChange, mode = "any", placeholder }) {
  const phoneMode = mode === "phone" || (mode === "any" && looksLikePhone(value));

  function handle(e) {
    let v = e.target.value;
    if (mode === "email") return onChange(v);
    // начали с цифр, а потом пошли буквы — это почта вроде «123abc@…», снимаем маску
    if (mode === "any" && !looksLikePhone(v) && /^\+996 \(/.test(value)) {
      v = v.replace(/^\+996 \(/, "").replace(/[)\s-]/g, "");
      return onChange(v);
    }
    onChange(mode === "phone" || looksLikePhone(v) ? formatPhone(v) : v);
  }

  return (
    <label className="search login-field">
      {phoneMode ? <Phone size={18} color="var(--muted-2)" /> : <AtSign size={18} color="var(--muted-2)" />}
      <input
        type={mode === "phone" ? "tel" : mode === "email" ? "email" : "text"}
        inputMode={mode === "phone" ? "tel" : "email"}
        autoComplete={mode === "phone" ? "tel" : mode === "email" ? "email" : "username"}
        autoCapitalize="off"
        autoCorrect="off"
        spellCheck={false}
        autoFocus
        placeholder={placeholder}
        value={value}
        onChange={handle}
      />
    </label>
  );
}

// Поле пароля с кнопкой «показать»
export function PasswordField({ value, onChange, placeholder, autoComplete = "current-password" }) {
  const { t } = useSettings();
  const [show, setShow] = useState(false);
  return (
    <label className="search login-field">
      <Lock size={18} color="var(--muted-2)" />
      <input
        type={show ? "text" : "password"}
        autoComplete={autoComplete}
        autoFocus
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
      <button
        type="button"
        className="login-eye"
        onClick={() => setShow((s) => !s)}
        aria-label={show ? t("login.hide") : t("login.show")}
      >
        {show ? <EyeOff size={18} /> : <Eye size={18} />}
      </button>
    </label>
  );
}

// Шаг «введите код»: шесть цифр проверяются сами, таймер повторной отправки, ошибки.
// verify(token) и resend() — async, бросают ошибку Supabase.
export function CodeStep({ title, text, verify, resend, onChangeTarget, changeLabel, children }) {
  const { t } = useSettings();
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  const [left, setLeft] = useState(RESEND_S);
  const ref = useRef(null);

  useEffect(() => {
    if (left <= 0) return;
    const id = setInterval(() => setLeft((s) => s - 1), 1000);
    return () => clearInterval(id);
  }, [left]);

  async function submit(value) {
    setBusy(true);
    setError(null);
    try {
      await verify(value);
    } catch (err) {
      setError(authErrorKey(err, "login.errCode"));
      setCode("");
      setBusy(false);
      setTimeout(() => ref.current?.focus(), 0);
      return;
    }
    setBusy(false);
  }

  function onChange(e) {
    const v = e.target.value.replace(/\D/g, "").slice(0, 6);
    setCode(v);
    if (error) setError(null);
    if (v.length === 6 && !busy) submit(v);
  }

  async function again() {
    setBusy(true);
    setError(null);
    try {
      await resend();
      setLeft(RESEND_S);
      setCode("");
      ref.current?.focus();
    } catch (err) {
      setError(authErrorKey(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <span className="login-icon">
        <KeyRound size={26} />
      </span>
      <h2>{title}</h2>
      <p className="muted">{text}</p>
      <motion.input
        ref={ref}
        className={`code-input ${error ? "is-error" : ""}`}
        type="text"
        inputMode="numeric"
        autoComplete="one-time-code"
        autoFocus
        maxLength={6}
        placeholder="••••••"
        aria-label={title}
        value={code}
        onChange={onChange}
        disabled={busy}
        animate={error ? { x: [0, -8, 8, -5, 5, 0] } : { x: 0 }}
        transition={{ duration: 0.35 }}
      />
      {error && <ErrorNote text={t(error)} />}
      {busy && <p className="muted t-sm">{t("login.checking")}</p>}
      <button className="cta ghost" type="button" disabled={busy || left > 0} onClick={again}>
        {left > 0 ? t("login.resendIn", { s: left }) : t("login.resend")}
      </button>
      {onChangeTarget && (
        <button className="text-btn login-change" type="button" onClick={onChangeTarget}>
          {changeLabel}
        </button>
      )}
      {children}
    </>
  );
}

export function ErrorNote({ text }) {
  return (
    <motion.p
      className="login-error"
      role="alert"
      initial={{ opacity: 0, y: -6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2 }}
    >
      {text}
    </motion.p>
  );
}

// логотип Google (по правилам бренда — разноцветная «G» на белом)
const G_LOGO = (
  <svg width="18" height="18" viewBox="0 0 48 48" aria-hidden="true">
    <path fill="#EA4335" d="M24 9.5c3.5 0 6.6 1.2 9 3.5l6.7-6.7C35.6 2.4 30.2 0 24 0 14.6 0 6.6 5.4 2.6 13.2l7.8 6.1C12.3 13.5 17.6 9.5 24 9.5z" />
    <path fill="#4285F4" d="M46.1 24.5c0-1.6-.1-3.1-.4-4.5H24v9h12.4c-.5 2.9-2.2 5.3-4.6 6.9l7.5 5.8c4.4-4 6.8-10 6.8-17.2z" />
    <path fill="#FBBC05" d="M10.4 28.7c-.5-1.4-.8-3-.8-4.7s.3-3.2.8-4.7l-7.8-6.1C1 16.5 0 20.1 0 24s1 7.5 2.6 10.8l7.8-6.1z" />
    <path fill="#34A853" d="M24 48c6.5 0 11.9-2.1 15.8-5.8l-7.5-5.8c-2.1 1.4-4.8 2.3-8.3 2.3-6.4 0-11.7-4-13.6-9.6l-7.8 6.1C6.6 42.6 14.6 48 24 48z" />
  </svg>
);
const APPLE_LOGO = (
  <svg width="16" height="18" viewBox="0 0 384 512" aria-hidden="true">
    <path fill="currentColor" d="M318.7 268.7c-.2-36.7 16.4-64.4 50-84.8-18.8-26.9-47.2-41.7-84.7-44.6-35.5-2.8-74.3 20.7-88.5 20.7-15 0-49.4-19.7-76.4-19.7C63.3 141.2 4 184.8 4 273.5q0 39.3 14.4 81.2c12.8 36.7 59 126.7 107.2 125.2 25.2-.6 43-17.9 75.8-17.9 31.8 0 48.3 17.9 76.4 17.9 48.6-.7 90.4-82.5 102.6-119.3-65.2-30.7-61.7-90-61.7-91.9zm-56.6-164.2c27.3-32.4 24.8-61.9 24-72.5-24.1 1.4-52 16.4-67.9 34.9-17.5 19.8-27.8 44.3-25.6 71.9 26.1 2 49.9-11.4 69.5-34.3z" />
  </svg>
);

// «Войти через Google / Apple» и разделитель «или». onError(key) — показать ошибку
export function OAuthButtons({ onError }) {
  const { t } = useSettings();
  const { signInWithProvider, providers } = useAuth();
  const [busy, setBusy] = useState(null);
  if (!providers.google && !providers.apple) return null; // ни один не включён в Supabase
  const go = async (provider) => {
    setBusy(provider);
    onError?.(null);
    try {
      await signInWithProvider(provider); // на сайте дальше — переход к провайдеру
    } catch (err) {
      console.warn("Вход через", provider, err);
      onError?.("login.errOAuth");
      setBusy(null);
    }
  };
  return (
    <div className="oauth">
      {providers.google && (
        <button type="button" className="oauth-btn" disabled={!!busy} onClick={() => go("google")}>
          {G_LOGO} {t("login.google")}
        </button>
      )}
      {providers.apple && (
        <button type="button" className="oauth-btn is-apple" disabled={!!busy} onClick={() => go("apple")}>
          {APPLE_LOGO} {t("login.apple")}
        </button>
      )}
      <div className="oauth-or"><span>{t("login.or")}</span></div>
    </div>
  );
}
