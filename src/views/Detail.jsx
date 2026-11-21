import { motion } from "motion/react";
import { BadgeCheck, Check, ChevronLeft, Clock, Globe, Map as MapIcon, MapPin, Users } from "lucide-react";
import { durationMinutes } from "../i18n";
import { useSettings } from "../settings-context";
import { flyToRoute } from "../flyToRoute";
import { twoGisPlace } from "../twogis";
import { SPRING, SCREEN_IN, STAGGER, RISE, HERO_IMG, TAP } from "../components/shared";
import { MiniMap, SaveHeart, Ticker, StarRow } from "../components/ui.jsx";

// 5. ДЕТАЛЬНЫЙ ЭКРАН И БРОНИРОВАНИЕ
export function Detail({ exp: raw, saved, inRoute, onBack, onToggleSave, onToggleRoute, onBook }) {
  const { t, loc, money, plural, fmtDuration } = useSettings();
  const exp = loc(raw);
  const self = !!raw.selfGuided;
  return (
    <motion.div className="gyg-scroll screen" {...SCREEN_IN}>
      <div className="detail-media">
        <motion.img src={exp.image} alt="" {...HERO_IMG} />
        <button className="icon-btn detail-back" onClick={onBack} aria-label={t("common.back")}>
          <ChevronLeft size={20} />
        </button>
        <button className="save-btn detail-save" onClick={() => onToggleSave(exp.id)} aria-label={saved ? t("common.unsave") : t("common.save")}>
          <SaveHeart saved={saved} />
        </button>
      </div>
      <motion.div className="screen-body" variants={STAGGER} initial="hidden" animate="show">
        <motion.div variants={RISE} className="kicker">{exp.type} · {exp.place}</motion.div>
        <motion.h1 variants={RISE} className="detail-title">{exp.title}</motion.h1>
        <motion.div variants={RISE} className="row wrap gap-14 mb-12 muted">
          <StarRow rating={exp.rating} />
          {exp.reviews > 0 && <span>{plural("pl.reviews", exp.reviews)}</span>}
          <span className="row gap-4"><Clock size={14} /> {fmtDuration(durationMinutes(exp.duration))}</span>
        </motion.div>
        <motion.div variants={RISE} className="detail-chips">
          {exp.freeCancel && <span className="detail-chip green">{t("detail.freeCancel")}</span>}
          {exp.group && <span className="detail-chip"><Users size={13} /> {exp.group}</span>}
          {exp.lang && <span className="detail-chip"><Globe size={13} /> {exp.lang}</span>}
        </motion.div>
        <motion.p variants={RISE} className="body-text">{exp.description}</motion.p>
        {exp.highlights?.length > 0 && (
          <>
            <b>{t("detail.whatsOn")}</b>
            <ul className="check-list">
              {exp.highlights.map((h) => <li key={h}><Check size={15} color="var(--terracotta)" /> {h}</li>)}
            </ul>
          </>
        )}
        {exp.includes?.length > 0 && (
          <>
            <b>{t("detail.includes")}</b>
            <div className="detail-chips mt-8">
              {exp.includes.map((i) => <span key={i} className="detail-chip">{i}</span>)}
            </div>
          </>
        )}
        {!self && exp.agencyName && (
          <motion.div variants={RISE} className="card organizer mb-16">
            <div className="row gap-12">
              {raw.agencyLogo ? (
                <img className="agency-logo" src={raw.agencyLogo} alt="" />
              ) : (
                <div className="agency-logo">{exp.agencyName.slice(0, 1)}</div>
              )}
              <div className="grow">
                <span className="muted t-xs">{t("detail.organizer")}</span>
                <b className="t-md">{exp.agencyName}</b>
              </div>
              {raw.agencyVerified && (
                <span className="mode-label self"><BadgeCheck size={13} /> {t("label.verified")}</span>
              )}
            </div>
            <div className="muted t-sm mt-8">{t(raw.agencyVerified ? "detail.verifiedText" : "detail.fromSite")}</div>
          </motion.div>
        )}
        {!self && (
          <motion.div variants={RISE} className="mb-16">
            <b>{t("detail.howTitle")}</b>
            <ol className="how-steps">
              <li>{t("detail.how1")}</li>
              <li>{t("detail.how2")}</li>
              <li>{t(exp.freeCancel ? "detail.how3cancel" : "detail.how3")}</li>
            </ol>
          </motion.div>
        )}
        <div className="row mb-8"><MapPin size={16} /> <b>{t(self ? "detail.start" : "detail.meeting")}</b></div>
        <div className="muted mb-12">{exp.meeting}</div>
        <MiniMap lat={exp.lat} lng={exp.lng} label={exp.place} />
        {exp.lat != null && exp.lng != null && (
          <div className="gis-actions mt-12">
            <a className="cta ghost" href={twoGisPlace(exp.lat, exp.lng)} target="_blank" rel="noreferrer">
              <MapIcon size={16} /> {t("map.poi.open2gis")}
            </a>
          </div>
        )}
        {!self && exp.url && (
          <a className="route-link mt-12" href={exp.url} target="_blank" rel="noopener noreferrer">
            {t("detail.agencySite", { name: exp.agencyName || "" })} →
          </a>
        )}
      </motion.div>
      <motion.div
        className="sticky-buy"
        initial={{ y: "100%" }}
        animate={{ y: 0 }}
        transition={{ ...SPRING, delay: 0.15 }}
      >
        <div>
          {self ? (
            <div className="price price-lg">{t("price.free")}</div>
          ) : exp.price == null ? (
            <div className="price">{t("price.request")}</div>
          ) : (
            <>
              <div className="muted t-xs">{t("common.from")}</div>
              <div className="price price-lg">{money(exp.price)}</div>
            </>
          )}
        </div>
        {self ? (
          <motion.button
            className="cta"
            whileTap={TAP}
            onClick={(e) => {
              if (!inRoute) flyToRoute({ from: e.currentTarget, image: exp.image });
              onToggleRoute(raw);
            }}
          >
            <Ticker value={inRoute ? t("card.inRoute") : t("card.addRoute")} />
          </motion.button>
        ) : (
          <motion.button className="cta" whileTap={TAP} onClick={() => onBook(raw)}>{t("detail.pickDate")}</motion.button>
        )}
      </motion.div>
    </motion.div>
  );
}
