// Живые курсы валют к 1 USD.
// Источник — open.er-api.com (бесплатно, без ключа, обновляется раз в сутки),
// запасной — currency-api на jsdelivr. Кэш в localStorage на 6 часов;
// без сети остаются последние курсы или примерные из CURRENCIES (i18n.js).
import { useCallback, useEffect, useRef, useState } from "react";
import { CURRENCIES } from "./i18n";

const KEY = "osh-rates-v1";
const TTL = 6 * 60 * 60 * 1000;
const CODES = CURRENCIES.map((c) => c.code);

function readCache() {
  try {
    const c = JSON.parse(localStorage.getItem(KEY));
    return c?.rates ? c : null;
  } catch {
    return null;
  }
}

// оставляем только наши валюты и только нормальные числа
function pick(src, upper) {
  const out = {};
  for (const code of CODES) {
    const v = Number(src?.[upper ? code : code.toLowerCase()]);
    if (Number.isFinite(v) && v > 0) out[code] = v;
  }
  out.USD = 1;
  return Object.keys(out).length > 1 ? out : null;
}

async function fromErApi() {
  const r = await fetch("https://open.er-api.com/v6/latest/USD", { cache: "no-store" });
  if (!r.ok) throw new Error(String(r.status));
  const j = await r.json();
  if (j.result !== "success") throw new Error("er-api");
  const rates = pick(j.rates, true);
  if (!rates) throw new Error("er-api empty");
  return { rates, date: new Date(j.time_last_update_unix * 1000).toISOString().slice(0, 10) };
}

async function fromJsdelivr() {
  const r = await fetch("https://cdn.jsdelivr.net/npm/@fawazahmed0/currency-api@latest/v1/currencies/usd.json", {
    cache: "no-store",
  });
  if (!r.ok) throw new Error(String(r.status));
  const j = await r.json();
  const rates = pick(j.usd, false);
  if (!rates) throw new Error("jsdelivr empty");
  return { rates, date: j.date };
}

export function useLiveRates() {
  const [state, setState] = useState(() => {
    const c = readCache();
    return { rates: c?.rates ?? null, date: c?.date ?? null, at: c?.at ?? 0 };
  });
  const busy = useRef(false);

  const refresh = useCallback(async () => {
    const c = readCache();
    if (c && Date.now() - c.at < TTL) return;
    if (busy.current) return;
    busy.current = true;
    try {
      let res;
      try {
        res = await fromErApi();
      } catch {
        res = await fromJsdelivr();
      }
      const next = { ...res, at: Date.now() };
      setState(next);
      try {
        localStorage.setItem(KEY, JSON.stringify(next));
      } catch {
        /* хранилище недоступно */
      }
    } catch {
      /* оба источника недоступны — остаются прежние курсы */
    } finally {
      busy.current = false;
    }
  }, []);

  useEffect(() => {
    const first = setTimeout(refresh, 0);
    const onVisible = () => {
      if (document.visibilityState === "visible") refresh();
    };
    document.addEventListener("visibilitychange", onVisible);
    window.addEventListener("online", refresh);
    return () => {
      clearTimeout(first);
      document.removeEventListener("visibilitychange", onVisible);
      window.removeEventListener("online", refresh);
    };
  }, [refresh]);

  return state;
}
