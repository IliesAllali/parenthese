// Easing ease-out cubique
export function easeOutCubic(t) {
  return 1 - Math.pow(1 - t, 3)
}

// Progression d'entrée avec easing (retourne 0→1)
export function getEntranceProgress(elapsed, startMs, duration) {
  if (elapsed < startMs) return 0
  if (elapsed >= startMs + duration) return 1
  return easeOutCubic((elapsed - startMs) / duration)
}

// Dessiner une portion de Bézier cubique via subdivision De Casteljau
export function drawPartialBezier(ctx, x0, y0, cp1x, cp1y, cp2x, cp2y, x3, y3, t) {
  if (t <= 0) return
  if (t >= 1) {
    ctx.beginPath()
    ctx.moveTo(x0, y0)
    ctx.bezierCurveTo(cp1x, cp1y, cp2x, cp2y, x3, y3)
    ctx.stroke()
    return
  }
  const mt = 1 - t
  const q1x = mt * x0 + t * cp1x, q1y = mt * y0 + t * cp1y
  const q2x = mt * cp1x + t * cp2x, q2y = mt * cp1y + t * cp2y
  const q3x = mt * cp2x + t * x3, q3y = mt * cp2y + t * y3
  const r1x = mt * q1x + t * q2x, r1y = mt * q1y + t * q2y
  const r2x = mt * q2x + t * q3x, r2y = mt * q2y + t * q3y
  const sx = mt * r1x + t * r2x, sy = mt * r1y + t * r2y
  ctx.beginPath()
  ctx.moveTo(x0, y0)
  ctx.bezierCurveTo(q1x, q1y, r1x, r1y, sx, sy)
  ctx.stroke()
}
