// Экран политики конфиденциальности: из профиля и по ссылке /privacy (для магазинов).
import { ChevronLeft, Mail } from "lucide-react";
import { useSettings } from "./settings-context";
import { fallbackOf } from "./i18n";
import { PRIVACY, PRIVACY_UPDATED, SUPPORT_EMAIL } from "./privacy-text";

export function PrivacyScreen({ onBack }) {
  const { t, lang, fmtDate } = useSettings();
  const doc = PRIVACY[lang] || PRIVACY[fallbackOf(lang)] || PRIVACY.en;
  return (
    <div className="gyg-scroll screen privacy">
      <div className="screen-head">
        <button className="icon-btn" onClick={onBack} aria-label={t("common.back")}>
          <ChevronLeft size={20} />
        </button>
        <span className="grow">
          <b>{doc.title}</b>
          <span className="muted t-xs">{t("privacy.updated", { date: fmtDate(PRIVACY_UPDATED) })}</span>
        </span>
      </div>
      <div className="screen-body">
        <p className="privacy-intro">{doc.intro}</p>
        {doc.sections.map((s) => (
          <section key={s.h} className="privacy-sec">
            <h2>{s.h}</h2>
            {s.p.map((x) => (
              <p key={x}>{x}</p>
            ))}
          </section>
        ))}
        <span className="orn-band privacy-orn" aria-hidden="true" />
        <a className="cta ghost privacy-mail" href={`mailto:${SUPPORT_EMAIL}`}>
          <Mail size={16} /> {SUPPORT_EMAIL}
        </a>
      </div>
    </div>
  );
}
