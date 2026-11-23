import { useState } from "react";
import { Pressable, Text, TextInput, View } from "react-native";
import { useSettings } from "../../src/settings-context";
import { authErrorKey, useAuth } from "../../src/auth-context";
import { readLoginId, showLoginId } from "../../src/phone";
import { Button } from "./ui";
import { OAuthButtons } from "./OAuthButtons";
import { FONT, H, RADIUS, useColors } from "./theme";

// вход или регистрация по коду (как src/Login.jsx); note — пояснение над формой (например, в брони)
export function LoginForm({ note }) {
  const { t } = useSettings();
  const { sendCode, verifyCode } = useAuth();
  const c = useColors();
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
    <View style={card}>
      <Text style={{ fontFamily: FONT.heavy, fontSize: 18, color: c.ink }}>{t(id ? "login.codeTitle" : "login.heroTitle")}</Text>
      <Text style={muted}>
        {id ? t(id.phone ? "login.codeTextPhone" : "login.codeTextEmail", { target: showLoginId(id) }) : t("login.heroText")}
      </Text>
      {!id && <OAuthButtons onError={(key) => setErr(key ? t(key) : "")} />}
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
      <Text style={[muted, { fontSize: 13 }]}>{note || t("login.note")}</Text>
    </View>
  );
}
