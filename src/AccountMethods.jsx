import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { AtSign, Check, ChevronLeft, ChevronRight, Lock, Phone, ShieldCheck } from "lucide-react";
import { authErrorKey, useAuth } from "./auth-context";
import { CodeStep, ErrorNote, IdField, PasswordField } from "./AuthParts";
import { prettyPhone, readLoginId, showLoginId } from "./phone";
import { useSettings } from "./settings-context";

const MIN_PASSWORD = 8;

// Блок профиля «Способы входа»: почта, телефон, пароль. onOpen("email" | "phone" | "password")
export function LoginMethods({ onOpen }) {
  const { t } = useSettings();
  const { user, hasPassword } = useAuth();
  if (!user) return null;
  const phone = prettyPhone(user.phone);
  const rows = [
    { key: "email", icon: AtSign, label: t("methods.email"), value: user.email, action: t("methods.link") },
    { key: "phone", icon: Phone, label: t("methods.phone"), value: phone, action: t("methods.link") },
    {
      key: "password",
      icon: Lock,
      label: t("methods.password"),
      value: hasPassword ? t("methods.passwordOn") : null,
      empty: t("methods.passwordOff"),
      action: hasPassword ? t("methods.change") : t("methods.set"),
      always: true,
    },
  ];
  return (
    <div className="card panel">
      <div className="panel-head">
        <ShieldCheck size={16} color="var(--terracotta)" />
        <b>{t("methods.title")}</b>
      </div>
      {rows.map(({ key, icon: Icon, label, value, empty, action, always }) => {
        const canOpen = !value || always;
        const body = (
          <>
            <span className="row gap-12 method-main">
              <Icon size={16} color="var(--muted)" />
              <span className="grow">
                <span className="method-label">{label}</span>
                <span className={`t-xs ${value ? "" : "muted"} login-email`}>{value || empty || t("methods.none")}</span>
              </span>
            </span>
            {canOpen && (
              <span className="row gap-4 method-action">
                {action}
                <ChevronRight size={16} />
              </span>
            )}
          </>
        );
        return canOpen ? (
          <button key={key} className="row-btn row-btn-divided method-row" onClick={() => onOpen(key)}>
            {body}
          </button>
        ) : (
          <div key={key} className="row-btn row-btn-divided method-row">
            {body}
          </div>
        );
      })}
    </div>
  );
}

// Экран привязки почты/телефона или установки пароля
export function LinkScreen({ mode, onBack }) {
  const { t } = useSettings();
  const { startLink, confirmLink, setPassword } = useAuth();
  const [step, setStep] = useState("form"); // "form" | "code" | "done"
  const [raw, setRaw] = useState("");
  const [id, setId] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  const doneTimer = useRef(null);
  useEffect(() => () => clearTimeout(doneTimer.current), []);

  function finish() {
    setStep("done");
    doneTimer.current = setTimeout(onBack, 1200);
  }

  async function submit(e) {
    e.preventDefault();
    setError(null);
    if (mode === "password") {
      if (raw.length < MIN_PASSWORD) return setError("login.errWeak");
      setBusy(true);
      try {
        await setPassword(raw);
        finish();
      } catch (err) {
        setError(authErrorKey(err, "login.errNetwork"));
      } finally {
        setBusy(false);
      }
      return;
    }
    const res = readLoginId(raw, mode);
    if (res.error) return setError(res.error);
    setBusy(true);
    try {
      await startLink(res.id);
      setId(res.id);
      setStep("code");
    } catch (err) {
      setError(authErrorKey(err));
    } finally {
      setBusy(false);
    }
  }

  const title = t(`link.${mode}Title`);
  const Icon = mode === "phone" ? Phone : mode === "email" ? AtSign : Lock;

  return (
    <motion.div
      className="gyg-scroll screen login-screen"
      initial={{ opacity: 0, x: 40 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.32, ease: [0.22, 1, 0.36, 1] }}
    >
      <div className="screen-head">
        <button className="icon-btn" onClick={onBack} aria-label={t("common.back")}>
          <ChevronLeft size={20} />
        </button>
        <b>{title}</b>
      </div>
      <div className="screen-body login-body">
        <AnimatePresence mode="wait" initial={false}>
          {step === "done" ? (
            <motion.div
              key="done"
              className="login-step login-done"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
            >
              <span className="login-icon is-ok">
                <Check size={30} strokeWidth={3} />
              </span>
              <h2>{t("link.done")}</h2>
              {id && <p className="muted">{showLoginId(id)}</p>}
            </motion.div>
          ) : step === "form" ? (
            <motion.form
              key="form"
              className="login-step"
              onSubmit={submit}
              noValidate
              initial={{ opacity: 0, x: -24 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -24 }}
            >
              <span className="login-icon">
                <Icon size={26} />
              </span>
              <h2>{title}</h2>
              <p className="muted">{t(`link.${mode}Text`)}</p>
              {mode === "password" ? (
                <PasswordField
                  value={raw}
                  autoComplete="new-password"
                  placeholder={t("link.newPassword")}
                  onChange={(v) => {
                    setRaw(v);
                    if (error) setError(null);
                  }}
                />
              ) : (
                <IdField
                  mode={mode}
                  value={raw}
                  placeholder={mode === "phone" ? "+996 (700) 12-34-56" : t("methods.email")}
                  onChange={(v) => {
                    setRaw(v);
                    if (error) setError(null);
                  }}
                />
              )}
              {error && <ErrorNote text={t(error)} />}
              <button className="cta" type="submit" disabled={busy || !raw.trim()}>
                {busy
                  ? t(mode === "password" ? "link.saving" : "login.sending")
                  : t(mode === "password" ? "link.save" : "login.send")}
              </button>
            </motion.form>
          ) : (
            <motion.div
              key="code"
              className="login-step"
              initial={{ opacity: 0, x: 24 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 24 }}
            >
              <CodeStep
                title={t("login.codeTitle")}
                text={t(id?.phone ? "login.codeTextPhone" : "login.codeTextEmail", { target: showLoginId(id) })}
                verify={async (token) => {
                  await confirmLink(id, token);
                  finish();
                }}
                resend={() => startLink(id)}
                onChangeTarget={() => {
                  setStep("form");
                  setError(null);
                }}
                changeLabel={t("login.changeId")}
              />
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}
