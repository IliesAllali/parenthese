import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import { analytics } from './analytics.js'

// PostHog après le premier rendu : les événements émis avant sont mis en file et envoyés à l'init
const deferInit = () => analytics.init()
if ('requestIdleCallback' in window) window.requestIdleCallback(deferInit, { timeout: 3000 })
else window.setTimeout(deferInit, 1500)

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
