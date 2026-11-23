import { useEffect, useState } from "react";
import { Linking, Pressable, Text, View } from "react-native";
import { useLocalSearchParams } from "expo-router";
import { Phone } from "lucide-react-native";
import { subscribeEvents } from "../../../../../src/booking/booking-api";
import { useSettings } from "../../../../../src/settings-context";
import { fetchAgencyBooking, fetchGuides, updateBooking } from "../../../../../src/agency/agency-api";
import { BookingChat } from "../../../../lib/BookingChat";
import { Button } from "../../../../lib/ui";
import { FONT, useColors } from "../../../../lib/theme";
import { AgencyGate } from "../../../../lib/agency/Gate";
import { AgScreen, Card, Chip, Chips, Field, Input, KV, Row, StatusBadge, Title, Txt } from "../../../../lib/agency/ui";
import { readTime, timeOsh, todayOsh } from "../../../../lib/agency/time";

// карточка заявки — как BookingDetail в src/agency/BookingsTab.jsx:
// подтвердить с гидом, временем встречи и комментарием, отклонить с причиной, «тур состоялся», чат.
// Переходы статуса проверяет база (booking_guard).

function contactHref(c) {
  const v = (c || "").trim();
  if (/^@\w+/.test(v)) return `https://t.me/${v.slice(1)}`;
  if (/@/.test(v)) return `mailto:${v}`;
  if (/^\+?[\d\s()-]{7,}$/.test(v)) return `tel:${v.replace(/[^\d+]/g, "")}`;
  return null;
}

export default function BookingScreen() {
  const { id } = useLocalSearchParams();
  const { t } = useSettings();
  return <AgencyGate title={t("ag.tab.bookings")}>{({ agency }) => (agency ? <Loader agency={agency} id={String(id)} /> : null)}</AgencyGate>;
}

function Loader({ agency, id }) {
  const { t } = useSettings();
  const [b, setB] = useState(undefined);
  const [live, setLive] = useState(0);
  // турист мог отменить или написать, пока карточка открыта — перечитываем по событиям, как список в вебе
  useEffect(() => subscribeEvents(`agency-bk-${id}`, (e) => e?.booking_id === id && setLive((x) => x + 1)), [id]);
  useEffect(() => {
    let off = false;
    fetchAgencyBooking(id)
      .then((d) => !off && setB(d || null))
      .catch(() => !off && setB(null));
    return () => {
      off = true;
    };
  }, [id, live]);
  if (b === undefined) return <AgScreen title={t("ag.tab.bookings")}><Txt kind="muted">{t("ag.loading")}</Txt></AgScreen>;
  if (!b) return <AgScreen title={t("ag.tab.bookings")}><Txt kind="error">{t("ag.loadError")}</Txt></AgScreen>;
  return <Detail agency={agency} booking={b} onChanged={(row) => setB((x) => ({ ...x, ...row }))} />;
}

function Detail({ agency, booking: b, onChanged }) {
  const { t, money, plural, fmtDate } = useSettings();
  const c = useColors();
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
      onChanged(await updateBooking(b.id, patch));
      setDeclining(false);
    } catch (err) {
      console.warn(err);
      setError("ag.saveError");
    } finally {
      setBusy(false);
    }
  }

  const time = readTime(f.time);
  const details = () => ({
    guide_id: f.guide_id || null,
    meet_at: time ? `${b.date}T${time}:00+06:00` : null,
    agency_note: f.note.trim() || null,
  });
  const withTime = (patch) => (time ? run({ ...patch, ...details() }) : setError("ag.bk.timeRequired"));
  const decline = () => (reason.trim().length < 3 ? setError("ag.bk.reasonRequired") : run({ status: "declined", decline_reason: reason.trim() }));

  const editable = b.status === "pending" || b.status === "confirmed";
  const chatClosed = !["pending", "confirmed", "done"].includes(b.status);
  const setField = (k) => (v) => setF((x) => ({ ...x, [k]: v }));

  return (
    <AgScreen title={b.tour?.title || b.tour_id} sub={<StatusBadge kind="bk" status={b.status} />}>
      <Card>
        <KV
          rows={[
            ["ag.bk.date", `${fmtDate(b.date)}${b.meet_at ? `, ${timeOsh(b.meet_at)}` : ""}`],
            ["ag.bk.guests", plural("pl.guests", b.guests)],
            ["ag.bk.sum", b.total_usd == null ? t("price.request") : money(Number(b.total_usd))],
            ["ag.bk.tourist", b.name],
            [
              "ag.bk.contactLabel",
              href ? (
                <Pressable onPress={() => Linking.openURL(href)}>
                  <Text style={{ fontFamily: FONT.bold, fontSize: 14, color: c.accent, textDecorationLine: "underline" }}>{b.contact}</Text>
                </Pressable>
              ) : b.contact,
            ],
            ["ag.bk.code", `${b.code}${b.lang ? ` · ${b.lang.toUpperCase()}` : ""}`],
            ["ag.bk.reason", b.decline_reason],
          ]}
        />
        {href ? <View style={{ flexDirection: "row" }}><Chip Icon={Phone} label={t("ag.bk.contact")} onPress={() => Linking.openURL(href)} /></View> : null}
      </Card>

      {editable && !declining && (
        <Card>
          <Title>{t(b.status === "pending" ? "ag.bk.confirmTitle" : "ag.bk.detailsTitle")}</Title>
          <Txt kind="small">{t("ag.bk.detailsHint")}</Txt>
          <Field label={t("ag.bk.guide")} hint={guides.length === 0 ? t("ag.bk.noGuides") : null}>
            <Chips value={f.guide_id} onChange={setField("guide_id")} options={[{ value: "", label: t("ag.bk.noGuide") }, ...guides.map((g) => ({ value: g.id, label: g.name }))]} />
          </Field>
          <Field label={t("ag.bk.meetTime")} hint={t("ag.bk.meetTimeHint")} required>
            <Input value={f.time} onChangeText={setField("time")} placeholder="09:30" keyboardType="numbers-and-punctuation" maxLength={5} bad={!!f.time && !time} />
          </Field>
          <Field label={t("ag.bk.note")} hint={t("ag.bk.noteHint")}>
            <Input multiline rows={3} maxLength={1000} value={f.note} onChangeText={setField("note")} />
          </Field>
          {error ? <Txt kind="error">{t(error)}</Txt> : null}
          {b.status === "pending" ? (
            <Row>
              <View style={{ flex: 1 }}><Button title={t("ag.bk.confirm")} disabled={busy} onPress={() => withTime({ status: "confirmed" })} /></View>
              <View style={{ flex: 1 }}><Button secondary title={t("ag.bk.decline")} disabled={busy} onPress={() => (setDeclining(true), setError(null))} /></View>
            </Row>
          ) : (
            <>
              <Button title={t("ag.bk.saveDetails")} disabled={busy} onPress={() => withTime({})} />
              {b.date <= today ? <Button secondary title={t("ag.bk.markDone")} disabled={busy} onPress={() => run({ status: "done" })} /> : null}
            </>
          )}
        </Card>
      )}

      {declining && (
        <Card>
          <Title>{t("ag.bk.declineTitle")}</Title>
          <Field label={t("ag.bk.reason")} hint={t("ag.bk.reasonHint")} required>
            <Input multiline rows={3} maxLength={300} value={reason} onChangeText={setReason} />
          </Field>
          {error ? <Txt kind="error">{t(error)}</Txt> : null}
          <Row>
            <View style={{ flex: 1 }}><Button title={t("ag.bk.decline")} disabled={busy} onPress={decline} /></View>
            <View style={{ flex: 1 }}><Button secondary title={t("common.cancel")} disabled={busy} onPress={() => setDeclining(false)} /></View>
          </Row>
        </Card>
      )}

      <Card>
        <Title>{t("chat.title")}</Title>
        <BookingChat bookingId={b.id} side="agency" closed={chatClosed} />
      </Card>
    </AgScreen>
  );
}
