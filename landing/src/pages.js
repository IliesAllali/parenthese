// Mesure d'audience des pages statiques (guides, aide, vidéo, vie privée), injectée au build
// par scripts/inject-pages.mjs. Mêmes événements et mêmes propriétés que la page d'accueil (App.jsx),
// et rien de plus que ce que décrit la page « Données et vie privée ».
import { analytics } from './analytics.js'

const params = new URLSearchParams(window.location.search)
// Provenance de l'arrivée (?source=newsletter…), sinon « direct », comme sur la page d'accueil
const arrival = params.get('source') || 'direct'
const lang = document.documentElement.lang?.startsWith('en') ? 'en' : 'fr'

const eventProps = (extra = {}) => ({
  source: arrival,
  referrer: document.referrer || 'none',
  viewport: window.innerWidth < 768 ? 'mobile' : 'desktop',
  lang,
  ...extra,
})

// Les liens vers l'app gardent la provenance de l'arrivée : un lecteur venu de ?source=newsletter
// ouvre la démo en newsletter, pas en « video ». Sans provenance, le lien garde celle de la page.
function forwardSource() {
  if (arrival === 'direct') return
  for (const link of document.querySelectorAll('a[href^="https://app.parenthese.io"]')) {
    const url = new URL(link.href)
    url.searchParams.set('source', arrival)
    link.href = url.toString()
  }
}

// Un clic vers la création de compte : le même événement que la page d'accueil (funnel PostHog)
function trackSignupClicks() {
  document.addEventListener('click', (event) => {
    const link = event.target.closest?.('a[href^="https://app.parenthese.io"]')
    if (!link || !link.href.includes('account=register')) return
    if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return
    event.preventDefault()
    analytics.captureThenNavigate('signup_cta_clicked', eventProps({ placement: 'page' }), link.href)
  })
}

function trackScroll() {
  const reached = { half: false, full: false }
  const onScroll = () => {
    const doc = document.documentElement
    const max = Math.max(0, doc.scrollHeight - window.innerHeight)
    const progress = max > 0 ? (window.scrollY || 0) / max : 1
    if (!reached.half && progress >= 0.5) {
      reached.half = true
      analytics.capture('scroll_depth_50', eventProps())
    }
    if (!reached.full && progress >= 0.99) {
      reached.full = true
      analytics.capture('scroll_depth_100', eventProps())
      window.removeEventListener('scroll', onScroll)
    }
  }
  window.addEventListener('scroll', onScroll, { passive: true })
}

// La vidéo de présentation (/video/) : une lecture par visite, avec le format regardé
function trackVideo() {
  let played = false
  for (const video of document.querySelectorAll('video')) {
    video.addEventListener('play', () => {
      if (played) return
      played = true
      analytics.capture('video_played', eventProps({ format: video.videoWidth > video.videoHeight ? '16x9' : '9x16' }))
    })
  }
}

function start() {
  forwardSource()
  trackSignupClicks()
  // PostHog après le premier rendu, comme main.jsx : les événements d'ici là partent à l'init
  if ('requestIdleCallback' in window) window.requestIdleCallback(() => analytics.init(), { timeout: 3000 })
  else window.setTimeout(() => analytics.init(), 1500)
  analytics.capture('page_viewed', eventProps())
  trackScroll()
  trackVideo()
}

// Une page préchargée (speculation rules) n'est comptée que si on l'ouvre vraiment
if (document.prerendering) document.addEventListener('prerenderingchange', start, { once: true })
else start()
