import { StrictMode } from 'react'
import { createRoot, hydrateRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import { analytics } from './analytics.js'
import { localeFromPath } from './i18n.js'

// PostHog après le premier rendu : les événements émis avant sont mis en file et envoyés à l'init
const deferInit = () => analytics.init()
if ('requestIdleCallback' in window) window.requestIdleCallback(deferInit, { timeout: 3000 })
else window.setTimeout(deferInit, 1500)

const container = document.getElementById('root')
const app = (
  <StrictMode>
    <App locale={localeFromPath(window.location.pathname)} />
  </StrictMode>
)

// En production le HTML est prérendu (scripts/prerender.mjs) : on l'hydrate.
// En développement (vite dev) la racine est vide : rendu client classique.
if (container.hasChildNodes()) hydrateRoot(container, app)
else createRoot(container).render(app)
