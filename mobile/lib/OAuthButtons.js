import { useEffect, useState } from "react";
import { Platform, Text, View } from "react-native";
import * as AppleAuthentication from "expo-apple-authentication";
import Svg, { Path } from "react-native-svg";
import { useSettings } from "../../src/settings-context";
import { useAuth } from "../../src/auth-context";
import { PressScale } from "./ui";
import { FONT, H, RADIUS, useColors } from "./theme";

// «Войти через Google / Apple» + «или» — как OAuthButtons в src/AuthParts.jsx.
// Цвета кнопок — по правилам брендов (Google — белая с цветной «G», Apple — чёрная / белая в тёмной теме)
export function OAuthButtons({ onError }) {
  const { t } = useSettings();
  const { signInWithProvider, providers } = useAuth();
  const c = useColors();
  const [busy, setBusy] = useState(null);
  const [nativeApple, setNativeApple] = useState(false);
  useEffect(() => {
    if (Platform.OS === "ios") AppleAuthentication.isAvailableAsync().then(setNativeApple).catch(() => {});
  }, []);

  const go = async (provider) => {
    if (busy) return;
    setBusy(provider);
    onError?.(null);
    try {
      await signInWithProvider(provider);
    } catch (err) {
      console.warn("Вход через", provider, err);
      onError?.("login.errOAuth");
    } finally {
      setBusy(null);
    }
  };
  if (!providers.google && !providers.apple) return null; // ни один не включён в Supabase
  const appleBg = c.dark ? "#FFFFFF" : "#000000";
  const appleFg = c.dark ? "#000000" : "#FFFFFF";
  const btn = { height: H.btn, borderRadius: RADIUS.btn, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 10 };

  return (
    <View style={{ gap: 10 }}>
      {providers.google && (
      <PressScale disabled={!!busy} onPress={() => go("google")} accessibilityRole="button" style={[btn, { borderWidth: 1, borderColor: c.line, backgroundColor: c.card, opacity: busy && busy !== "google" ? 0.6 : 1 }]}>
        <Svg width={18} height={18} viewBox="0 0 48 48">
          <Path fill="#EA4335" d="M24 9.5c3.5 0 6.6 1.2 9 3.5l6.7-6.7C35.6 2.4 30.2 0 24 0 14.6 0 6.6 5.4 2.6 13.2l7.8 6.1C12.3 13.5 17.6 9.5 24 9.5z" />
          <Path fill="#4285F4" d="M46.1 24.5c0-1.6-.1-3.1-.4-4.5H24v9h12.4c-.5 2.9-2.2 5.3-4.6 6.9l7.5 5.8c4.4-4 6.8-10 6.8-17.2z" />
          <Path fill="#FBBC05" d="M10.4 28.7c-.5-1.4-.8-3-.8-4.7s.3-3.2.8-4.7l-7.8-6.1C1 16.5 0 20.1 0 24s1 7.5 2.6 10.8l7.8-6.1z" />
          <Path fill="#34A853" d="M24 48c6.5 0 11.9-2.1 15.8-5.8l-7.5-5.8c-2.1 1.4-4.8 2.3-8.3 2.3-6.4 0-11.7-4-13.6-9.6l-7.8 6.1C6.6 42.6 14.6 48 24 48z" />
        </Svg>
        <Text style={{ fontFamily: FONT.bold, fontSize: 15, color: c.ink }}>{t("login.google")}</Text>
      </PressScale>
      )}

      {!providers.apple ? null : nativeApple ? (
        <AppleAuthentication.AppleAuthenticationButton
          buttonType={AppleAuthentication.AppleAuthenticationButtonType.CONTINUE}
          buttonStyle={c.dark ? AppleAuthentication.AppleAuthenticationButtonStyle.WHITE : AppleAuthentication.AppleAuthenticationButtonStyle.BLACK}
          cornerRadius={RADIUS.btn}
          style={{ height: H.btn }}
          onPress={() => go("apple")}
        />
      ) : (
        <PressScale disabled={!!busy} onPress={() => go("apple")} accessibilityRole="button" style={[btn, { backgroundColor: appleBg, opacity: busy && busy !== "apple" ? 0.6 : 1 }]}>
          <Svg width={16} height={18} viewBox="0 0 384 512">
            <Path fill={appleFg} d="M318.7 268.7c-.2-36.7 16.4-64.4 50-84.8-18.8-26.9-47.2-41.7-84.7-44.6-35.5-2.8-74.3 20.7-88.5 20.7-15 0-49.4-19.7-76.4-19.7C63.3 141.2 4 184.8 4 273.5q0 39.3 14.4 81.2c12.8 36.7 59 126.7 107.2 125.2 25.2-.6 43-17.9 75.8-17.9 31.8 0 48.3 17.9 76.4 17.9 48.6-.7 90.4-82.5 102.6-119.3-65.2-30.7-61.7-90-61.7-91.9zm-56.6-164.2c27.3-32.4 24.8-61.9 24-72.5-24.1 1.4-52 16.4-67.9 34.9-17.5 19.8-27.8 44.3-25.6 71.9 26.1 2 49.9-11.4 69.5-34.3z" />
          </Svg>
          <Text style={{ fontFamily: FONT.bold, fontSize: 15, color: appleFg }}>{t("login.apple")}</Text>
        </PressScale>
      )}

      <View style={{ flexDirection: "row", alignItems: "center", gap: 12, marginVertical: 2 }}>
        <View style={{ flex: 1, height: 1, backgroundColor: c.line }} />
        <Text style={{ fontFamily: FONT.ui, fontSize: 12, color: c.muted }}>{t("login.or")}</Text>
        <View style={{ flex: 1, height: 1, backgroundColor: c.line }} />
      </View>
    </View>
  );
}
