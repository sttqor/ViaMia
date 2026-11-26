import { useMemo, useRef, useState } from "react";
import { motion } from "motion/react";
import { BadgeCheck, ChevronLeft, Phone, User, Users } from "lucide-react";
import { makeCode, upcomingDates } from "../data";
import { durationMinutes, weekdayShort } from "../i18n";
import { useSettings } from "../settings-context";
import { SPRING, SCREEN_IN, TAP } from "../components/shared";
import { Reveal, Ticker } from "../components/ui.jsx";
import { useAuth } from "../auth-context";
import { LoginScreen } from "../Login.jsx";

export function Booking({ exp: raw, defaults, onBack, onConfirm }) {
  const { t, loc, money, plural, fmtDuration, lang } = useSettings();
  const exp = loc(raw);
  const dates = useMemo(() => upcomingDates(), []);
  const [date, setDate] = useState(dates[1]?.key || dates[0].key);
  const [guests, setGuests] = useState(2);
  const [name, setName] = useState(defaults?.name || "");
  const [contact, setContact] = useState(defaults?.contact || "");
  const total = exp.price == null ? null : exp.price * guests; // в USD; null — цена по запросу
  const nameOk = name.trim().length >= 2;
  const contactOk = contact.trim().length >= 5;
  const canSubmit = nameOk && contactOk;
  const [sending, setSending] = useState(false);
  const [code] = useState(makeCode); // один код на форму: повтор после обрыва связи не создаст вторую заявку
  const [sendError, setSendError] = useState(false);
  const [tried, setTried] = useState(false); // нажимали «отправить» с пустыми полями
  const nameRef = useRef(null);
  const contactRef = useRef(null);
  // бронь — только из аккаунта: иначе не прислать подтверждение, гида и сообщения
  const { enabled: authOn, user } = useAuth();
  const needLogin = authOn && !user;
  const [askLogin, setAskLogin] = useState(false);

  const inFlight = useRef(false); // двойной тап быстрее перерисовки: state ещё старый, ref — нет
  async function submit() {
    if (sending || inFlight.current) return;
    if (!canSubmit) {
      setTried(true);
      (nameOk ? contactRef : nameRef).current?.focus();
      return;
    }
    if (needLogin) {
      setAskLogin(true); // вход по коду, поля формы сохранятся
      return;
    }
    inFlight.current = true;
    setSending(true);
    setSendError(false);
    try {
      await onConfirm({
        exp: raw,
        date,
        guests,
        total,
        name: name.trim(),
        contact: contact.trim(),
        status: "pending",
        createdAt: new Date().toISOString(),
        code,
      });
    } catch (err) {
      console.warn("Заявка не отправилась", err);
      // лимит заявок в базе (04-hardening.sql): «rate_limited:7» — ждать 7 минут
      const wait = String(err?.message).match(/rate_limited:(\d+)/);
      setSendError(wait ? t("booking.errRate", { t: fmtDuration(Number(wait[1])) }) : t("booking.error"));
      inFlight.current = false;
      setSending(false);
    }
  }

  if (askLogin && needLogin) return <LoginScreen onBack={() => setAskLogin(false)} />;

  const dayLabel = (d, i) => (i === 0 ? t("booking.today") : i === 1 ? t("booking.tomorrow") : weekdayShort(d.date, lang));

  return (
    <motion.div className="gyg-scroll screen" {...SCREEN_IN}>
      <div className="screen-head">
        <button className="icon-btn" onClick={onBack} aria-label={t("common.back")}><ChevronLeft size={20} /></button>
        <b>{t("booking.title")}</b>
      </div>
      <div className="screen-body">
        <div className="booking-summary">
          <img src={exp.image} alt="" />
          <div>
            <div className="booking-summary-title">{exp.title}</div>
            <div className="muted">{fmtDuration(durationMinutes(exp.duration))} · {exp.place}</div>
            {exp.agencyName && (
              <div className="row gap-4 muted t-sm">
                {t("detail.organizer")}: {exp.agencyName}
                {raw.agencyVerified && <BadgeCheck size={14} color="var(--green)" aria-label={t("label.verified")} />}
              </div>
            )}
          </div>
        </div>
        <b>{t("booking.when")}</b>
        <div className="h-scroll date-row">
          {dates.map((d, i) => (
            <motion.button
              key={d.key}
              className={`date-chip ${date === d.key ? "on" : ""}`}
              aria-pressed={date === d.key}
              whileTap={TAP}
              onClick={() => setDate(d.key)}
            >
              {date === d.key && <motion.span layoutId="date-thumb" className="date-thumb" transition={SPRING} />}
              <span className="date-label date-day">{dayLabel(d, i)}</span>
              <span className="date-label date-num">{d.date.getDate()}</span>
            </motion.button>
          ))}
        </div>

        <b>{t("booking.guests")}</b>
        <div className="guests-box">
          <span className="row"><Users size={16} /> <Ticker value={plural("pl.guests", guests)} /></span>
          <div className="row">
            <button className="icon-btn" aria-label={t("booking.fewer")} disabled={guests <= 1} onClick={() => setGuests((g) => Math.max(1, g - 1))}>−</button>
            <button className="icon-btn" aria-label={t("booking.more")} disabled={guests >= 10} onClick={() => setGuests((g) => Math.min(10, g + 1))}>+</button>
          </div>
        </div>

        <div className="row between mb-16">
          {total == null ? (
            <>
              <span className="muted">{plural("pl.guests", guests)}</span>
              <b className="t-md">{t("price.request")}</b>
            </>
          ) : (
            <>
              <span className="muted">{money(exp.price)} × {plural("pl.guests", guests)}</span>
              <b className="t-lg"><Ticker value={money(total)} /></b>
            </>
          )}
        </div>

        <b>{t("booking.contacts")}</b>
        <div className="stack-10 form-fields">
          <div className={`search ${tried && !nameOk ? "is-invalid" : ""}`}>
            <User size={18} color="var(--muted-2)" />
            <input
              ref={nameRef}
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={t("booking.name")}
              aria-label={t("booking.name")}
              autoComplete="name"
              aria-invalid={tried && !nameOk}
            />
          </div>
          <div className={`search ${tried && !contactOk ? "is-invalid" : ""}`}>
            <Phone size={18} color="var(--muted-2)" />
            <input
              ref={contactRef}
              value={contact}
              onChange={(e) => setContact(e.target.value)}
              placeholder={t("booking.contact")}
              aria-label={t("booking.contact")}
              autoComplete="tel"
              aria-invalid={tried && !contactOk}
            />
          </div>
        </div>
        <div className="muted mb-16">{t("booking.note")}</div>

        <Reveal show={sendError}>
          <div className="form-error" role="alert">{sendError || t("booking.error")}</div>
        </Reveal>

        <Reveal show={!canSubmit}>
          <div className={`form-hint ${tried ? "is-error" : ""}`} role={tried ? "alert" : undefined}>
            {t("booking.fillHint")}
          </div>
        </Reveal>

        {needLogin && <div className="muted t-sm mb-8">{t("booking.loginWhy")}</div>}

        <motion.button className="cta booking-submit" disabled={sending} whileTap={TAP} onClick={submit}>
          {sending
            ? t("booking.sending")
            : needLogin
              ? t("booking.loginFirst")
              : total == null
              ? t("booking.submitRequest")
              : t("booking.submit", { total: money(total) })}
        </motion.button>
      </div>
    </motion.div>
  );
}
