import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { useContent } from "../../src/content-context";
import { useAccountSync } from "../../src/useAccountSync";

// Избранное, маршрут и брони — тот же ключ и формат, что в src/App.jsx (osh-guide-v1),
// и та же синхронизация с аккаунтом (src/useAccountSync.js)
const STORE_KEY = "osh-guide-v1";
const DEFAULT_ROUTE = ["self-sulaiman", "self-center", "self-jayma"];

function loadStore() {
  try {
    const raw = JSON.parse(localStorage.getItem(STORE_KEY) || "null");
    if (!raw) return null;
    return { saved: new Set(raw.saved || []), route: raw.route || [], bookings: (raw.bookings || []).filter((b) => b.exp) };
  } catch {
    return null;
  }
}

const StoreContext = createContext(null);
export const useStore = () => useContext(StoreContext);

export function StoreProvider({ children }) {
  const { byId } = useContent();
  const [initial] = useState(loadStore);
  const [saved, setSaved] = useState(() => initial?.saved || new Set());
  const [routeIds, setRouteIds] = useState(() => initial?.route || DEFAULT_ROUTE);
  const [bookings, setBookings] = useState(() => initial?.bookings || []);

  const { account, rememberContact } = useAccountSync({
    byId,
    saved,
    setSaved,
    routeIds,
    setRouteIds,
    setBookings,
    onSignedOut: () => {},
    defaultRoute: DEFAULT_ROUTE,
  });

  useEffect(() => {
    try {
      localStorage.setItem(STORE_KEY, JSON.stringify({ saved: [...saved], route: routeIds, bookings }));
    } catch {
      /* хранилище недоступно */
    }
  }, [saved, routeIds, bookings]);

  const value = useMemo(
    () => ({
      saved,
      routeIds,
      setRouteIds,
      routeItems: routeIds.map(byId).filter(Boolean),
      bookings,
      setBookings,
      account,
      rememberContact,
      toggleSave: (id) =>
        setSaved((prev) => {
          const next = new Set(prev);
          if (!next.delete(id)) next.add(id);
          return next;
        }),
      toggleRoute: (id) => setRouteIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id])),
    }),
    [saved, routeIds, bookings, byId, account, rememberContact]
  );

  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>;
}
