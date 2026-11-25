import { useEffect, useMemo, useState } from "react";
import { Alert, Pressable, Text, View } from "react-native";
import { Image } from "expo-image";
import { router } from "expo-router";
import { BadgeCheck, MessageCircle, Pencil, Trash2 } from "lucide-react-native";
import { useSettings } from "../../../src/settings-context";
import { subscribeEvents } from "../../../src/booking/booking-api";
import { deleteGuide, deleteTour, fetchAgencyBookings, fetchGuides, fetchMyTours, fetchUnreadByBooking, setMyTourStatus } from "../../../src/agency/agency-api";
import { Button } from "../ui";
import { FONT, RADIUS, useColors } from "../theme";
import { Banner, Card, Chip, Chips, KV, Row, StatusBadge, Title, Txt } from "./ui";
import { timeOsh, todayOsh } from "./time";

// вкладки кабинета — как ToursTab / AgencyInfo / AgencyStatus (AgencyApp.jsx), BookingsTab.jsx, GuidesTab.jsx

const ask = (title, okLabel, onOk, cancelLabel) =>
  Alert.alert(title, undefined, [
    { text: cancelLabel, style: "cancel" },
    { text: okLabel, style: "destructive", onPress: onOk },
  ]);

export function Intro() {
  const { t } = useSettings();
  return (
    <Card>
      <Title>{t("ag.intro.title")}</Title>
      <Txt kind="muted">{t("ag.intro.text")}</Txt>
      {[1, 2, 3, 4].map((n) => (
        <View key={n} style={{ gap: 2 }}>
          <Txt kind="bold">{`${n}. ${t(`ag.intro.s${n}`)}`}</Txt>
          <Txt kind="muted">{t(`ag.intro.s${n}t`)}</Txt>
        </View>
      ))}
    </Card>
  );
}

export function AgencyStatus({ agency, onEdit }) {
  const { t } = useSettings();
  const c = useColors();
  if (agency.status === "approved") {
    return (
      <Banner tone="ok">
        <Row style={{ justifyContent: "flex-start" }}><BadgeCheck color={c.success} size={18} /><Txt kind="bold" style={{ color: c.success }}>{t("ag.st.approvedTitle")}</Txt></Row>
        <Txt style={{ color: c.success }}>{t("ag.st.approvedText")}</Txt>
      </Banner>
    );
  }
  if (agency.status === "rejected") {
    return (
      <Banner tone="bad" title={t("ag.st.rejectedTitle")}>
        {agency.reject_reason ? <Txt>{`${t("ag.reason")}: ${agency.reject_reason}`}</Txt> : null}
        <Txt>{t("ag.st.rejectedText")}</Txt>
        <View style={{ flexDirection: "row" }}><Chip label={t("ag.form.fix")} onPress={onEdit} /></View>
      </Banner>
    );
  }
  if (agency.status === "blocked") return <Banner tone="bad" title={t("ag.st.blockedTitle")}><Txt>{t("ag.st.blockedText")}</Txt></Banner>;
  return <Banner title={t("ag.st.pendingTitle")}><Txt>{t("ag.st.pendingText")}</Txt></Banner>;
}

export function AgencyInfo({ agency, onEdit }) {
  const { t } = useSettings();
  return (
    <Card>
      <Row>
        <Title>{agency.name}</Title>
        <StatusBadge kind="agency" status={agency.status} />
      </Row>
      <KV
        rows={[
          ["ag.f.legal", agency.legal_name],
          ["ag.f.inn", agency.inn],
          ["ag.f.license", agency.license_no],
          ["ag.f.address", agency.address],
          ["ag.f.phone", agency.phone],
          ["ag.f.telegram", agency.telegram],
          ["ag.f.email", agency.email],
          ["ag.f.website", agency.website],
        ]}
      />
      {agency.about ? <Txt>{agency.about}</Txt> : null}
      {agency.status !== "blocked" ? <Button secondary title={t("ag.form.editTitle")} onPress={onEdit} /> : null}
    </Card>
  );
}

function Thumb({ uri, round, letter }) {
  const c = useColors();
  const s = { width: 64, height: 64, borderRadius: round ? 32 : 14, backgroundColor: c.bg2 };
  if (uri) return <Image source={uri} style={s} contentFit="cover" />;
  return <View style={[s, { alignItems: "center", justifyContent: "center" }]}><Text style={{ fontFamily: FONT.heavy, fontSize: 22, color: c.muted }}>{letter}</Text></View>;
}

// ── туры ─────────────────────────────────────────────
export function ToursTab({ agency, tick }) {
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
  }, [agency.id, tick]);

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

  const remove = (row) =>
    ask(t("ag.tour.confirmDelete"), t("ag.delete"), async () => {
      try {
        await deleteTour(row);
        setTours((list) => list.filter((x) => x.id !== row.id));
      } catch (err) {
        console.warn(err);
        Alert.alert(t("ag.tour.deleteHasBookings"));
      }
    }, t("common.cancel"));

  if (agency.status === "blocked") return null;
  const edit = (id) => router.push(`/agency/tour/${id}`);

  return (
    <>
      <Button title={t("ag.tour.new")} onPress={() => edit("new")} />
      {error ? <Txt kind="error">{t("ag.loadError")}</Txt> : null}
      {tours === null && !error ? <Txt kind="muted">{t("ag.loading")}</Txt> : null}
      {tours?.length === 0 ? <Card><Txt kind="muted">{t("ag.tour.empty")}</Txt></Card> : null}
      {tours?.map((row) => (
        <Card key={row.id}>
          <Pressable onPress={() => edit(row.id)} style={{ flexDirection: "row", gap: 12 }}>
            <Thumb uri={row.images?.[0]} />
            <View style={{ flex: 1, gap: 4 }}>
              <Txt kind="bold">{row.title}</Txt>
              <Txt kind="small">{`${row.place} · ${row.price == null ? t("price.request") : money(row.price)}`}</Txt>
              <StatusBadge kind="tour" status={row.status} />
              {row.status === "rejected" && row.reject_reason ? <Txt kind="reason">{`${t("ag.reason")}: ${row.reject_reason}`}</Txt> : null}
            </View>
          </Pressable>
          <View style={{ flexDirection: "row", flexWrap: "wrap", alignItems: "center", gap: 8 }}>
            {(row.status === "draft" || row.status === "rejected") && <Chip label={t("ag.tour.editSend")} onPress={() => edit(row.id)} />}
            {row.status === "published" && <Chip label={t("ag.tour.hide")} onPress={() => changeStatus(row, "hidden")} />}
            {row.status === "hidden" && <Chip label={t("ag.tour.unhide")} onPress={() => changeStatus(row, "review")} />}
            {row.status === "review" && <Txt kind="small">{t("ag.tour.inReview")}</Txt>}
            <Chip Icon={Trash2} label={t("ag.remove")} onPress={() => remove(row)} />
          </View>
        </Card>
      ))}
    </>
  );
}

// ── гиды ─────────────────────────────────────────────
export function GuidesTab({ agency, tick }) {
  const { t } = useSettings();
  const [list, setList] = useState(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    let off = false;
    fetchGuides(agency.id)
      .then((d) => !off && (setList(d), setError(false)))
      .catch(() => !off && setError(true));
    return () => {
      off = true;
    };
  }, [agency.id, tick]);

  const remove = (g) =>
    ask(t("ag.g.deleteAsk", { name: g.name }), t("ag.delete"), async () => {
      try {
        await deleteGuide(g);
        setList((l) => l.filter((x) => x.id !== g.id));
        setError(false);
      } catch (err) {
        console.warn(err);
        setError(true);
      }
    }, t("common.cancel"));

  return (
    <>
      <Banner><Txt>{t("ag.g.how")}</Txt></Banner>
      <Button title={t("ag.g.add")} onPress={() => router.push("/agency/guide/new")} />
      {error ? <Txt kind="error">{t("ag.loadError")}</Txt> : null}
      {list === null && !error ? <Txt kind="muted">{t("ag.loading")}</Txt> : null}
      {list?.length === 0 ? <Card><Txt kind="muted">{t("ag.g.empty")}</Txt></Card> : null}
      {list?.map((g) => (
        <Card key={g.id}>
          <View style={{ flexDirection: "row", gap: 12 }}>
            <Thumb uri={g.photo_url} round letter={g.name.slice(0, 1)} />
            <View style={{ flex: 1, gap: 2 }}>
              <Txt kind="bold">{g.name}</Txt>
              {g.langs?.length > 0 ? <Txt kind="small">{g.langs.join(", ")}</Txt> : null}
              {g.phone ? <Txt kind="small">{`${g.phone} · ${t(g.show_phone ? "ag.g.phoneShown" : "ag.g.phoneHidden")}`}</Txt> : null}
              {!g.active ? <StatusBadgeText text={t("ag.g.inactive")} /> : null}
            </View>
          </View>
          <View style={{ flexDirection: "row", gap: 8 }}>
            <Chip Icon={Pencil} label={t("ag.edit")} onPress={() => router.push(`/agency/guide/${g.id}`)} />
            <Chip Icon={Trash2} label={t("ag.delete")} onPress={() => remove(g)} />
          </View>
        </Card>
      ))}
    </>
  );
}

function StatusBadgeText({ text }) {
  const c = useColors();
  return (
    <View style={{ alignSelf: "flex-start", paddingHorizontal: 10, paddingVertical: 3, borderRadius: RADIUS.chip, backgroundColor: c.bg2 }}>
      <Text style={{ fontFamily: FONT.bold, fontSize: 12, color: c.ink }}>{text}</Text>
    </View>
  );
}

// ── заявки ───────────────────────────────────────────
export function BookingsTab({ agency, tick, onUnread }) {
  const { t, money, plural, fmtDate } = useSettings();
  const c = useColors();
  const [list, setList] = useState(null);
  const [unread, setUnread] = useState({});
  const [filter, setFilter] = useState("new");
  const [error, setError] = useState(false);
  const [live, setLive] = useState(0); // новое событие → перечитать

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
  }, [agency.id, tick, live]);

  // новая заявка, отмена или сообщение — сразу, без перезагрузки
  useEffect(() => subscribeEvents(`agency-${agency.id}`, () => setLive((x) => x + 1)), [agency.id]);

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

  return (
    <>
      <Chips
        value={filter}
        onChange={setFilter}
        options={[
          { value: "new", label: pendingCount ? `${t("ag.bk.new")} · ${pendingCount}` : t("ag.bk.new") },
          { value: "soon", label: t("ag.bk.soon") },
          { value: "all", label: t("ag.bk.all") },
        ]}
      />
      {error ? <Txt kind="error">{t("ag.loadError")}</Txt> : null}
      {list === null && !error ? <Txt kind="muted">{t("ag.loading")}</Txt> : null}
      {list && shown.length === 0 ? (
        <Card><Txt kind="muted">{t(filter === "new" && list.length > 0 ? "ag.bk.emptyNew" : filter === "soon" ? "ag.bk.emptySoon" : "ag.bk.empty")}</Txt></Card>
      ) : null}
      {shown.map((b) => (
        <Pressable key={b.id} onPress={() => router.push(`/agency/booking/${b.id}`)}>
          <Card style={{ gap: 4 }}>
            <Row>
              <Txt kind="bold" style={{ flex: 1 }}>{b.tour?.title || b.tour_id}</Txt>
              <StatusBadge kind="bk" status={b.status} />
            </Row>
            <Txt kind="small">
              {`${fmtDate(b.date)}${b.meet_at ? `, ${timeOsh(b.meet_at)}` : ""} · ${plural("pl.guests", b.guests)} · ${b.total_usd == null ? t("price.request") : money(Number(b.total_usd))}`}
            </Txt>
            <Row>
              <Txt>{b.name}</Txt>
              {unread[b.id] > 0 ? (
                <Row>
                  <MessageCircle color={c.accent} size={14} />
                  <Txt kind="error">{String(unread[b.id])}</Txt>
                </Row>
              ) : null}
            </Row>
          </Card>
        </Pressable>
      ))}
    </>
  );
}
