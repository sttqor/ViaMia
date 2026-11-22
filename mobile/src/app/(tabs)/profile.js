import { useEffect, useRef, useState } from "react";
import { Linking, Pressable, ScrollView, Switch, Text, View } from "react-native";
import { Image } from "expo-image";
import { router, useScrollToTop } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import Animated, { FadeInDown } from "react-native-reanimated";
import { Bell, Building2, ChevronRight, DollarSign, Globe, Heart, HelpCircle, LogOut, Moon, ShieldCheck, Ticket, Trash2, User } from "lucide-react-native";
import { useSettings } from "../../../../src/settings-context";
import { useAuth } from "../../../../src/auth-context";
import { useContent } from "../../../../src/content-context";
import { deleteMyAccount, fetchAccountRoles } from "../../../../src/api";
import { LANGUAGES, currencySymbol } from "../../../../src/i18n";
import { priceText } from "../../../../src/components/shared";
import { prettyPhone } from "../../../../src/phone";
import { useStore } from "../../../lib/store";
import { BellButton, Button, Segmented } from "../../../lib/ui";
import { TABBAR_SPACE } from "../../../lib/TabBar";
import { FONT, RADIUS, useColors } from "../../../lib/theme";

const DANGER = "#C8102E";

// строка-кнопка: значок, подпись (и подпись мельче), справа значение и стрелка
function Row({ Icon, title, sub, value, onPress, danger, right }) {
  const c = useColors();
  const color = danger ? DANGER : c.accent;
  return (
    <Pressable onPress={onPress} disabled={!onPress} style={({ pressed }) => ({ flexDirection: "row", alignItems: "center", gap: 10, minHeight: 44, opacity: pressed ? 0.7 : 1 })}>
      <Icon color={color} size={16} />
      <View style={{ flex: 1 }}>
        <Text style={{ fontFamily: sub ? FONT.bold : FONT.heavy, fontSize: 15, color: danger ? DANGER : c.ink }}>{title}</Text>
        {sub ? <Text style={{ fontFamily: FONT.ui, fontSize: 12, lineHeight: 17, color: c.muted }}>{sub}</Text> : null}
      </View>
      {value ? <Text style={{ fontFamily: FONT.ui, fontSize: 14, color: c.muted }}>{value}</Text> : null}
      {right || (onPress && <ChevronRight color={c.muted} size={16} />)}
    </Pressable>
  );
}

// профиль — как src/views/ProfileView.jsx
export default function ProfileScreen() {
  const s = useSettings();
  const { t, lang, loc, money, fmtDate, plural, theme, setTheme, currency, fmtRate, ratesDate, notifs, setNotifs } = s;
  const { enabled, user, signOut } = useAuth();
  const { allTours } = useContent();
  const { saved, bookings } = useStore();
  const c = useColors();
  const scroll = useRef(null);
  useScrollToTop(scroll);
  const [roles, setRoles] = useState({ agency: null, admin: false, for: null });
  const [del, setDel] = useState({ ask: false, busy: false, err: null });
  const [helpOpen, setHelpOpen] = useState(false);

  useEffect(() => {
    if (!user) return;
    let off = false;
    fetchAccountRoles(user.id)
      .then((r) => !off && setRoles({ ...r, for: user.id }))
      .catch(() => {});
    return () => {
      off = true;
    };
  }, [user]);
  const my = user && roles.for === user.id ? roles : { agency: null, admin: false };
  const savedRaw = allTours.filter((e) => saved.has(e.id));
  const currentLang = LANGUAGES.find((l) => l.code === lang);

  const deleteAccount = () => {
    if (!del.ask) return setDel({ ask: true, busy: false, err: null });
    setDel({ ask: true, busy: true, err: null });
    deleteMyAccount()
      .then(() => (setDel({ ask: false, busy: false, err: null }), signOut()))
      .catch((e) => {
        const code = String(e?.message || "");
        setDel({ ask: false, busy: false, err: /agency_owner/.test(code) ? "agency" : /admin/.test(code) ? "admin" : "other" });
      });
  };

  const card = { padding: 16, borderRadius: RADIUS.card, borderWidth: 1, borderColor: c.line, backgroundColor: c.card, gap: 12 };
  const muted = { fontFamily: FONT.ui, fontSize: 12, lineHeight: 17, color: c.muted };
  const label = { fontFamily: FONT.heavy, fontSize: 15, color: c.ink };
  const divider = <View style={{ height: 1, backgroundColor: c.line }} />;
  const blocks = [];
  const block = (key, el) => blocks.push(<Animated.View key={key} entering={FadeInDown.delay(blocks.length * 50).springify()}>{el}</Animated.View>);

  block(
    "account",
    <View style={card}>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
        <View style={{ width: 48, height: 48, borderRadius: 24, alignItems: "center", justifyContent: "center", backgroundColor: c.dark ? "#3b2520" : "#fbeee8" }}>
          <User color={c.accent} size={22} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={label}>{user ? t("login.account") : t("profile.guest")}</Text>
          <Text style={muted} numberOfLines={1}>{user ? user.email || prettyPhone(user.phone) : t("profile.guestNote")}</Text>
        </View>
        {!user && (
          <Pressable
            disabled={!enabled}
            onPress={() => router.push("/login")}
            style={{ height: 36, paddingHorizontal: 16, borderRadius: 999, justifyContent: "center", borderWidth: 1, borderColor: c.line, backgroundColor: c.card, opacity: enabled ? 1 : 0.5 }}
          >
            <Text style={{ fontFamily: FONT.heavy, fontSize: 13, color: c.ink }}>{t(enabled ? "login.cta" : "profile.soon")}</Text>
          </Pressable>
        )}
      </View>
      {user && (
        <>
          {divider}
          <Row Icon={LogOut} title={t("login.out")} onPress={signOut} />
        </>
      )}
    </View>
  );

  block(
    "trips",
    <View style={card}>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
        <Ticket color={c.accent} size={16} />
        <Text style={label}>{t("profile.tickets", { n: bookings.length })}</Text>
      </View>
      {bookings.length === 0 ? (
        <>
          <Text style={[muted, { fontSize: 14, lineHeight: 20 }]}>{t("profile.noTickets")}</Text>
          <View style={{ alignSelf: "flex-start" }}>
            <Button title={t("profile.seeTours")} onPress={() => router.navigate("/tours")} />
          </View>
        </>
      ) : (
        bookings.map((b) => {
          const e = loc(b.exp);
          const st = b.status || "pending";
          return (
            <Pressable key={b.code} onPress={() => router.push(`/ticket/${b.code}`)} style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
              <Image source={e.image} style={{ width: 52, height: 52, borderRadius: 12, backgroundColor: c.bg2 }} contentFit="cover" />
              <View style={{ flex: 1 }}>
                <Text style={{ fontFamily: FONT.heavy, fontSize: 15, color: c.ink }} numberOfLines={1}>{e.title}</Text>
                <Text style={muted}>{`${fmtDate(b.date)} · ${plural("pl.guests", b.guests)} · ${b.code}`}</Text>
                <Text style={{ fontFamily: FONT.bold, fontSize: 12, color: st === "confirmed" || st === "done" ? c.success : c.muted }}>{t(`trip.status.${st}`)}</Text>
              </View>
              <ChevronRight color={c.muted} size={16} />
            </Pressable>
          );
        })
      )}
    </View>
  );

  block(
    "partners",
    <View style={[card, { gap: 4 }]}>
      <Row Icon={Building2} title={my.agency ? my.agency.name : t("profile.agencyTitle")} sub={my.agency ? t(`profile.agency.${my.agency.status}`) : t("profile.agencyText")} onPress={() => router.push("/agency")} />
      {divider}
      <Row Icon={ShieldCheck} title={t(my.admin ? "profile.adminTitle" : "profile.adminAsk")} sub={t(my.admin ? "profile.adminText" : "profile.adminAskText")} onPress={() => router.push("/admin")} />
    </View>
  );

  block(
    "saved",
    <View style={card}>
      <Pressable onPress={() => router.push("/saved")} style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
        <Heart color={c.accent} size={16} />
        <Text style={[label, { flex: 1 }]}>{t("profile.saved", { n: savedRaw.length })}</Text>
        <Text style={{ fontFamily: FONT.heavy, fontSize: 14, color: c.accent }}>{t("saved.all")}</Text>
        <ChevronRight color={c.accent} size={18} />
      </Pressable>
      {savedRaw.length === 0 ? (
        <Text style={[muted, { fontSize: 14, lineHeight: 20 }]}>{t("profile.noSaved")}</Text>
      ) : (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 10 }}>
          {savedRaw.map((raw) => {
            const e = loc(raw);
            return (
              <Pressable key={e.id} onPress={() => router.push(`/tour/${encodeURIComponent(e.id)}`)} style={{ width: 150, borderRadius: 14, overflow: "hidden", borderWidth: 1, borderColor: c.line }}>
                <Image source={e.image} style={{ height: 90, backgroundColor: c.bg2 }} contentFit="cover" />
                <View style={{ padding: 8, gap: 2 }}>
                  <Text numberOfLines={2} style={{ fontFamily: FONT.bold, fontSize: 13, color: c.ink }}>{e.title}</Text>
                  <Text style={muted}>{priceText(e, t, money)}</Text>
                </View>
              </Pressable>
            );
          })}
        </ScrollView>
      )}
    </View>
  );

  block("lang", <View style={card}><Row Icon={Globe} title={t("profile.language")} value={currentLang?.native} onPress={() => router.push("/pick?kind=lang")} /></View>);

  block(
    "currency",
    <View style={card}>
      <Row Icon={DollarSign} title={t("profile.currency")} value={`${currencySymbol(currency, lang)} ${currency}`} onPress={() => router.push("/pick?kind=currency")} />
      {currency !== "USD" && <Text style={muted}>{ratesDate ? t("profile.ratesLive", { rate: fmtRate(currency), date: fmtDate(ratesDate) }) : t("profile.ratesNote")}</Text>}
    </View>
  );

  block(
    "theme",
    <View style={card}>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
        <Moon color={c.accent} size={16} />
        <Text style={label}>{t("profile.theme")}</Text>
      </View>
      <Segmented label={t("profile.theme")} value={theme} onChange={setTheme} options={["light", "dark", "system"].map((v) => ({ value: v, label: t(`theme.${v}`) }))} />
      {theme === "system" && <Text style={muted}>{t("theme.systemNote")}</Text>}
    </View>
  );

  block(
    "notifs",
    <View style={card}>
      <Row Icon={Bell} title={t("profile.notifs")} right={<Switch value={notifs} onValueChange={setNotifs} trackColor={{ true: c.accent, false: c.line }} thumbColor="#FFFFFF" />} />
    </View>
  );

  block(
    "help",
    <View style={[card, { gap: 4 }]}>
      <Row Icon={HelpCircle} title={t("profile.help")} sub={helpOpen ? t("profile.helpSoon") : null} onPress={() => setHelpOpen((o) => !o)} />
      {divider}
      <Row Icon={ShieldCheck} title={t("profile.privacy")} onPress={() => Linking.openURL("https://osh-explorer2.vercel.app/privacy")} />
    </View>
  );

  if (user)
    block(
      "delete",
      <View style={card}>
        <Row
          Icon={Trash2}
          danger
          title={t(del.ask ? "profile.deleteConfirm" : "profile.delete")}
          sub={del.err ? t(`profile.deleteErr.${del.err}`) : t(del.ask ? "profile.deleteWarn" : "profile.deleteText")}
          onPress={del.busy ? null : deleteAccount}
        />
      </View>
    );

  return (
    <SafeAreaView edges={["top"]} style={{ flex: 1, backgroundColor: c.bg }}>
      <ScrollView ref={scroll} contentContainerStyle={{ padding: 16, gap: 14, paddingBottom: TABBAR_SPACE + 16 }}>
        <View style={{ flexDirection: "row", alignItems: "center", minHeight: 44 }}>
          <Text style={{ flex: 1, fontFamily: FONT.display, fontSize: 30, color: c.ink }}>{t("profile.title")}</Text>
          <BellButton />
        </View>
        {blocks}
      </ScrollView>
    </SafeAreaView>
  );
}
