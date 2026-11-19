import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { Check, ChevronLeft, Lock, UserRound } from "lucide-react";
import { authErrorKey, useAuth } from "./auth-context";
import { CodeStep, ErrorNote, IdField, PasswordField } from "./AuthParts";
import { prettyPhone, readLoginId, showLoginId } from "./phone";
import { useSettings } from "./settings-context";

const SPRING = { type: "spring", stiffness: 400, damping: 32 };
const EASE_OUT = [0.22, 1, 0.36, 1];
const SLIDE = (dir) => ({
  initial: { opacity: 0, x: 24 * dir },
  animate: { opacity: 1, x: 0 },
  exit: { opacity: 0, x: 24 * dir },
  transition: { duration: 0.22, ease: "easeOut" },
});

// Единое окно входа и регистрации: почта или номер +996 → код → готово.
// Аккаунта нет — он создаётся при первом верном коде, без отдельной формы.
// Пароль — по желанию: «войти по паролю» (если задан в профиле).
export function LoginScreen({ onBack }) {
  const { t } = useSettings();
  const { user, sendCode, verifyCode, signInWithPassword } = useAuth();
  const [step, setStep] = useState("id"); // "id" | "code" | "password" | "done"
  const [raw, setRaw] = useState("");
  const [id, setId] = useState(null); // { email } | { phone }
  const [password, setPasswordValue] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null); // ключ перевода
  const doneTimer = useRef(null);

  // уже вошли (например, во второй вкладке) — на экране делать нечего
  const signedElsewhere = user && step === "id";

  useEffect(() => () => clearTimeout(doneTimer.current), []);

  function finish() {
    setStep("done");
    doneTimer.current = setTimeout(onBack, 1200);
  }

  function readId() {
    const res = readLoginId(raw);
    if (res.error) setError(res.error);
    return res.id || null;
  }

  async function submitId(e) {
    e.preventDefault();
    const next = readId();
    if (!next) return;
    setBusy(true);
    setError(null);
    try {
      await sendCode(next);
      setId(next);
      setStep("code");
    } catch (err) {
      setError(authErrorKey(err));
    } finally {
      setBusy(false);
    }
  }

  function toPassword() {
    const next = readId();
    if (!next) return;
    setError(null);
    setId(next);
    setPasswordValue("");
    setStep("password");
  }

  async function submitPassword(e) {
    e.preventDefault();
    if (!password) return;
    setBusy(true);
    setError(null);
    try {
      await signInWithPassword(id, password);
      finish();
    } catch (err) {
      setError(authErrorKey(err, "login.errPassword"));
    } finally {
      setBusy(false);
    }
  }

  async function codeInstead() {
    setBusy(true);
    setError(null);
    try {
      await sendCode(id);
      setStep("code");
    } catch (err) {
      setError(authErrorKey(err));
    } finally {
      setBusy(false);
    }
  }

  function backToId() {
    setStep("id");
    setError(null);
  }

  const target = showLoginId(id);
  const who = user?.email || prettyPhone(user?.phone);

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
              <p className="muted">{who}</p>
              {signedElsewhere && (
                <button className="cta mt-16" onClick={onBack}>
                  {t("common.back")}
                </button>
              )}
            </motion.div>
          ) : step === "id" ? (
            <motion.form key="id" className="login-step" onSubmit={submitId} noValidate {...SLIDE(-1)}>
              <span className="login-icon">
                <UserRound size={26} />
              </span>
              <h2>{t("login.heroTitle")}</h2>
              <p className="muted">{t("login.heroText")}</p>
              <IdField
                value={raw}
                placeholder={t("login.idPlaceholder")}
                onChange={(v) => {
                  setRaw(v);
                  if (error) setError(null);
                }}
              />
              {error && <ErrorNote text={t(error)} />}
              <button className="cta" type="submit" disabled={busy || !raw.trim()}>
                {busy ? t("login.sending") : t("login.send")}
              </button>
              <button className="text-btn login-change" type="button" disabled={busy || !raw.trim()} onClick={toPassword}>
                {t("login.withPassword")}
              </button>
              <p className="muted t-xs login-note">{t("login.note")}</p>
            </motion.form>
          ) : step === "code" ? (
            <motion.div key="code" className="login-step" {...SLIDE(1)}>
              <CodeStep
                title={t("login.codeTitle")}
                text={t(id?.phone ? "login.codeTextPhone" : "login.codeTextEmail", { target })}
                verify={async (token) => {
                  await verifyCode(id, token);
                  finish();
                }}
                resend={() => sendCode(id)}
                onChangeTarget={backToId}
                changeLabel={t("login.changeId")}
              />
            </motion.div>
          ) : (
            <motion.form key="password" className="login-step" onSubmit={submitPassword} {...SLIDE(1)}>
              <span className="login-icon">
                <Lock size={26} />
              </span>
              <h2>{t("login.passwordTitle")}</h2>
              <p className="muted">
                {target} · {t("login.passwordText")}
              </p>
              <PasswordField
                value={password}
                placeholder={t("login.password")}
                onChange={(v) => {
                  setPasswordValue(v);
                  if (error) setError(null);
                }}
              />
              {error && <ErrorNote text={t(error)} />}
              <button className="cta" type="submit" disabled={busy || !password}>
                {busy ? t("login.checking") : t("login.signIn")}
              </button>
              <button className="text-btn login-change" type="button" disabled={busy} onClick={codeInstead}>
                {t("login.withCode")}
              </button>
              <button className="text-btn login-change" type="button" onClick={backToId}>
                {t("login.changeId")}
              </button>
            </motion.form>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}
