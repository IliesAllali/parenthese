import { StrictMode } from 'react'
import { renderToString } from 'react-dom/server'
import App from './App.jsx'

// Rendu de la landing à la compilation (npm run build), une fois par langue,
// injecté dans dist/index.html (fr) et dist/en/index.html (en) par scripts/prerender.mjs
export function render(locale = 'fr') {
  return renderToString(
    <StrictMode>
      <App locale={locale} />
    </StrictMode>,
  )
}
