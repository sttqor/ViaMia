// Пошаговое ведение по маршруту поверх ExploreMap (как в Google Maps / 2ГИС):
// плашка следующего манёвра, камера за человеком по ходу движения, голос,
// перестроение при сходе с пути, «вы прибыли» на каждой остановке, экран не гаснет.
// demo — стрелка сама едет по маршруту (если человек не в Оше).
import { useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { Check, Crosshair, Flag, Volume2, VolumeX } from "lucide-react";
import { bearing, buildSteps, measure, meters, pointAt, project, remainingLine } from "./navigation";
import { fetchRoute } from "./routing";
import { useSettings } from "./settings-context";
import "./Navigator.css";

const SPRING = { type: "spring", bounce: 0, duration: 0.32 };
const MUTE_KEY = "osh-nav-muted";
// пороги голосовых подсказок до манёвра, метров (последний — «сейчас»)
const VOICE_AT = { foot: [120, 15], car: [500, 150, 30] };
// сколько метров от линии — уже сошёл с маршрута
const OFF_ROUTE_M = { foot: 35, car: 60 };
// скорость демо-режима, м/с (быстрее реальной, чтобы не ждать)
const DEMO_SPEED = { foot: 6, car: 20 };

const fc = (features) => ({ type: "FeatureCollection", features });
const line = (coords) =>
  coords.length > 1 ? fc([{ type: "Feature", geometry: { type: "LineString", coordinates: coords }, properties: { approx: false } }]) : fc([]);

function readMuted() {
  try {
    return localStorage.getItem(MUTE_KEY) === "1";
  } catch {
    return false;
  }
}

export function Navigator({ mapRef, route, demo, onReroute, onExit }) {
  const { t, plural, locale, lang, fmtDuration } = useSettings();
  const mode = route.mode;

  // линия, её длина и манёвры — пересчитываются только когда пришёл новый маршрут
  const geo = useMemo(() => {
    const coords = route.data.coords;
    const { cum, total } = measure(coords);
    return { coords, cum, total, steps: buildSteps(route.data, coords, cum) };
  }, [route.data]);

  const [view, setView] = useState({ hasFix: false, along: 0, next: null, after: null, distTo: 0 });
  const [following, setFollowing] = useState(true);
  const [muted, setMuted] = useState(readMuted);
  const [notice, setNotice] = useState(null); // строка поверх: «вы прибыли…», «перестраиваем…»
  const [finished, setFinished] = useState(false);

  // изменяемое между фиксами GPS — в ref, чтобы не перерисовывать лишнего
  const S = useRef({ lastIdx: 0, along: 0, off: 0, lastReroute: 0, stop: 0, spoken: new Set(), lastPos: null, heading: 0, simS: 0 });
  const live = useRef({});
  useEffect(() => {
    live.current = { geo, route, following, muted, finished, t, plural, locale, lang, demo, onReroute, mode };
  });

  // новый маршрут (перестроили) — прогресс заново
  useEffect(() => {
    Object.assign(S.current, { lastIdx: 0, along: 0, off: 0, stop: 0, spoken: new Set(), simS: 0 });
  }, [geo]);

  // ── голос ──
  function speak(text) {
    if (live.current.muted || !text) return;
    try {
      const synth = window.speechSynthesis;
      synth.cancel();
      const u = new SpeechSynthesisUtterance(text);
      u.lang = live.current.locale;
      const v = synth.getVoices().find((x) => x.lang?.toLowerCase().startsWith(live.current.lang));
      if (v) u.voice = v;
      synth.speak(u);
    } catch {
      /* озвучки нет — ничего страшного */
    }
  }

  // tt — функция перевода (в рендере — t из контекста, в обработчике фикса — свежая из live)
  const instruction = (step, tt) => {
    if (!step) return "";
    const base = tt(step.key, step.vars);
    return step.road && !step.arrive ? `${base} ${tt("nav.onto", { road: step.road })}` : base;
  };

  // расстояние: на экране «120 м», голосом «120 метров»
  const showDist = (m) =>
    m >= 1000
      ? t("unit.km", { n: new Intl.NumberFormat(locale, { maximumFractionDigits: 1 }).format(m / 1000) })
      : t("unit.m", { n: m >= 100 ? Math.round(m / 10) * 10 : Math.max(5, Math.round(m / 5) * 5) });
  const sayDist = (m) => {
    const { plural: pl } = live.current;
    if (m >= 1000) return pl("pl.kilometers", Math.round(m / 100) / 10);
    return pl("pl.meters", m >= 100 ? Math.round(m / 50) * 50 : Math.max(10, Math.round(m / 10) * 10));
  };

  // ── один фикс положения: всё остальное считается отсюда ──
  function onFix(p, gpsHeading, speed) {
    const L = live.current;
    const st = S.current;
    const { coords, cum, steps } = L.geo;
    const map = mapRef.current;
    if (!map || coords.length < 2 || L.finished) return;

    const proj = project(coords, cum, p, st.lastIdx);
    const off = proj.dist > OFF_ROUTE_M[L.mode];

    // сход с маршрута: 3 фикса подряд вне линии — перестраиваем (не чаще раза в 15 с)
    if (off && !L.demo) {
      st.off += 1;
      if (st.off >= 3 && Date.now() - st.lastReroute > 15000) {
        st.lastReroute = Date.now();
        st.off = 0;
        setNotice(L.t("nav.rerouting"));
        const rest = L.route.stops.slice(stopOfLeg(st.stop, L.route));
        fetchRoute([p, ...rest.map((s) => [s.lng, s.lat])], L.mode)
          .then((data) => {
            setNotice(null);
            L.onReroute(data, p, rest);
          })
          .catch(() => setNotice(null));
      }
    } else {
      st.off = 0;
      st.lastIdx = proj.idx;
      st.along = proj.along;
    }

    // направление: на маршруте — по линии (ровнее GPS), иначе по компасу GPS или по движению
    let heading = st.heading;
    if (!off) heading = proj.heading;
    else if (gpsHeading != null && !Number.isNaN(gpsHeading) && (speed ?? 0) > 0.7) heading = gpsHeading;
    else if (st.lastPos && meters(st.lastPos, p) > 3) heading = bearing(st.lastPos, p);
    st.heading = heading;
    st.lastPos = p;

    // прибытие на остановки
    const along = st.along;
    for (const s of steps) {
      if (!s.arrive || s.leg < st.stop) continue;
      const stop = L.route.stops[stopOfLeg(s.leg, L.route) ] ;
      const near = stop ? meters(p, [stop.lng, stop.lat]) < 25 : false;
      if (along >= s.at - 20 || near) {
        st.stop = s.leg + 1;
        const nextStop = L.route.stops[stopOfLeg(s.leg + 1, L.route)];
        const last = !nextStop;
        const msg = L.t("nav.arrivedAt", { name: stop?.label || "" });
        speak(last ? `${msg}. ${L.t("nav.finished")}` : `${msg}. ${L.t("nav.nextStop", { name: nextStop.label })}`);
        if (last) setFinished(true);
        else {
          setNotice(msg);
          setTimeout(() => setNotice(null), 4000);
        }
      }
      break;
    }

    // следующий манёвр и голосовые подсказки
    const nextIdx = steps.findIndex((s) => s.at > along + 4 && s.key !== "nav.m.depart");
    const next = nextIdx >= 0 ? steps[nextIdx] : null;
    const distTo = next ? next.at - along : 0;
    if (next && !next.arrive) {
      const marks = VOICE_AT[L.mode];
      for (let i = 0; i < marks.length; i++) {
        const id = `${nextIdx}:${i}`;
        if (distTo <= marks[i] && !st.spoken.has(id)) {
          for (let j = 0; j <= i; j++) st.spoken.add(`${nextIdx}:${j}`);
          const text = instruction(next, L.t);
          speak(i === marks.length - 1 ? text : `${L.t("nav.in", { d: sayDist(distTo) })}. ${text}`);
          break;
        }
      }
    }

    // карта: стрелка, остаток линии, камера
    map.getSource("me")?.setData(fc([{ type: "Feature", geometry: { type: "Point", coordinates: p }, properties: { heading } }]));
    if (!off) map.getSource("route")?.setData(line(remainingLine(coords, proj)));
    if (L.following) {
      map.easeTo({
        center: p,
        bearing: heading,
        pitch: 50,
        zoom: L.mode === "car" ? 16.5 : 17.5,
        padding: { top: 220, bottom: 260, left: 0, right: 0 },
        duration: 950,
        easing: (x) => x,
      });
    }

    // at — момент фикса: от него считается время прибытия (в рендере Date.now нельзя)
    setView({ hasFix: true, at: Date.now(), along, next, after: nextIdx >= 0 ? steps[nextIdx + 1] || null : null, distTo });
  }

  const fixRef = useRef(onFix);
  useEffect(() => {
    fixRef.current = onFix;
  });

  // источник положения: GPS или демо
  useEffect(() => {
    if (demo) {
      const id = setInterval(() => {
        const g = live.current.geo;
        const st = S.current;
        st.simS = Math.min(g.total, st.simS + DEMO_SPEED[live.current.mode]);
        const { point, heading } = pointAt(g.coords, g.cum, st.simS);
        fixRef.current(point, heading, DEMO_SPEED[live.current.mode]);
      }, 1000);
      return () => clearInterval(id);
    }
    if (!navigator.geolocation) return undefined;
    const id = navigator.geolocation.watchPosition(
      (pos) => fixRef.current([pos.coords.longitude, pos.coords.latitude], pos.coords.heading, pos.coords.speed),
      () => {},
      { enableHighAccuracy: true, maximumAge: 1000, timeout: 20000 },
    );
    return () => navigator.geolocation.clearWatch(id);
  }, [demo]);

  // человек сдвинул карту пальцем — перестаём следовать, показываем «вернуться»
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return undefined;
    const stop = (e) => {
      if (e.originalEvent) setFollowing(false);
    };
    map.on("dragstart", stop);
    map.on("rotatestart", stop);
    map.on("pitchstart", stop);
    return () => {
      map.off("dragstart", stop);
      map.off("rotatestart", stop);
      map.off("pitchstart", stop);
    };
  }, [mapRef]);

  // экран не гаснет, пока идёт навигация
  useEffect(() => {
    let lock = null;
    const request = async () => {
      try {
        lock = await navigator.wakeLock?.request("screen");
      } catch {
        /* браузер не умеет — не страшно */
      }
    };
    request();
    const onVisible = () => {
      if (document.visibilityState === "visible") request();
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      document.removeEventListener("visibilitychange", onVisible);
      lock?.release?.().catch(() => {});
    };
  }, []);

  // выход из навигации: карта ровно, стрелка снова точка
  useEffect(() => {
    const map = mapRef.current;
    const st = S.current; // объект один на всё время навигации, меняются только его поля
    return () => {
      try {
        window.speechSynthesis?.cancel();
      } catch {
        /* нет озвучки */
      }
      if (!map?.getStyle()) return;
      const last = st.lastPos;
      map.getSource("me")?.setData(fc(last ? [{ type: "Feature", geometry: { type: "Point", coordinates: last }, properties: {} }] : []));
      map.easeTo({ pitch: 0, bearing: 0, padding: { top: 0, bottom: 0, left: 0, right: 0 }, duration: 600 });
    };
  }, [mapRef]);

  function toggleMute() {
    setMuted((m) => {
      const next = !m;
      try {
        localStorage.setItem(MUTE_KEY, next ? "1" : "0");
        if (next) window.speechSynthesis?.cancel();
      } catch {
        /* хранилище недоступно */
      }
      return next;
    });
  }

  // остаток пути и время прибытия
  const remaining = Math.max(0, geo.total - view.along);
  const remainingSec = geo.total > 0 ? route.data.duration * (remaining / geo.total) : 0;
  const eta = view.at
    ? new Intl.DateTimeFormat(locale, { hour: "2-digit", minute: "2-digit" }).format(new Date(view.at + remainingSec * 1000))
    : "—";
  const next = view.next;
  const NextIcon = next?.Icon;

  return (
    <>
      <motion.div className="nav-banner" initial={{ opacity: 0, y: -16 }} animate={{ opacity: 1, y: 0 }} transition={SPRING}>
        {!view.hasFix ? (
          <div className="nav-banner-main">
            <span className="nav-banner-text">
              <b>{t("nav.noGps")}</b>
            </span>
          </div>
        ) : (
          <>
            <div className="nav-banner-main">
              {NextIcon && (
                <span className="nav-banner-icon">
                  <NextIcon size={30} strokeWidth={2.4} />
                </span>
              )}
              <span className="nav-banner-text">
                <b>{next ? showDist(view.distTo) : ""}</b>
                <span>{instruction(next, t)}</span>
              </span>
            </div>
            {view.after && (
              <div className="nav-banner-then">
                {t("nav.then")} <view.after.Icon size={14} /> {t(view.after.key, view.after.vars)}
              </div>
            )}
          </>
        )}
      </motion.div>

      <AnimatePresence>
        {notice && !finished && (
          <motion.div key="notice" className="nav-notice" initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
            {notice}
          </motion.div>
        )}
      </AnimatePresence>

      {!following && (
        <button type="button" className="nav-recenter" onClick={() => setFollowing(true)}>
          <Crosshair size={16} /> {t("nav.recenter")}
        </button>
      )}

      <motion.div className="nav-bottom" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={SPRING}>
        {finished ? (
          <>
            <span className="nav-bottom-info">
              <b>
                <Flag size={16} /> {t("nav.finished")}
              </b>
            </span>
            <button type="button" className="nav-stop" onClick={onExit}>
              <Check size={16} /> OK
            </button>
          </>
        ) : (
          <>
            <span className="nav-bottom-info">
              <b>{t("nav.arrival", { time: eta })}</b>
              <small>
                {showDist(remaining)} · {fmtDuration(Math.max(1, Math.round(remainingSec / 60)))}
                {demo && ` · ${t("nav.demo")}`}
              </small>
            </span>
            <button type="button" className="nav-round" onClick={toggleMute} aria-label={muted ? t("nav.voiceOn") : t("nav.voiceOff")}>
              {muted ? <VolumeX size={18} /> : <Volume2 size={18} />}
            </button>
            <button type="button" className="nav-stop" onClick={onExit}>
              {t("nav.stop")}
            </button>
          </>
        )}
      </motion.div>
    </>
  );
}

// какая остановка в конце участка leg: если маршрут начинается «от вас» — участки 1:1 с остановками,
// если от первой остановки — участок 0 ведёт ко второй
function stopOfLeg(leg, route) {
  return route.start ? leg : leg + 1;
}
