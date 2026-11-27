// «Поездка» внутри билета: время встречи, гид, программа, связь, чат.
// Гид и контакты приходят из базы (my_trip) только после подтверждения агентством.
import { useEffect, useState } from "react";
import { motion } from "motion/react";
import { Clock, MessageCircle, Navigation, Phone, Send, UserRound } from "lucide-react";
import { useSettings } from "../settings-context";
import { useAuth } from "../auth-context";
import { fetchTrip } from "./booking-api";
import { BookingChat } from "./BookingChat";
import "./booking.css";

const TZ = "Asia/Bishkek";
const digits = (p) => (p || "").replace(/[^\d+]/g, "");
const tgLink = (tg) => {
  const v = (tg || "").trim().replace(/^https?:\/\/t\.me\//, "").replace(/^@/, "");
  return /^[A-Za-z0-9_]{5,32}$/.test(v) ? `https://t.me/${v}` : null; // только имя пользователя Telegram
};

export function TripBlock({ booking, onNavigate }) {
  const { t, locale } = useSettings();
  const { user } = useAuth();
  const [trip, setTrip] = useState(null);
  const exp = booking.exp;
  const canChat = Boolean(user && booking.id);

  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    if (!canChat) return;
    let off = false;
    let retry = null;
    fetchTrip(booking.id)
      .then((d) => !off && setTrip(d))
      // нет сети — гид и программа подтянутся со следующей попытки (до 3 раз)
      .catch(() => {
        if (!off && attempt < 3) retry = setTimeout(() => setAttempt((n) => n + 1), 5000);
      });
    return () => {
      off = true;
      clearTimeout(retry);
    };
  }, [booking.id, canChat, booking.status, attempt]);

  const status = trip?.status || booking.status;
  const meetAt = trip?.meet_at || booking.meetAt;
  const note = trip?.note || booking.note;
  const guide = trip?.guide;
  const agency = trip?.agency;
  const plan = exp.itinerary || [];
  const meetLabel = meetAt
    ? new Intl.DateTimeFormat(locale, { timeZone: TZ, weekday: "short", day: "numeric", month: "long", hour: "2-digit", minute: "2-digit" }).format(new Date(meetAt))
    : null;

  const phone = guide?.phone || agency?.phone;
  const tg = tgLink(agency?.telegram);
  const closed = ["declined", "cancelled", "expired"].includes(status);

  return (
    <motion.div className="trip" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
      {status === "confirmed" && meetLabel && (
        <section className="card panel trip-meet">
          <div className="row gap-6"><Clock size={16} color="var(--terracotta)" /> <b>{t("trip.meet")}</b></div>
          <div className="trip-akjol">{t("trip.akjol")}</div>
          <div className="t-lg b">{meetLabel}</div>
          {exp.meeting && <div className="muted t-sm">{exp.meeting}</div>}
          {exp.lat != null && onNavigate && (
            <button className="cta ghost mt-8" onClick={() => onNavigate(exp)}>
              <Navigation size={16} /> {t("trip.howToGet")}
            </button>
          )}
        </section>
      )}

      {guide && (
        <section className="card panel">
          <b className="mb-8">{t("trip.guide")}</b>
          <div className="bk-guide">
            {guide.photo_url ? <img className="bk-guide-photo" src={guide.photo_url} alt="" /> : <span className="bk-guide-photo"><UserRound size={24} /></span>}
            <span className="grow">
              <span className="t-md b">{guide.name}</span>
              {guide.langs?.length > 0 && <span className="muted t-sm">{guide.langs.join(", ")}</span>}
            </span>
          </div>
        </section>
      )}

      {note && status === "confirmed" && (
        <section className="card panel">
          <b>{t("trip.note")}</b>
          <p className="t-sm trip-note">{note}</p>
        </section>
      )}

      {plan.length > 0 && (
        <section className="card panel">
          <b className="mb-8">{t("trip.plan")}</b>
          <ol className="bk-plan">
            {plan.map((p, i) => (
              <li key={i}>
                <span className="bk-plan-time">{p.time}</span>
                <span className="bk-plan-dot" aria-hidden="true" />
                <span className="bk-plan-title">{p.title}</span>
              </li>
            ))}
          </ol>
        </section>
      )}

      {(phone || tg) && (
        <section className="card panel">
          <b className="mb-8">{t("trip.contact", { name: agency?.name || "" })}</b>
          <div className="bk-contacts">
            {phone && <a className="pill" href={`https://wa.me/${digits(phone).replace("+", "")}`} target="_blank" rel="noreferrer"><MessageCircle size={14} /> WhatsApp</a>}
            {tg && <a className="pill" href={tg} target="_blank" rel="noreferrer"><Send size={14} /> Telegram</a>}
            {phone && <a className="pill" href={`tel:${digits(phone)}`}><Phone size={14} /> {t("trip.call")}</a>}
          </div>
        </section>
      )}

      {canChat ? (
        <section className="card panel">
          <b className="mb-8">{t("chat.title")}</b>
          <BookingChat bookingId={booking.id} side="tourist" closed={closed} />
        </section>
      ) : (
        booking.synced && <div className="muted t-xs trip-hint">{t("trip.loginForChat")}</div>
      )}
    </motion.div>
  );
}
