import { createContext, useCallback, useContext, useEffect, useState } from "react";
import { fetchAccountRoles } from "../../src/api";
import { useAuth } from "../../src/auth-context";

// Роли аккаунта: своё агентство и права админа. Агентство и админ живут в своём кабинете,
// а не в туристическом приложении (см. Screens в src/app/_layout.js).
// home — куда открывать: "/admin" | "/agency" | null (турист или ещё не знаем)
const RolesContext = createContext({ agency: null, admin: false, ready: false, home: null, refresh: () => {} });
export const useRoles = () => useContext(RolesContext);

export function RolesProvider({ children }) {
  const { user } = useAuth();
  const [state, setState] = useState({ agency: null, admin: false, for: null });
  const [tick, setTick] = useState(0);

  useEffect(() => {
    if (!user) return;
    let off = false;
    fetchAccountRoles(user.id)
      .then((r) => !off && setState({ ...r, for: user.id }))
      .catch(() => !off && setState({ agency: null, admin: false, for: user.id }));
    return () => {
      off = true;
    };
  }, [user, tick]);

  const refresh = useCallback(() => setTick((x) => x + 1), []);
  const ready = Boolean(user) && state.for === user.id;
  const agency = ready ? state.agency : null;
  const admin = ready && state.admin;
  const home = admin ? "/admin" : agency ? "/agency" : null;
  return <RolesContext.Provider value={{ agency, admin, ready, home, refresh }}>{children}</RolesContext.Provider>;
}
