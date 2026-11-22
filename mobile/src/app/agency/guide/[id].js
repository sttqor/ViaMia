import { useEffect, useState } from "react";
import { Text, View } from "react-native";
import { Image } from "expo-image";
import { router, useLocalSearchParams } from "expo-router";
import { Upload } from "lucide-react-native";
import { useSettings } from "../../../../../src/settings-context";
import { fetchGuides, removePhoto, saveGuide, uploadPhoto } from "../../../../../src/agency/agency-api";
import { Button } from "../../../../lib/ui";
import { FONT, useColors } from "../../../../lib/theme";
import { AgencyGate } from "../../../../lib/agency/Gate";
import { pickImages } from "../../../../lib/agency/files";
import { AgScreen, Card, Chip, Field, Input, Toggle, Txt } from "../../../../lib/agency/ui";

// гид агентства: добавить / изменить — как GuideForm в src/agency/GuidesTab.jsx. id = "new" — новый
const EMPTY = { name: "", photo_url: "", langs: "", phone: "", show_phone: false, active: true };

export default function GuideScreen() {
  const { id } = useLocalSearchParams();
  const { t } = useSettings();
  return <AgencyGate title={t("ag.tab.guides")}>{({ agency }) => (agency ? <Loader agency={agency} id={String(id)} /> : null)}</AgencyGate>;
}

function Loader({ agency, id }) {
  const { t } = useSettings();
  const [g, setG] = useState(id === "new" ? null : undefined);
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    if (id === "new") return;
    let off = false;
    fetchGuides(agency.id)
      .then((d) => {
        if (off) return;
        const row = d.find((x) => x.id === id);
        row ? setG(row) : setFailed(true);
      })
      .catch(() => !off && setFailed(true));
    return () => {
      off = true;
    };
  }, [agency.id, id]);
  if (failed) return <AgScreen title={t("ag.tab.guides")}><Txt kind="error">{t("ag.loadError")}</Txt></AgScreen>;
  if (g === undefined) return <AgScreen title={t("ag.tab.guides")}><Txt kind="muted">{t("ag.loading")}</Txt></AgScreen>;
  return <GuideForm agency={agency} guide={g} />;
}

function GuideForm({ agency, guide }) {
  const { t } = useSettings();
  const c = useColors();
  const [f, setF] = useState(() => (guide ? { ...guide, langs: (guide.langs || []).join(", "), phone: guide.phone || "", photo_url: guide.photo_url || "" } : EMPTY));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  const set = (k) => (v) => setF((x) => ({ ...x, [k]: v }));

  async function pickPhoto() {
    setBusy(true);
    try {
      const [file] = await pickImages();
      if (!file) return;
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

  async function save() {
    if (f.name.trim().length < 2) return setError("ag.g.nameRequired");
    setBusy(true);
    setError(null);
    try {
      await saveGuide(
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
      router.back();
    } catch (err) {
      console.warn(err);
      setError("ag.saveError");
      setBusy(false);
    }
  }

  return (
    <AgScreen title={t(guide ? "ag.g.editTitle" : "ag.g.add")}>
      <Card>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
          {f.photo_url ? (
            <Image source={f.photo_url} style={{ width: 64, height: 64, borderRadius: 32, backgroundColor: c.bg2 }} contentFit="cover" />
          ) : (
            <View style={{ width: 64, height: 64, borderRadius: 32, backgroundColor: c.bg2, alignItems: "center", justifyContent: "center" }}>
              <Text style={{ fontFamily: FONT.heavy, fontSize: 22, color: c.muted }}>{(f.name || "?").slice(0, 1)}</Text>
            </View>
          )}
          <Chip Icon={Upload} label={t("ag.g.photo")} onPress={pickPhoto} disabled={busy} />
        </View>
        <Field label={t("ag.g.name")} required><Input value={f.name} onChangeText={set("name")} maxLength={80} /></Field>
        <Field label={t("ag.g.langs")} hint={t("ag.g.langsHint")}><Input value={f.langs} onChangeText={set("langs")} /></Field>
        <Field label={t("ag.g.phone")}><Input value={f.phone} onChangeText={set("phone")} keyboardType="phone-pad" maxLength={40} /></Field>
        <Toggle label={t("ag.g.showPhone")} value={f.show_phone} onChange={set("show_phone")} />
        <Toggle label={t("ag.g.active")} value={f.active} onChange={set("active")} />
        {error ? <Txt kind="error">{t(error)}</Txt> : null}
        <Button title={t("ag.save")} onPress={save} disabled={busy} />
        <Button secondary title={t("common.cancel")} onPress={() => router.back()} />
      </Card>
    </AgScreen>
  );
}
