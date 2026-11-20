import { lazy, Suspense } from "react";
import { MotionConfig } from "motion/react";
import App from "./App.jsx";
import { ContentProvider } from "./ContentProvider.jsx";

// /agency — кабинет турагентства, /admin — модерация (playbooks/agency-cabinet).
// Грузятся отдельно, туристу этот код не нужен. На vercel все пути отдают index.html (vercel.json).
const AgencyApp = lazy(() => import("./agency/AgencyApp.jsx"));
const AdminApp = lazy(() => import("./agency/AdminApp.jsx"));

export default function Root() {
  const path = window.location.pathname.replace(/\/+$/, "");
  const Screen = path === "/agency" ? AgencyApp : path === "/admin" ? AdminApp : null;
  return (
    // «уменьшить движение» в ОС: остаётся только прозрачность
    <MotionConfig reducedMotion="user">
      {Screen ? (
        <Suspense fallback={null}>
          <Screen />
        </Suspense>
      ) : (
        <ContentProvider>
          <App />
        </ContentProvider>
      )}
    </MotionConfig>
  );
}
