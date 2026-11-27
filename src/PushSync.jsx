import { useEffect } from "react";
import { useAuth } from "./auth-context";
import { useSettings } from "./settings-context";
import { pushPermission, subscribePush, unsubscribePush } from "./push";

// Держит подписку браузера на push в порядке: есть вход, «уведомления о турах» включены и
// разрешение дано — подписка есть (и с текущим языком); выключили — отписываемся.
// Разрешение спрашивает переключатель в профиле (ProfileView), здесь — никогда.
export function PushSync() {
  const { user } = useAuth();
  const { notifs, lang } = useSettings();
  const uid = user?.id;

  useEffect(() => {
    if (!uid || pushPermission() !== "granted") return;
    const job = notifs ? subscribePush(lang) : unsubscribePush();
    job.catch(() => {
      /* нет сети или push-сервис недоступен — попробуем при следующем запуске */
    });
  }, [uid, notifs, lang]);

  return null;
}
