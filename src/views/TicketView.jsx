import { useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { Calendar, Check, ChevronLeft, Clock, MapPin, Ticket, User, X } from "lucide-react";
import { useSettings } from "../settings-context";
import { EASE_OUT, SCREEN_IN, TAP } from "../components/shared";
import { Reveal } from "../components/ui.jsx";
import { TripBlock } from "../booking/TripBlock.jsx";

export function TicketView({ booking, onClose, onCancel, onNavigate }) {
  const { t, loc, money, plural, fmtDate } = useSettings();
  const exp = loc(booking.exp);
  const [confirmCancel, setConfirmCancel] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const [cancelError, setCancelError] = useState(false);

  async function doCancel() {
    setCancelling(true);
    setCancelError(false);
    try {
      await onCancel(booking);
    } catch (err) {
      console.warn("Отмена не прошла", err);
      setCancelError(true);
      setCancelling(false);
    }
  }

  return (
    <motion.div className="gyg-scroll screen" {...SCREEN_IN}>
      <div className="screen-head">
        <button className="icon-btn" onClick={onClose} aria-label={t("common.back")}><ChevronLeft size={20} /></button>
        <b>{t("ticket.title")}</b>
      </div>
      <div className="screen-body">
        <motion.div
          className="ticket"
          initial={{ opacity: 0, y: 28, scale: 0.96 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ type: "spring", bounce: 0, duration: 0.42, delay: 0.1 }}
        >
          <img className="ticket-cover" src={exp.image} alt="" />
          <span className="orn-band ticket-orn" aria-hidden="true" />
          <div className="ticket-body">
            {booking.status === "confirmed" ? (
              <div className="row ticket-status is-ok">
                <motion.span
                  className="ico"
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ type: "spring", stiffness: 500, damping: 14, delay: 0.35 }}
                >
                  <Check size={16} />
                </motion.span>
                {t("ticket.confirmed")}
              </div>
            ) : ["declined", "cancelled", "expired", "done"].includes(booking.status) ? (
              <div className={`row ticket-status ${booking.status === "done" ? "is-ok" : ""}`}>
                {booking.status === "done" ? <Check size={16} /> : <X size={16} />} {t(`ticket.${booking.status}`)}
              </div>
            ) : (
              <div className="row ticket-status">
                <Clock size={16} /> {t("ticket.pending")}
              </div>
            )}
            <div className="ticket-title">{exp.title}</div>
            <div className="ticket-lines">
              <div className="row muted"><Calendar size={14} /> {fmtDate(booking.date)} · {plural("pl.guests", booking.guests)}</div>
              <div className="row top muted"><MapPin size={14} className="ico-top" /> {exp.meeting}</div>
              {booking.name && (
                <div className="row muted"><User size={14} /> {booking.name} · {booking.contact}</div>
              )}
              <div className="row muted"><Ticket size={14} /> {t("ticket.payOnSite")} <b className="ink">{booking.total == null ? t("price.request") : money(booking.total)}</b></div>
            </div>
          </div>
          <div className="ticket-cut" />
          <div className="ticket-code">
            <span className="muted t-xs">{t("ticket.code")}</span>
            <div>{booking.code}</div>
          </div>
        </motion.div>

        {booking.status === "declined" && booking.declineReason && (
          <div className="card panel mt-16 t-sm">{t("bell.reason", { reason: booking.declineReason })}</div>
        )}

        <TripBlock booking={booking} onNavigate={onNavigate} />

        <Reveal show={cancelError}>
          <div className="form-error mt-16" role="alert">{t("ticket.cancelError")}</div>
        </Reveal>

        {onCancel && ["pending", "confirmed"].includes(booking.status) && (
          <AnimatePresence mode="wait" initial={false}>
            {confirmCancel ? (
              <motion.div
                key="confirm"
                className="row mt-16"
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
                transition={{ duration: 0.18, ease: EASE_OUT }}
              >
                <motion.button className="pill grow-btn" whileTap={TAP} disabled={cancelling} onClick={() => setConfirmCancel(false)}>
                  {t("ticket.keep")}
                </motion.button>
                <motion.button className="cta grow-btn" whileTap={TAP} disabled={cancelling} onClick={doCancel}>
                  {t("ticket.confirmCancel")}
                </motion.button>
              </motion.div>
            ) : (
              <motion.button
                key="ask"
                className="text-btn text-btn-muted ticket-cancel"
                onClick={() => setConfirmCancel(true)}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.15 }}
              >
                {t("ticket.cancel")}
              </motion.button>
            )}
          </AnimatePresence>
        )}
      </div>
    </motion.div>
  );
}
