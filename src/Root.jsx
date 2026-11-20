import { lazy, Suspense } from "react";
import { MotionConfig } from "motion/react";
import App from "./App.jsx";
import { ContentProvider } from "./ContentProvider.jsx";
import { ErrorBoundary, Loader } from "./Status.jsx";
import { PrivacyScreen } from "./Privacy.jsx";

// /agency — кабинет турагентства, /admin — модерация (playbooks/agency-cabinet).
// Грузятся отдельно, туристу этот код не нужен. На vercel все пути отдают index.html (vercel.json).
const AgencyApp = lazy(() => import("./agency/AgencyApp.jsx"));
const AdminApp = lazy(() => import("./agency/AdminApp.jsx"));

export default function Root() {
  const path = window.location.pathname.replace(/\/+$/, "");
  const Screen = path === "/agency" ? AgencyApp : path === "/admin" ? AdminApp : null;
  // /privacy — открытая ссылка на политику для App Store и Google Play
  if (path === "/privacy") {
    return (
      <MotionConfig reducedMotion="user">
        <PrivacyScreen onBack={() => window.location.assign("/")} />
      </MotionConfig>
    );
  }
  return (
    // «уменьшить движение» в ОС: остаётся только прозрачность
    <MotionConfig reducedMotion="user">
      <ErrorBoundary full>
      {Screen ? (
        <Suspense fallback={<Loader full />}>
          <Screen />
        </Suspense>
      ) : (
        <ContentProvider>
          <App />
        </ContentProvider>
      )}
      </ErrorBoundary>
    </MotionConfig>
  );
}
