import { useCallback, useEffect, useState } from "react";
import { fetchAccountRoles } from "./api";
import { useAuth } from "./auth-context";
import { RolesContext } from "./roles-context";

export function RolesProvider({ children }) {
  const { user } = useAuth();
  const [state, setState] = useState({ agency: null, admin: false, for: null });
  const [tick, setTick] = useState(0);

  useEffect(() => {
    if (!user) return;
    let off = false;
    let retry;
    fetchAccountRoles(user.id)
      .then((r) => !off && setState({ ...r, for: user.id }))
      .catch(() => {
        // не знаем роли — не решаем за человека, пробуем снова
        if (!off) retry = setTimeout(() => setTick((x) => x + 1), 5000);
      });
    return () => {
      off = true;
      clearTimeout(retry);
    };
  }, [user, tick]);

  const refresh = useCallback(() => setTick((x) => x + 1), []);
  const ready = Boolean(user) && state.for === user.id;
  const agency = ready ? state.agency : null;
  const admin = ready && state.admin;
  const home = admin ? "/admin" : agency ? "/agency" : null;
  return <RolesContext.Provider value={{ agency, admin, ready, home, refresh }}>{children}</RolesContext.Provider>;
}
