// Колокольчик: события по броням (подтвердили, отклонили, гид назначен, новое сообщение…).
// Приходят сразу через Supabase Realtime; список — нижний лист. onOpen(bookingId) — открыть поездку.
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion } from "motion/react";
import { Bell, X } from "lucide-react";
import { useSettings } from "../settings-context";
import { useAuth } from "../auth-context";
import { fetchEvents, markEventsRead, subscribeEvents } from "./booking-api";
import "./booking.css";

export function EventsBell({ onOpen }) {
  const { t, fmtDate } = useSettings();
  const { user } = useAuth();
  const [events, setEvents] = useState([]);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!user) return;
    let off = false;
    const load = () =>
      fetchEvents()
        // в кабинете агентства свои события; здесь — только туристские
        .then((d) => !off && setEvents(d.filter((e) => !e.to_agency)))
        .catch(() => {});
    load();
    const unsub = subscribeEvents(`user-${user.id}`, load);
    return () => {
      off = true;
      unsub();
    };
  }, [user]);

  if (!user) return null;
  const unread = events.filter((e) => !e.read_at).length;

  function toggle() {
    setOpen((o) => !o);
    if (!open && unread) {
      markEventsRead().catch(() => {});
      setEvents((l) => l.map((e) => ({ ...e, read_at: e.read_at || new Date().toISOString() })));
    }
  }

  const text = (e) => {
    const p = e.payload || {};
    const date = p.date ? fmtDate(p.date) : "";
    if (e.kind === "message") return t("bell.message", { text: p.text || "" });
    if (e.kind === "declined") return t("bell.declined", { tour: p.tour || "", date }) + (p.reason ? ` ${t("bell.reason", { reason: p.reason })}` : "");
    return t(`bell.${e.kind}`, { tour: p.tour || "", date });
  };

  return (
    <>
      <button className="icon-btn bell-btn" onClick={toggle} aria-label={t("bell.title")} aria-expanded={open}>
        <Bell size={18} />
        {unread > 0 && <span className="bk-badge bell-count">{unread}</span>}
      </button>
      {createPortal(
        <AnimatePresence>
          {open && (
            <>
              <motion.div className="bell-backdrop" onClick={() => setOpen(false)} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} />
              <motion.div
                className="bell-sheet"
                role="dialog"
                aria-label={t("bell.title")}
                initial={{ y: "100%" }}
                animate={{ y: 0 }}
                exit={{ y: "100%" }}
                transition={{ type: "spring", stiffness: 400, damping: 36 }}
              >
                <div className="row between mb-8">
                  <b className="t-lg">{t("bell.title")}</b>
                  <button className="icon-btn" onClick={() => setOpen(false)} aria-label={t("map.poi.close")}><X size={18} /></button>
                </div>
                {events.length === 0 && <div className="bk-chat-empty">{t("bell.empty")}</div>}
                <ul className="bell-list">
                  {events.map((e) => (
                    <li key={e.id}>
                      <button
                        onClick={() => {
                          setOpen(false);
                          onOpen?.(e.booking_id);
                        }}
                      >
                        <span className="t-sm">{text(e)}</span>
                        <span className="muted t-xs">{fmtDate(new Date(e.created_at).toLocaleDateString("en-CA"))}</span>
                      </button>
                    </li>
                  ))}
                </ul>
              </motion.div>
            </>
          )}
        </AnimatePresence>,
        document.body
      )}
    </>
  );
}
