import { useEffect, useState } from "react";
import { Alert, Linking, Pressable, ScrollView, Text, View } from "react-native";
import { Image } from "expo-image";
import { BadgeCheck, Ban, FileText, X } from "lucide-react-native";
import { useSettings } from "../../../src/settings-context";
import { useAuth } from "../../../src/auth-context";
import { prettyPhone } from "../../../src/phone";
import { fetchAgencies, fetchIsAdmin, fetchToursForReview, reviewAgency, reviewTour } from "../../../src/agency/agency-api";
import { LoginForm } from "../../lib/LoginForm";
import { Button } from "../../lib/ui";
import { FONT, useColors } from "../../lib/theme";
import { LogoutButton } from "../../lib/agency/Gate";
import { openDoc } from "../../lib/agency/files";
import { AgScreen, Banner, Card, Chip, Chips, Field, Input, KV, Row, StatusBadge, Title, Txt } from "../../lib/agency/ui";

// модерация платформы — как src/agency/AdminApp.jsx. Доступ — только тем, кто в public.admins; права проверяет база
export default function AdminScreen() {
  const { t } = useSettings();
  const { enabled, user, signOut } = useAuth();
  // ответ привязан к аккаунту: сменили аккаунт — снова «проверяем»
  const [check, setCheck] = useState({ for: null, admin: false });
  const admin = user && check.for === user.id ? check.admin : null;
  const [tab, setTab] = useState("agencies");

  useEffect(() => {
    if (!user) return;
    let off = false;
    fetchIsAdmin()
      .then((v) => !off && setCheck({ for: user.id, admin: v }))
      .catch(() => !off && setCheck({ for: user.id, admin: false }));
    return () => {
      off = true;
    };
  }, [user]);

  const title = t("adm.title");
  if (!enabled) return <AgScreen title={title}><Banner><Txt>{t("ag.noBackend")}</Txt></Banner></AgScreen>;
  if (!user) return <AgScreen title={title}><LoginForm /></AgScreen>;
  const who = user.email || prettyPhone(user.phone);
  const screen = (children) => <AgScreen title={title} sub={who} right={<LogoutButton />}>{children}</AgScreen>;

  if (admin === null) return screen(<Txt kind="muted">{t("ag.loading")}</Txt>);
  if (!admin) {
    return screen(
      <>
        <Banner tone="bad" title={t("adm.denied")}>
          <Txt>{t("adm.deniedAs", { who })}</Txt>
          <Txt>{t("adm.deniedHint")}</Txt>
        </Banner>
        <Button title={t("adm.switchAccount")} onPress={signOut} />
      </>
    );
  }
  return screen(
    <>
      <Chips value={tab} onChange={setTab} options={[{ value: "agencies", label: t("adm.tab.agencies") }, { value: "tours", label: t("adm.tab.tours") }]} />
      {tab === "agencies" ? <AgenciesReview /> : <ToursReview />}
    </>
  );
}

function useList(fetcher) {
  const [list, setList] = useState(null);
  const [error, setError] = useState(false);
  const [key, setKey] = useState(0);
  useEffect(() => {
    let off = false;
    fetcher()
      .then((d) => !off && (setError(false), setList(d)))
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

// отказ / блок / снятие — с причиной: агентство увидит её в кабинете (в вебе — window.prompt)
function useReview(review, okStatus) {
  const { t } = useSettings();
  const [asking, setAsking] = useState(null); // { id, status }
  const [reason, setReason] = useState("");
  async function act(id, status, why, done) {
    if (status !== okStatus && !why) {
      setAsking({ id, status });
      setReason("");
      return;
    }
    try {
      await review(id, status, why);
      setAsking(null);
      done();
    } catch (err) {
      console.warn(err);
      Alert.alert(t("ag.loadError"));
    }
  }
  return { asking, reason, setReason, act, cancel: () => setAsking(null) };
}

function ReasonBox({ r, label, done }) {
  const { t } = useSettings();
  return (
    <Card style={{ padding: 12 }}>
      <Field label={t("adm.reasonPrompt")} required>
        <Input multiline rows={2} value={r.reason} onChangeText={r.setReason} maxLength={300} />
      </Field>
      <Row style={{ justifyContent: "flex-start", flexWrap: "wrap" }}>
        <Chip on label={label} disabled={!r.reason.trim()} onPress={() => r.act(r.asking.id, r.asking.status, r.reason.trim(), done)} />
        <Chip label={t("common.cancel")} onPress={r.cancel} />
      </Row>
    </Card>
  );
}

function ListState({ list, error, empty }) {
  const { t } = useSettings();
  if (error) return <Txt kind="error">{t("ag.loadError")}</Txt>;
  if (list === null) return <Txt kind="muted">{t("ag.loading")}</Txt>;
  return empty ? <Card><Txt kind="muted">{t("adm.empty")}</Txt></Card> : null;
}

function AgenciesReview() {
  const { t, fmtDate } = useSettings();
  const c = useColors();
  const { list, error, load } = useList(fetchAgencies);
  const [filter, setFilter] = useState("pending");
  const r = useReview(reviewAgency, "approved");
  const shown = (list || []).filter((a) => filter === "all" || a.status === filter);

  return (
    <>
      <Chips value={filter} onChange={setFilter} options={["pending", "approved", "rejected", "all"].map((v) => ({ value: v, label: t(`adm.f.${v}`) }))} />
      <ListState list={list} error={error} empty={shown.length === 0} />
      {shown.map((a) => (
        <Card key={a.id}>
          <Row>
            <Title>{a.name}</Title>
            <StatusBadge kind="agency" status={a.status} />
          </Row>
          <KV
            rows={[
              ["ag.f.legal", a.legal_name],
              ["ag.f.inn", a.inn],
              ["ag.f.license", a.license_no],
              ["ag.f.address", a.address],
              ["ag.f.phone", a.phone],
              ["ag.f.telegram", a.telegram],
              ["ag.f.email", a.email],
              ["ag.f.website", a.website],
              ["adm.created", fmtDate(a.created_at.slice(0, 10))],
            ]}
          />
          {a.about ? <Txt kind="muted">{a.about}</Txt> : null}
          <Txt kind="small">{t("adm.innCheck")}</Txt>
          {a.doc_paths.length === 0 ? <Txt kind="reason">{t("adm.noDocs")}</Txt> : null}
          {a.doc_paths.map((p, i) => (
            <Pressable key={p} onPress={() => openDoc(p)} style={{ flexDirection: "row", alignItems: "center", gap: 8, minHeight: 36 }}>
              <FileText color={c.muted} size={16} />
              <Text style={{ fontFamily: FONT.bold, fontSize: 14, color: c.ink, textDecorationLine: "underline" }}>{t("ag.f.docN", { n: i + 1 })}</Text>
            </Pressable>
          ))}
          {a.reject_reason ? <Txt kind="reason">{`${t("ag.reason")}: ${a.reject_reason}`}</Txt> : null}
          {r.asking?.id === a.id ? (
            <ReasonBox r={r} label={t(r.asking.status === "blocked" ? "adm.block" : "adm.reject")} done={load} />
          ) : (
            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
              {a.status !== "approved" && <Chip on Icon={BadgeCheck} label={t("adm.approve")} onPress={() => r.act(a.id, "approved", null, load)} />}
              {a.status !== "rejected" && <Chip Icon={X} label={t("adm.reject")} onPress={() => r.act(a.id, "rejected", null, load)} />}
              {a.status !== "blocked" && <Chip Icon={Ban} label={t("adm.block")} onPress={() => r.act(a.id, "blocked", null, load)} />}
            </View>
          )}
        </Card>
      ))}
    </>
  );
}

function ToursReview() {
  const { t, money, fmtDuration } = useSettings();
  const c = useColors();
  const { list, error, load } = useList(fetchToursForReview);
  const [filter, setFilter] = useState("review");
  const r = useReview(reviewTour, "published");
  const shown = (list || []).filter((x) => filter === "all" || x.status === filter);
  const link = (url, label) => (
    <Pressable onPress={() => Linking.openURL(url)}>
      <Text style={{ fontFamily: FONT.bold, fontSize: 14, color: c.accent, textDecorationLine: "underline" }} numberOfLines={1}>{label}</Text>
    </Pressable>
  );

  return (
    <>
      <Chips value={filter} onChange={setFilter} options={["review", "published", "all"].map((v) => ({ value: v, label: t(`adm.t.${v}`) }))} />
      <ListState list={list} error={error} empty={shown.length === 0} />
      {shown.map((x) => (
        <Card key={x.id}>
          <Row>
            <Title>{x.title}</Title>
            <StatusBadge kind="tour" status={x.status} />
          </Row>
          <Row style={{ justifyContent: "flex-start", flexWrap: "wrap" }}>
            <Txt kind="bold">{x.agency?.name}</Txt>
            {x.agency ? <StatusBadge kind="agency" status={x.agency.status} /> : null}
          </Row>
          {x.agency && x.agency.status !== "approved" ? <Txt kind="reason">{t("adm.agencyNotApproved")}</Txt> : null}
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
            {x.images.map((u) => (
              <Pressable key={u} onPress={() => Linking.openURL(u)}>
                <Image source={u} style={{ width: 96, height: 96, borderRadius: 14, backgroundColor: c.bg2 }} contentFit="cover" />
              </Pressable>
            ))}
          </ScrollView>
          <Txt kind="small">
            {[x.type, x.place, fmtDuration(Number(x.duration) || 0), x.price == null ? t("price.request") : money(Number(x.price)), x.langs, x.group_size].filter(Boolean).join(" · ")}
          </Txt>
          {x.description ? <Txt>{x.description}</Txt> : null}
          {x.highlights.map((h) => <Txt key={h}>{`• ${h}`}</Txt>)}
          {x.includes.length > 0 ? <Txt kind="small">{`✓ ${x.includes.join(" · ")}`}</Txt> : null}
          <Txt><Txt kind="bold">{`${t("detail.meeting")}: `}</Txt>{x.meeting}</Txt>
          {link(`https://www.openstreetmap.org/?mlat=${x.lat}&mlon=${x.lng}#map=17/${x.lat}/${x.lng}`, `${t("adm.onMap")} ↗`)}
          {x.source_url ? link(x.source_url, x.source_url) : null}
          {x.reject_reason ? <Txt kind="reason">{`${t("ag.reason")}: ${x.reject_reason}`}</Txt> : null}
          {r.asking?.id === x.id ? (
            <ReasonBox r={r} label={x.status === "published" ? t("adm.unpublish") : t("adm.reject")} done={load} />
          ) : (
            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
              {x.status !== "published" && <Chip on Icon={BadgeCheck} label={t("adm.publish")} onPress={() => r.act(x.id, "published", null, load)} />}
              {x.status !== "rejected" && <Chip Icon={X} label={x.status === "published" ? t("adm.unpublish") : t("adm.reject")} onPress={() => r.act(x.id, "rejected", null, load)} />}
            </View>
          )}
        </Card>
      ))}
    </>
  );
}
