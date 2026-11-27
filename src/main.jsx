import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import './screens.css'
import Root from './Root.jsx'
import { SettingsProvider } from './SettingsProvider.jsx'
import { AuthProvider } from './AuthProvider.jsx'
import { RolesProvider } from './RolesProvider.jsx'
import { initNative, isNative, nativeOAuth } from './native.js'
import { unsubscribePush } from './push.js'
import { PushSync } from './PushSync.jsx'

// фото не загрузилось (нет сети) — вместо значка битой картинки песочная плашка (.img-broken в index.css)
window.addEventListener('error', (e) => {
  if (e.target instanceof HTMLImageElement) e.target.classList.add('img-broken')
}, true)

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <SettingsProvider>
      <AuthProvider oauth={isNative() ? nativeOAuth : undefined} beforeSignOut={unsubscribePush}>
        <RolesProvider>
          <PushSync />
          <Root />
        </RolesProvider>
      </AuthProvider>
    </SettingsProvider>
  </StrictMode>,
)

initNative()

// отчёты о падениях — только если задан ключ; без личных данных (почта/ip не уходят)
if (import.meta.env.VITE_SENTRY_DSN) {
  import('@sentry/react').then((Sentry) =>
    Sentry.init({ dsn: import.meta.env.VITE_SENTRY_DSN, sendDefaultPii: false }),
  )
}
