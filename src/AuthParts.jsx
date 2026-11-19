import { useEffect, useRef, useState } from "react";
import { motion } from "motion/react";
import { AtSign, Eye, EyeOff, KeyRound, Lock, Phone } from "lucide-react";
import { authErrorKey } from "./auth-context";
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
