import { useState } from "react";
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, Text, TextInput, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useSettings } from "../../../../src/settings-context";
import { authErrorKey, useAuth } from "../../../../src/auth-context";
import { readLoginId, showLoginId, prettyPhone } from "../../../../src/phone";
import { LANGUAGES } from "../../../../src/i18n";
import { router } from "expo-router";
import { ChevronRight, Heart } from "lucide-react-native";
import { Button } from "../../../lib/ui";
import { useStore } from "../../../lib/store";
import { FONT, H, RADIUS, useColors } from "../../../lib/theme";

// профиль: вход по коду (как src/Login.jsx) и язык; остальное — следующим шагом
export default function ProfileScreen() {
  const { t, lang, setLang } = useSettings();
  const { enabled, user, sendCode, verifyCode, signOut } = useAuth();
  const c = useColors();
  const { saved } = useStore();
  const [raw, setRaw] = useState("");
  const [id, setId] = useState(null); // куда отправили код
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  const run = async (fn, fallback) => {
    setBusy(true);
    setErr("");
    try {
      await fn();
    } catch (e) {
      setErr(t(authErrorKey(e, fallback)));
    } finally {
      setBusy(false);
    }
  };
  const send = () => {
    const r = readLoginId(raw);
    if (r.error) return setErr(t(r.error));
    run(async () => {
      await sendCode(r.id);
      setId(r.id);
      setCode("");
    });
  };
  const verify = () => run(() => verifyCode(id, code.trim()), "login.errCode");

  const input = { height: H.btn, borderRadius: RADIUS.btn, borderWidth: 1, borderColor: c.line, backgroundColor: c.card, paddingHorizontal: 14, fontFamily: FONT.ui, fontSize: 16, color: c.ink };
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
            <View style={card}>
              <Text style={{ fontFamily: FONT.heavy, fontSize: 18, color: c.ink }}>{t(id ? "login.codeTitle" : "login.heroTitle")}</Text>
              <Text style={muted}>
                {id ? t(id.phone ? "login.codeTextPhone" : "login.codeTextEmail", { target: showLoginId(id) }) : t("login.heroText")}
              </Text>
              {id ? (
                <TextInput
                  value={code}
                  onChangeText={setCode}
                  keyboardType="number-pad"
                  textContentType="oneTimeCode"
                  autoComplete="one-time-code"
                  maxLength={6}
                  style={[input, { letterSpacing: 6, textAlign: "center", fontFamily: FONT.heavy }]}
                />
              ) : (
                <TextInput
                  value={raw}
                  onChangeText={setRaw}
                  placeholder={t("login.idPlaceholder")}
                  placeholderTextColor={c.muted}
                  autoCapitalize="none"
                  autoCorrect={false}
                  keyboardType="email-address"
                  style={input}
                />
              )}
              {err ? <Text style={{ fontFamily: FONT.bold, color: c.accent }}>{err}</Text> : null}
              {id ? (
                <>
                  <Button title={t(busy ? "login.checking" : "login.signIn")} onPress={verify} disabled={busy || code.trim().length < 6} />
                  <Pressable onPress={() => (setId(null), setErr(""))}>
                    <Text style={{ fontFamily: FONT.bold, color: c.ink, textAlign: "center" }}>{t("login.changeId")}</Text>
                  </Pressable>
                </>
              ) : (
                <Button title={t(busy ? "login.sending" : "login.send")} onPress={send} disabled={busy} />
              )}
              <Text style={[muted, { fontSize: 13 }]}>{t("login.note")}</Text>
            </View>
          ) : null}

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
