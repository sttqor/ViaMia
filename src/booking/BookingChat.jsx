// Чат по одной брони — общий для туриста («поездка») и агентства (кабинет).
// side: "tourist" | "agency" — чьи сообщения справа.
import { useEffect, useRef, useState } from "react";
import { SendHorizontal } from "lucide-react";
import { useSettings } from "../settings-context";
import { fetchMessages, markChatRead, sendMessage, subscribeMessages } from "./booking-api";
import "./booking.css";

export function BookingChat({ bookingId, side, closed = false }) {
  const { t, locale } = useSettings();
  const [list, setList] = useState(null);
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState(false);
  const endRef = useRef(null);

  useEffect(() => {
    let off = false;
    const early = []; // пришли по realtime раньше, чем загрузилась история
    const add = (m) => {
      if (!early.some((x) => x.id === m.id)) early.push(m);
      setList((l) => (l && !l.some((x) => x.id === m.id) ? [...l, m] : l));
    };
    fetchMessages(bookingId)
      .then((d) => {
        if (off) return;
        setList([...d, ...early.filter((m) => !d.some((x) => x.id === m.id))]);
        markChatRead(bookingId).catch(() => {});
      })
      .catch(() => !off && setError(true));
    const unsub = subscribeMessages(bookingId, (m) => {
      add(m);
      markChatRead(bookingId).catch(() => {});
    });
    return () => {
      off = true;
      unsub();
    };
  }, [bookingId]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ block: "nearest" });
  }, [list]);

  async function send(e) {
    e.preventDefault();
    const body = text.trim();
    if (!body || sending) return;
    setSending(true);
    setError(false);
    try {
      const m = await sendMessage(bookingId, body);
      setList((l) => ((l || []).some((x) => x.id === m.id) ? l : [...(l || []), m]));
      setText("");
    } catch (err) {
      console.warn(err);
      setError(true);
    } finally {
      setSending(false);
    }
  }

  const mine = (m) => (side === "agency" ? m.from_agency : !m.from_agency);
  const time = (iso) => {
    try {
      return new Intl.DateTimeFormat(locale, { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" }).format(new Date(iso));
    } catch {
      return "";
    }
  };

  return (
    <section className="bk-chat" aria-label={t("chat.title")}>
      <div className="bk-chat-list" role="log" aria-live="polite">
        {list === null && !error && <div className="bk-chat-empty">{t("chat.loading")}</div>}
        {list && list.length === 0 && (
          <div className="bk-chat-empty">{t(side === "agency" ? "chat.emptyAgency" : "chat.emptyTourist")}</div>
        )}
        {list?.map((m) => (
          <div key={m.id} className={`bk-msg ${mine(m) ? "is-mine" : ""}`}>
            <span className="bk-msg-who">{m.from_agency ? t("chat.agency") : t("chat.tourist")}</span>
            <span className="bk-msg-body">{m.body}</span>
            <span className="bk-msg-time">{time(m.created_at)}</span>
          </div>
        ))}
        <div ref={endRef} />
      </div>
      {error && <div className="form-error">{t("chat.error")}</div>}
      {closed ? (
        <div className="bk-chat-empty">{t("chat.closed")}</div>
      ) : (
        <form className="bk-chat-form" onSubmit={send}>
          <textarea
            className="bk-chat-input"
            rows={1}
            maxLength={2000}
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) send(e);
            }}
            placeholder={t("chat.placeholder")}
            aria-label={t("chat.placeholder")}
          />
          <button className="icon-btn bk-chat-send" type="submit" disabled={!text.trim() || sending} aria-label={t("chat.send")}>
            <SendHorizontal size={18} />
          </button>
        </form>
      )}
    </section>
  );
}
