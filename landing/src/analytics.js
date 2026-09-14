/**
 * PostHog analytics wrapper.
 * Activate by setting VITE_POSTHOG_KEY in your .env file.
 * Events are silently dropped when the key is absent.
 */

let ph = null
let initStarted = false
let enabled = false
const queuedEvents = []
const MAX_QUEUED_EVENTS = 100

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

    const key = import.meta.env.VITE_POSTHOG_KEY
    if (!key) return

    enabled = true
    import('posthog-js')
      .then(({ default: posthog }) => {
        posthog.init(key, {
          api_host: import.meta.env.VITE_POSTHOG_HOST || 'https://us.i.posthog.com',
          cross_subdomain_cookie: true,
          defaults: '2026-01-30',
          person_profiles: 'identified_only',
          autocapture: false,
          capture_pageview: false,
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
