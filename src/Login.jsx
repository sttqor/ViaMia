import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { AtSign, Check, ChevronLeft, KeyRound, Mail } from "lucide-react";
import { useAuth } from "./auth-context";
import { useSettings } from "./settings-context";

const SPRING = { type: "spring", stiffness: 400, damping: 32 };
const EASE_OUT = [0.22, 1, 0.36, 1];
const EMAIL_RE = /^\S+@\S+\.\S+$/;
const RESEND_S = 60;

// Экран входа: почта → шестизначный код из письма → готово.
// Код проверяется сам, как только введены все шесть цифр.
export function LoginScreen({ onBack }) {
  const { t } = useSettings();
  const { user, sendCode, verifyCode } = useAuth();
  const [step, setStep] = useState("email"); // "email" | "code" | "done"
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null); // ключ перевода
  const [left, setLeft] = useState(0); // секунды до повторной отправки
  const codeRef = useRef(null);
  const doneTimer = useRef(null);

  // уже вошли (например, вторая вкладка) — на экране делать нечего
  const signedElsewhere = user && step === "email";

  useEffect(() => {
    if (left <= 0) return;
    const id = setInterval(() => setLeft((s) => s - 1), 1000);
    return () => clearInterval(id);
  }, [left]);

  useEffect(() => () => clearTimeout(doneTimer.current), []);

  async function submitEmail(e) {
    e.preventDefault();
    const addr = email.trim().toLowerCase();
    if (!EMAIL_RE.test(addr)) {
      setError("login.errEmail");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await sendCode(addr);
      setEmail(addr);
      setCode("");
      setLeft(RESEND_S);
      setStep("code");
    } catch {
      setError("login.errSend");
    } finally {
      setBusy(false);
    }
  }

  async function submitCode(value) {
    setBusy(true);
    setError(null);
    try {
      await verifyCode(email, value);
      setStep("done");
      doneTimer.current = setTimeout(onBack, 1200);
    } catch {
      setError("login.errCode");
      setCode("");
      codeRef.current?.focus();
    } finally {
      setBusy(false);
    }
  }

  function onCodeChange(e) {
    const v = e.target.value.replace(/\D/g, "").slice(0, 6);
    setCode(v);
    if (error) setError(null);
    if (v.length === 6 && !busy) submitCode(v);
  }

  async function resend() {
    setBusy(true);
    setError(null);
    try {
      await sendCode(email);
      setLeft(RESEND_S);
      setCode("");
      codeRef.current?.focus();
    } catch {
      setError("login.errSend");
    } finally {
      setBusy(false);
    }
  }

  return (
    <motion.div
      className="gyg-scroll screen login-screen"
      initial={{ opacity: 0, x: 40 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.32, ease: EASE_OUT }}
    >
      <div className="screen-head">
        <button className="icon-btn" onClick={onBack} aria-label={t("common.back")}>
          <ChevronLeft size={20} />
        </button>
        <b>{t("login.title")}</b>
      </div>

      <div className="screen-body login-body">
        <AnimatePresence mode="wait" initial={false}>
          {step === "done" || signedElsewhere ? (
            <motion.div
              key="done"
              className="login-step login-done"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={SPRING}
            >
              <motion.span
                className="login-icon is-ok"
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ ...SPRING, delay: 0.1 }}
              >
                <Check size={30} strokeWidth={3} />
              </motion.span>
              <h2>{t("login.done")}</h2>
              <p className="muted">{user?.email}</p>
              {signedElsewhere && (
                <button className="cta mt-16" onClick={onBack}>
                  {t("common.back")}
                </button>
              )}
            </motion.div>
          ) : step === "email" ? (
            <motion.form
              key="email"
              className="login-step"
              onSubmit={submitEmail}
              initial={{ opacity: 0, x: -24 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -24 }}
              transition={{ duration: 0.22, ease: "easeOut" }}
            >
              <span className="login-icon">
                <Mail size={26} />
              </span>
              <h2>{t("login.heroTitle")}</h2>
              <p className="muted">{t("login.heroText")}</p>
              <label className="search login-field">
                <AtSign size={18} color="var(--muted-2)" />
                <input
                  type="email"
                  inputMode="email"
                  autoComplete="email"
                  autoFocus
                  placeholder={t("login.email")}
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    if (error) setError(null);
                  }}
                />
              </label>
              {error && <ErrorNote text={t(error)} />}
              <button className="cta" type="submit" disabled={busy || !email.trim()}>
                {busy ? t("login.sending") : t("login.send")}
              </button>
              <p className="muted t-xs login-note">{t("login.note")}</p>
            </motion.form>
          ) : (
            <motion.div
              key="code"
              className="login-step"
              initial={{ opacity: 0, x: 24 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 24 }}
              transition={{ duration: 0.22, ease: "easeOut" }}
            >
              <span className="login-icon">
                <KeyRound size={26} />
              </span>
              <h2>{t("login.codeTitle")}</h2>
              <p className="muted">{t("login.codeText", { email })}</p>
              <motion.input
                ref={codeRef}
                className={`code-input ${error ? "is-error" : ""}`}
                type="text"
                inputMode="numeric"
                autoComplete="one-time-code"
                autoFocus
                maxLength={6}
                placeholder="••••••"
                aria-label={t("login.codeTitle")}
                value={code}
                onChange={onCodeChange}
                disabled={busy}
                animate={error ? { x: [0, -8, 8, -5, 5, 0] } : { x: 0 }}
                transition={{ duration: 0.35 }}
              />
              {error && <ErrorNote text={t(error)} />}
              {busy && <p className="muted t-sm">{t("login.checking")}</p>}
              <button className="cta ghost" type="button" disabled={busy || left > 0} onClick={resend}>
                {left > 0 ? t("login.resendIn", { s: left }) : t("login.resend")}
              </button>
              <button
                className="text-btn login-change"
                type="button"
                onClick={() => {
                  setStep("email");
                  setCode("");
                  setError(null);
                }}
              >
                {t("login.changeEmail")}
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}

function ErrorNote({ text }) {
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
