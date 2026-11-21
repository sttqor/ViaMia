// Гиды агентства: один раз завести — потом выбирать при подтверждении заявки.
// Турист видит гида (фото, имя, языки) только в подтверждённой «поездке»; телефон — если разрешено.
import { useEffect, useState } from "react";
import { Pencil, Plus, Trash2, Upload } from "lucide-react";
import { useSettings } from "../settings-context";
import { Field } from "./ui";
import { deleteGuide, fetchGuides, removePhoto, saveGuide, uploadPhoto } from "./agency-api";

const EMPTY = { name: "", photo_url: "", langs: "", phone: "", show_phone: false, active: true };

export function GuidesTab({ agency }) {
  const { t } = useSettings();
  const [list, setList] = useState(null);
  const [error, setError] = useState(false);
  const [editing, setEditing] = useState(null); // null | "new" | строка гида

  useEffect(() => {
    let off = false;
    fetchGuides(agency.id)
      .then((d) => !off && setList(d))
      .catch(() => !off && setError(true));
    return () => {
      off = true;
    };
  }, [agency.id]);

  if (editing) {
    return (
      <GuideForm
        agency={agency}
        guide={editing === "new" ? null : editing}
        onClose={() => setEditing(null)}
        onSaved={(g) => {
          setList((l) => (l.some((x) => x.id === g.id) ? l.map((x) => (x.id === g.id ? g : x)) : [...l, g]));
          setEditing(null);
        }}
      />
    );
  }

  async function remove(g) {
    if (!window.confirm(t("ag.g.deleteAsk", { name: g.name }))) return;
    try {
      await deleteGuide(g);
      setList((l) => l.filter((x) => x.id !== g.id));
    } catch (err) {
      console.warn(err);
      setError(true);
    }
  }

  return (
    <>
      <div className="ag-banner">{t("ag.g.how")}</div>
      <button className="cta" onClick={() => setEditing("new")}>
        <Plus size={18} /> {t("ag.g.add")}
      </button>
      {error && <div className="form-error">{t("ag.loadError")}</div>}
      {list === null && !error && <div className="ag-empty">{t("ag.loading")}</div>}
      {list && list.length === 0 && <div className="card ag-empty">{t("ag.g.empty")}</div>}
      {list?.map((g) => (
        <article key={g.id} className="card">
          <div className="ag-item">
            {g.photo_url ? <img className="ag-thumb ag-thumb-round" src={g.photo_url} alt="" /> : <span className="ag-thumb ag-thumb-round ag-initial">{g.name.slice(0, 1)}</span>}
            <span className="grow">
              <span className="t-md b">{g.name}</span>
              {g.langs?.length > 0 && <span className="muted t-sm">{g.langs.join(", ")}</span>}
              {g.phone && <span className="muted t-sm">{g.phone} · {t(g.show_phone ? "ag.g.phoneShown" : "ag.g.phoneHidden")}</span>}
              {!g.active && <span className="ag-status">{t("ag.g.inactive")}</span>}
            </span>
          </div>
          <div className="ag-actions">
            <button className="pill" onClick={() => setEditing(g)}><Pencil size={14} /> {t("ag.edit")}</button>
            <button className="pill" onClick={() => remove(g)}><Trash2 size={14} /> {t("ag.delete")}</button>
          </div>
        </article>
      ))}
    </>
  );
}

function GuideForm({ agency, guide, onClose, onSaved }) {
  const { t } = useSettings();
  const [f, setF] = useState(() => (guide ? { ...guide, langs: (guide.langs || []).join(", "), phone: guide.phone || "", photo_url: guide.photo_url || "" } : EMPTY));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  const set = (k) => (e) => setF((x) => ({ ...x, [k]: e.target.type === "checkbox" ? e.target.checked : e.target.value }));

  async function pickPhoto(e) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setBusy(true);
    try {
      const url = await uploadPhoto(agency.id, file);
      if (f.photo_url && f.photo_url !== guide?.photo_url) removePhoto(f.photo_url).catch(() => {});
      setF((x) => ({ ...x, photo_url: url }));
    } catch (err) {
      console.warn(err);
      setError("ag.g.photoError");
    } finally {
      setBusy(false);
    }
  }

  async function save(e) {
    e.preventDefault();
    if (f.name.trim().length < 2) return setError("ag.g.nameRequired");
    setBusy(true);
    setError(null);
    try {
      const row = await saveGuide(
        agency.id,
        {
          name: f.name.trim(),
          photo_url: f.photo_url || null,
          langs: f.langs.split(/[,;]/).map((s) => s.trim()).filter(Boolean),
          phone: f.phone.trim() || null,
          show_phone: f.show_phone,
          active: f.active,
        },
        guide?.id
      );
      onSaved(row);
    } catch (err) {
      console.warn(err);
      setError("ag.saveError");
    } finally {
      setBusy(false);
    }
  }

  return (
    <form className="card ag-panel" onSubmit={save}>
      <h2>{t(guide ? "ag.g.editTitle" : "ag.g.add")}</h2>
      <div className="row gap-12">
        {f.photo_url ? <img className="ag-thumb ag-thumb-round" src={f.photo_url} alt="" /> : <span className="ag-thumb ag-thumb-round ag-initial">{(f.name || "?").slice(0, 1)}</span>}
        <label className="pill ag-file-btn">
          <Upload size={14} /> {t("ag.g.photo")}
          <input type="file" accept="image/*" onChange={pickPhoto} disabled={busy} />
        </label>
      </div>
      <Field label={t("ag.g.name")} required>
        <input className="ag-input" value={f.name} onChange={set("name")} maxLength={80} />
      </Field>
      <Field label={t("ag.g.langs")} hint={t("ag.g.langsHint")}>
        <input className="ag-input" value={f.langs} onChange={set("langs")} />
      </Field>
      <Field label={t("ag.g.phone")}>
        <input className="ag-input" type="tel" value={f.phone} onChange={set("phone")} maxLength={40} />
      </Field>
      <label className="ag-check"><input type="checkbox" checked={f.show_phone} onChange={set("show_phone")} /> {t("ag.g.showPhone")}</label>
      <label className="ag-check"><input type="checkbox" checked={f.active} onChange={set("active")} /> {t("ag.g.active")}</label>
      {error && <div className="form-error">{t(error)}</div>}
      <div className="ag-actions ag-actions-flat">
        <button className="cta" type="submit" disabled={busy}>{t("ag.save")}</button>
        <button className="cta ghost" type="button" onClick={onClose}>{t("common.cancel")}</button>
      </div>
    </form>
  );
}
