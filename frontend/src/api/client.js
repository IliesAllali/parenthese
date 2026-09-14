const rawApiBaseUrl = import.meta.env.VITE_API_BASE_URL
const defaultApiBaseUrl = import.meta.env.DEV ? 'http://localhost:4000' : ''
const API_BASE_URL = (rawApiBaseUrl ?? defaultApiBaseUrl).replace(/\/$/, '')

class ApiError extends Error {
  constructor(message, status, payload = null) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.payload = payload
  }
}

async function safeParseJson(text) {
  if (!text) {
    return null
  }

  try {
    return JSON.parse(text)
  } catch {
    return null
  }
}

async function apiRequest(path, options = {}) {
  const providedHeaders = options.headers || {}
  const hasExplicitContentType = Object.keys(providedHeaders).some((key) => key.toLowerCase() === 'content-type')

  const headers = {
    ...(options.body !== undefined && !hasExplicitContentType ? { 'Content-Type': 'application/json' } : {}),
    ...providedHeaders,
  }

  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers,
  })

  const text = await response.text()
  const payload = await safeParseJson(text)

  if (!response.ok) {
    throw new ApiError(payload?.error || `request_failed_${response.status}`, response.status, payload)
  }

  return payload
}

export { ApiError, API_BASE_URL, apiRequest }
