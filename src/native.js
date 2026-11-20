// Только для приложения из магазина (Capacitor). В браузере ничего не делает.
// - системная «назад» на android: закрывает верхний экран (history), на главном — сворачивает приложение;
// - цвет текста в строке статуса под тему;
// - прячем нативную заставку, когда React уже нарисовал свою.
import { Capacitor } from "@capacitor/core";

export const isNative = () => Capacitor.isNativePlatform();

export async function initNative() {
  if (!isNative()) return;
  const [{ App }, { StatusBar, Style }, { SplashScreen }] = await Promise.all([
    import("@capacitor/app"),
    import("@capacitor/status-bar"),
    import("@capacitor/splash-screen"),
  ]);

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
