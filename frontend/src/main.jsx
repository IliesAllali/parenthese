import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './assets/fonts/fonts.css'
import './index.css'
import App from './App.jsx'
import ErrorBoundary from './components/ErrorBoundary.jsx'
import BootLoader from './components/BootLoader.jsx'
import { initAppAnalytics } from './utils/analytics.js'
import { sweepLegacyLocalData } from './utils/localHygiene.js'
import { resetFavicon } from './utils/favicon.js'

sweepLegacyLocalData()
resetFavicon()
initAppAnalytics()

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <ErrorBoundary>
      <App />
      <BootLoader />
    </ErrorBoundary>
  </StrictMode>,
)
