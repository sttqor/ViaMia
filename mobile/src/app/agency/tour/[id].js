import { useEffect, useMemo, useState } from "react";
import { Pressable, Text, View } from "react-native";
import { Image } from "expo-image";
import { router, useLocalSearchParams } from "expo-router";
import { Check, Circle, ImagePlus, X } from "lucide-react-native";
import { useSettings } from "../../../../../src/settings-context";
import { CATEGORIES } from "../../../../../src/data";
import { fetchMyTours, removePhoto, saveTour, uploadPhoto } from "../../../../../src/agency/agency-api";
import { LANGS, MAX_PHOTOS, badPrice, checklist, fromRow, toRow } from "../../../../../src/agency/tour-form";
import { Button } from "../../../../lib/ui";
import { FONT, RADIUS, useColors } from "../../../../lib/theme";
import { AgencyGate, NoAgency } from "../../../../lib/agency/Gate";
import { pickImages } from "../../../../lib/agency/files";
import { useLeaveGuard } from "../../../../lib/agency/useLeaveGuard";
import { PickMap } from "../../../../lib/agency/PickMap";
import { AgScreen, Banner, Card, Chip, Chips, Field, Input, StatusBadge, Title, Toggle, Txt } from "../../../../lib/agency/ui";

// редактор тура — как src/agency/TourEditor.jsx (форма ↔ строка — общий src/agency/tour-form.js). id = "new" — новый тур
export default function TourScreen() {
  const { id } = useLocalSearchParams();
  const { t } = useSettings();
  return <AgencyGate title={t("ag.tour.edit")}>{({ agency }) => (agency ? <Loader agency={agency} id={String(id)} /> : <NoAgency />)}</AgencyGate>;
}

function Loader({ agency, id }) {
  const { t } = useSettings();
  const [tour, setTour] = useState(id === "new" ? null : undefined);
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    if (id === "new") return;
    let off = false;
    fetchMyTours(agency.id)
      .then((d) => {
        if (off) return;
        const row = d.find((x) => x.id === id);
        row ? setTour(row) : setFailed(true);
      })
      .catch(() => !off && setFailed(true));
    return () => {
      off = true;
    };
  }, [agency.id, id]);
  if (failed) return <AgScreen title={t("ag.tour.edit")}><Txt kind="error">{t("ag.loadError")}</Txt></AgScreen>;
  if (tour === undefined) return <AgScreen title={t("ag.tour.edit")}><Txt kind="muted">{t("ag.loading")}</Txt></AgScreen>;
  return <Editor agency={agency} tour={tour} />;
}

function Editor({ agency, tour }) {
  const { t, loc, money } = useSettings();
  const c = useColors();
  const [start] = useState(() => fromRow(tour));
  const [f, setF] = useState(start);
  const allowLeave = useLeaveGuard(JSON.stringify(f) !== JSON.stringify(start));
  const [busy, setBusy] = useState(null); // null | "draft" | "review" | "photo"
  const [error, setError] = useState(null);
  const [showChecks, setShowChecks] = useState(false);
  const set = (k) => (v) => setF((x) => ({ ...x, [k]: v }));
  const checks = useMemo(() => checklist(f), [f]);
  const ready = checks.every(([, ok]) => ok);
  const cats = CATEGORIES.filter((x) => x.id !== "all");
  const wasPublished = tour?.status === "published";

  async function addPhotos() {
    const limit = MAX_PHOTOS - f.images.length;
    if (limit <= 0) return;
    setBusy("photo");
    setError(null);
    try {
      for (const file of await pickImages({ multiple: true, limit })) {
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
    if (f.title.trim().length < 3) return setError("ag.tour.errTitle");
    if (badPrice(f)) return setError("ag.tour.errPrice");
    if (status === "review" && !ready) {
      setShowChecks(true);
      return setError("ag.tour.errChecklist");
    }
    setBusy(status);
    setError(null);
    try {
      await saveTour(agency.id, toRow(f, status), tour?.id);
      allowLeave();
      router.back();
    } catch (err) {
      console.warn("Тур не сохранился", err);
      setError("ag.tour.errSave");
      setBusy(null);
    }
  }

  const priceNum = Number(String(f.price).replace(",", "."));
  const footer = (
    <>
      <View style={{ flex: 1 }}>
        <Button secondary title={busy === "draft" ? t("ag.saving") : t("ag.tour.saveDraft")} onPress={() => save(wasPublished ? "review" : "draft")} disabled={!!busy || wasPublished} />
      </View>
      <View style={{ flex: 1 }}>
        <Button title={busy === "review" ? t("ag.saving") : t("ag.tour.send")} onPress={() => save("review")} disabled={!!busy} />
      </View>
    </>
  );

  return (
    <AgScreen title={tour ? t("ag.tour.edit") : t("ag.tour.new")} sub={tour ? <StatusBadge kind="tour" status={tour.status} /> : null} footer={footer}>
      {tour?.status === "rejected" && tour.reject_reason ? <Banner tone="bad" title={t("ag.tour.rejected")}><Txt>{tour.reject_reason}</Txt></Banner> : null}
      {wasPublished ? <Banner><Txt>{t("ag.tour.editPublished")}</Txt></Banner> : null}

      <Card>
        <Title>{t("ag.tour.photos")}</Title>
        <Txt kind="small">{t("ag.tour.photosHint")}</Txt>
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
          {f.images.map((url, i) => (
            <Pressable key={url} onPress={() => makeCover(url)} style={{ width: 96, height: 96, borderRadius: 14, overflow: "hidden", backgroundColor: c.bg2 }}>
              <Image source={url} style={{ flex: 1 }} contentFit="cover" />
              {i === 0 ? (
                <View style={{ position: "absolute", left: 6, bottom: 6, paddingHorizontal: 8, paddingVertical: 2, borderRadius: RADIUS.chip, backgroundColor: c.gold }}>
                  <Text style={{ fontFamily: FONT.bold, fontSize: 11, color: c.indigo }}>{t("ag.tour.cover")}</Text>
                </View>
              ) : null}
              <Pressable onPress={() => dropPhoto(url)} accessibilityLabel={t("ag.remove")} hitSlop={8} style={{ position: "absolute", top: 4, right: 4, width: 26, height: 26, borderRadius: 13, alignItems: "center", justifyContent: "center", backgroundColor: c.card }}>
                <X color={c.ink} size={14} />
              </Pressable>
            </Pressable>
          ))}
          {f.images.length < MAX_PHOTOS ? (
            <Pressable onPress={addPhotos} disabled={busy === "photo"} accessibilityLabel={t("ag.tour.addPhoto")} style={{ width: 96, height: 96, borderRadius: 14, borderWidth: 1, borderStyle: "dashed", borderColor: c.line, alignItems: "center", justifyContent: "center", backgroundColor: c.card }}>
              {busy === "photo" ? <Txt kind="small">{t("ag.saving")}</Txt> : <ImagePlus color={c.muted} size={22} />}
            </Pressable>
          ) : null}
        </View>
      </Card>

      <Card>
        <Title>{t("ag.tour.main")}</Title>
        <Field label={t("ag.t.title")} hint={t("ag.t.titleHint")} required><Input value={f.title} onChangeText={set("title")} maxLength={90} /></Field>
        <Field label={t("ag.t.category")} required>
          <Chips value={f.category} onChange={set("category")} options={cats.map((x) => ({ value: x.id, label: loc(x).label }))} />
        </Field>
        <Field label={t("ag.t.type")} hint={t("ag.t.typeHint")} required><Input value={f.type} onChangeText={set("type")} maxLength={40} /></Field>
        <Field label={t("ag.t.place")} hint={t("ag.t.placeHint")} required><Input value={f.place} onChangeText={set("place")} maxLength={80} /></Field>
        <Field label={t("ag.t.hours")} hint={t("ag.t.hoursHint")} required><Input value={f.hours} onChangeText={set("hours")} keyboardType="decimal-pad" placeholder="2.5" /></Field>
        <Field label={t("ag.t.group")} hint={t("ag.t.groupHint")}><Input value={f.group_size} onChangeText={set("group_size")} maxLength={40} /></Field>
        <Field label={t("ag.t.price")} hint={f.price && !f.onRequest ? t("ag.t.priceIs", { price: money(priceNum) }) : t("ag.t.priceHint")} required>
          <Input value={f.onRequest ? "" : f.price} onChangeText={set("price")} keyboardType="decimal-pad" placeholder="25" editable={!f.onRequest} />
        </Field>
        <Toggle label={t("price.request")} value={f.onRequest} onChange={set("onRequest")} />
        <Field label={t("ag.t.langs")} required>
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
            {LANGS.map((l) => {
              const on = f.langs.includes(l);
              return <Chip key={l} label={l} on={on} onPress={() => setF((x) => ({ ...x, langs: on ? x.langs.filter((y) => y !== l) : [...x.langs, l] }))} />;
            })}
          </View>
        </Field>
        <Toggle label={t("ag.t.freeCancel")} value={f.free_cancel} onChange={set("free_cancel")} />
      </Card>

      <Card>
        <Title>{t("ag.tour.about")}</Title>
        <Field label={t("ag.t.description")} hint={t("ag.t.descriptionHint", { n: f.description.trim().length })} required>
          <Input multiline rows={6} value={f.description} onChangeText={set("description")} maxLength={3000} />
        </Field>
        <Field label={t("ag.t.highlights")} hint={t("ag.t.highlightsHint")} required><Input multiline rows={5} value={f.highlights} onChangeText={set("highlights")} /></Field>
        <Field label={t("ag.t.includes")} hint={t("ag.t.includesHint")} required><Input multiline rows={4} value={f.includes} onChangeText={set("includes")} /></Field>
        <Field label={t("ag.t.plan")} hint={t("ag.t.planHint")}>
          <Input multiline rows={5} value={f.plan} onChangeText={set("plan")} placeholder={t("ag.t.planPlaceholder")} />
        </Field>
      </Card>

      <Card>
        <Title>{t("ag.tour.meeting")}</Title>
        <Field label={t("ag.t.meeting")} hint={t("ag.t.meetingHint")} required>
          <Input multiline rows={3} value={f.meeting} onChangeText={set("meeting")} maxLength={300} />
        </Field>
        <Txt kind="small">{f.pointSet ? t("ag.t.pointSet") : t("ag.t.pointHint")}</Txt>
        <PickMap lat={f.lat} lng={f.lng} onPick={(p) => setF((x) => ({ ...x, ...p, pointSet: true }))} />
        <Field label={t("ag.t.source")} hint={t("ag.t.sourceHint")}>
          <Input value={f.source_url} onChangeText={set("source_url")} placeholder="https://" autoCapitalize="none" keyboardType="url" maxLength={300} />
        </Field>
      </Card>

      <Card>
        <Title>{t("ag.check.head")}</Title>
        <Txt kind="small">{t("ag.check.hint")}</Txt>
        {checks.map(([k, ok]) => (
          <View key={k} style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
            {ok ? <Check color={c.success} size={15} /> : <Circle color={showChecks ? c.accent : c.muted} size={15} />}
            <Txt kind={!ok && showChecks ? "reason" : undefined} style={ok ? { color: c.success } : null}>{t(`ag.check.${k}`)}</Txt>
          </View>
        ))}
      </Card>

      {error ? <Txt kind="error">{t(error)}</Txt> : null}
    </AgScreen>
  );
}
