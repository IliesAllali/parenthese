/**
 * PostHog analytics wrapper.
 * Activate by setting VITE_POSTHOG_KEY in your .env file.
 * Events are silently dropped when the key is absent.
 */

const KEY = import.meta.env.VITE_POSTHOG_KEY
let ph = null
let initStarted = false
let enabled = Boolean(KEY)
const queuedEvents = []
const MAX_QUEUED_EVENTS = 100

// Une adresse d'arbre (/arbre/<slug>) peut arriver en referrer : elle ne part jamais chez PostHog.
// Même règle que frontend/src/utils/analytics.js.
function scrubTreeSlug(value) {
  if (typeof value === 'string') {
    return value
      .replace(/\/arbre\/[^/?#\s]+/g, '/arbre/:slug')
      .replace(/%2Farbre%2F(?:(?!%2F|%3F|%23)[^&#\s])+/gi, '%2Farbre%2F%3Aslug')
  }
  if (Array.isArray(value)) return value.map(scrubTreeSlug)
  if (value && typeof value === 'object' && !(value instanceof Date)) {
    return Object.fromEntries(Object.entries(value).map(([k, v]) => [k, scrubTreeSlug(v)]))
  }
  return value
}

export function scrubAnalyticsEvent(event) {
  if (!event) return event
  const next = { ...event }
  for (const key of ['properties', '$set', '$set_once']) {
    if (next[key]) next[key] = scrubTreeSlug(next[key])
  }
  return next
}

function flushQueue() {
  if (!ph || typeof ph.capture !== 'function') return
  while (queuedEvents.length > 0) {
    const next = queuedEvents.shift()
    ph.capture(next.event, next.props)
  }
}

export const analytics = {
  init() {
    if (initStarted) return
    initStarted = true

    if (!KEY) return

    import('posthog-js')
      .then(({ default: posthog }) => {
        posthog.init(KEY, {
          api_host: import.meta.env.VITE_POSTHOG_HOST || 'https://us.i.posthog.com',
          cross_subdomain_cookie: true,
          defaults: '2026-01-30',
          person_profiles: 'identified_only',
          autocapture: false,
          capture_pageview: false,
          disable_session_recording: true,
          // Aucun feature flag dans le code. Sans ça, /flags recevrait les propriétés de personne
          // ($initial_current_url...), que before_send ne voit pas.
          advanced_disable_flags: true,
          // Même verrouillage que l'app (frontend/src/utils/analytics.js) : rien d'activable depuis le tableau
          // de bord PostHog, aucun script externe
          capture_dead_clicks: false,
          capture_heatmaps: false,
          capture_exceptions: false,
          capture_performance: false,
          rageclick: false,
          disable_surveys: true,
          disable_product_tours: true,
          disable_web_experiments: true,
          disable_external_dependency_loading: true,
          before_send: scrubAnalyticsEvent,
        })
        ph = posthog
        flushQueue()
      })
      .catch(() => {
        enabled = false
        queuedEvents.length = 0
      })
  },

  capture(event, props = {}) {
    if (!event) return
    if (ph && typeof ph.capture === 'function') {
      ph.capture(event, props)
      return
    }

    if (!enabled) return
    if (queuedEvents.length >= MAX_QUEUED_EVENTS) return
    queuedEvents.push({ event, props })
  },
}
