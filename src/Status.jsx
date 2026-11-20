// Загрузка, ошибки и «нет интернета» — одинаково по всему приложению.
// Символика: түндүк (крутится при загрузке) и полоска узора «кочкор мүйүз».
import { Component, useEffect, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { RotateCw, WifiOff } from "lucide-react";
import { useSettings } from "./settings-context";
import "./Status.css";

export function Loader({ full = false, label }) {
  const { t } = useSettings();
  return (
    <div className={`status-loader ${full ? "is-full" : ""}`} role="status" aria-live="polite">
      <span className="tunduk-spin" aria-hidden="true" />
      <span className="status-loader-text">{label || t("status.loading")}</span>
    </div>
  );
}

export function ErrorView({ title, text, onRetry, full = false }) {
  const { t } = useSettings();
  const offline = typeof navigator !== "undefined" && navigator.onLine === false;
  return (
    <div className={`status-error ${full ? "is-full" : ""}`} role="alert">
      <span className="tunduk-mark" aria-hidden="true" />
      <b>{title || t(offline ? "status.offlineTitle" : "status.errorTitle")}</b>
      <span className="muted">{text || t(offline ? "status.offlineText" : "status.errorText")}</span>
      <span className="orn-band" aria-hidden="true" />
      {onRetry && (
        <button type="button" className="cta status-retry" onClick={onRetry}>
          <RotateCw size={16} /> {t("status.retry")}
        </button>
      )}
    </div>
  );
}

// Любая неожиданная ошибка в экране → понятный экран с «повторить», а не белая пустота.
// Тексты берём из ErrorView (там useSettings), сам класс хуки не может.
export class ErrorBoundary extends Component {
  state = { error: null };
  static getDerivedStateFromError(error) {
    return { error };
  }
  componentDidCatch(error) {
    console.error(error);
  }
  render() {
    if (!this.state.error) return this.props.children;
    const retry = () => {
      // не догрузился кусок кода (обычно нет сети или вышла новая версия) — перезагружаем целиком
      if (/dynamically imported module|Loading chunk|Importing a module script/i.test(String(this.state.error?.message))) {
        window.location.reload();
        return;
      }
      this.setState({ error: null });
      this.props.onReset?.();
    };
    return <ErrorView full={this.props.full} onRetry={retry} />;
  }
}

// Тонкая плашка сверху, пока нет интернета
export function OfflineBanner() {
  const { t } = useSettings();
  const [online, setOnline] = useState(() => navigator.onLine !== false);
  useEffect(() => {
    const up = () => setOnline(true);
    const down = () => setOnline(false);
    window.addEventListener("online", up);
    window.addEventListener("offline", down);
    return () => {
      window.removeEventListener("online", up);
      window.removeEventListener("offline", down);
    };
  }, []);
  return (
    <AnimatePresence>
      {!online && (
        <motion.div
          className="offline-banner"
          role="status"
          initial={{ y: -40, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: -40, opacity: 0 }}
        >
          <WifiOff size={14} /> {t("status.offlineBanner")}
        </motion.div>
      )}
    </AnimatePresence>
  );
}
