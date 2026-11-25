// Только для приложения из магазина (Capacitor). В браузере ничего не делает.
// - системная «назад» на android: закрывает верхний экран (history), на главном — сворачивает приложение;
// - цвет текста в строке статуса под тему;
// - прячем нативную заставку, когда React уже нарисовал свою;
// - вход через Google / Apple: системный браузер и возврат по kg.viamia.app://auth.
import { Capacitor } from "@capacitor/core";
import { supabase } from "./supabase";

export const isNative = () => Capacitor.isNativePlatform();

// Google не пускает вход во встроенный webview (ошибка disallowed_useragent), поэтому в
// Capacitor-сборке вход открывается в системном браузере (@capacitor/browser). Обратно —
// ссылка kg.viamia.app://auth (Info.plist / AndroidManifest; адрес разрешён в Supabase →
// URL Configuration). Сайт и Expo-версия входят своими способами (AuthProvider, mobile/lib/oauth.js).
const OAUTH_RETURN = "kg.viamia.app://auth";

export async function nativeOAuth(provider) {
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider,
    options: { redirectTo: OAUTH_RETURN, skipBrowserRedirect: true },
  });
  if (error) throw error;
  const { Browser } = await import("@capacitor/browser");
  await Browser.open({ url: data.url, presentationStyle: "popover" });
}

// Вернулись из браузера: ?code=… (PKCE) или #access_token=…&refresh_token=… (implicit) → сессия.
// shortcut: ошибку не показываем — человек просто остаётся на экране входа.
async function finishOAuth(url) {
  const { Browser } = await import("@capacitor/browser");
  Browser.close().catch(() => {}); // на android окно уже закрыто
  const u = new URL(url);
  const code = u.searchParams.get("code");
  const hash = new URLSearchParams(u.hash.slice(1));
  if (code) await supabase.auth.exchangeCodeForSession(code).catch(() => {});
  else if (hash.get("access_token") && hash.get("refresh_token"))
    await supabase.auth
      .setSession({ access_token: hash.get("access_token"), refresh_token: hash.get("refresh_token") })
      .catch(() => {});
}

export async function initNative() {
  if (!isNative()) return;
  const [{ App }, { StatusBar, Style }, { SplashScreen }] = await Promise.all([
    import("@capacitor/app"),
    import("@capacitor/status-bar"),
    import("@capacitor/splash-screen"),
  ]);

  if (supabase) {
    App.addListener("appUrlOpen", ({ url }) => {
      if (url.startsWith(OAUTH_RETURN)) finishOAuth(url);
    });
  }

  App.addListener("backButton", ({ canGoBack }) => {
    if (canGoBack) window.history.back();
    else App.minimizeApp();
  });

  const syncBar = () => {
    const dark = document.documentElement.dataset.theme === "dark";
    StatusBar.setStyle({ style: dark ? Style.Dark : Style.Light }).catch(() => {});
  };
  syncBar();
  new MutationObserver(syncBar).observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });

  SplashScreen.hide().catch(() => {});
}
