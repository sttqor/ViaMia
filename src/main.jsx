import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import './screens.css'
import Root from './Root.jsx'
import { SettingsProvider } from './SettingsProvider.jsx'
import { AuthProvider } from './AuthProvider.jsx'
import { initNative } from './native.js'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <SettingsProvider>
      <AuthProvider>
        <Root />
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
