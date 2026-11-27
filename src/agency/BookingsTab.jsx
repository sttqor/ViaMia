// Заявки туристов: список (новые / предстоящие / все) → карточка заявки:
// подтвердить с гидом, временем встречи и комментарием, отклонить с причиной, «тур состоялся», чат.
// Переходы статуса проверяет база (booking_guard), здесь — только удобство.
import { useEffect, useMemo, useState } from "react";
import { ChevronLeft, MessageCircle, Phone } from "lucide-react";
import { useSettings } from "../settings-context";
import { Segmented } from "../Segmented";
import { BookingChat } from "../booking/BookingChat";
import { subscribeEvents } from "../booking/booking-api";
import { Field, StatusBadge } from "./ui";
import { fetchAgencyBookings, fetchGuides, fetchUnreadByBooking, updateBooking } from "./agency-api";

const TZ = "Asia/Bishkek"; // время встречи — всегда по Ошу, не по телефону
const todayOsh = () => new Intl.DateTimeFormat("en-CA", { timeZone: TZ }).format(new Date());
const timeOsh = (iso) =>
  iso ? new Intl.DateTimeFormat("ru", { timeZone: TZ, hour: "2-digit", minute: "2-digit" }).format(new Date(iso)) : "";

function contactHref(c) {
  const v = (c || "").trim();
  if (/^@\w{5,32}$/.test(v)) return `https://t.me/${v.slice(1)}`; // только чистый ник, без хвостов «/../»
  if (/@/.test(v)) return `mailto:${v}`;
  if (/^\+?[\d\s()-]{7,}$/.test(v)) return `tel:${v.replace(/[^\d+]/g, "")}`;
  return null;
}

export function BookingsTab({ agency, onUnread }) {
  const { t, money, plural, fmtDate } = useSettings();
  const [list, setList] = useState(null);
  const [unread, setUnread] = useState({});
  const [filter, setFilter] = useState("new");
  const [error, setError] = useState(false);
  const [openId, setOpenId] = useState(null);
  const [tick, setTick] = useState(0); // новое событие → перечитать

  useEffect(() => {
    let off = false;
    Promise.all([fetchAgencyBookings(agency.id), fetchUnreadByBooking(agency.id).catch(() => ({}))])
      .then(([d, u]) => {
        if (off) return;
        setList(d);
        setUnread(u);
        setError(false);
      })
      .catch((err) => {
        console.warn(err);
        if (!off) setError(true);
      });
    return () => {
      off = true;
    };
  }, [agency.id, tick, openId]);

  // новая заявка, отмена или сообщение — сразу, без перезагрузки
  useEffect(() => subscribeEvents(`agency-${agency.id}`, () => setTick((x) => x + 1)), [agency.id]);

  const totalUnread = Object.values(unread).reduce((a, b) => a + b, 0);
  const pendingCount = (list || []).filter((b) => b.status === "pending").length;
  useEffect(() => {
    onUnread?.(pendingCount + totalUnread);
  }, [pendingCount, totalUnread, onUnread]);

  const today = todayOsh();
  const shown = useMemo(() => {
    const all = list || [];
    if (filter === "new") return all.filter((b) => b.status === "pending");
    if (filter === "soon") return all.filter((b) => b.status === "confirmed" && b.date >= today).sort((a, b) => a.date.localeCompare(b.date));
    return all;
  }, [list, filter, today]);

  const open = list?.find((b) => b.id === openId);
  if (open) {
    return (
      <BookingDetail
        agency={agency}
        booking={open}
        onBack={() => setOpenId(null)}
        onChanged={(row) => setList((l) => l.map((x) => (x.id === row.id ? { ...x, ...row } : x)))}
      />
    );
  }

  return (
    <>
      <Segmented
        label={t("ag.tab.bookings")}
        value={filter}
        onChange={setFilter}
        options={[
          { value: "new", label: pendingCount ? `${t("ag.bk.new")} · ${pendingCount}` : t("ag.bk.new") },
          { value: "soon", label: t("ag.bk.soon") },
          { value: "all", label: t("ag.bk.all") },
        ]}
      />
      {error && <div className="form-error">{t("ag.loadError")}</div>}
      {list === null && !error && <div className="ag-empty">{t("ag.loading")}</div>}
      {list && shown.length === 0 && (
        <div className="card ag-empty">{t(filter === "new" && list.length > 0 ? "ag.bk.emptyNew" : filter === "soon" ? "ag.bk.emptySoon" : "ag.bk.empty")}</div>
      )}
      {shown.map((b) => (
        <button key={b.id} className="card ag-item no-thumb ag-bk-row" onClick={() => setOpenId(b.id)}>
          <span className="grow">
            <span className="row between gap-6">
              <span className="t-md b">{b.tour?.title || b.tour_id}</span>
              <span className="row gap-6">
                {b.paid_at && <span className="ag-paid">{t("ag.bk.paid")}</span>}
                <StatusBadge kind="bk" status={b.status} />
              </span>
            </span>
            <span className="muted t-sm">
              {fmtDate(b.date)}
              {b.meet_at ? `, ${timeOsh(b.meet_at)}` : ""} · {plural("pl.guests", b.guests)} · {b.total_usd == null ? t("price.request") : money(Number(b.total_usd))}
            </span>
            <span className="row between">
              <span className="t-sm">{b.name}</span>
              {unread[b.id] > 0 && (
                <span className="row gap-6 t-xs"><MessageCircle size={14} /> <span className="bk-badge">{unread[b.id]}</span></span>
              )}
            </span>
          </span>
        </button>
      ))}
    </>
  );
}

function BookingDetail({ agency, booking: b, onBack, onChanged }) {
  const { t, money, plural, fmtDate } = useSettings();
  const [guides, setGuides] = useState([]);
  const [f, setF] = useState(() => ({ guide_id: b.guide_id || "", time: timeOsh(b.meet_at), note: b.agency_note || "" }));
  const [declining, setDeclining] = useState(false);
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  const href = contactHref(b.contact);
  const today = todayOsh();

  useEffect(() => {
    let off = false;
    fetchGuides(agency.id).then((d) => !off && setGuides(d.filter((g) => g.active || g.id === b.guide_id))).catch(() => {});
    return () => {
      off = true;
    };
  }, [agency.id, b.guide_id]);

  async function run(patch) {
    setBusy(true);
    setError(null);
    try {
      const row = await updateBooking(b.id, patch);
      onChanged(row);
      setDeclining(false);
    } catch (err) {
      console.warn(err);
      setError("ag.saveError");
    } finally {
      setBusy(false);
    }
  }

  const details = () => ({
    guide_id: f.guide_id || null,
    meet_at: f.time ? `${b.date}T${f.time}:00+06:00` : null,
    agency_note: f.note.trim() || null,
  });

  function confirm() {
    if (!f.time) return setError("ag.bk.timeRequired");
    run({ status: "confirmed", ...details() });
  }

  function decline() {
    if (reason.trim().length < 3) return setError("ag.bk.reasonRequired");
    run({ status: "declined", decline_reason: reason.trim() });
  }

  const editable = b.status === "pending" || b.status === "confirmed";
  const chatClosed = !["pending", "confirmed", "done"].includes(b.status);

  return (
    <>
      <button className="text-btn ag-back" onClick={onBack}><ChevronLeft size={16} /> {t("ag.bk.back")}</button>

      <section className="card ag-panel">
        <div className="row between gap-6">
          <h2>{b.tour?.title || b.tour_id}</h2>
          <span className="row gap-6">
            {b.paid_at && <span className="ag-paid">{t("ag.bk.paidSum", { sum: `${b.paid_amount} ${b.paid_currency || ""}`.trim() })}</span>}
            <StatusBadge kind="bk" status={b.status} />
          </span>
        </div>
        <dl className="ag-kv">
          <dt>{t("ag.bk.date")}</dt><dd>{fmtDate(b.date)}{b.meet_at ? `, ${timeOsh(b.meet_at)}` : ""}</dd>
          <dt>{t("ag.bk.guests")}</dt><dd>{plural("pl.guests", b.guests)}</dd>
          <dt>{t("ag.bk.sum")}</dt><dd>{b.total_usd == null ? t("price.request") : money(Number(b.total_usd))}</dd>
          <dt>{t("ag.bk.tourist")}</dt><dd>{b.name}</dd>
          <dt>{t("ag.bk.contactLabel")}</dt><dd>{href ? <a className="route-link" href={href}>{b.contact}</a> : b.contact}</dd>
          <dt>{t("ag.bk.code")}</dt><dd><b>{b.code}</b>{b.lang ? ` · ${b.lang.toUpperCase()}` : ""}</dd>
          {b.decline_reason && (<><dt>{t("ag.bk.reason")}</dt><dd>{b.decline_reason}</dd></>)}
        </dl>
        {href && <a className="pill ag-file-btn" href={href}><Phone size={14} /> {t("ag.bk.contact")}</a>}
      </section>

      {editable && !declining && (
        <section className="card ag-panel">
          <h2>{t(b.status === "pending" ? "ag.bk.confirmTitle" : "ag.bk.detailsTitle")}</h2>
          <p className="ag-hint">{t("ag.bk.detailsHint")}</p>
          <Field label={t("ag.bk.guide")} hint={guides.length === 0 ? t("ag.bk.noGuides") : null}>
            <select className="ag-select" value={f.guide_id} onChange={(e) => setF((x) => ({ ...x, guide_id: e.target.value }))}>
              <option value="">{t("ag.bk.noGuide")}</option>
              {guides.map((g) => <option key={g.id} value={g.id}>{g.name}</option>)}
            </select>
          </Field>
          <Field label={t("ag.bk.meetTime")} hint={t("ag.bk.meetTimeHint")} required>
            <input className="ag-input" type="time" value={f.time} onChange={(e) => setF((x) => ({ ...x, time: e.target.value }))} />
          </Field>
          <Field label={t("ag.bk.note")} hint={t("ag.bk.noteHint")}>
            <textarea className="ag-textarea" rows={3} maxLength={1000} value={f.note} onChange={(e) => setF((x) => ({ ...x, note: e.target.value }))} />
          </Field>
          {error && <div className="form-error">{t(error)}</div>}
          <div className="ag-actions ag-actions-flat">
            {b.status === "pending" ? (
              <>
                <button className="pill on" disabled={busy} onClick={confirm}>{t("ag.bk.confirm")}</button>
                <button className="pill" disabled={busy} onClick={() => { setDeclining(true); setError(null); }}>{t("ag.bk.decline")}</button>
              </>
            ) : (
              <>
                <button className="pill on" disabled={busy} onClick={() => (f.time ? run(details()) : setError("ag.bk.timeRequired"))}>{t("ag.bk.saveDetails")}</button>
                {b.date <= today && <button className="pill" disabled={busy} onClick={() => run({ status: "done" })}>{t("ag.bk.markDone")}</button>}
              </>
            )}
          </div>
        </section>
      )}

      {declining && (
        <section className="card ag-panel">
          <h2>{t("ag.bk.declineTitle")}</h2>
          <Field label={t("ag.bk.reason")} hint={t("ag.bk.reasonHint")} required>
            <textarea className="ag-textarea" rows={3} maxLength={300} value={reason} onChange={(e) => setReason(e.target.value)} />
          </Field>
          {error && <div className="form-error">{t(error)}</div>}
          <div className="ag-actions ag-actions-flat">
            <button className="pill on" disabled={busy} onClick={decline}>{t("ag.bk.decline")}</button>
            <button className="pill" disabled={busy} onClick={() => setDeclining(false)}>{t("common.cancel")}</button>
          </div>
        </section>
      )}

      <section className="card ag-panel">
        <h2>{t("chat.title")}</h2>
        <BookingChat bookingId={b.id} side="agency" closed={chatClosed} />
      </section>
    </>
  );
}
