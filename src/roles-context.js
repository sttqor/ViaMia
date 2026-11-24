import { createContext, useContext } from "react";

// Роли аккаунта: своё агентство и права админа. Агентство и админ работают в своём кабинете,
// а не в туристическом приложении (сайт — src/App.jsx, телефон — mobile/src/app/_layout.js).
// home — куда открывать: "/admin" | "/agency" | null (турист или ещё не знаем); refresh() — перечитать
export const RolesContext = createContext({ agency: null, admin: false, ready: false, home: null, refresh: () => {} });
export const useRoles = () => useContext(RolesContext);
