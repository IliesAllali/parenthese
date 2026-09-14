import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import faviconUrl from './assets/Parenthese logo.svg?url'
import './index.css'
import App from './App.jsx'
import ErrorBoundary from './components/ErrorBoundary.jsx'
import { initAppAnalytics } from './utils/analytics.js'

const setFavicon = (href) => {
  if (typeof document === 'undefined') return

  const upsertLink = (selector, rel, type) => {
    const link = document.querySelector(selector) ?? document.createElement('link')
    link.rel = rel
    if (type) link.type = type
    link.href = href
    if (!link.parentNode) document.head.appendChild(link)
  }

  upsertLink(`link[rel~="icon"]`, 'icon', 'image/svg+xml')
  upsertLink(`link[rel="apple-touch-icon"]`, 'apple-touch-icon')
}

setFavicon(faviconUrl)
initAppAnalytics()

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </StrictMode>,
)
