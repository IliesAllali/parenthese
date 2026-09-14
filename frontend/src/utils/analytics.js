let ph = null
let initStarted = false
let enabled = false
const queuedEvents = []
const MAX_QUEUED_EVENTS = 100

function flushQueue() {
  if (!ph) return
  while (queuedEvents.length > 0) {
    const next = queuedEvents.shift()
    if (next.type === 'identify' && typeof ph.identify === 'function') {
      ph.identify(next.distinctId, next.properties)
      continue
    }
    if (next.type === 'reset' && typeof ph.reset === 'function') {
      ph.reset()
      continue
    }
    if (next.type === 'capture' && typeof ph.capture === 'function') {
      ph.capture(next.eventName, next.properties)
    }
  }
}

function normalizeRole(value) {
  return String(value || '').trim().toLowerCase()
}

export function initAppAnalytics() {
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
}

function fnv1aHash(input) {
  let hash = 0x811c9dc5
  for (let i = 0; i < input.length; i += 1) {
    hash ^= input.charCodeAt(i)
    hash = Math.imul(hash, 0x01000193)
  }
  return (hash >>> 0).toString(16)
}

export function toOpaqueTreeId(treeId) {
  if (!treeId) return ''
  return fnv1aHash(String(treeId))
}

export function toJourneyRole(rawRole) {
  const role = normalizeRole(rawRole)
  if (role === 'visitor') return 'visitor'
  if (role === 'contributor') return 'contributor_anon'
  return null
}

export function toInteractionMediaType(rawType) {
  const type = String(rawType || '').trim().toLowerCase()
  if (type === 'photo') return 'photo'
  if (type === 'video') return 'video'
  return 'text'
}

export function trackAppEvent(eventName, properties = {}) {
  if (!eventName) return

  if (ph && typeof ph.capture === 'function') {
    ph.capture(eventName, properties)
    return
  }

  if (!enabled) return
  if (queuedEvents.length >= MAX_QUEUED_EVENTS) return
  queuedEvents.push({ type: 'capture', eventName, properties })
}

export function identifyUser(distinctId, properties = {}) {
  const normalizedDistinctId = String(distinctId || '').trim()
  if (!normalizedDistinctId) return

  if (ph && typeof ph.identify === 'function') {
    ph.identify(normalizedDistinctId, properties)
    return
  }

  if (!enabled) return
  if (queuedEvents.length >= MAX_QUEUED_EVENTS) return
  queuedEvents.push({ type: 'identify', distinctId: normalizedDistinctId, properties })
}

export function resetUser() {
  if (ph && typeof ph.reset === 'function') {
    ph.reset()
    return
  }

  if (!enabled) return
  if (queuedEvents.length >= MAX_QUEUED_EVENTS) return
  queuedEvents.push({ type: 'reset' })
}
