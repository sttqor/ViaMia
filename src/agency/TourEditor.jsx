import { lazy, Suspense, useMemo, useState } from "react";
import { Check, Circle, ImagePlus, Save, Send, X } from "lucide-react";
import { useSettings } from "../settings-context";
import { CATEGORIES } from "../data";
import { removePhoto, saveTour, uploadPhoto } from "./agency-api";
import { AgencyHeader, Field, StatusBadge } from "./ui";
import { LANGS, MAX_PHOTOS, checklist, fromRow, toRow } from "./tour-form";

const PickMap = lazy(() => import("../OshMap").then((m) => ({ default: m.PickMap })));

export function TourEditor({ agency, tour, onClose, onSaved }) {
  const { t, loc, money } = useSettings();
  const [f, setF] = useState(() => fromRow(tour));
  const [busy, setBusy] = useState(null); // null | "draft" | "review" | "photo"
  const [error, setError] = useState(null);
  const [showChecks, setShowChecks] = useState(false);
  const set = (k) => (e) => setF((x) => ({ ...x, [k]: e.target.type === "checkbox" ? e.target.checked : e.target.value }));
  const checks = useMemo(() => checklist(f), [f]);
  const ready = checks.every(([, ok]) => ok);
  const cats = CATEGORIES.filter((c) => c.id !== "all");
  const wasPublished = tour?.status === "published";

  async function addPhotos(e) {
    const files = [...(e.target.files || [])].slice(0, MAX_PHOTOS - f.images.length);
    e.target.value = "";
    if (!files.length) return;
    setBusy("photo");
    setError(null);
    try {
      for (const file of files) {
        const url = await uploadPhoto(agency.id, file);
        setF((x) => ({ ...x, images: [...x.images, url] }));
      }
    } catch (err) {
      console.warn("Фото не загрузилось", err);
      setError("ag.tour.errPhoto");
    } finally {
      setBusy(null);
    }
  }

  function dropPhoto(url) {
    setF((x) => ({ ...x, images: x.images.filter((u) => u !== url) }));
    // с сервера удаляем, только если фото ещё не в сохранённом туре
    if (!tour?.images?.includes(url)) removePhoto(url).catch(() => {});
  }

  const makeCover = (url) => setF((x) => ({ ...x, images: [url, ...x.images.filter((u) => u !== url)] }));

  async function save(status) {
    if (f.title.trim().length < 3) {
      setError("ag.tour.errTitle");
      return;
    }
    if (status === "review" && !ready) {
      setShowChecks(true);
      setError("ag.tour.errChecklist");
      document.getElementById("ag-checklist")?.scrollIntoView({ behavior: "smooth", block: "center" });
      return;
    }
    setBusy(status);
    setError(null);
    try {
      const row = await saveTour(agency.id, toRow(f, status), tour?.id);
      onSaved(row);
    } catch (err) {
      console.warn("Тур не сохранился", err);
      setError("ag.tour.errSave");
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="ag-editor">
      <AgencyHeader
        title={tour ? t("ag.tour.edit") : t("ag.tour.new")}
        sub={tour ? <StatusBadge kind="tour" status={tour.status} /> : null}
        onBack={onClose}
      />
      <div className="ag-body">
        {tour?.status === "rejected" && tour.reject_reason && (
          <div className="ag-banner is-bad"><b>{t("ag.tour.rejected")}</b><span>{tour.reject_reason}</span></div>
        )}
        {wasPublished && <div className="ag-banner">{t("ag.tour.editPublished")}</div>}

        <section className="card ag-panel">
          <h2>{t("ag.tour.photos")}</h2>
          <span className="ag-hint">{t("ag.tour.photosHint")}</span>
          <div className="ag-photos">
            {f.images.map((url, i) => (
              <div key={url} className="ag-photo">
                <img src={url} alt="" onClick={() => makeCover(url)} />
                {i === 0 && <span className="ag-cover-mark">{t("ag.tour.cover")}</span>}
                <button type="button" className="ag-photo-x" onClick={() => dropPhoto(url)} aria-label={t("ag.remove")}><X size={14} /></button>
              </div>
            ))}
            {f.images.length < MAX_PHOTOS && (
              <label className="ag-add" aria-label={t("ag.tour.addPhoto")}>
                {busy === "photo" ? <span className="t-xs">{t("ag.saving")}</span> : <ImagePlus size={22} />}
                <input type="file" accept="image/*" multiple onChange={addPhotos} disabled={busy === "photo"} />
              </label>
            )}
          </div>
        </section>

        <section className="card ag-panel">
          <h2>{t("ag.tour.main")}</h2>
          <Field label={t("ag.t.title")} hint={t("ag.t.titleHint")} required>
            <input className="ag-input" value={f.title} onChange={set("title")} maxLength={90} />
          </Field>
          <div className="ag-two">
            <Field label={t("ag.t.category")} required>
              <select className="ag-select" value={f.category} onChange={set("category")}>
                {cats.map((c) => <option key={c.id} value={c.id}>{loc(c).label}</option>)}
              </select>
            </Field>
            <Field label={t("ag.t.type")} hint={t("ag.t.typeHint")} required>
              <input className="ag-input" value={f.type} onChange={set("type")} maxLength={40} />
            </Field>
          </div>
          <Field label={t("ag.t.place")} hint={t("ag.t.placeHint")} required>
            <input className="ag-input" value={f.place} onChange={set("place")} maxLength={80} />
          </Field>
          <div className="ag-two">
            <Field label={t("ag.t.hours")} hint={t("ag.t.hoursHint")} required>
              <input className="ag-input" value={f.hours} onChange={set("hours")} inputMode="decimal" placeholder="2.5" />
            </Field>
            <Field label={t("ag.t.group")} hint={t("ag.t.groupHint")}>
              <input className="ag-input" value={f.group_size} onChange={set("group_size")} maxLength={40} />
            </Field>
          </div>
          <div className="ag-two">
            <Field label={t("ag.t.price")} hint={f.price && !f.onRequest ? t("ag.t.priceIs", { price: money(Number(String(f.price).replace(",", "."))) }) : t("ag.t.priceHint")} required>
              <input className="ag-input" value={f.onRequest ? "" : f.price} onChange={set("price")} inputMode="decimal" placeholder="25" disabled={f.onRequest} />
            </Field>
            <label className="ag-check mt-16">
              <input type="checkbox" checked={f.onRequest} onChange={set("onRequest")} /> {t("price.request")}
            </label>
          </div>
          <div className="ag-field">
            <span className="ag-label">{t("ag.t.langs")}<span className="req"> *</span></span>
            <div className="row wrap gap-6">
              {LANGS.map((l) => {
                const on = f.langs.includes(l);
                return (
                  <button
                    key={l}
                    type="button"
                    className={`pill pill-sm ${on ? "on" : ""}`}
                    aria-pressed={on}
                    onClick={() => setF((x) => ({ ...x, langs: on ? x.langs.filter((y) => y !== l) : [...x.langs, l] }))}
                  >
                    {l}
                  </button>
                );
              })}
            </div>
          </div>
          <label className="ag-check">
            <input type="checkbox" checked={f.free_cancel} onChange={set("free_cancel")} /> {t("ag.t.freeCancel")}
          </label>
        </section>

        <section className="card ag-panel">
          <h2>{t("ag.tour.about")}</h2>
          <Field label={t("ag.t.description")} hint={t("ag.t.descriptionHint", { n: f.description.trim().length })} required>
            <textarea className="ag-textarea" value={f.description} onChange={set("description")} maxLength={3000} rows={6} />
          </Field>
          <Field label={t("ag.t.highlights")} hint={t("ag.t.highlightsHint")} required>
            <textarea className="ag-textarea" value={f.highlights} onChange={set("highlights")} rows={5} />
          </Field>
          <Field label={t("ag.t.includes")} hint={t("ag.t.includesHint")} required>
            <textarea className="ag-textarea" value={f.includes} onChange={set("includes")} rows={4} />
          </Field>
          <Field label={t("ag.t.plan")} hint={t("ag.t.planHint")}>
            <textarea className="ag-textarea" value={f.plan} onChange={set("plan")} rows={5} placeholder={t("ag.t.planPlaceholder")} />
          </Field>
        </section>

        <section className="card ag-panel">
          <h2>{t("ag.tour.meeting")}</h2>
          <Field label={t("ag.t.meeting")} hint={t("ag.t.meetingHint")} required>
            <textarea className="ag-textarea" value={f.meeting} onChange={set("meeting")} maxLength={300} rows={3} />
          </Field>
          <span className="ag-hint">{f.pointSet ? t("ag.t.pointSet") : t("ag.t.pointHint")}</span>
          <Suspense fallback={<div className="mini-map pick-map" />}>
            <PickMap lat={f.lat} lng={f.lng} onPick={(p) => setF((x) => ({ ...x, ...p, pointSet: true }))} />
          </Suspense>
          <Field label={t("ag.t.source")} hint={t("ag.t.sourceHint")}>
            <input className="ag-input" value={f.source_url} onChange={set("source_url")} placeholder="https://" maxLength={300} />
          </Field>
        </section>

        <section id="ag-checklist" className="card ag-panel">
          <h2>{t("ag.check.head")}</h2>
          <span className="ag-hint">{t("ag.check.hint")}</span>
          <ul className="ag-checklist">
            {checks.map(([k, ok]) => (
              <li key={k} className={ok ? "is-ok" : ""}>
                {ok ? <Check size={15} /> : <Circle size={15} />}
                <span className={!ok && showChecks ? "ag-reason" : ""}>{t(`ag.check.${k}`)}</span>
              </li>
            ))}
          </ul>
        </section>

        {error && <div className="form-error" role="alert">{t(error)}</div>}
      </div>

      <div className="ag-sticky">
        <button className="cta ghost" onClick={() => save(wasPublished ? "review" : "draft")} disabled={!!busy || wasPublished}>
          <Save size={16} /> {busy === "draft" ? t("ag.saving") : t("ag.tour.saveDraft")}
        </button>
        <button className="cta" onClick={() => save("review")} disabled={!!busy}>
          <Send size={16} /> {busy === "review" ? t("ag.saving") : t("ag.tour.send")}
        </button>
      </div>
    </div>
  );
}
