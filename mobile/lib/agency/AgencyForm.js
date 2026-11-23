import { useRef, useState } from "react";
import { Pressable, Text, View } from "react-native";
import { Image } from "expo-image";
import { FileText, Plus, Trash2, Upload } from "lucide-react-native";
import { useSettings } from "../../../src/settings-context";
import { removeDoc, saveAgency, uploadDoc, uploadPhoto } from "../../../src/agency/agency-api";
import { Button, IconButton } from "../ui";
import { FONT, useColors } from "../theme";
import { Card, Chip, Field, Input, Title, Txt } from "./ui";
import { openDoc, pickDocs, pickImages } from "./files";
import { useLeaveGuard } from "./useLeaveGuard";

// форма организации — как AgencyForm в src/agency/AgencyApp.jsx
const EMPTY = { name: "", legal_name: "", inn: "", license_no: "", address: "", phone: "", telegram: "", email: "", website: "", about: "", logo_url: "", doc_paths: [] };

export function AgencyForm({ userId, agency, onSaved }) {
  const [droppedDocs, setDroppedDocs] = useState([]);
  const createdId = useRef(null); // id агентства, созданного прошлой (неудачной) попыткой
  const { t } = useSettings();
  const c = useColors();
  const [start] = useState(() => ({ ...EMPTY, ...Object.fromEntries(Object.entries(agency || {}).filter(([, v]) => v != null)) }));
  const [form, setForm] = useState(start);
  const [newDocs, setNewDocs] = useState([]); // выбранные, ещё не загруженные
  const [logoFile, setLogoFile] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  const [tried, setTried] = useState(false);
  const set = (k) => (v) => setForm((f) => ({ ...f, [k]: v }));
  const allowLeave = useLeaveGuard(newDocs.length > 0 || !!logoFile || JSON.stringify(form) !== JSON.stringify(start));

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

  async function submit() {
    setTried(true);
    if (Object.values(problems).some(Boolean)) return setError("ag.form.errFill");
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
      allowLeave();
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


  async function pick(fn) {
    try {
      await fn();
    } catch (err) {
      console.warn("Файл не выбрался", err);
      setError("ag.form.errSave");
    }
  }

  const input = (k, props) => <Input value={form[k] || ""} onChangeText={set(k)} bad={bad(k)} {...props} />;
  const fileRow = (key, label, onOpen, onRemove) => (
    <View key={key} style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
      <FileText color={c.muted} size={16} />
      <Pressable style={{ flex: 1 }} onPress={onOpen} disabled={!onOpen}>
        <Text style={{ fontFamily: FONT.bold, fontSize: 14, color: c.ink, textDecorationLine: onOpen ? "underline" : "none" }} numberOfLines={1}>{label}</Text>
      </Pressable>
      <IconButton label={t("ag.remove")} onPress={onRemove}><Trash2 color={c.ink} size={16} /></IconButton>
    </View>
  );

  return (
    <Card>
      <Title>{t("ag.form.title")}</Title>
      <Txt kind="muted">{t("ag.form.text")}</Txt>

      <Field label={t("ag.f.name")} hint={t("ag.f.nameHint")} required>{input("name", { maxLength: 120 })}</Field>
      <Field label={t("ag.f.legal")} hint={t("ag.f.legalHint")} required>{input("legal_name", { maxLength: 200 })}</Field>
      <Field label={t("ag.f.inn")} hint={t("ag.f.innHint")} required>{input("inn", { keyboardType: "number-pad", maxLength: 14 })}</Field>
      <Field label={t("ag.f.license")} hint={t("ag.f.licenseHint")}>{input("license_no", { maxLength: 80 })}</Field>
      <Field label={t("ag.f.address")} required>{input("address", { maxLength: 200 })}</Field>
      <Field label={t("ag.f.phone")} hint={t("ag.f.phoneHint")} required>{input("phone", { keyboardType: "phone-pad", placeholder: "+996 …", maxLength: 30 })}</Field>
      <Field label={t("ag.f.telegram")}>{input("telegram", { placeholder: "@agency", autoCapitalize: "none", maxLength: 60 })}</Field>
      <Field label={t("ag.f.email")}>{input("email", { keyboardType: "email-address", autoCapitalize: "none", maxLength: 120 })}</Field>
      <Field label={t("ag.f.website")}>{input("website", { placeholder: "https://", autoCapitalize: "none", keyboardType: "url", maxLength: 200 })}</Field>
      <Field label={t("ag.f.about")} hint={t("ag.f.aboutHint")}>{input("about", { multiline: true, maxLength: 1500 })}</Field>

      <Field label={t("ag.f.logo")}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
          {logoFile || form.logo_url ? <Image source={logoFile?.uri || form.logo_url} style={{ width: 56, height: 56, borderRadius: 14, backgroundColor: c.bg2 }} /> : null}
          <Chip Icon={Upload} label={t("ag.f.logoPick")} onPress={() => pick(async () => { const [f] = await pickImages(); if (f) setLogoFile(f); })} />
        </View>
      </Field>

      <Field label={t("ag.f.docs")} hint={t("ag.f.docsHint")} required>
        {form.doc_paths.map((p, i) => fileRow(p, t("ag.f.docN", { n: i + 1 }), () => openDoc(p), () => dropSavedDoc(p)))}
        {newDocs.map((f, i) => fileRow(`${f.uri}-${i}`, f.name, null, () => setNewDocs((d) => d.filter((_, j) => j !== i))))}
        <View style={{ flexDirection: "row" }}>
          <Chip
            Icon={Plus}
            bad={bad("docs")}
            label={t("ag.f.docsAdd")}
            disabled={newDocs.length >= 6}
            onPress={() => pick(async () => { const files = await pickDocs(6 - newDocs.length); setNewDocs((d) => [...d, ...files].slice(0, 6)); })}
          />
        </View>
      </Field>

      {error ? <Txt kind="error">{t(error)}</Txt> : null}
      {agency?.status === "approved" ? <Txt kind="small">{t("ag.form.reReview")}</Txt> : null}
      <Button title={busy ? t("ag.saving") : agency ? t("ag.form.save") : t("ag.form.send")} onPress={submit} disabled={busy} />
    </Card>
  );
}
