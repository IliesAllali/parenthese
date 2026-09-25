import { StrictMode } from 'react'
import { renderToString } from 'react-dom/server'
import App from './App.jsx'

// Rendu de la landing à la compilation (npm run build), injecté dans dist/index.html par scripts/prerender.mjs
export function render() {
  return renderToString(
    <StrictMode>
      <App />
    </StrictMode>,
  )
}
