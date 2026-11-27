import { useCallback, useEffect, useState } from "react";
import { motion } from "motion/react";
import { Building2, Check, ChevronLeft, ChevronRight, DollarSign, Globe, Heart, HelpCircle, LogOut, Moon, Pencil, Search, ShieldCheck, Ticket, Trash2, User } from "lucide-react";
import { useContent } from "../content-context";
import { deleteMyAccount, fetchAccountRoles } from "../api";
import { CURRENCIES, LANGUAGES, currencySymbol, displayName } from "../i18n";
import { useSettings } from "../settings-context";
import { Toast } from "../Toast";
import { Segmented } from "../Segmented";
import { LinkScreen, LoginMethods } from "../AccountMethods.jsx";
import { prettyPhone } from "../phone";
import { useAuth } from "../auth-context";
import { SUPPORT_EMAIL } from "../privacy-text";
import { OfflineMapRow } from "../OfflineMapRow.jsx";
import { NotifsRow } from "../NotifsRow.jsx";
import { EventsBell } from "../booking/EventsBell.jsx";
import { SPRING, SCREEN_IN, STAGGER, RISE, TAP, priceText } from "../components/shared";
import { ProfileEdit } from "./ProfileEdit.jsx";

// 4. ПРОФИЛЬ: НАСТРОЙКИ, ЯЗЫК, ВАЛЮТА, ПОДДЕРЖКА
function PickerScreen({ title, items, activeCode, onSelect, onBack }) {
  const { t } = useSettings();
  const [q, setQ] = useState("");
  const filtered = items.filter((it) => {
    const s = q.trim().toLowerCase();
    if (!s) return true;
    return `${it.label} ${it.sub || ""} ${it.code}`.toLowerCase().includes(s);
  });

  return (
    <motion.div className="gyg-scroll screen" {...SCREEN_IN}>
      <div className="screen-head">
        <button className="icon-btn" onClick={onBack} aria-label={t("common.back")}>
          <ChevronLeft size={20} />
        </button>
        <b>{title}</b>
      </div>
      <div className="screen-body">
        <div className="search mb-12">
          <Search size={18} color="var(--muted-2)" />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder={t("common.search")} />
        </div>
        <div className="card">
          {filtered.map((it) => (
            <button key={it.code} className="list-row" aria-pressed={activeCode === it.code} onClick={() => onSelect(it.code)}>
              <span>
                <span className="list-row-title">{it.label}</span>
                {it.sub && it.sub !== it.label && <span className="list-row-sub">{it.sub}</span>}
              </span>
              <span className="row gap-10 muted">
                {it.symbol && it.symbol !== it.code && <span>{it.symbol}</span>}
                <b>{it.code.toUpperCase()}</b>
                {activeCode === it.code && (
                  <motion.span className="ico" initial={{ scale: 0 }} animate={{ scale: 1 }} transition={SPRING}>
                    <Check size={18} color="var(--terracotta)" />
                  </motion.span>
                )}
              </span>
            </button>
          ))}
          {filtered.length === 0 && <div className="muted list-empty">{t("common.nothing")}</div>}
        </div>
      </div>
    </motion.div>
  );
}

export function ProfileView({ account, onSaveAccount, bookings, onOpenTicket, onOpenBooking, saved, onOpenSaved, onOpenSavedList, onOpenLogin, onGoToTours, onOpenAgency, onOpenAdmin, onOpenPrivacy }) {
  const {
    t,
    loc,
    money,
    fmtDate,
    fmtRate,
    ratesDate,
    plural,
    lang,
    setLang,
    currency,
    setCurrency,
    theme,
    setTheme,
    locale,
  } = useSettings();
  const [screen, setScreen] = useState(null); // null | "lang" | "currency" | "link-email" | "link-phone" | "link-password"
  // удаление аккаунта: первый тап — спросить, второй — удалить
  const [del, setDel] = useState({ ask: false, busy: false, err: null });
  const [deletedToast, setDeletedToast] = useState(false);
  const hideDeleted = useCallback(() => setDeletedToast(false), []);

  const { enabled: authOn, user: authUser, signOut } = useAuth();
  // своё агентство и права админа — чтобы показать нужные входы
  const [roles, setRoles] = useState({ agency: null, admin: false, for: null });
  useEffect(() => {
    if (!authUser) return;
    let off = false;
    fetchAccountRoles(authUser.id)
      .then((r) => !off && setRoles({ ...r, for: authUser.id }))
      .catch(() => {});
    return () => {
      off = true;
    };
  }, [authUser]);
  const myRoles = authUser && roles.for === authUser.id ? roles : { agency: null, admin: false };
  const currentLang = LANGUAGES.find((l) => l.code === lang);
  const { allTours } = useContent();
  const savedRaw = allTours.filter((e) => saved.has(e.id));

  // предстоящие — ждут ответа или подтверждены и дата ещё не прошла; остальное — история
  const [tripsTab, setTripsTab] = useState("upcoming");
  const today = new Date().toLocaleDateString("en-CA");
  const isUpcoming = (b) => ["pending", "confirmed", undefined].includes(b.status) && !(b.date < today);
  const upcoming = bookings.filter(isUpcoming);
  const history = bookings
    .filter((b) => !isUpcoming(b))
    .sort((a, b) => String(b.createdAt || "").localeCompare(String(a.createdAt || "")));
  const showHistory = tripsTab === "history";
  const boughtAt = (iso) =>
    new Date(iso).toLocaleString(locale, { day: "numeric", month: "short", hour: "numeric", minute: "2-digit" });
  const bookingRow = (b) => {
    const exp = loc(b.exp);
    const status = b.status || "pending";
    return (
      <motion.button key={b.code} layout className="booking-row" whileTap={TAP} onClick={() => onOpenTicket(b)}>
        <img src={exp.image} alt="" />
        <span className="grow">
          <span className="booking-row-title">{exp.title}</span>
          <span className="muted t-xs">
            {fmtDate(b.date)} · {plural("pl.guests", b.guests)} · {b.code}
          </span>
          <span className={`trip-status is-${status}`}>{t(`trip.status.${status}`)}</span>
        </span>
        <ChevronRight size={16} color="var(--muted-2)" />
      </motion.button>
    );
  };

  if (screen === "edit" && authUser) {
    return <ProfileEdit account={account} onSave={onSaveAccount} onBack={() => setScreen(null)} />;
  }

  if (screen?.startsWith("link-") && authUser) {
    return <LinkScreen mode={screen.slice(5)} onBack={() => setScreen(null)} />;
  }

  if (screen === "lang") {
    return (
      <PickerScreen
        title={t("profile.language")}
        items={LANGUAGES.map((l) => ({ code: l.code, label: l.native, sub: displayName("language", l.code, lang) }))}
        activeCode={lang}
        onSelect={(code) => {
          setLang(code);
          setScreen(null);
        }}
        onBack={() => setScreen(null)}
      />
    );
  }

  if (screen === "currency") {
    return (
      <PickerScreen
        title={t("profile.currency")}
        items={CURRENCIES.map((c) => ({
          code: c.code,
          label: displayName("currency", c.code, lang),
          // курс за 1 USD прямо в списке (живой, если успел загрузиться)
          sub: c.code === "USD" ? undefined : `1 USD = ${fmtRate(c.code)}`,
          symbol: currencySymbol(c.code, lang),
        }))}
        activeCode={currency}
        onSelect={(code) => {
          setCurrency(code);
          setScreen(null);
        }}
        onBack={() => setScreen(null)}
      />
    );
  }

  return (
    <motion.div className="gyg-scroll profile" variants={STAGGER} initial="hidden" animate="show">
      <div className="row between">
        <h1 className="page-title">{t("profile.title")}</h1>
        <EventsBell onOpen={onOpenBooking} />
      </div>

      <motion.div className="card panel" variants={RISE}>
        <div className="row gap-12">
          {/* вошёл — шапка открывает «Изменить профиль» (имя, фамилия, фото) */}
          <button
            className="profile-head-btn"
            onClick={() => authUser && setScreen("edit")}
            disabled={!authUser}
            aria-label={authUser ? t("profile.edit") : undefined}
          >
            <span className="avatar">
              {authUser && account?.avatar ? <img src={account.avatar} alt="" /> : <User size={22} color="var(--terracotta)" />}
            </span>
            <span className="grow">
              <span className="t-md b" style={{ display: "block" }}>
                {authUser ? account?.name || t("login.account") : t("profile.guest")}
              </span>
              <span className="muted t-xs login-email" style={{ display: "block" }}>
                {authUser ? authUser.email || prettyPhone(authUser.phone) : t("profile.guestNote")}
              </span>
            </span>
            {authUser && <Pencil size={16} color="var(--muted-2)" />}
          </button>
          {!authUser &&
            (authOn ? (
              <motion.button className="pill pill-sm" whileTap={TAP} onClick={onOpenLogin}>
                {t("login.cta")}
              </motion.button>
            ) : (
              <button className="pill pill-sm" disabled>
                {t("profile.soon")}
              </button>
            ))}
        </div>
        {authUser && (
          <button className="row-btn row-btn-divided" onClick={signOut}>
            <span className="row">
              <LogOut size={16} color="var(--terracotta)" />
              <span>{t("login.out")}</span>
            </span>
            <ChevronRight size={16} color="var(--muted-2)" />
          </button>
        )}
      </motion.div>

      {authUser && (
        <motion.div variants={RISE}>
          <LoginMethods onOpen={(mode) => setScreen(`link-${mode}`)} />
        </motion.div>
      )}

      <motion.div className="card panel" variants={RISE}>
        <div className="panel-head">
          <Ticket size={16} color="var(--terracotta)" />
          <b>{t("profile.trips")}</b>
        </div>
        {bookings.length > 0 && (
          <div className="mb-12">
            <Segmented
              label={t("profile.trips")}
              value={showHistory ? "history" : "upcoming"}
              onChange={(v) => setTripsTab(v)}
              options={[
                { value: "upcoming", label: t("profile.upcoming", { n: upcoming.length }) },
                { value: "history", label: t("profile.history", { n: history.length }) },
              ]}
            />
          </div>
        )}
        {showHistory && history.length === 0 ? (
          <div className="muted">{t("profile.noHistory")}</div>
        ) : showHistory ? (
          <div className="stack-8">
            {history.map((b) => (
              <div key={b.code}>
                {b.createdAt && (
                  <div className="wave-divider">
                    <span>{t("profile.boughtAt", { time: boughtAt(b.createdAt) })}</span>
                  </div>
                )}
                {bookingRow(b)}
              </div>
            ))}
          </div>
        ) : upcoming.length === 0 ? (
          <div className="empty-cta">
            <div className="muted">{t("profile.noTickets")}</div>
            <button className="cta cta-sm" onClick={onGoToTours}>{t("profile.seeTours")}</button>
          </div>
        ) : (
          <div className="stack-8">
            {upcoming.map((b) => bookingRow(b))}
          </div>
        )}
      </motion.div>

      <motion.div className="card panel" variants={RISE}>
        <motion.button className="row-btn saved-open" whileTap={{ scale: 0.98 }} onClick={onOpenSavedList}>
          <span className="row">
            <Heart size={16} color="var(--terracotta)" />
            <b>{t("profile.saved", { n: savedRaw.length })}</b>
          </span>
          {savedRaw.length > 0 && (
            <span className="row gap-4 saved-open-all">
              {t("saved.all")}
              <ChevronRight size={18} />
            </span>
          )}
        </motion.button>
        {savedRaw.length === 0 ? (
          <div className="muted">{t("profile.noSaved")}</div>
        ) : (
          <div className="h-scroll saved-scroll">
            {savedRaw.map((raw) => {
              const exp = loc(raw);
              return (
                <button key={exp.id} className="saved-card" onClick={() => onOpenSaved(raw)}>
                  <img src={exp.image} alt="" />
                  <span className="saved-card-body">
                    <span className="saved-card-title">{exp.title}</span>
                    <span className="muted t-xs">{priceText(exp, t, money)}</span>
                  </span>
                </button>
              );
            })}
          </div>
        )}
      </motion.div>

      {/* все настройки — одной карточкой: строки через разделитель, порядок — от нужного в дороге к оформлению */}
      <motion.div className="card panel settings-card" variants={RISE}>
        <div className="panel-head">
          <b>{t("profile.settings")}</b>
        </div>
        <button className="row-btn" onClick={() => setScreen("lang")}>
          <span className="row">
            <Globe size={16} color="var(--terracotta)" />
            <span>{t("profile.language")}</span>
          </span>
          <span className="row gap-6 muted">
            {currentLang?.native || lang}
            <ChevronRight size={16} color="var(--muted-2)" />
          </span>
        </button>
        <div className="settings-item">
          <button className="row-btn" onClick={() => setScreen("currency")}>
            <span className="row">
              <DollarSign size={16} color="var(--terracotta)" />
              <span>{t("profile.currency")}</span>
            </span>
            <span className="row gap-6 muted">
              {currencySymbol(currency, lang)} {currency}
              <ChevronRight size={16} color="var(--muted-2)" />
            </span>
          </button>
          {currency !== "USD" && (
            <div className="muted t-xs settings-note">
              {ratesDate
                ? t("profile.ratesLive", { rate: fmtRate(currency), date: fmtDate(ratesDate) })
                : t("profile.ratesNote")}
            </div>
          )}
        </div>
        <div className="settings-item">
          <OfflineMapRow />
        </div>
        <div className="settings-item">
          <NotifsRow />
        </div>
        <div className="settings-item">
          <div className="row settings-label">
            <Moon size={16} color="var(--terracotta)" />
            <span>{t("profile.theme")}</span>
          </div>
          <Segmented
            label={t("profile.theme")}
            value={theme}
            onChange={setTheme}
            options={[
              { value: "light", label: t("theme.light") },
              { value: "dark", label: t("theme.dark") },
              { value: "system", label: t("theme.system") },
            ]}
          />
          {theme === "system" && <div className="muted t-xs mt-8">{t("theme.systemNote")}</div>}
        </div>
      </motion.div>

      <motion.div className="card panel" variants={RISE}>
        <a className="row-btn" href={`mailto:${SUPPORT_EMAIL}`}>
          <span className="row">
            <HelpCircle size={16} color="var(--terracotta)" />
            <span className="grow">
              <span>{t("profile.help")}</span>
              <span className="muted t-xs">{SUPPORT_EMAIL}</span>
            </span>
          </span>
          <ChevronRight size={16} color="var(--muted-2)" />
        </a>
        <button className="row-btn row-btn-divided" onClick={onOpenPrivacy}>
          <span className="row">
            <ShieldCheck size={16} color="var(--terracotta)" />
            <span>{t("profile.privacy")}</span>
          </span>
          <ChevronRight size={16} color="var(--muted-2)" />
        </button>
      </motion.div>

      {/* для партнёров: кабинет агентства внизу профиля; модерация видна только админам (права всё равно проверяет база) */}
      <motion.div className="card panel" variants={RISE}>
        <button className="row-btn" onClick={onOpenAgency}>
          <span className="row">
            <Building2 size={16} color="var(--terracotta)" />
            <span className="grow">
              <span>{myRoles.agency ? myRoles.agency.name : t("profile.agencyTitle")}</span>
              <span className="muted t-xs">
                {myRoles.agency ? t(`profile.agency.${myRoles.agency.status}`) : t("profile.agencyText")}
              </span>
            </span>
          </span>
          <ChevronRight size={16} color="var(--muted-2)" />
        </button>
        {myRoles.admin && (
          <button className="row-btn row-btn-divided" onClick={onOpenAdmin}>
            <span className="row">
              <ShieldCheck size={16} color="var(--terracotta)" />
              <span className="grow">
                <span>{t("profile.adminTitle")}</span>
                <span className="muted t-xs">{t("profile.adminText")}</span>
              </span>
            </span>
            <ChevronRight size={16} color="var(--muted-2)" />
          </button>
        )}
      </motion.div>

      {authUser && (
        <motion.div className="card panel" variants={RISE}>
          <button
            className="row-btn delete-row"
            disabled={del.busy}
            onClick={() => {
              if (!del.ask) return setDel({ ask: true, busy: false, err: null });
              setDel({ ask: true, busy: true, err: null });
              deleteMyAccount()
                .then(() => {
                  setDel({ ask: false, busy: false, err: null });
                  setDeletedToast(true);
                  return signOut();
                })
                .catch((e) => {
                  const code = String(e?.message || "");
                  const err = /agency_owner/.test(code) ? "agency" : /admin/.test(code) ? "admin" : "other";
                  setDel({ ask: false, busy: false, err });
                });
            }}
          >
            <span className="row">
              <Trash2 size={16} color="var(--danger)" />
              <span className="grow">
                <span>{t(del.ask ? "profile.deleteConfirm" : "profile.delete")}</span>
                <span className="muted t-xs">
                  {del.err ? t(`profile.deleteErr.${del.err}`) : t(del.ask ? "profile.deleteWarn" : "profile.deleteText")}
                </span>
              </span>
            </span>
          </button>
          {del.ask && !del.busy && (
            <button className="row-btn row-btn-divided" onClick={() => setDel({ ask: false, busy: false, err: null })}>
              <span>{t("common.cancel")}</span>
            </button>
          )}
        </motion.div>
      )}

      <Toast show={deletedToast} onHide={hideDeleted}>
        {t("profile.deleted")}
      </Toast>
    </motion.div>
  );
}
