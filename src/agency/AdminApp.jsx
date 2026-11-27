import { Fragment, useEffect, useState } from "react";
import { BadgeCheck, Ban, Building2, FileText, LogOut, X } from "lucide-react";
import { safeHttp } from "../components/shared";
import { useAuth } from "../auth-context";
import { useSettings } from "../settings-context";
import { LoginScreen } from "../Login";
import { Segmented } from "../Segmented";
import { prettyPhone } from "../phone";
import { fetchAgencies, fetchIsAdmin, fetchToursForReview, openDoc, reviewAgency, reviewTour } from "./agency-api";
import { AgencyHeader, StatusBadge } from "./ui";
import "./agency.css";

// Модерация платформы: /admin. Доступ — только тем, кто в таблице public.admins
// (playbooks/agency-cabinet/toolbox/03-make-admin.sql). Права проверяет база, не этот экран.
// Что смотреть — playbooks/agency-cabinet/toolbox/accreditation-checklist.md и tour-checklist.md.

export default function AdminApp({ onExit, onOpenAgency }) {
  // null — кабинет открыт как рабочий экран аккаунта: «назад» в туристическое приложение нет
  const exit = onExit === null ? undefined : onExit || (() => window.location.assign("/"));
  const { t } = useSettings();
  const { enabled, user, signOut } = useAuth();
  // ответ привязан к аккаунту: сменили аккаунт — снова «проверяем», без мигания «нет доступа»
  const [check, setCheck] = useState({ for: null, admin: false });
  const admin = user && check.for === user.id ? check.admin : null; // null — проверяем
  const [tab, setTab] = useState("agencies");

  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    if (!user) return;
    let off = false;
    let retry = null;
    fetchIsAdmin()
      .then((v) => !off && setCheck({ for: user.id, admin: v }))
      // сбой сети — это не «нет доступа»: остаёмся в «проверяем» и пробуем снова
      .catch(() => {
        if (!off) retry = setTimeout(() => setAttempt((n) => n + 1), 4000);
      });
    return () => {
      off = true;
      clearTimeout(retry);
    };
  }, [user, attempt]);

  if (!enabled) {
    return (
      <div className="ag-app">
        <AgencyHeader title={t("adm.title")} onBack={exit} />
        <div className="ag-body"><div className="ag-banner">{t("ag.noBackend")}</div></div>
      </div>
    );
  }
  if (!user) return <LoginScreen onBack={exit} />;

  const logout = (
    <>
      {onOpenAgency && (
        <button className="icon-btn" onClick={onOpenAgency} aria-label={t("ag.brand")}><Building2 size={18} /></button>
      )}
      <button className="icon-btn" onClick={signOut} aria-label={t("login.out")}><LogOut size={18} /></button>
    </>
  );
  const who = user.email || prettyPhone(user.phone);
  const head = <AgencyHeader title={t("adm.title")} sub={who} right={logout} onBack={exit} />;

  if (admin === null) return <div className="ag-app">{head}<div className="ag-empty">{t("ag.loading")}</div></div>;
  if (!admin) {
    return (
      <div className="ag-app">
        {head}
        <div className="ag-body">
          <div className="ag-banner is-bad">
            <b>{t("adm.denied")}</b>
            <span>{t("adm.deniedAs", { who })}</span>
            <span>{t("adm.deniedHint")}</span>
          </div>
          <button className="cta" onClick={signOut}>{t("adm.switchAccount")}</button>
        </div>
      </div>
    );
  }

  return (
    <div className="ag-app">
      {head}
      <div className="ag-tabs">
        <Segmented
          label={t("adm.title")}
          value={tab}
          onChange={setTab}
          options={[
            { value: "agencies", label: t("adm.tab.agencies") },
            { value: "tours", label: t("adm.tab.tours") },
          ]}
        />
      </div>
      <div className="ag-body">{tab === "agencies" ? <AgenciesReview /> : <ToursReview />}</div>
    </div>
  );
}

// причина отказа обязательна: агентство увидит её в кабинете
function askReason(t) {
  const r = window.prompt(t("adm.reasonPrompt"));
  return r && r.trim() ? r.trim() : null;
}

function useList(fetcher) {
  const [list, setList] = useState(null);
  const [error, setError] = useState(false);
  const [key, setKey] = useState(0);
  useEffect(() => {
    let off = false;
    fetcher()
      .then((d) => {
        if (off) return;
        setError(false);
        setList(d);
      })
      .catch((err) => {
        console.warn(err);
        if (!off) setError(true);
      });
    return () => {
      off = true;
    };
  }, [fetcher, key]);
  return { list, error, load: () => setKey((k) => k + 1) };
}

function AgenciesReview() {
  const { t, fmtDate } = useSettings();
  const { list, error, load } = useList(fetchAgencies);
  const [filter, setFilter] = useState("pending");

  async function act(a, status) {
    let reason = null;
    if (status !== "approved") {
      reason = askReason(t);
      if (!reason) return;
    }
    try {
      await reviewAgency(a.id, status, reason);
      load();
    } catch (err) {
      console.warn(err);
      window.alert(t("ag.loadError"));
    }
  }

  const shown = (list || []).filter((a) => filter === "all" || a.status === filter);
  return (
    <>
      <Segmented
        label={t("adm.tab.agencies")}
        value={filter}
        onChange={setFilter}
        options={["pending", "approved", "rejected", "all"].map((v) => ({ value: v, label: t(`adm.f.${v}`) }))}
      />
      {error && <div className="form-error">{t("ag.loadError")}</div>}
      {list === null && !error && <div className="ag-empty">{t("ag.loading")}</div>}
      {list && shown.length === 0 && <div className="card ag-empty">{t("adm.empty")}</div>}
      {shown.map((a) => (
        <article key={a.id} className="card ag-panel">
          <div className="row between gap-6">
            <h2>{a.name}</h2>
            <StatusBadge kind="agency" status={a.status} />
          </div>
          <dl className="ag-kv">
            {[
              ["ag.f.legal", a.legal_name],
              ["ag.f.inn", a.inn],
              ["ag.f.license", a.license_no],
              ["ag.f.address", a.address],
              ["ag.f.phone", a.phone],
              ["ag.f.telegram", a.telegram],
              ["ag.f.email", a.email],
              ["ag.f.website", a.website],
              ["adm.created", fmtDate(a.created_at.slice(0, 10))],
            ]
              .filter(([, v]) => v)
              .map(([k, v]) => (
                <Fragment key={k}>
                  <dt>{t(k)}</dt>
                  <dd>{v}</dd>
                </Fragment>
              ))}
          </dl>
          {a.about && <p className="t-sm muted">{a.about}</p>}
          <span className="ag-hint">{t("adm.innCheck")}</span>
          <div className="stack-8">
            {a.doc_paths.length === 0 && <span className="ag-reason">{t("adm.noDocs")}</span>}
            {a.doc_paths.map((p, i) => (
              <button key={p} className="ag-file-row" onClick={() => openDoc(p)}>
                <FileText size={16} /> <span className="grow">{t("ag.f.docN", { n: i + 1 })}</span>
              </button>
            ))}
          </div>
          {a.reject_reason && <span className="ag-reason">{t("ag.reason")}: {a.reject_reason}</span>}
          <div className="row wrap gap-6">
            {a.status !== "approved" && (
              <button className="pill on" onClick={() => act(a, "approved")}><BadgeCheck size={14} /> {t("adm.approve")}</button>
            )}
            {a.status !== "rejected" && (
              <button className="pill" onClick={() => act(a, "rejected")}><X size={14} /> {t("adm.reject")}</button>
            )}
            {a.status !== "blocked" && (
              <button className="pill" onClick={() => act(a, "blocked")}><Ban size={14} /> {t("adm.block")}</button>
            )}
          </div>
        </article>
      ))}
    </>
  );
}

function ToursReview() {
  const { t, money, fmtDuration } = useSettings();
  const { list, error, load } = useList(fetchToursForReview);
  const [filter, setFilter] = useState("review");

  async function act(row, status) {
    let reason = null;
    if (status !== "published") {
      reason = askReason(t);
      if (!reason) return;
    }
    try {
      await reviewTour(row.id, status, reason);
      load();
    } catch (err) {
      console.warn(err);
      window.alert(t("ag.loadError"));
    }
  }

  const shown = (list || []).filter((r) => filter === "all" || r.status === filter);
  return (
    <>
      <Segmented
        label={t("adm.tab.tours")}
        value={filter}
        onChange={setFilter}
        options={["review", "published", "all"].map((v) => ({ value: v, label: t(`adm.t.${v}`) }))}
      />
      {error && <div className="form-error">{t("ag.loadError")}</div>}
      {list === null && !error && <div className="ag-empty">{t("ag.loading")}</div>}
      {list && shown.length === 0 && <div className="card ag-empty">{t("adm.empty")}</div>}
      {shown.map((r) => (
        <article key={r.id} className="card ag-panel">
          <div className="row between gap-6">
            <h2>{r.title}</h2>
            <StatusBadge kind="tour" status={r.status} />
          </div>
          <div className="row wrap gap-6 t-sm">
            <b>{r.agency?.name}</b>
            {r.agency && <StatusBadge kind="agency" status={r.agency.status} />}
          </div>
          {r.agency && r.agency.status !== "approved" && <span className="ag-reason">{t("adm.agencyNotApproved")}</span>}
          <div className="ag-photos">
            {r.images.map((u) => (
              <a key={u} className="ag-photo" href={safeHttp(u)} target="_blank" rel="noopener noreferrer"><img src={u} alt="" /></a>
            ))}
          </div>
          <div className="muted t-sm">
            {r.type} · {r.place} · {fmtDuration(Number(r.duration) || 0)} ·{" "}
            {r.price == null ? t("price.request") : money(Number(r.price))}
            {r.langs ? ` · ${r.langs}` : ""}
            {r.group_size ? ` · ${r.group_size}` : ""}
          </div>
          {r.description && <p className="body-text t-sm">{r.description}</p>}
          {r.highlights.length > 0 && <ul className="t-sm">{r.highlights.map((h) => <li key={h}>{h}</li>)}</ul>}
          {r.includes.length > 0 && (
            <div className="detail-chips">{r.includes.map((h) => <span key={h} className="detail-chip">{h}</span>)}</div>
          )}
          <div className="t-sm">
            <b>{t("detail.meeting")}:</b> {r.meeting}{" "}
            <a
              className="route-link"
              href={`https://www.openstreetmap.org/?mlat=${r.lat}&mlon=${r.lng}#map=17/${r.lat}/${r.lng}`}
              target="_blank"
              rel="noopener noreferrer"
            >
              {t("adm.onMap")} ↗
            </a>
          </div>
          {safeHttp(r.source_url) && (
            <a className="route-link t-sm" href={safeHttp(r.source_url)} target="_blank" rel="noopener noreferrer">{r.source_url}</a>
          )}
          {r.reject_reason && <span className="ag-reason">{t("ag.reason")}: {r.reject_reason}</span>}
          <div className="row wrap gap-6">
            {r.status !== "published" && (
              <button className="pill on" onClick={() => act(r, "published")}><BadgeCheck size={14} /> {t("adm.publish")}</button>
            )}
            {r.status !== "rejected" && (
              <button className="pill" onClick={() => act(r, "rejected")}>
                <X size={14} /> {r.status === "published" ? t("adm.unpublish") : t("adm.reject")}
              </button>
            )}
          </div>
        </article>
      ))}
    </>
  );
}
