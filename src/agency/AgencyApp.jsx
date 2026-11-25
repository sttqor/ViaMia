import { Fragment, useEffect, useRef, useState } from "react";
import { BadgeCheck, FileText, LogOut, Plus, Send, Trash2, Upload } from "lucide-react";
import { useAuth } from "../auth-context";
import { useRoles } from "../roles-context";
import { useSettings } from "../settings-context";
import { LoginScreen } from "../Login";
import { Segmented } from "../Segmented";
import { prettyPhone } from "../phone";
import { TourEditor } from "./TourEditor";
import { BookingsTab } from "./BookingsTab";
import { GuidesTab } from "./GuidesTab";
import { AgencyHeader, Field, StatusBadge } from "./ui";
import {
  deleteTour,
  fetchMyAgency,
  fetchMyTours,
  openDoc,
  removeDoc,
  saveAgency,
  setMyTourStatus,
  uploadDoc,
  uploadPhoto,
} from "./agency-api";
import "./agency.css";

// Кабинет турагентства: /agency
// 1. вход (тот же, что у туристов) → 2. данные организации и документы → 3. проверка админом
// → 4. туры (черновик → на проверку → опубликован) и заявки туристов.

// onExit — выйти обратно в приложение (экран профиля); без него — на главную по ссылке /agency
export default function AgencyApp({ onExit }) {
  // null — кабинет открыт как рабочий экран аккаунта: «назад» в туристическое приложение нет
  const exit = onExit === null ? undefined : onExit || (() => window.location.assign("/"));
  const { t } = useSettings();
  const { enabled, user, signOut } = useAuth();
  const { refresh: refreshRoles } = useRoles();
  const [agency, setAgency] = useState(undefined); // undefined — грузится, null — ещё не зарегистрировано
  const [loadError, setLoadError] = useState(false);
  const [tab, setTab] = useState("bookings");
  const [bkBadge, setBkBadge] = useState(0); // новые заявки + непрочитанные сообщения
  const [editingAgency, setEditingAgency] = useState(false);
  const [editingTour, setEditingTour] = useState(null); // null | "new" | строка тура

  const [reloadKey, setReloadKey] = useState(0);
  const reload = () => setReloadKey((k) => k + 1);

  useEffect(() => {
    if (!user) return;
    let off = false;
    fetchMyAgency(user.id)
      .then((a) => {
        if (off) return;
        setLoadError(false);
        setAgency(a);
      })
      .catch((err) => {
        console.warn("Кабинет: не загрузилось агентство", err);
        if (!off) setLoadError(true);
      });
    return () => {
      off = true;
    };
  }, [user, reloadKey]);

  if (!enabled) {
    return (
      <div className="ag-app">
        <AgencyHeader title={t("ag.brand")} onBack={exit} />
        <div className="ag-body"><div className="ag-banner">{t("ag.noBackend")}</div></div>
      </div>
    );
  }

  // экран входа сам размонтируется, когда появится user
  if (!user) return <LoginScreen onBack={exit} />;

  const logout = (
    <button className="icon-btn" onClick={signOut} aria-label={t("login.out")}>
      <LogOut size={18} />
    </button>
  );
  const who = user.email || prettyPhone(user.phone);

  if (loadError) {
    return (
      <div className="ag-app">
        <AgencyHeader title={t("ag.brand")} sub={who} right={logout} onBack={exit} />
        <div className="ag-body">
          <div className="ag-banner is-bad">{t("ag.loadError")}</div>
          <button className="cta" onClick={reload}>{t("ag.retry")}</button>
        </div>
      </div>
    );
  }
  if (agency === undefined) {
    return (
      <div className="ag-app">
        <AgencyHeader title={t("ag.brand")} sub={who} right={logout} onBack={exit} />
        <div className="ag-empty">{t("ag.loading")}</div>
      </div>
    );
  }

  if (!agency || editingAgency) {
    return (
      <div className="ag-app">
        <AgencyHeader
          title={agency ? t("ag.form.editTitle") : t("ag.brand")}
          sub={who}
          onBack={agency ? () => setEditingAgency(false) : exit}
          right={logout}
        />
        <div className="ag-body">
          {!agency && <Intro />}
          <AgencyForm
            userId={user.id}
            agency={agency}
            onSaved={(a) => {
              setAgency(a);
              refreshRoles(); // анкета подана — с этой минуты кабинет и есть приложение этого аккаунта
              setEditingAgency(false);
              window.scrollTo(0, 0);
            }}
          />
        </div>
      </div>
    );
  }

  if (editingTour) {
    return (
      <div className="ag-app">
        <TourEditor
          agency={agency}
          tour={editingTour === "new" ? null : editingTour}
          onClose={() => setEditingTour(null)}
          onSaved={() => {
            setEditingTour(null);
            window.scrollTo(0, 0);
          }}
        />
      </div>
    );
  }

  return (
    <div className="ag-app">
      <AgencyHeader title={agency.name} sub={who} right={logout} onBack={exit} />
      <div className="ag-tabs">
        <Segmented
          label={t("ag.brand")}
          value={tab}
          onChange={setTab}
          options={[
            { value: "bookings", label: bkBadge ? `${t("ag.tab.bookings")} · ${bkBadge}` : t("ag.tab.bookings") },
            { value: "tours", label: t("ag.tab.tours") },
            { value: "guides", label: t("ag.tab.guides") },
            { value: "agency", label: t("ag.tab.agency") },
          ]}
        />
      </div>
      <div className="ag-body">
        <AgencyStatus agency={agency} onEdit={() => setEditingAgency(true)} />
        {tab === "tours" && <ToursTab agency={agency} onEdit={setEditingTour} />}
        {tab === "bookings" && <BookingsTab agency={agency} onUnread={setBkBadge} />}
        {tab === "guides" && <GuidesTab agency={agency} />}
        {tab === "agency" && <AgencyInfo agency={agency} onEdit={() => setEditingAgency(true)} />}
      </div>
    </div>
  );
}

// ── как это работает ───────────────────────────────────────────
function Intro() {
  const { t } = useSettings();
  return (
    <section className="card ag-panel">
      <h2>{t("ag.intro.title")}</h2>
      <p className="muted t-sm">{t("ag.intro.text")}</p>
      <ol className="ag-steps">
        {[1, 2, 3, 4].map((n) => (
          <li key={n}>
            <span><b>{t(`ag.intro.s${n}`)}</b><br />{t(`ag.intro.s${n}t`)}</span>
          </li>
        ))}
      </ol>
    </section>
  );
}

function AgencyStatus({ agency, onEdit }) {
  const { t } = useSettings();
  if (agency.status === "approved") {
    return (
      <div className="ag-banner is-ok">
        <b className="row gap-6"><BadgeCheck size={18} /> {t("ag.st.approvedTitle")}</b>
        <span>{t("ag.st.approvedText")}</span>
      </div>
    );
  }
  if (agency.status === "rejected") {
    return (
      <div className="ag-banner is-bad">
        <b>{t("ag.st.rejectedTitle")}</b>
        {agency.reject_reason && <span>{t("ag.reason")}: {agency.reject_reason}</span>}
        <span>{t("ag.st.rejectedText")}</span>
        <button className="pill pill-sm mt-8" onClick={onEdit}>{t("ag.form.fix")}</button>
      </div>
    );
  }
  if (agency.status === "blocked") {
    return (
      <div className="ag-banner is-bad">
        <b>{t("ag.st.blockedTitle")}</b>
        <span>{t("ag.st.blockedText")}</span>
      </div>
    );
  }
  return (
    <div className="ag-banner">
      <b>{t("ag.st.pendingTitle")}</b>
      <span>{t("ag.st.pendingText")}</span>
    </div>
  );
}

// ── форма организации ──────────────────────────────────────────
const EMPTY_AGENCY = { name: "", legal_name: "", inn: "", license_no: "", address: "", phone: "", telegram: "", email: "", website: "", about: "", logo_url: "", doc_paths: [] };

function AgencyForm({ userId, agency, onSaved }) {
  const [droppedDocs, setDroppedDocs] = useState([]);
  const createdId = useRef(null); // id агентства, созданного прошлой (неудачной) попыткой
  const { t } = useSettings();
  const [form, setForm] = useState(() => ({ ...EMPTY_AGENCY, ...Object.fromEntries(Object.entries(agency || {}).filter(([, v]) => v != null)) }));
  const [newDocs, setNewDocs] = useState([]); // File[] до сохранения
  const [logoFile, setLogoFile] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  const [tried, setTried] = useState(false);
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const inn = form.inn.replace(/\D/g, "");
  const problems = {
    name: form.name.trim().length < 2,
    legal_name: form.legal_name.trim().length < 3,
    inn: !/^\d{14}$/.test(inn),
    address: form.address.trim().length < 5,
    phone: form.phone.replace(/\D/g, "").length < 9,
    docs: form.doc_paths.length + newDocs.length === 0,
  };
  const bad = (k) => tried && problems[k];

  async function submit(e) {
    e.preventDefault();
    setTried(true);
    if (Object.values(problems).some(Boolean)) {
      setError("ag.form.errFill");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const base = {
        ...form,
        inn,
        name: form.name.trim(),
        telegram: form.telegram.trim().replace(/^https?:\/\/t\.me\//, "@").replace(/^([^@])/, "@$1") || null,
      };
      if (!base.telegram || base.telegram === "@") base.telegram = null;
      // новое агентство: сначала строка (нужен id для папки с файлами), потом файлы
      // строка уже создана прошлой попыткой (упала загрузка файла) — дописываем в неё, а не создаём вторую
      let saved = await saveAgency(userId, { ...base, doc_paths: form.doc_paths }, agency?.id || createdId.current);
      createdId.current = saved.id;
      const paths = [...form.doc_paths];
      for (const f of newDocs) paths.push(await uploadDoc(saved.id, f));
      let logo = form.logo_url || null;
      if (logoFile) logo = await uploadPhoto(saved.id, logoFile);
      if (paths.length !== form.doc_paths.length || logo !== (form.logo_url || null)) {
        saved = await saveAgency(userId, { doc_paths: paths, logo_url: logo }, saved.id);
      }
      for (const p of droppedDocs) removeDoc(p).catch(() => {});
      setDroppedDocs([]);
      onSaved(saved);
    } catch (err) {
      console.warn("Кабинет: не сохранилось агентство", err);
      setError(/inn/i.test(err?.message || "") ? "ag.form.errInn" : "ag.form.errSave");
    } finally {
      setBusy(false);
    }
  }

  // из хранилища файл уходит только после сохранения: ушли без сохранения — в базе ссылка на живой файл
  function dropSavedDoc(path) {
    setForm((f) => ({ ...f, doc_paths: f.doc_paths.filter((p) => p !== path) }));
    setDroppedDocs((d) => [...d, path]);
  }


  return (
    <form className="card ag-panel" onSubmit={submit} noValidate>
      <h2>{t("ag.form.title")}</h2>
      <p className="muted t-sm">{t("ag.form.text")}</p>

      <Field label={t("ag.f.name")} hint={t("ag.f.nameHint")} required>
        <input className={`ag-input ${bad("name") ? "is-bad" : ""}`} value={form.name} onChange={set("name")} maxLength={120} />
      </Field>
      <Field label={t("ag.f.legal")} hint={t("ag.f.legalHint")} required>
        <input className={`ag-input ${bad("legal_name") ? "is-bad" : ""}`} value={form.legal_name} onChange={set("legal_name")} maxLength={200} />
      </Field>
      <div className="ag-two">
        <Field label={t("ag.f.inn")} hint={t("ag.f.innHint")} required>
          <input className={`ag-input ${bad("inn") ? "is-bad" : ""}`} value={form.inn} onChange={set("inn")} inputMode="numeric" maxLength={14} />
        </Field>
        <Field label={t("ag.f.license")} hint={t("ag.f.licenseHint")}>
          <input className="ag-input" value={form.license_no} onChange={set("license_no")} maxLength={80} />
        </Field>
      </div>
      <Field label={t("ag.f.address")} required>
        <input className={`ag-input ${bad("address") ? "is-bad" : ""}`} value={form.address} onChange={set("address")} maxLength={200} />
      </Field>
      <div className="ag-two">
        <Field label={t("ag.f.phone")} hint={t("ag.f.phoneHint")} required>
          <input className={`ag-input ${bad("phone") ? "is-bad" : ""}`} value={form.phone} onChange={set("phone")} inputMode="tel" placeholder="+996 …" maxLength={30} />
        </Field>
        <Field label={t("ag.f.telegram")}>
          <input className="ag-input" value={form.telegram || ""} onChange={set("telegram")} placeholder="@agency" maxLength={60} />
        </Field>
      </div>
      <div className="ag-two">
        <Field label={t("ag.f.email")}>
          <input className="ag-input" type="email" value={form.email} onChange={set("email")} maxLength={120} />
        </Field>
        <Field label={t("ag.f.website")}>
          <input className="ag-input" value={form.website} onChange={set("website")} placeholder="https://" maxLength={200} />
        </Field>
      </div>
      <Field label={t("ag.f.about")} hint={t("ag.f.aboutHint")}>
        <textarea className="ag-textarea" value={form.about} onChange={set("about")} maxLength={1500} />
      </Field>

      <div className="ag-field">
        <span className="ag-label">{t("ag.f.logo")}</span>
        <div className="row gap-12">
          {(logoFile || form.logo_url) && (
            <img className="ag-thumb" src={logoFile ? URL.createObjectURL(logoFile) : form.logo_url} alt="" />
          )}
          <label className="pill pill-sm ag-file-btn">
            <Upload size={14} /> {t("ag.f.logoPick")}
            <input type="file" accept="image/*" onChange={(e) => setLogoFile(e.target.files?.[0] || null)} />
          </label>
        </div>
      </div>

      <div className="ag-field">
        <span className="ag-label">{t("ag.f.docs")}<span className="req"> *</span></span>
        <span className="ag-hint">{t("ag.f.docsHint")}</span>
        {form.doc_paths.map((p, i) => (
          <div key={p} className="ag-file-row">
            <FileText size={16} />
            <button type="button" className="grow route-link" onClick={() => openDoc(p)}>
              {t("ag.f.docN", { n: i + 1 })}
            </button>
            <button type="button" className="icon-btn icon-btn-sm" onClick={() => dropSavedDoc(p)} aria-label={t("ag.remove")}><Trash2 size={14} /></button>
          </div>
        ))}
        {newDocs.map((f, i) => (
          <div key={`${f.name}-${i}`} className="ag-file-row">
            <FileText size={16} />
            <span className="grow">{f.name}</span>
            <button type="button" className="icon-btn icon-btn-sm" onClick={() => setNewDocs((d) => d.filter((_, j) => j !== i))} aria-label={t("ag.remove")}><Trash2 size={14} /></button>
          </div>
        ))}
        <label className={`pill pill-sm ag-file-btn ${bad("docs") ? "is-bad" : ""}`}>
          <Plus size={14} /> {t("ag.f.docsAdd")}
          <input
            type="file"
            accept="image/*,application/pdf"
            multiple
            onChange={(e) => {
              const files = [...(e.target.files || [])].filter((f) => f.size <= 10 * 1024 * 1024);
              setNewDocs((d) => [...d, ...files].slice(0, 6));
              e.target.value = "";
            }}
          />
        </label>
      </div>

      {error && <div className="form-error" role="alert">{t(error)}</div>}
      {agency?.status === "approved" && <div className="ag-hint">{t("ag.form.reReview")}</div>}
      <button className="cta" type="submit" disabled={busy}>
        <Send size={16} /> {busy ? t("ag.saving") : agency ? t("ag.form.save") : t("ag.form.send")}
      </button>
    </form>
  );
}

function AgencyInfo({ agency, onEdit }) {
  const { t } = useSettings();
  const rows = [
    ["ag.f.legal", agency.legal_name],
    ["ag.f.inn", agency.inn],
    ["ag.f.license", agency.license_no],
    ["ag.f.address", agency.address],
    ["ag.f.phone", agency.phone],
    ["ag.f.telegram", agency.telegram],
    ["ag.f.email", agency.email],
    ["ag.f.website", agency.website],
  ].filter(([, v]) => v);
  return (
    <section className="card ag-panel">
      <div className="row between">
        <h2>{agency.name}</h2>
        <StatusBadge kind="agency" status={agency.status} />
      </div>
      <dl className="ag-kv">
        {rows.map(([k, v]) => (
          <Fragment key={k}>
            <dt>{t(k)}</dt>
            <dd>{v}</dd>
          </Fragment>
        ))}
      </dl>
      {agency.about && <p className="body-text t-sm">{agency.about}</p>}
      {agency.status !== "blocked" && <button className="cta ghost" onClick={onEdit}>{t("ag.form.editTitle")}</button>}
    </section>
  );
}

// ── туры ───────────────────────────────────────────────────────
function ToursTab({ agency, onEdit }) {
  const { t, money } = useSettings();
  const [tours, setTours] = useState(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    let off = false;
    fetchMyTours(agency.id)
      .then((d) => !off && (setTours(d), setError(false)))
      .catch((err) => {
        console.warn("Кабинет: туры", err);
        if (!off) setError(true);
      });
    return () => {
      off = true;
    };
  }, [agency.id]);

  async function changeStatus(row, status) {
    try {
      const fresh = await setMyTourStatus(row.id, status);
      setTours((list) => list.map((x) => (x.id === row.id ? fresh : x)));
      setError(false);
    } catch (err) {
      console.warn(err);
      setError(true);
    }
  }

  async function remove(row) {
    if (!window.confirm(t("ag.tour.confirmDelete"))) return;
    try {
      await deleteTour(row);
      setTours((list) => list.filter((x) => x.id !== row.id));
    } catch (err) {
      console.warn(err);
      window.alert(t("ag.tour.deleteHasBookings"));
    }
  }

  if (agency.status === "blocked") return null;

  return (
    <>
      <button className="cta" onClick={() => onEdit("new")}><Plus size={18} /> {t("ag.tour.new")}</button>
      {error && <div className="form-error">{t("ag.loadError")}</div>}
      {tours === null && !error && <div className="ag-empty">{t("ag.loading")}</div>}
      {tours?.length === 0 && <div className="card ag-empty">{t("ag.tour.empty")}</div>}
      {tours?.map((row) => (
        <article key={row.id} className="card">
          <button className="ag-item" onClick={() => onEdit(row)}>
            <img className="ag-thumb" src={row.images?.[0] || ""} alt="" />
            <span className="grow">
              <span className="row between gap-6">
                <span className="t-md b">{row.title}</span>
              </span>
              <span className="muted t-sm">{row.place} · {row.price == null ? t("price.request") : money(row.price)}</span>
              <span><StatusBadge kind="tour" status={row.status} /></span>
              {row.status === "rejected" && row.reject_reason && (
                <span className="ag-reason">{t("ag.reason")}: {row.reject_reason}</span>
              )}
            </span>
          </button>
          <div className="ag-actions">
            {(row.status === "draft" || row.status === "rejected") && (
              <button className="pill" onClick={() => onEdit(row)}>{t("ag.tour.editSend")}</button>
            )}
            {row.status === "published" && (
              <button className="pill" onClick={() => changeStatus(row, "hidden")}>{t("ag.tour.hide")}</button>
            )}
            {row.status === "hidden" && (
              <button className="pill" onClick={() => changeStatus(row, "review")}>{t("ag.tour.unhide")}</button>
            )}
            {row.status === "review" && <span className="muted t-sm">{t("ag.tour.inReview")}</span>}
            <button className="pill" onClick={() => remove(row)} aria-label={t("ag.remove")}><Trash2 size={14} /></button>
          </div>
        </article>
      ))}
    </>
  );
}
