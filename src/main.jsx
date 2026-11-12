import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import { SettingsProvider } from './SettingsProvider.jsx'
import { ContentProvider } from './ContentProvider.jsx'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <SettingsProvider>
      <ContentProvider>
        <App />
      </ContentProvider>
    </SettingsProvider>
  </StrictMode>,
)
