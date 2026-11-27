// Web Push в браузере (веб-версия и сайт на экране «Домой»). В Capacitor-сборке не работает —
// там будет нативный push. Сервис-воркер — public/push-sw.js, отправка — supabase/functions/push-send,
// база — playbooks/booking-notifications/toolbox/04-push.sql.
import { supabase } from "./supabase";
import { isNative } from "./native";

const VAPID = import.meta.env.VITE_VAPID_PUBLIC_KEY;
const SW_WAIT_MS = 4000; // в dev сервис-воркера нет — не ждём вечно

export function pushSupported() {
  return (
    !!VAPID &&
    !!supabase &&
    typeof window !== "undefined" &&
    "serviceWorker" in navigator &&
    "PushManager" in window &&
    "Notification" in window &&
    !isNative()
  );
}

// "granted" | "denied" | "default" | "unsupported"
export function pushPermission() {
  return pushSupported() ? Notification.permission : "unsupported";
}

// iPhone/iPad в обычном Safari: push есть только у сайта, добавленного на экран «Домой»
export function needsHomeScreen() {
  if (typeof navigator === "undefined") return false;
  const ios = /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
  const standalone = window.matchMedia?.("(display-mode: standalone)").matches || navigator.standalone === true;
  return ios && !standalone;
}

function b64ToBytes(b64) {
  const s = atob((b64 + "=".repeat((4 - (b64.length % 4)) % 4)).replace(/-/g, "+").replace(/_/g, "/"));
  return Uint8Array.from(s, (c) => c.charCodeAt(0));
}

async function registration() {
  const timeout = new Promise((resolve) => setTimeout(() => resolve(null), SW_WAIT_MS));
  return Promise.race([navigator.serviceWorker.ready, timeout]);
}

async function currentSub() {
  const reg = await registration();
  return reg ? reg.pushManager.getSubscription() : null;
}

// Попросить разрешение (только по нажатию). Возвращает новое состояние разрешения.
export async function askPushPermission() {
  if (!pushSupported()) return "unsupported";
  try {
    return await Notification.requestPermission();
  } catch {
    return Notification.permission;
  }
}

// Подписать этот браузер на push текущего аккаунта (повторный вызов только обновит язык)
export async function subscribePush(lang) {
  if (pushPermission() !== "granted") return false;
  const reg = await registration();
  if (!reg) return false;
  const sub =
    (await reg.pushManager.getSubscription()) ||
    (await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: b64ToBytes(VAPID) }));
  const { endpoint, keys } = sub.toJSON();
  const { error } = await supabase.rpc("save_push", {
    p_endpoint: endpoint,
    p_p256dh: keys.p256dh,
    p_auth: keys.auth,
    p_lang: lang,
  });
  if (error) throw error;
  return true;
}

// Отписать этот браузер: убрать из базы (пока есть вход) и у самого браузера
export async function unsubscribePush() {
  if (!pushSupported()) return;
  const sub = await currentSub().catch(() => null);
  if (!sub) return;
  try {
    await supabase.rpc("drop_push", { p_endpoint: sub.endpoint });
  } catch {
    /* нет сети — после отписки push-сервис ответит 410 и функция уберёт строку сама */
  }
  await sub.unsubscribe().catch(() => {});
}

// Нажатие на уведомление, когда приложение уже открыто: воркер присылает адрес
export function onPushOpen(cb) {
  if (typeof navigator === "undefined" || !("serviceWorker" in navigator)) return () => {};
  const handler = (e) => {
    if (e.data?.type === "push-open" && typeof e.data.url === "string") cb(new URL(e.data.url));
  };
  navigator.serviceWorker.addEventListener("message", handler);
  return () => navigator.serviceWorker.removeEventListener("message", handler);
}
