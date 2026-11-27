import { useEffect, useRef, useState } from "react";
import { avatarPath, clearAvatars, fetchMyBookings, fetchProfile, saveProfile } from "./api";
import { useAuth } from "./auth-context";
import { subscribeEvents } from "./booking/booking-api";
import { cleanSettings, mergeSettings, useSettings } from "./settings-context";

// Аккаунт — не косметика: избранное, маршрут, брони и настройки (язык, валюта, тема,
// уведомления, режим «сам/с гидом») уезжают в облако и возвращаются на любом устройстве.
//
// Вход: облачный профиль сливается с тем, что гость успел сделать на устройстве —
//   избранное и маршрут объединяются, брони — по коду (статус с сервера главнее),
//   настройки — что гость менял сам, перекрывает облако, остальное берётся из облака.
//   Результат сразу записывается обратно.
// Дальше: изменения уходят в профиль с задержкой 0,8 с.
// Выход: личное стирается с устройства — но только если слияние успело пройти
//   (вошли без сети и вышли — иначе стёрли бы то, чего больше нигде нет).
export function useAccountSync({ byId, saved, setSaved, routeIds, setRouteIds, setBookings, onSignedOut, defaultRoute }) {
  const { user } = useAuth();
  const { lang, currency, theme, notifs, travelMode, touched, applySynced, clearTouched } = useSettings();
  const [account, setAccount] = useState(null); // имя и контакт для подстановки в бронь
  const pulledFor = useRef(null); // чьи данные начали тянуть
  const readyFor = useRef(null); // чьи данные уже слиты — только после этого можно писать
  const [pullTry, setPullTry] = useState(0); // не загрузилось (нет сети) — пробуем снова

  // свежие значения для async-слияния (без них в замыкании остались бы старые)
  const latest = useRef(null);
  const settings = { lang, currency, theme, notifs, travelMode };
  const settingsKey = JSON.stringify(settings);
  useEffect(() => {
    latest.current = { saved, routeIds, settings: JSON.parse(settingsKey), touched };
  }, [saved, routeIds, settingsKey, touched]);

  useEffect(() => {
    const uid = user?.id ?? null;

    if (!uid) {
      const wasSynced = readyFor.current;
      pulledFor.current = null;
      readyFor.current = null;
      if (wasSynced) {
        setAccount(null);
        setSaved(new Set());
        setRouteIds(defaultRoute);
        setBookings([]);
        clearTouched(); // настройки остаются на устройстве, но уже как «не менял сам»
        onSignedOut?.();
      }
      return;
    }
    if (pulledFor.current === uid) return;
    pulledFor.current = uid;

    let cancelled = false;
    let retry = null;
    (async () => {
      try {
        const [profile, remote] = await Promise.all([fetchProfile(uid), fetchMyBookings(uid, byId)]);
        if (cancelled) return;
        const now = latest.current;
        const mergedSaved = new Set([...(profile?.saved || []), ...now.saved]);
        const mergedRoute = mergeRoute(profile?.route, now.routeIds, defaultRoute);
        const mergedSettings = mergeSettings(profile?.settings, now.settings, now.touched);

        // имя и фото по умолчанию — из Google / Apple, пока человек не задал свои
        const meta = user.user_metadata || {};
        setAccount({
          name: profile?.name || meta.full_name || meta.name || "",
          contact: profile?.contact || "",
          avatar: profile?.avatar_url || meta.avatar_url || meta.picture || "",
        });
        setSaved(mergedSaved);
        setRouteIds(mergedRoute);
        setBookings((prev) => mergeBookings(prev, remote));
        applySynced(mergedSettings);
        clearTouched();
        readyFor.current = uid; // слияние прошло — теперь можно писать в базу

        // гостевое сразу уезжает в облако, даже если на экране ничего не поменялось
        await saveProfile(uid, { saved: [...mergedSaved], route: mergedRoute, settings: mergedSettings });
      } catch (err) {
        // не смогли прочитать — ничего не пишем, чтобы не затереть аккаунт пустотой
        console.warn("Не удалось загрузить данные аккаунта", err);
        // слияние не прошло — через 5 с ещё раз, иначе избранное и маршрут не попадут в аккаунт до перезахода
        if (!cancelled && readyFor.current !== uid) {
          pulledFor.current = null;
          retry = setTimeout(() => setPullTry((n) => n + 1), Math.min(60000, 5000 * 2 ** pullTry)); // 5, 10, 20 … 60 с
        }
      }
    })();
    return () => {
      cancelled = true;
      clearTimeout(retry);
      // прервали до конца слияния — следующий запуск эффекта должен попробовать снова
      if (readyFor.current !== uid) pulledFor.current = null;
    };
    // слияние — один раз на вход; остальные зависимости — стабильные сеттеры
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id, byId, pullTry]);

  // Агентство подтвердило / назначило гида / ответило — брони обновляются сразу (Supabase Realtime)
  useEffect(() => {
    const uid = user?.id;
    if (!uid) return;
    return subscribeEvents(`sync-${uid}`, () => {
      if (readyFor.current !== uid) return;
      fetchMyBookings(uid, byId)
        .then((remote) => setBookings((prev) => mergeBookings(prev, remote)))
        .catch(() => {});
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id, byId]);

  // Изменения уходят в аккаунт с задержкой, чтобы не писать на каждый тап
  useEffect(() => {
    const uid = user?.id;
    if (!uid || readyFor.current !== uid) return;
    const id = setTimeout(() => {
      saveProfile(uid, {
        saved: [...saved],
        route: routeIds,
        settings: cleanSettings(JSON.parse(settingsKey)),
      }).catch((err) => console.warn("Не удалось сохранить данные в аккаунт", err));
    }, 800);
    return () => clearTimeout(id);
  }, [saved, routeIds, settingsKey, user]);

  // контакты из брони запоминаются в аккаунте — в следующий раз не вводить заново
  function rememberContact({ name, contact }) {
    if (!user || readyFor.current !== user.id) return;
    setAccount((a) => ({ ...(a || {}), name, contact }));
    saveProfile(user.id, { name, contact }).catch((err) => console.warn("Не удалось запомнить контакт", err));
  }

  // экран «Изменить профиль»: имя и фото. Пишет сразу (не ждёт задержку), ошибку отдаёт экрану
  async function updateAccount({ name, avatar }) {
    if (!user || readyFor.current !== user.id) throw new Error("not_ready");
    await saveProfile(user.id, { name, avatar_url: avatar || null });
    clearAvatars(user.id, avatarPath(avatar)).catch(() => {}); // прежние фото больше не нужны
    setAccount((a) => ({ ...(a || {}), name, avatar }));
  }

  return { account, rememberContact, updateAccount };
}

// маршрут не трогали — берём свой из аккаунта, иначе — свой + чего не хватает из аккаунта
function mergeRoute(serverRoute, localRoute, defaultRoute) {
  const local = localRoute || [];
  const server = serverRoute || [];
  if (server.length === 0) return local;
  const untouched = local.length === defaultRoute.length && local.every((id, i) => id === defaultRoute[i]);
  if (untouched) return server;
  return [...local, ...server.filter((id) => !local.includes(id))];
}

function mergeBookings(local, remote) {
  const byCode = new Map((local || []).map((b) => [b.code, b]));
  // с сервера приходит актуальный статус — он главнее сохранённого на устройстве
  for (const r of remote) byCode.set(r.code, { ...byCode.get(r.code), ...r });
  return [...byCode.values()].sort((a, b) => String(b.createdAt || "").localeCompare(String(a.createdAt || "")));
}
