export function easeOutCubic(t) {
  return 1 - Math.pow(1 - t, 3)
}

export function getEntranceProgress(elapsed, startMs, duration, reducedMotion = false) {
  if (reducedMotion) return 1
  if (elapsed < startMs) return 0
  if (elapsed >= startMs + duration) return 1
  return easeOutCubic((elapsed - startMs) / duration)
}

export function seededFloat(id, salt = 0) {
  let hash = 2166136261 + salt
  for (let i = 0; i < id.length; i += 1) {
    hash = Math.imul(hash ^ id.charCodeAt(i), 16777619)
  }
  return (hash >>> 0) / 4294967295
}

export function lerp(current, target, factor) {
  return current + (target - current) * factor
}
