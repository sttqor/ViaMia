// Push в сервис-воркере. Подключается к воркеру vite-plugin-pwa через workbox.importScripts
// (vite.config.js). Сообщение шлёт supabase/functions/push-send: { title, body, url, tag }.

self.addEventListener("push", (event) => {
  let data;
  try {
    data = event.data ? event.data.json() : {};
  } catch {
    data = { body: event.data ? event.data.text() : "" };
  }
  event.waitUntil(
    self.registration.showNotification(data.title || "ViaMia", {
      body: data.body || "",
      icon: "/icon-192.png",
      badge: "/icon-192.png",
      tag: data.tag,
      renotify: !!data.tag,
      data: { url: data.url || "/" },
    })
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = new URL(event.notification.data?.url || "/", self.location.origin).href;
  event.waitUntil(
    (async () => {
      const wins = await self.clients.matchAll({ type: "window", includeUncontrolled: true });
      const win = wins.find((w) => new URL(w.url).origin === self.location.origin);
      if (win) {
        // приложение уже открыто — открыть нужный экран без перезагрузки (src/push.js)
        win.postMessage({ type: "push-open", url });
        return win.focus();
      }
      return self.clients.openWindow(url);
    })()
  );
});
