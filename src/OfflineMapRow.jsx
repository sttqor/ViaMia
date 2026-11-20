// Строка в профиле: скачать карту Оша для работы без интернета (src/offlineMap.js).
import { useState } from "react";
import { ChevronRight, CloudDownload, Check } from "lucide-react";
import { useSettings } from "./settings-context";
import { downloadOshMap, offlineMapSaved, offlineSupported } from "./offlineMap";

export function OfflineMapRow() {
  const { t, fmtDate } = useSettings();
  const [state, setState] = useState(() => ({ saved: offlineMapSaved(), pct: null, error: false }));
  const busy = state.pct != null;
  const supported = offlineSupported();

  function start() {
    if (busy || !supported) return;
    setState((s) => ({ ...s, pct: 0, error: false }));
    downloadOshMap((done, total) => setState((s) => ({ ...s, pct: Math.round((done / total) * 100) })))
      .then(() => setState({ saved: offlineMapSaved(), pct: null, error: false }))
      .catch(() => setState((s) => ({ ...s, pct: null, error: true })));
  }

  const sub = !supported
    ? t("offline.unsupported")
    : busy
      ? t("offline.progress", { pct: state.pct })
      : state.error
        ? t("offline.error")
        : state.saved
          ? t("offline.saved", { date: fmtDate(state.saved.slice(0, 10)) })
          : t("offline.get");

  return (
    <button className="row-btn" onClick={start} disabled={busy || !supported} aria-busy={busy}>
      <span className="row">
        {state.saved && !busy ? <Check size={16} color="var(--green)" /> : <CloudDownload size={16} color="var(--terracotta)" />}
        <span className="grow">
          <span>{t("offline.title")}</span>
          <span className={`muted t-xs ${state.error ? "is-danger" : ""}`}>{sub}</span>
          {busy && (
            <span className="offline-bar" aria-hidden="true">
              <span style={{ width: `${state.pct}%` }} />
            </span>
          )}
        </span>
      </span>
      <ChevronRight size={16} color="var(--muted-2)" />
    </button>
  );
}
