import { KeyboardAvoidingView, Platform, Pressable, ScrollView, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useSettings } from "../../../../src/settings-context";
import { useAuth } from "../../../../src/auth-context";
import { prettyPhone } from "../../../../src/phone";
import { LANGUAGES } from "../../../../src/i18n";
import { router } from "expo-router";
import { ChevronRight, Heart, Ticket } from "lucide-react-native";
import { Image } from "expo-image";
import { Button } from "../../../lib/ui";
import { LoginForm } from "../../../lib/LoginForm";
import { useStore } from "../../../lib/store";
import { FONT, H, RADIUS, useColors } from "../../../lib/theme";

// профиль: аккаунт, поездки, избранное, язык
export default function ProfileScreen() {
  const { t, lang, setLang, loc, fmtDate, plural } = useSettings();
  const { enabled, user, signOut } = useAuth();
  const c = useColors();
  const { saved, bookings } = useStore();
  const card = { padding: 16, borderRadius: RADIUS.card, borderWidth: 1, borderColor: c.line, backgroundColor: c.card, gap: 12 };
  const muted = { fontFamily: FONT.ui, fontSize: 14, lineHeight: 20, color: c.muted };

  return (
    <SafeAreaView edges={["top"]} style={{ flex: 1, backgroundColor: c.bg }}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
        <ScrollView contentContainerStyle={{ padding: 16, gap: 16 }} keyboardShouldPersistTaps="handled">
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
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
