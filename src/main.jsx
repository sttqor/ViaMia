import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { MotionConfig } from 'motion/react'
import './index.css'
import './screens.css'
import App from './App.jsx'
import { SettingsProvider } from './SettingsProvider.jsx'
import { ContentProvider } from './ContentProvider.jsx'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <SettingsProvider>
      <ContentProvider>
        {/* «уменьшить движение» в ОС: остаётся только прозрачность */}
        <MotionConfig reducedMotion="user">
          <App />
        </MotionConfig>
      </ContentProvider>
    </SettingsProvider>
  </StrictMode>,
)
