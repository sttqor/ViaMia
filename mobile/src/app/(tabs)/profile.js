import { KeyboardAvoidingView, Linking, Platform, Pressable, ScrollView, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useSettings } from "../../../../src/settings-context";
import { useAuth } from "../../../../src/auth-context";
import { prettyPhone } from "../../../../src/phone";
import { router } from "expo-router";
import { Building2, ChevronRight, Heart, Shield, ShieldCheck, Ticket, Trash2 } from "lucide-react-native";
import { useEffect, useRef, useState } from "react";
import { useScrollToTop } from "expo-router";
import { deleteMyAccount, fetchAccountRoles } from "../../../../src/api";
import { CURRENCIES, LANGUAGES } from "../../../../src/i18n";
import { TABBAR_SPACE } from "../../../lib/TabBar";
import { Image } from "expo-image";
import { Button } from "../../../lib/ui";
import { LoginForm } from "../../../lib/LoginForm";
import { useStore } from "../../../lib/store";
import { FONT, H, RADIUS, useColors } from "../../../lib/theme";

// профиль: аккаунт, поездки, избранное, язык
export default function ProfileScreen() {
  const { t, lang, setLang, loc, fmtDate, plural, theme, setTheme, currency, setCurrency } = useSettings();
  const scroll = useRef(null);
  useScrollToTop(scroll);
  // своё агентство и права админа — как в src/views/ProfileView.jsx
  const [roles, setRoles] = useState({ agency: null, admin: false, for: null });
  const [del, setDel] = useState({ ask: false, busy: false, err: null });
  const { enabled, user, signOut } = useAuth();
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
  const c = useColors();
  const { saved, bookings } = useStore();
  const card = { padding: 16, borderRadius: RADIUS.card, borderWidth: 1, borderColor: c.line, backgroundColor: c.card, gap: 12 };
  const muted = { fontFamily: FONT.ui, fontSize: 14, lineHeight: 20, color: c.muted };

  return (
    <SafeAreaView edges={["top"]} style={{ flex: 1, backgroundColor: c.bg }}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
        <ScrollView ref={scroll} contentContainerStyle={{ padding: 16, gap: 16, paddingBottom: TABBAR_SPACE + 16 }} keyboardShouldPersistTaps="handled">
          <Text style={{ fontFamily: FONT.display, fontSize: 30, color: c.ink }}>{t("profile.title")}</Text>

          {user ? (
            <View style={card}>
              <Text style={muted}>{t("login.account")}</Text>
              <Text style={{ fontFamily: FONT.heavy, fontSize: 17, color: c.ink }}>{user.email || prettyPhone(user.phone)}</Text>
              <Button secondary title={t("login.out")} onPress={signOut} />
            </View>
          ) : enabled ? (
            <LoginForm />
          ) : null}

          <View style={card}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
              <Ticket color={c.accent} size={18} />
              <Text style={{ fontFamily: FONT.heavy, fontSize: 16, color: c.ink }}>{t("profile.tickets", { n: bookings.length })}</Text>
            </View>
            {bookings.length === 0 ? (
              <>
                <Text style={muted}>{t("profile.noTickets")}</Text>
                <Button title={t("profile.seeTours")} onPress={() => router.navigate("/tours")} />
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
                      <Text style={{ fontFamily: FONT.ui, fontSize: 12, color: c.muted }}>{`${fmtDate(b.date)} · ${plural("pl.guests", b.guests)} · ${b.code}`}</Text>
                      <Text style={{ fontFamily: FONT.bold, fontSize: 12, color: st === "confirmed" || st === "done" ? c.success : c.muted }}>{t(`trip.status.${st}`)}</Text>
                    </View>
                    <ChevronRight color={c.muted} size={18} />
                  </Pressable>
                );
              })
            )}
          </View>

          <Pressable onPress={() => router.push("/saved")} style={[card, { flexDirection: "row", alignItems: "center" }]}>
            <Heart color={c.accent} size={20} />
            <Text style={{ fontFamily: FONT.heavy, fontSize: 16, color: c.ink, flex: 1 }}>{t("profile.saved", { n: saved.size })}</Text>
            <ChevronRight color={c.muted} size={20} />
          </Pressable>

          <View style={card}>
            <Text style={{ fontFamily: FONT.heavy, fontSize: 16, color: c.ink }}>{t("profile.language")}</Text>
            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
              {LANGUAGES.map((l) => {
                const on = l.code === lang;
                return (
                  <Pressable
                    key={l.code}
                    onPress={() => setLang(l.code)}
                    accessibilityState={{ selected: on }}
                    style={{ height: H.chip, paddingHorizontal: 14, borderRadius: RADIUS.chip, justifyContent: "center", backgroundColor: on ? c.solid : c.card, borderWidth: 1, borderColor: on ? c.solid : c.line }}
                  >
                    <Text style={{ fontFamily: FONT.bold, color: on ? c.onSolid : c.ink }}>{l.native}</Text>
                  </Pressable>
                );
              })}
            </View>
          </View>

          <View style={card}>
            <Text style={{ fontFamily: FONT.heavy, fontSize: 16, color: c.ink }}>{t("profile.theme")}</Text>
            <View style={{ flexDirection: "row", gap: 4, padding: 4, borderRadius: RADIUS.chip, backgroundColor: c.bg2 }}>
              {["light", "dark", "system"].map((v) => {
                const on = theme === v;
                return (
                  <Pressable key={v} onPress={() => setTheme(v)} accessibilityState={{ selected: on }} style={{ flex: 1, height: 36, borderRadius: RADIUS.chip, alignItems: "center", justifyContent: "center", backgroundColor: on ? c.solid : "transparent" }}>
                    <Text style={{ fontFamily: FONT.bold, color: on ? c.onSolid : c.ink }}>{t(`theme.${v}`)}</Text>
                  </Pressable>
                );
              })}
            </View>
            {theme === "system" && <Text style={[muted, { fontSize: 12 }]}>{t("theme.systemNote")}</Text>}
          </View>

          <View style={card}>
            <Text style={{ fontFamily: FONT.heavy, fontSize: 16, color: c.ink }}>{t("profile.currency")}</Text>
            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
              {CURRENCIES.map((cur) => {
                const on = cur.code === currency;
                return (
                  <Pressable key={cur.code} onPress={() => setCurrency(cur.code)} accessibilityState={{ selected: on }} style={{ height: H.chip, paddingHorizontal: 14, borderRadius: RADIUS.chip, justifyContent: "center", backgroundColor: on ? c.solid : c.card, borderWidth: 1, borderColor: on ? c.solid : c.line }}>
                    <Text style={{ fontFamily: FONT.bold, color: on ? c.onSolid : c.ink }}>{cur.code}</Text>
                  </Pressable>
                );
              })}
            </View>
          </View>

          {/* для партнёров: кабинет агентства и модерация (пускает только база) */}
          <View style={card}>
            <Pressable onPress={() => router.push("/agency")} style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
              <Building2 color={c.accent} size={18} />
              <View style={{ flex: 1 }}>
                <Text style={{ fontFamily: FONT.bold, fontSize: 15, color: c.ink }}>{my.agency ? my.agency.name : t("profile.agencyTitle")}</Text>
                <Text style={[muted, { fontSize: 12 }]}>{my.agency ? t(`profile.agency.${my.agency.status}`) : t("profile.agencyText")}</Text>
              </View>
              <ChevronRight color={c.muted} size={18} />
            </Pressable>
            <View style={{ height: 1, backgroundColor: c.line }} />
            <Pressable onPress={() => router.push("/admin")} style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
              <ShieldCheck color={c.accent} size={18} />
              <View style={{ flex: 1 }}>
                <Text style={{ fontFamily: FONT.bold, fontSize: 15, color: c.ink }}>{t(my.admin ? "profile.adminTitle" : "profile.adminAsk")}</Text>
                <Text style={[muted, { fontSize: 12 }]}>{t(my.admin ? "profile.adminText" : "profile.adminAskText")}</Text>
              </View>
              <ChevronRight color={c.muted} size={18} />
            </Pressable>
          </View>

          <Pressable onPress={() => Linking.openURL("https://osh-explorer2.vercel.app/privacy")} style={[card, { flexDirection: "row", alignItems: "center" }]}>
            <Shield color={c.muted} size={18} />
            <Text style={{ flex: 1, fontFamily: FONT.bold, fontSize: 15, color: c.ink }}>{t("profile.privacy")}</Text>
            <ChevronRight color={c.muted} size={18} />
          </Pressable>

          {user && (
            <Pressable disabled={del.busy} onPress={deleteAccount} style={[card, { flexDirection: "row", alignItems: "center" }]}>
              <Trash2 color="#C8102E" size={18} />
              <View style={{ flex: 1 }}>
                <Text style={{ fontFamily: FONT.bold, fontSize: 15, color: "#C8102E" }}>{t(del.ask ? "profile.deleteConfirm" : "profile.delete")}</Text>
                <Text style={[muted, { fontSize: 12 }]}>{del.err ? t(`profile.deleteErr.${del.err}`) : t(del.ask ? "profile.deleteWarn" : "profile.deleteText")}</Text>
              </View>
            </Pressable>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
