import { ChevronLeft } from "lucide-react";
import { useSettings } from "../settings-context";

// Общие куски кабинета агентства и панели модерации

export function StatusBadge({ kind, status }) {
  const { t } = useSettings();
  return <span className={`ag-status is-${status}`}>{t(`ag.${kind}.${status}`)}</span>;
}

export function AgencyHeader({ title, sub, onBack, right }) {
  const { t } = useSettings();
  return (
    <header className="ag-head">
      {onBack && (
        <button className="icon-btn" onClick={onBack} aria-label={t("common.back")}>
          <ChevronLeft size={20} />
        </button>
      )}
      <div className="grow">
        <span className="ag-brand">{title}</span>
        {sub && <span className="muted t-xs">{sub}</span>}
      </div>
      {right}
    </header>
  );
}

export function Field({ label, hint, required, children }) {
  return (
    <label className="ag-field">
      <span className="ag-label">{label}{required && <span className="req"> *</span>}</span>
      {children}
      {hint && <span className="ag-hint">{hint}</span>}
    </label>
  );
}

