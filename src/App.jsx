import { Suspense, lazy, useEffect, useMemo, useRef, useState } from "react";
import { Compass, Map as MapIcon, Route as RouteIcon, Sparkles, User } from "lucide-react";
import { EXPERIENCES } from "./data";
import { useContent } from "./content-context";
import { cancelBookingRequest, submitBookingRequest } from "./api";
import { useAccountSync } from "./useAccountSync";
import { onPushOpen } from "./push";
import { useSettings } from "./settings-context";
import { useRoles } from "./roles-context";
import { TabBar } from "./TabBar";
import { FlyLayer } from "./FlyLayer";
import { useMinimizeOnScroll } from "./useMinimizeOnScroll";
import { Onboarding } from "./Onboarding";
import { TipsScreen } from "./Tips.jsx";
import { LoginScreen } from "./Login.jsx";
import { ErrorBoundary, Loader, OfflineBanner } from "./Status.jsx";
import { PrivacyScreen } from "./Privacy.jsx";
import splashVideo from "./splash.mp4";
import { ExploreMap } from "./components/ui.jsx";
import { HomeView } from "./views/HomeView.jsx";
import { RouteView } from "./views/RouteView.jsx";
import { ToursView } from "./views/ToursView.jsx";
import { SavedView } from "./views/SavedView.jsx";
import { ProfileView } from "./views/ProfileView.jsx";
import { Detail } from "./views/Detail.jsx";
import { Booking } from "./views/Booking.jsx";
import { TicketView } from "./views/TicketView.jsx";

// Заставка при запуске: ролик с иконкой-дорогой — дорога идёт быстро, сборка логотипа в обычном темпе. Лежит поверх приложения,
// которое тем временем уже грузится, и плавно открывает его. Фон — цвет первого кадра ролика
// (как у заглушки в index.html), чтобы видео не выглядело отдельным окном.
// Пропускается тапом, при prefers-reduced-motion не показывается вовсе.
const SPLASH_SPEED = 2.5; // дорога до логотипа ускорена
const SPLASH_LOGO_AT = 3.4; // с этой секунды ролика дорога сворачивается в логотип — играем как есть
const SPLASH_START_MS = 1500; // не начал играть за это время — пропускаем
const SPLASH_SAFETY_MS = 7000; // только если видео зависло
const SPLASH_FADE_MS = 280; // = transition в .splash (index.css)

function Splash({ onDone }) {
  const [hide, setHide] = useState(false);
  const doneRef = useRef(false);
  const videoRef = useRef(null);
  const finish = () => {
    if (doneRef.current) return;
    doneRef.current = true;
    setHide(true);
    setTimeout(onDone, SPLASH_FADE_MS);
  };
  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      doneRef.current = true;
      onDone();
      return;
    }
    const v = videoRef.current;
    if (v) {
      v.defaultPlaybackRate = SPLASH_SPEED;
      v.playbackRate = SPLASH_SPEED;
      // автозапуск запрещён (режим энергосбережения на iOS и т.п.) — сразу в приложение, без пустого экрана
      v.play()?.catch(finish);
    }
    // ролик так и не пошёл — не держим пустой фон
    const noStart = setTimeout(() => {
      if (!v || v.paused || v.currentTime === 0) finish();
    }, SPLASH_START_MS);
    const safety = setTimeout(finish, SPLASH_SAFETY_MS);
    // скорость по кадру ролика: быстро до логотипа, потом 1×; заодно чинит сброс скорости на iOS
    let raf = 0;
    const tick = () => {
      if (v) {
        const rate = v.currentTime < SPLASH_LOGO_AT ? SPLASH_SPEED : 1;
        if (v.playbackRate !== rate) v.playbackRate = rate;
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(raf);
      clearTimeout(noStart);
      clearTimeout(safety);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return (
    <div className={`splash ${hide ? "splash-hide" : ""}`} onClick={finish}>
      <video
        ref={videoRef}
        src={splashVideo}
        autoPlay
        muted
        playsInline
        preload="auto"
        onEnded={finish}
        onError={finish}
      />
    </div>
  );
}

const TABS = [
  { id: "home", key: "nav.home", Icon: Compass },
  { id: "map", key: "nav.map", Icon: MapIcon },
  { id: "route", key: "nav.route", Icon: RouteIcon, accent: true },
  { id: "tours", key: "nav.tours", Icon: Sparkles },
  { id: "profile", key: "nav.profile", Icon: User },
];

// кабинет агентства и модерация — экраны внутри приложения, грузятся только когда открыты
const AgencyScreen = lazy(() => import("./agency/AgencyApp.jsx"));
const AdminScreen = lazy(() => import("./agency/AdminApp.jsx"));
// Сохранение на устройстве (localStorage может быть недоступен — тогда просто работаем в памяти).
// Избранное и маршрут храним как id туров (туры могут прийти из Supabase позже),
// а в брони — копию тура на момент бронирования, чтобы билет не пропал, если тур снимут.
const STORE_KEY = "osh-guide-v1";
const legacyTour = (id) => EXPERIENCES.find((e) => e.id === id);

function loadStore() {
  try {
    const raw = JSON.parse(localStorage.getItem(STORE_KEY) || "null");
    if (!raw) return null;
    return {
      saved: new Set(raw.saved || []),
      route: raw.route || [],
      bookings: (raw.bookings || [])
        .map((b) => (b.exp ? b : { ...b, exp: legacyTour(b.expId) })) // старый формат: только expId
        .filter((b) => b.exp),
    };
  } catch {
    return null;
  }
}

const initialStore = loadStore();
const DEFAULT_ROUTE = ["self-sulaiman", "self-center", "self-jayma"];

// ГЛАВНЫЙ ЭКСПОРТ
// Слой «полёта в маршрут» живёт рядом с экранами, чтобы работать и на экранах без нижней панели
export default function App() {
  const [splash, setSplash] = useState(true);
  return (
    <>
      <AppScreens />
      <FlyLayer />
      {splash && <Splash onDone={() => setSplash(false)} />}
    </>
  );
}

function AppScreens() {
  const { t, lang, travelMode, setTravelMode } = useSettings();
  const { allTours, byId } = useContent();
  const [tab, setTab] = useState("home");
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("all");
  const [saved, setSaved] = useState(() => initialStore?.saved || new Set());
  const [selected, setSelected] = useState(null);
  const [bookingExp, setBookingExp] = useState(null);
  const [ticket, setTicket] = useState(null);
  const [bookings, setBookings] = useState(() => initialStore?.bookings || []);
  const [navMin, setNavMin] = useMinimizeOnScroll();
  // экран поверх вкладок без своего тура: "saved" | "tips" | null
  const [page, setPage] = useState(null);
  // агентство и админ работают в своём кабинете, а не в туристическом приложении
  const roles = useRoles();
  const refreshRoles = roles.refresh;
  // после заявки агентства (экран кабинета закрыли) роль появляется — перечитываем при смене экрана
  useEffect(() => {
    refreshRoles();
  }, [page, refreshRoles]);
  // маршрут дня, открытый на карте кнопкой «навигация» ({ stops }), null — нет
  const [navPlan, setNavPlan] = useState(null);

  const [routeIds, setRouteIds] = useState(() => initialStore?.route || DEFAULT_ROUTE);
  const routeItems = useMemo(() => routeIds.map(byId).filter(Boolean), [routeIds, byId]);
  const setRouteItems = (items) => setRouteIds(items.map((x) => x.id));

  // ── Аккаунт ───────────────────────────────────────────────────
  // Избранное, маршрут, брони и настройки сливаются с облаком при входе и
  // синхронизируются дальше; выход убирает личное с устройства (useAccountSync.js)
  const { account, rememberContact, updateAccount } = useAccountSync({
    byId,
    saved,
    setSaved,
    routeIds,
    setRouteIds,
    setBookings,
    onSignedOut: () => setTicket(null),
    defaultRoute: DEFAULT_ROUTE,
  });

  // Нажали на push брони: /?ticket=КОД при запуске или сообщение от воркера, если приложение открыто.
  // Билет открываем, когда бронь есть в списке (после входа она подтягивается из базы).
  const [pendingTicket, setPendingTicket] = useState(() => {
    const code = new URLSearchParams(window.location.search).get("ticket");
    if (code) window.history.replaceState(window.history.state, "", window.location.pathname);
    return code;
  });
  useEffect(() => onPushOpen((url) => setPendingTicket(url.searchParams.get("ticket"))), []);
  const pushBooking = pendingTicket ? bookings.find((x) => x.code === pendingTicket) : null;
  if (pushBooking) {
    // смена состояния во время рендера — так React советует подстраиваться под новые данные
    setPendingTicket(null);
    setTicket(pushBooking);
  }

  useEffect(() => {
    try {
      localStorage.setItem(
        STORE_KEY,
        JSON.stringify({ saved: [...saved], route: routeIds, bookings })
      );
    } catch {
      /* хранилище недоступно */
    }
  }, [saved, routeIds, bookings]);

  // При смене экрана — наверх
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [tab, selected, bookingExp, ticket, page]);

  // Системная «назад» закрывает верхний экран, а не приложение:
  // каждое открытие кладёт запись в history, popstate снимает её.
  const depth = (page ? 1 : 0) + (selected ? 1 : 0) + (bookingExp ? 1 : 0) + (ticket ? 1 : 0);
  const prevDepth = useRef(0);
  useEffect(() => {
    if (depth > prevDepth.current) window.history.pushState({ screen: depth }, "");
    prevDepth.current = depth;
  }, [depth]);
  useEffect(() => {
    function onPop() {
      if (ticket) setTicket(null);
      else if (bookingExp) setBookingExp(null);
      else if (selected) setSelected(null);
      else if (page) setPage(null);
      // экран уже закрыт кодом (бронь подтверждена/отменена) — запись лишняя, идём дальше назад
      else window.history.back();
    }
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, [ticket, bookingExp, selected, page]);
  // Кнопки «назад» в интерфейсе идут через history, чтобы стек не расходился
  const closeScreen = () => window.history.back();

  function toggleSave(id) {
    setSaved((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleRoute(exp) {
    setRouteIds((prev) => (prev.includes(exp.id) ? prev.filter((id) => id !== exp.id) : [...prev, exp.id]));
  }

  // Заявка уходит в Supabase (если он настроен). Ошибка пробрасывается — экран брони её покажет.
  async function confirmBooking(entry) {
    const { synced, id } = await submitBookingRequest(entry, lang);
    const record = { ...entry, synced, id };
    setBookings((b) => [record, ...b]);
    rememberContact(entry);
    setBookingExp(null);
    setSelected(null);
    setPage(null);
    setTicket(record);
    setTab("profile");
  }

  // из колокольчика: открыть поездку по id брони
  function openBookingById(id) {
    const b = bookings.find((x) => x.id === id);
    if (b) setTicket(b);
    else setTab("profile");
  }

  async function cancelBooking(entry) {
    if (entry.synced && !(await cancelBookingRequest(entry.code))) throw new Error("not cancellable"); // уже сгорела или отклонена
    setBookings((b) => b.filter((x) => x.code !== entry.code));
    setTicket(null);
  }

  if (roles.home) {
    // у админа со своим агентством кабинет агентства открывается из модерации и закрывается назад в неё
    const inAgency = roles.home === "/agency" || page === "agency";
    const Screen = inAgency ? AgencyScreen : AdminScreen;
    return (
      <ErrorBoundary full>
        <Suspense fallback={<Loader full />}>
          <Screen
            onExit={roles.home === "/admin" && inAgency ? () => setPage(null) : null}
            onOpenAgency={roles.agency ? () => setPage("agency") : undefined}
          />
        </Suspense>
      </ErrorBoundary>
    );
  }
  if (travelMode === null) {
    return (
      <Onboarding
        onPick={(mode) => {
          setTravelMode(mode);
          setTab("home");
        }}
      />
    );
  }
  if (ticket) {
    // билет берём из списка броней — статус и детали обновляются, пока он открыт
    const live = bookings.find((b) => b.code === ticket.code) || ticket;
    return (
      <TicketView
        booking={live}
        onClose={closeScreen}
        onCancel={cancelBooking}
        onNavigate={(exp) => {
          setTicket(null);
          setNavPlan({ stops: [{ lng: exp.lng, lat: exp.lat, label: exp.title }] });
          setTab("map");
        }}
      />
    );
  }
  if (bookingExp)
    return <Booking exp={bookingExp} defaults={account} onBack={closeScreen} onConfirm={confirmBooking} />;
  if (selected) {
    return (
      <Detail
        exp={selected}
        saved={saved.has(selected.id)}
        onBack={closeScreen}
        onToggleSave={toggleSave}
        onBook={setBookingExp}
        inRoute={routeIds.includes(selected.id)}
        onToggleRoute={toggleRoute}
      />
    );
  }
  if (page === "saved") {
    return (
      <SavedView
        saved={saved}
        routeItems={routeItems}
        onBack={closeScreen}
        onOpen={setSelected}
        onToggleSave={toggleSave}
        onToggleRoute={toggleRoute}
        onGoToTours={() => {
          closeScreen();
          setTab("tours");
        }}
      />
    );
  }
  if (page === "tips") return <TipsScreen onBack={closeScreen} />;
  if (page === "privacy") return <PrivacyScreen onBack={closeScreen} />;
  if (page === "terms") return <PrivacyScreen kind="terms" onBack={closeScreen} />;
  if (page === "login") return <LoginScreen onBack={closeScreen} />;
  if (page === "agency" || page === "admin") {
    const Screen = page === "agency" ? AgencyScreen : AdminScreen;
    return (
      <ErrorBoundary full>
        <Suspense fallback={<Loader full />}>
          <Screen onExit={closeScreen} />
        </Suspense>
      </ErrorBoundary>
    );
  }

  return (
    <div className="gyg-app ornament-bg">
      <OfflineBanner />
      {tab === "home" && (
        <HomeView onGoTo={setTab} onOpenExp={setSelected} onOpenTips={() => setPage("tips")} onOpenBooking={openBookingById} />
      )}

      {tab === "map" && (
        <ExploreMap items={allTours} onOpen={setSelected} nav={navPlan} onNavEnd={() => setNavPlan(null)} />
      )}

      {tab === "route" && (
        <RouteView
          items={routeItems}
          setItems={setRouteItems}
          onGoToTours={() => setTab("tours")}
          onNavigate={(stops) => {
            if (stops.length === 0) return;
            setNavPlan({ stops });
            setTab("map");
          }}
        />
      )}

      {tab === "tours" && (
        <ToursView
          query={query}
          setQuery={setQuery}
          category={category}
          setCategory={setCategory}
          saved={saved}
          routeItems={routeItems}
          onOpen={setSelected}
          onToggleSave={toggleSave}
          onToggleRoute={toggleRoute}
        />
      )}

      {tab === "profile" && (
        <ProfileView
          account={account}
          onSaveAccount={updateAccount}
          bookings={bookings}
          onOpenTicket={setTicket}
          onOpenBooking={openBookingById}
          saved={saved}
          onOpenSaved={setSelected}
          onOpenSavedList={() => setPage("saved")}
          onOpenLogin={() => setPage("login")}
          onOpenAgency={() => setPage("agency")}
          onOpenAdmin={() => setPage("admin")}
          onOpenPrivacy={() => setPage("privacy")}
          onOpenTerms={() => setPage("terms")}
          onGoToTours={() => setTab("tours")}
        />
      )}

      <TabBar
        tabs={TABS.map((tb) => ({ id: tb.id, Icon: tb.Icon, accent: tb.accent, label: t(tb.key) }))}
        activeId={tab}
        label={t("nav.label")}
        minimized={navMin}
        onExpand={() => setNavMin(false)}
        onSelect={(id) => {
          setNavMin(false);
          setTab(id);
        }}
        onReselect={() => {
          setNavMin(false);
          window.scrollTo({ top: 0, behavior: "smooth" });
        }}
      />
    </div>
  );
}
