import { Platform } from "react-native";
import * as WebBrowser from "expo-web-browser";
import * as Linking from "expo-linking";
import * as AppleAuthentication from "expo-apple-authentication";
import * as Crypto from "expo-crypto";
import { supabase } from "./supabase";

WebBrowser.maybeCompleteAuthSession();

// Вход через Google / Apple в приложении (signInWithProvider в src/AuthProvider.jsx).
// Айфон + Apple — нативное окно Apple (требование App Store). Остальное — защищённое окно браузера:
// Supabase → провайдер → обратно в приложение по viamia://auth с кодом (PKCE) → сессия.
export async function signInWithProvider(provider) {
  if (!supabase) throw new Error("offline");

  if (provider === "apple" && Platform.OS === "ios" && (await AppleAuthentication.isAvailableAsync())) {
    // nonce: Apple получает хэш, Supabase — исходную строку и сверяет их
    const raw = Crypto.randomUUID();
    const hashed = await Crypto.digestStringAsync(Crypto.CryptoDigestAlgorithm.SHA256, raw);
    let cred;
    try {
      cred = await AppleAuthentication.signInAsync({
        requestedScopes: [AppleAuthentication.AppleAuthenticationScope.FULL_NAME, AppleAuthentication.AppleAuthenticationScope.EMAIL],
        nonce: hashed,
      });
    } catch (err) {
      if (err?.code === "ERR_REQUEST_CANCELED") return; // передумал — не ошибка
      throw err;
    }
    const { error } = await supabase.auth.signInWithIdToken({ provider: "apple", token: cred.identityToken, nonce: raw });
    if (error) throw error;
    return;
  }

  const redirectTo = Linking.createURL("auth");
  const { data, error } = await supabase.auth.signInWithOAuth({ provider, options: { redirectTo, skipBrowserRedirect: true } });
  if (error) throw error;
  const res = await WebBrowser.openAuthSessionAsync(data.url, redirectTo);
  if (res.type !== "success") return; // закрыл окно
  const { queryParams } = Linking.parse(res.url);
  if (queryParams?.error) throw new Error(String(queryParams.error_description || queryParams.error));
  if (!queryParams?.code) throw new Error("no code");
  const { error: exchange } = await supabase.auth.exchangeCodeForSession(String(queryParams.code));
  if (exchange) throw exchange;
}
