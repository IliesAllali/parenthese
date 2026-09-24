import { getPersonById, getPersonMedias } from '../../data/mockData'
import { __iconNode as mapIconNode } from 'lucide-react/dist/esm/icons/map.js'
import { __iconNode as mapPinIconNode } from 'lucide-react/dist/esm/icons/map-pin.js'
import { __iconNode as routeIconNode } from 'lucide-react/dist/esm/icons/route.js'
import {
  PERSON_R, UNKNOWN_R, UNION_W, UNION_H,
  MAX_ORBIT_MEDIAS, ORBIT_MEDIA_SIZE,
  COLORS,
  LOD_SHADOW_MIN_SCALE, LOD_DETAIL_MIN_SCALE, LOD_LABEL_FADE_IN, LOD_LABEL_FADE_OUT, CULL_MARGIN,
} from './constants'
import { getEntranceProgress, drawPartialBezier } from './utils'

// ============================================================
// Culling : view = { x0, y0, x1, y1, scale } en coordonnées monde
// (null = tout dessiner). Un élément hors écran, marge comprise,
// n'est pas dessiné.
// ============================================================
function rectInView(view, minX, minY, maxX, maxY) {
  if (!view) return true
  return maxX >= view.x0 - CULL_MARGIN && minX <= view.x1 + CULL_MARGIN &&
    maxY >= view.y0 - CULL_MARGIN && minY <= view.y1 + CULL_MARGIN
}

function pointInView(view, cx, cy) {
  return rectInView(view, cx, cy, cx, cy)
}

// ============================================================
// Background
// ============================================================
export function drawBackground(ctx, canvas) {
  ctx.clearRect(0, 0, canvas.width, canvas.height)
  const baseGradient = ctx.createLinearGradient(0, 0, 0, canvas.height)
  baseGradient.addColorStop(0, '#FBFAF7')
  baseGradient.addColorStop(0.6, '#FBFAF7')
  baseGradient.addColorStop(1, '#FBFAF7')
  ctx.fillStyle = baseGradient
  ctx.fillRect(0, 0, canvas.width, canvas.height)

  const glowGradient = ctx.createRadialGradient(
    canvas.width * 0.14, canvas.height * 0.08, 50,
    canvas.width * 0.14, canvas.height * 0.08, canvas.width * 0.65
  )
  glowGradient.addColorStop(0, 'rgba(251, 250, 247, 0.2)')
  glowGradient.addColorStop(1, 'rgba(251, 250, 247, 0)')
  ctx.fillStyle = glowGradient
  ctx.fillRect(0, 0, canvas.width, canvas.height)
}

// ============================================================
// Helper: calcul des points Bézier couple (partagé entre
// drawCoupleLinks et drawPathHighlight)
// ============================================================
function computeCouplePoints(p1Pos, p2Pos, unionPos, p1R, p2R, nodeRandomData) {
  const p1Key = p1Pos._key
  const p2Key = p2Pos._key
  const rd1 = nodeRandomData.get(p1Key)
  const rd2 = nodeRandomData.get(p2Key)

  const isP1Left = p1Pos.cx < p2Pos.cx
  const leftPos = isP1Left ? p1Pos : p2Pos
  const rightPos = isP1Left ? p2Pos : p1Pos
  const leftR = isP1Left ? p1R : p2R
  const rightR = isP1Left ? p2R : p1R
  const rdLeft = isP1Left ? rd1 : rd2
  const rdRight = isP1Left ? rd2 : rd1

  const aL = 0 + (rdLeft?.anchorAngleOffset || 0)
  const sLx = leftPos.cx + Math.cos(aL) * leftR
  const sLy = leftPos.cy + Math.sin(aL) * leftR

  const aR = Math.PI + (rdRight?.anchorAngleOffset || 0)
  const sRx = rightPos.cx + Math.cos(aR) * rightR
  const sRy = rightPos.cy + Math.sin(aR) * rightR

  const jx = unionPos.cx
  const jy = unionPos.cy

  return { sLx, sLy, sRx, sRy, jx, jy }
}

function computeFiliationCurvePoints(sourcePos, targetPos, childR, anchorAngleOffset = 0) {
  const sx = sourcePos.cx
  const sy = sourcePos.cy
  const angleChild = -Math.PI / 2 + anchorAngleOffset
  const ex = targetPos.cx + Math.cos(angleChild) * childR
  const ey = targetPos.cy + Math.sin(angleChild) * childR
  const dy = ey - sy

  return {
    sx,
    sy,
    ex,
    ey,
    cp1x: sx,
    cp1y: sy + dy * 0.88,
    cp2x: ex,
    cp2y: ey - dy * 0.06,
  }
}

// ============================================================
// Courbes de couple (Bézier)
// ============================================================
export function drawCoupleLinks(ctx, coupleBarMeta, posMap, nodeMap, nodeRandomData, entrance, entranceActive, elapsed, view = null) {
  coupleBarMeta.forEach(({ elkId, p1Key, p2Key, virtual }) => {
    const p1Pos = posMap.get(p1Key)
    const p2Pos = posMap.get(p2Key)
    const unionPos = posMap.get(elkId)
    if (!p1Pos || !p2Pos || !unionPos) return
    if (!rectInView(view, Math.min(p1Pos.cx, p2Pos.cx), Math.min(p1Pos.cy, p2Pos.cy), Math.max(p1Pos.cx, p2Pos.cx), Math.max(p1Pos.cy, p2Pos.cy))) return

    const p1Node = nodeMap.get(p1Key)
    const p2Node = nodeMap.get(p2Key)
    const p1R = p1Node?._type === 'unknown' ? UNKNOWN_R : PERSON_R
    const p2R = p2Node?._type === 'unknown' ? UNKNOWN_R : PERSON_R

    // Entrance animation
    let coupleProgress = 1
    if (entranceActive) {
      const cs = entrance.coupleSchedule.get(elkId)
      if (cs) {
        coupleProgress = getEntranceProgress(elapsed, cs.startMs, cs.duration)
        if (coupleProgress === 0) return
      }
    }

    // Annotate positions with keys for computeCouplePoints
    const p1PosKeyed = { ...p1Pos, _key: p1Key }
    const p2PosKeyed = { ...p2Pos, _key: p2Key }
    const { sLx, sLy, sRx, sRy, jx, jy } = computeCouplePoints(
      p1PosKeyed, p2PosKeyed, unionPos, p1R, p2R, nodeRandomData
    )

    ctx.strokeStyle = virtual ? COLORS.linkUnknown : COLORS.link
    ctx.lineWidth = 0.5
    ctx.setLineDash(virtual ? [4, 4] : [])
    ctx.lineCap = 'round'
    ctx.globalAlpha = coupleProgress

    drawPartialBezier(ctx, sLx, sLy,
      sLx + (jx - sLx) * 0.55, sLy, jx - (jx - sLx) * 0.1, jy, jx, jy, coupleProgress)
    drawPartialBezier(ctx, sRx, sRy,
      sRx + (jx - sRx) * 0.55, sRy, jx - (jx - sRx) * 0.1, jy, jx, jy, coupleProgress)

    ctx.globalAlpha = 1
    ctx.setLineDash([])
  })
}

// ============================================================
// Filiations (Bézier union → enfant)
// ============================================================
export function drawFiliations(ctx, edges, posMap, nodeMap, nodeRandomData, entrance, entranceActive, elapsed, view = null) {
  if (!edges) return

  edges.forEach(edge => {
    const sourceId = edge.sources[0]
    const targetId = edge.targets[0]
    const sourcePos = posMap.get(sourceId)
    const targetPos = posMap.get(targetId)
    if (!sourcePos || !targetPos) return
    if (!rectInView(view, Math.min(sourcePos.cx, targetPos.cx), Math.min(sourcePos.cy, targetPos.cy), Math.max(sourcePos.cx, targetPos.cx), Math.max(sourcePos.cy, targetPos.cy))) return

    let edgeProgress = 1
    if (entranceActive) {
      const es = entrance.edgeSchedule.get(edge.id)
      if (es) {
        edgeProgress = getEntranceProgress(elapsed, es.startMs, es.duration)
        if (edgeProgress === 0) return
      }
    }

    const targetNode = nodeMap.get(targetId)
    const rdChild = nodeRandomData.get(targetId)
    const pType = edge._parentageType || 'biologique'

    if (pType === 'adoption') {
      ctx.setLineDash([8, 5])
      ctx.strokeStyle = COLORS.link
    } else if (pType === 'inconnu') {
      ctx.setLineDash([3, 3])
      ctx.strokeStyle = COLORS.linkUnknown
    } else {
      ctx.setLineDash([])
      ctx.strokeStyle = COLORS.link
    }
    ctx.lineWidth = 0.5
    ctx.lineCap = 'round'
    ctx.globalAlpha = Math.min(1, edgeProgress * 1.5)

    const childR = targetNode?._type === 'unknown' ? UNKNOWN_R : PERSON_R
    const { sx, sy, ex, ey, cp1x, cp1y, cp2x, cp2y } = computeFiliationCurvePoints(
      sourcePos,
      targetPos,
      childR,
      rdChild?.anchorAngleOffset || 0,
    )

    drawPartialBezier(ctx, sx, sy, cp1x, cp1y, cp2x, cp2y, ex, ey, edgeProgress)
    ctx.globalAlpha = 1
    ctx.setLineDash([])
  })
}

// ============================================================
// Path highlight (sélection + hover)
// ============================================================
export function drawPathHighlight(ctx, {
  pathEdgesRef, pathNodesRef, pathLabelAlpha,
  pathProgressRef, selectedElkId, hoveredNodeId,
  coupleBarMeta, posMap, nodeMap, nodeRandomData, layoutData,
}) {
  if (pathEdgesRef.length === 0 && pathLabelAlpha <= 0.01) return

  const highlightCoupleIds = new Set(
    pathEdgesRef.filter(e => e.type === 'couple').map(e => e.id)
  )
  const highlightFiliationIds = new Set(
    pathEdgesRef.filter(e => e.type === 'filiation').map(e => e.id)
  )

  // Re-dessiner les couples du chemin par-dessus
  coupleBarMeta.forEach(({ elkId, p1Key, p2Key }) => {
    if (!highlightCoupleIds.has(elkId)) return
    const hp = pathProgressRef.get(elkId) || 0
    if (hp < 0.01) return

    const p1Pos = posMap.get(p1Key)
    const p2Pos = posMap.get(p2Key)
    const unionPos = posMap.get(elkId)
    if (!p1Pos || !p2Pos || !unionPos) return

    const p1Node = nodeMap.get(p1Key)
    const p2Node = nodeMap.get(p2Key)
    const p1R = p1Node?._type === 'unknown' ? UNKNOWN_R : PERSON_R
    const p2R = p2Node?._type === 'unknown' ? UNKNOWN_R : PERSON_R

    const p1PosKeyed = { ...p1Pos, _key: p1Key }
    const p2PosKeyed = { ...p2Pos, _key: p2Key }
    const { sLx, sLy, sRx, sRy, jx, jy } = computeCouplePoints(
      p1PosKeyed, p2PosKeyed, unionPos, p1R, p2R, nodeRandomData
    )

    ctx.strokeStyle = `rgba(147, 64, 42, ${0.55 + 0.25 * hp})`
    ctx.lineWidth = 1.5 + 1.5 * hp
    ctx.setLineDash([])
    ctx.lineCap = 'round'
    ctx.globalAlpha = 1

    drawPartialBezier(ctx, sLx, sLy,
      sLx + (jx - sLx) * 0.55, sLy, jx - (jx - sLx) * 0.1, jy, jx, jy, hp)
    drawPartialBezier(ctx, sRx, sRy,
      sRx + (jx - sRx) * 0.55, sRy, jx - (jx - sRx) * 0.1, jy, jx, jy, hp)
  })

  // Re-dessiner les filiations du chemin par-dessus
  if (layoutData.edges) {
    layoutData.edges.forEach(edge => {
      if (!highlightFiliationIds.has(edge.id)) return
      const hp = pathProgressRef.get(edge.id) || 0
      if (hp < 0.01) return

      const sourcePos = posMap.get(edge.sources[0])
      const targetPos = posMap.get(edge.targets[0])
      if (!sourcePos || !targetPos) return

      const targetNode = nodeMap.get(edge.targets[0])
      const rdChild = nodeRandomData.get(edge.targets[0])
      const childR = targetNode?._type === 'unknown' ? UNKNOWN_R : PERSON_R
      const { sx, sy, ex, ey, cp1x, cp1y, cp2x, cp2y } = computeFiliationCurvePoints(
        sourcePos,
        targetPos,
        childR,
        rdChild?.anchorAngleOffset || 0,
      )

      ctx.strokeStyle = `rgba(147, 64, 42, ${0.55 + 0.25 * hp})`
      ctx.lineWidth = 1.5 + 1.5 * hp
      ctx.setLineDash([])
      ctx.lineCap = 'round'
      ctx.globalAlpha = 1

      drawPartialBezier(ctx, sx, sy, cp1x, cp1y, cp2x, cp2y, ex, ey, hp)
    })
  }

  // Glow subtil sur les noeuds intermédiaires du chemin
  for (const nodeId of pathNodesRef) {
    if (!nodeId.startsWith('p-')) continue
    if (nodeId === selectedElkId || nodeId === hoveredNodeId) continue
    const hp = pathProgressRef.get(nodeId) || 0
    if (hp < 0.01) continue
    const pos = posMap.get(nodeId)
    if (!pos) continue
    const pathGlowR = PERSON_R + 10
    const pathGlow = ctx.createRadialGradient(pos.cx, pos.cy, PERSON_R * 0.7, pos.cx, pos.cy, pathGlowR)
    pathGlow.addColorStop(0, `rgba(147, 64, 42, ${0.12 * hp})`)
    pathGlow.addColorStop(1, 'rgba(147, 64, 42, 0)')
    ctx.fillStyle = pathGlow
    ctx.beginPath()
    ctx.arc(pos.cx, pos.cy, pathGlowR, 0, Math.PI * 2)
    ctx.fill()
  }

  ctx.globalAlpha = 1
  ctx.setLineDash([])
}

// ============================================================
// Mesures de texte mises en cache (une par police + libellé).
// measureText est appelé pour chaque personne à chaque frame ;
// le cache est vidé quand les polices web finissent de charger.
// ============================================================
const textMetricsCache = new Map()
if (typeof document !== 'undefined' && document.fonts?.ready) {
  document.fonts.ready.then(() => textMetricsCache.clear())
}

function measureTextCached(ctx, text, fontKey) {
  const key = `${fontKey}|${text}`
  let m = textMetricsCache.get(key)
  if (!m) {
    const raw = ctx.measureText(text)
    m = {
      width: raw.width,
      actualBoundingBoxAscent: raw.actualBoundingBoxAscent,
      actualBoundingBoxDescent: raw.actualBoundingBoxDescent,
    }
    textMetricsCache.set(key, m)
  }
  return m
}

// ============================================================
// Dessiner un noeud personne (photo + cadre + labels)
// ============================================================
function drawPersonNode(ctx, node, pos, nodeProgress, {
  nodeRandomData, imageCache, hoverScales, selectedGlowScales, searchGlowScales,
  mediaHoverState, entrance, entranceActive, elapsed, view = null,
}) {
  const { cx, cy } = pos
  const person = getPersonById(node._data.id) || node._data
  const rd = nodeRandomData.get(node.id)
  const img = person.photo ? imageCache.get(person.photo) : null
  const frameType = resolveFrameType(person, img)
  const frameRot = rd?.frameRotation || 0
  const personMedias = getPersonMedias(person.id)

  // --- Niveau de détail selon le zoom ---
  const scale = view?.scale ?? 1
  const withDetail = scale >= LOD_DETAIL_MIN_SCALE
  const withShadow = scale >= LOD_SHADOW_MIN_SCALE
  const labelAlpha = Math.min(1, Math.max(0, (scale - LOD_LABEL_FADE_OUT) / (LOD_LABEL_FADE_IN - LOD_LABEL_FADE_OUT)))

  // --- Memory Orbit : médias satellites ---
  const orbitSlots = rd?.orbitSlots || []
  const orbitCount = withDetail ? Math.min(personMedias.length, MAX_ORBIT_MEDIAS) : 0
  for (let i = 0; i < orbitCount; i++) {
    const media = personMedias[i]
    const slot = orbitSlots[i]
    if (!slot) continue

    const mhKey = `${node.id}:${i}`

    let orbitProgress = 1
    if (entranceActive) {
      const os = entrance.orbitSchedule.get(mhKey)
      if (os) {
        orbitProgress = getEntranceProgress(elapsed, os.startMs, os.duration)
        if (orbitProgress === 0) continue
      }
    }

    const mh = mediaHoverState.get(mhKey) || { scale: 0, dx: 0, dy: 0 }
    const mx = cx + Math.cos(slot.angle) * slot.dist + mh.dx
    const my = cy + Math.sin(slot.angle) * slot.dist + mh.dy
    const ms = ORBIT_MEDIA_SIZE
    const orbitEntranceScale = 0.3 + orbitProgress * 0.7
    const mediaScale = orbitEntranceScale * (1 + mh.scale * 0.18)

    ctx.save()
    ctx.globalAlpha = nodeProgress * orbitProgress
    ctx.translate(mx, my)
    ctx.scale(mediaScale, mediaScale)
    ctx.rotate(slot.rot)

    if (withShadow) {
      ctx.shadowColor = 'rgba(42, 38, 34, 0.18)'
      ctx.shadowBlur = 4
      ctx.shadowOffsetY = 1
    }

    const pad = 2
    ctx.fillStyle = '#FFFFFF'
    ctx.beginPath()
    ctx.roundRect(-ms - pad, -ms - pad, (ms + pad) * 2, (ms + pad) * 2 + 4, 2)
    ctx.fill()

    ctx.shadowColor = 'transparent'
    ctx.shadowBlur = 0

    drawMediaContent(ctx, media, ms, imageCache)

    ctx.restore()
  }

  // --- Hover scale + entrance scale ---
  const hs = hoverScales.get(node.id) || 0
  const entranceScale = 0.3 + nodeProgress * 0.7
  const personScale = entranceScale * (1 + hs * 0.1)

  // --- Glow sélection ---
  const sg = selectedGlowScales.get(node.id) || 0
  if (sg > 0.001) {
    const selGlowR = PERSON_R + 24 + sg * 14
    const selAlpha = sg * 0.38 * nodeProgress
    const selGlow = ctx.createRadialGradient(cx, cy, PERSON_R * 0.3, cx, cy, selGlowR)
    selGlow.addColorStop(0, `rgba(210, 105, 74, ${selAlpha})`)
    selGlow.addColorStop(0.5, `rgba(210, 105, 74, ${selAlpha * 0.45})`)
    selGlow.addColorStop(1, 'rgba(210, 105, 74, 0)')
    ctx.fillStyle = selGlow
    ctx.beginPath()
    ctx.arc(cx, cy, selGlowR, 0, Math.PI * 2)
    ctx.fill()
  }

  // --- Glow recherche (jaune) ---
  const srch = (searchGlowScales || new Map()).get(node.id) || 0
  if (srch > 0.001) {
    const searchGlowR = PERSON_R + 28 + srch * 18
    const searchAlpha = srch * 0.55 * nodeProgress
    const searchGlow = ctx.createRadialGradient(cx, cy, PERSON_R * 0.25, cx, cy, searchGlowR)
    searchGlow.addColorStop(0, `rgba(210, 105, 74, ${searchAlpha})`)
    searchGlow.addColorStop(0.5, `rgba(210, 105, 74, ${searchAlpha * 0.55})`)
    searchGlow.addColorStop(1, 'rgba(210, 105, 74, 0)')
    ctx.fillStyle = searchGlow
    ctx.beginPath()
    ctx.arc(cx, cy, searchGlowR, 0, Math.PI * 2)
    ctx.fill()

  }

  // --- Halo glow ---
  if (withDetail) {
    const glowR = PERSON_R + 12 + hs * 6
    const glowAlpha = (person.isAlive ? 0.15 + hs * 0.1 : 0.08 + hs * 0.06) * nodeProgress
    const glow = ctx.createRadialGradient(cx, cy, PERSON_R * 0.6, cx, cy, glowR)
    glow.addColorStop(0, `rgba(147, 64, 42, ${glowAlpha})`)
    glow.addColorStop(1, 'rgba(147, 64, 42, 0)')
    ctx.fillStyle = glow
    ctx.beginPath()
    ctx.arc(cx, cy, glowR, 0, Math.PI * 2)
    ctx.fill()
  }

  // --- Cadre photo ---
  ctx.save()
  ctx.globalAlpha = nodeProgress
  ctx.translate(cx, cy)
  ctx.scale(personScale, personScale)
  ctx.rotate(frameRot)

  if (withShadow) {
    const shadowBlur = 10 + hs * 14
    const shadowY = 3 + hs * 4
    const shadowAlpha = 0.15 + hs * 0.1
    ctx.shadowColor = `rgba(42, 38, 34, ${shadowAlpha})`
    ctx.shadowBlur = shadowBlur
    ctx.shadowOffsetX = 0
    ctx.shadowOffsetY = shadowY
  }

  drawFrame(ctx, frameType, person, img)
  ctx.restore()

  // --- Labels (estompés puis absents en dézoom) ---
  if (labelAlpha <= 0) return
  const labelRot = rd?.labelRotation || 0
  const labelOffsetY = (PERSON_R + 24) * personScale
  ctx.save()
  ctx.globalAlpha = nodeProgress * labelAlpha
  ctx.translate(cx, cy + labelOffsetY)
  ctx.rotate(labelRot)

  ctx.font = '400 13px "Newsreader", Georgia, serif'
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  const nameLabel = person.firstName || ''
  if (nameLabel) {
    if (withDetail) {
      const nameMetrics = measureTextCached(ctx, nameLabel, 'name')
      const nameBlockH = Math.max(
        18,
        (nameMetrics.actualBoundingBoxAscent || 7) + (nameMetrics.actualBoundingBoxDescent || 4) + 8,
      )
      const labelGlowY = 6
      const labelGlowRx = Math.max(26, Math.round(nameMetrics.width * 0.62))
      const labelGlowRy = Math.max(16, Math.round(nameBlockH * 1.15))
      const labelGlow = ctx.createRadialGradient(0, labelGlowY, 0, 0, labelGlowY, labelGlowRx)
      labelGlow.addColorStop(0, 'rgba(251, 250, 247, 0.98)')
      labelGlow.addColorStop(0.38, 'rgba(251, 250, 247, 0.82)')
      labelGlow.addColorStop(0.72, 'rgba(251, 250, 247, 0.34)')
      labelGlow.addColorStop(1, 'rgba(251, 250, 247, 0)')

      ctx.save()
      ctx.fillStyle = labelGlow
      ctx.scale(1, labelGlowRy / labelGlowRx)
      ctx.beginPath()
      ctx.arc(0, labelGlowY * (labelGlowRx / labelGlowRy), labelGlowRx, 0, Math.PI * 2)
      ctx.fill()
      ctx.restore()
    }

    ctx.fillStyle = COLORS.text
    ctx.fillText(nameLabel, 0, 0)
  }

  if (withDetail) {
    ctx.font = '400 11px "DM Sans", system-ui, sans-serif'
    ctx.fillStyle = COLORS.textLight
    const birthYearLabel = person.birthYear ?? '-'
    const years = person.deathYear ? `${birthYearLabel}–${person.deathYear}` : `${birthYearLabel}`
    ctx.fillText(years, 0, 15)
  }

  ctx.restore()
}

// ============================================================
// Dessiner le contenu d'un média (selon type)
// ============================================================
const lucidePathCache = new Map()

function getCachedPath2D(pathData) {
  if (!pathData) return null
  if (!lucidePathCache.has(pathData)) {
    lucidePathCache.set(pathData, new Path2D(pathData))
  }
  return lucidePathCache.get(pathData)
}

function num(value, fallback = 0) {
  const n = Number(value)
  return Number.isFinite(n) ? n : fallback
}

function drawLucideIcon(ctx, iconNode, x, y, size, color, lineWidth = 1.9, alpha = 1) {
  if (!Array.isArray(iconNode) || iconNode.length === 0 || size <= 0) return

  const unit = size / 24
  ctx.save()
  ctx.translate(x - size / 2, y - size / 2)
  ctx.scale(unit, unit)
  ctx.globalAlpha *= alpha
  ctx.strokeStyle = color
  ctx.lineWidth = lineWidth / unit
  ctx.lineCap = 'round'
  ctx.lineJoin = 'round'

  for (const node of iconNode) {
    const [tag, attrs] = node
    if (!attrs || typeof attrs !== 'object') continue

    if (tag === 'path') {
      const p = getCachedPath2D(attrs.d)
      if (p) ctx.stroke(p)
    } else if (tag === 'circle') {
      const cx = num(attrs.cx, 0)
      const cy = num(attrs.cy, 0)
      const r = num(attrs.r, 0)
      ctx.beginPath()
      ctx.arc(cx, cy, r, 0, Math.PI * 2)
      ctx.stroke()
    }
  }

  ctx.restore()
}

function drawMapThumbnailBase(ctx, ms, palette) {
  const size = ms * 2
  const tileStep = Math.max(4, ms * 0.5)

  ctx.save()
  ctx.beginPath()
  ctx.roundRect(-ms, -ms, size, size, 2)
  ctx.clip()

  const bg = ctx.createLinearGradient(-ms, -ms, ms, ms)
  bg.addColorStop(0, palette.bgA)
  bg.addColorStop(1, palette.bgB)
  ctx.fillStyle = bg
  ctx.fillRect(-ms, -ms, size, size)

  const vignette = ctx.createRadialGradient(0, 0, ms * 0.2, 0, 0, ms * 1.2)
  vignette.addColorStop(0, 'rgba(255, 255, 255, 0)')
  vignette.addColorStop(1, palette.vignette || 'rgba(42, 38, 34, 0.06)')
  ctx.fillStyle = vignette
  ctx.fillRect(-ms, -ms, size, size)

  ctx.strokeStyle = palette.grid
  ctx.lineWidth = 0.5
  for (let x = -ms; x <= ms; x += tileStep) {
    ctx.beginPath()
    ctx.moveTo(x, -ms)
    ctx.lineTo(x, ms)
    ctx.stroke()
  }
  for (let y = -ms; y <= ms; y += tileStep) {
    ctx.beginPath()
    ctx.moveTo(-ms, y)
    ctx.lineTo(ms, y)
    ctx.stroke()
  }

  if (palette.fold) {
    const foldSize = ms * 0.34
    ctx.fillStyle = palette.fold
    ctx.beginPath()
    ctx.moveTo(ms - foldSize, -ms)
    ctx.lineTo(ms, -ms)
    ctx.lineTo(ms, -ms + foldSize)
    ctx.closePath()
    ctx.fill()
  }

  ctx.restore()

  ctx.strokeStyle = palette.border
  ctx.lineWidth = 0.9
  ctx.beginPath()
  ctx.roundRect(-ms, -ms, size, size, 2)
  ctx.stroke()
}

function drawGeoJsonThumbnail(ctx, ms) {
  drawMapThumbnailBase(ctx, ms, {
    bgA: '#EEF7EE',
    bgB: '#DFEDDF',
    grid: 'rgba(72, 115, 90, 0.13)',
    border: 'rgba(72, 115, 90, 0.52)',
    fold: 'rgba(72, 115, 90, 0.13)',
    vignette: 'rgba(46, 80, 60, 0.08)',
  })

  drawLucideIcon(ctx, mapIconNode, 0, 0, ms * 1.45, 'rgba(61, 110, 84, 0.52)', 1.85, 1)
  drawLucideIcon(ctx, mapPinIconNode, ms * 0.28, ms * 0.02, ms * 0.72, 'rgba(255, 255, 255, 0.92)', 2.2, 1)
  drawLucideIcon(ctx, mapPinIconNode, ms * 0.28, ms * 0.02, ms * 0.72, '#2F6B4E', 1.65, 1)
}

function drawGpxThumbnail(ctx, ms) {
  drawMapThumbnailBase(ctx, ms, {
    bgA: '#EEF5FC',
    bgB: '#DEEAF8',
    grid: 'rgba(56, 103, 145, 0.13)',
    border: 'rgba(56, 103, 145, 0.52)',
    fold: 'rgba(56, 103, 145, 0.13)',
    vignette: 'rgba(32, 70, 104, 0.08)',
  })

  drawLucideIcon(ctx, mapIconNode, 0, 0, ms * 1.45, 'rgba(58, 103, 143, 0.45)', 1.75, 0.95)
  drawLucideIcon(ctx, routeIconNode, 0, 0, ms * 1.02, 'rgba(255, 255, 255, 0.96)', 2.2, 1)
  drawLucideIcon(ctx, routeIconNode, 0, 0, ms * 1.02, '#3A678F', 1.35, 1)
}

function drawMediaContent(ctx, media, ms, imageCache) {
  const mImg = media.url ? imageCache.get(media.url) : null

  if (media.type === 'photo' && mImg) {
    ctx.save()
    ctx.beginPath()
    ctx.roundRect(-ms, -ms, ms * 2, ms * 2, 1)
    ctx.clip()
    ctx.drawImage(mImg, -ms, -ms, ms * 2, ms * 2)
    ctx.restore()
  } else if (media.type === 'video') {
    ctx.fillStyle = '#3D3731'
    ctx.beginPath()
    ctx.roundRect(-ms, -ms, ms * 2, ms * 2, 1)
    ctx.fill()
    ctx.fillStyle = '#FFFFFF'
    for (let p = 0; p < 4; p++) {
      const py = -ms + 4 + p * (ms * 2 - 6) / 3
      ctx.fillRect(-ms + 1.5, py, 3, 3)
      ctx.fillRect(ms - 4.5, py, 3, 3)
    }
    const innerPad = 5
    ctx.fillStyle = '#2A2622'
    ctx.fillRect(-ms + innerPad, -ms + 2, (ms - innerPad) * 2, ms * 2 - 4)
    ctx.fillStyle = 'rgba(255, 255, 255, 0.7)'
    ctx.beginPath()
    ctx.moveTo(-4, -5)
    ctx.lineTo(-4, 5)
    ctx.lineTo(5, 0)
    ctx.closePath()
    ctx.fill()
  } else if (media.type === 'audio') {
    ctx.fillStyle = '#2A2622'
    ctx.beginPath()
    ctx.arc(0, 0, ms, 0, Math.PI * 2)
    ctx.fill()
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.08)'
    ctx.lineWidth = 0.5
    for (let r = 5; r < ms; r += 3) {
      ctx.beginPath()
      ctx.arc(0, 0, r, 0, Math.PI * 2)
      ctx.stroke()
    }
    ctx.fillStyle = '#93402A'
    ctx.beginPath()
    ctx.arc(0, 0, 6, 0, Math.PI * 2)
    ctx.fill()
    ctx.fillStyle = '#2A2622'
    ctx.beginPath()
    ctx.arc(0, 0, 1.5, 0, Math.PI * 2)
    ctx.fill()
  } else if (media.type === 'document') {
    ctx.fillStyle = '#FCF3EF'
    ctx.beginPath()
    ctx.moveTo(-ms, -ms)
    ctx.lineTo(ms - 5, -ms)
    ctx.lineTo(ms, -ms + 5)
    ctx.lineTo(ms, ms)
    ctx.lineTo(-ms, ms)
    ctx.closePath()
    ctx.fill()
    ctx.fillStyle = '#E6E1DA'
    ctx.beginPath()
    ctx.moveTo(ms - 5, -ms)
    ctx.lineTo(ms - 5, -ms + 5)
    ctx.lineTo(ms, -ms + 5)
    ctx.closePath()
    ctx.fill()
    ctx.fillStyle = 'rgba(42, 38, 34, 0.15)'
    for (let l = 0; l < 5; l++) {
      const ly = -ms + 8 + l * 6
      const lw = l === 4 ? ms * 0.6 : ms * 1.4
      ctx.fillRect(-ms + 4, ly, lw, 1.5)
    }
  } else if (media.type === 'geojson') {
    drawGeoJsonThumbnail(ctx, ms)
  } else if (media.type === 'gpx') {
    drawGpxThumbnail(ctx, ms)
  } else if (media.type === 'citation') {
    ctx.fillStyle = '#F8E4DB'
    ctx.beginPath()
    ctx.roundRect(-ms, -ms, ms * 2, ms * 2, 1)
    ctx.fill()
    ctx.fillStyle = 'rgba(147, 64, 42, 0.12)'
    ctx.fillRect(-6, -ms, 12, 3)
    ctx.fillStyle = '#93402A'
    ctx.font = `400 ${ms * 1.1}px "Newsreader", Georgia, serif`
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillText('„', 0, -ms * 0.4)
  } else {
    ctx.fillStyle = '#EBE6DF'
    ctx.beginPath()
    ctx.roundRect(-ms, -ms, ms * 2, ms * 2, 1)
    ctx.fill()
  }
}

// ============================================================
// Dessiner le cadre photo (polaroid, rect, round)
// ============================================================
function resolveFrameType(person, img) {
  const fallback = person.frameType || 'round'

  if (!img || !img.naturalWidth || !img.naturalHeight) {
    return fallback
  }

  const ratio = img.naturalWidth / img.naturalHeight

  if (ratio >= 1.28) {
    return 'rect'
  }

  if (ratio <= 0.78) {
    return 'polaroid'
  }

  // Photo carrée ou presque : chaque personne garde sa forme tirée au hasard
  // (person.frameType, voir pickFrameType), pour que l'arbre ne soit pas uniforme
  return fallback
}

function drawFrame(ctx, frameType, person, img) {
  if (frameType === 'polaroid') {
    const pw = PERSON_R + 4
    const ph = PERSON_R + 4
    const padSide = 4
    const padBottom = 10
    ctx.fillStyle = '#FFFFFF'
    ctx.beginPath()
    ctx.roundRect(-pw - padSide, -ph - padSide, (pw + padSide) * 2, (ph + padSide) + ph + padBottom, 3)
    ctx.fill()
    ctx.shadowColor = 'transparent'
    ctx.shadowBlur = 0
    ctx.strokeStyle = 'rgba(42, 38, 34, 0.08)'
    ctx.lineWidth = 0.5
    ctx.stroke()
    ctx.beginPath()
    ctx.roundRect(-pw, -ph, pw * 2, ph * 2, 2)
    ctx.clip()
    drawPersonImage(ctx, img, person, -pw, -ph, pw * 2, ph * 2)
  } else if (frameType === 'square') {
    const s = PERSON_R + 4
    const pad = 3
    ctx.fillStyle = '#FFFFFF'
    ctx.beginPath()
    ctx.roundRect(-s - pad, -s - pad, (s + pad) * 2, (s + pad) * 2, 4)
    ctx.fill()
    ctx.shadowColor = 'transparent'
    ctx.shadowBlur = 0
    ctx.strokeStyle = 'rgba(42, 38, 34, 0.08)'
    ctx.lineWidth = 0.5
    ctx.stroke()
    ctx.beginPath()
    ctx.roundRect(-s, -s, s * 2, s * 2, 2)
    ctx.clip()
    drawPersonImage(ctx, img, person, -s, -s, s * 2, s * 2)
  } else if (frameType === 'rect') {
    const ratio = img?.naturalWidth && img?.naturalHeight
      ? img.naturalWidth / img.naturalHeight
      : 1
    // Photo carrée : cadre vertical, qui garde le visage entier
    const isLandscape = ratio > 1.05
    const rw = isLandscape ? PERSON_R + 12 : PERSON_R + 2
    const rh = isLandscape ? PERSON_R - 8 : PERSON_R + 6
    const pad = 3
    ctx.fillStyle = '#FFFFFF'
    ctx.beginPath()
    ctx.roundRect(-rw - pad, -rh - pad, (rw + pad) * 2, (rh + pad) * 2, 5)
    ctx.fill()
    ctx.shadowColor = 'transparent'
    ctx.shadowBlur = 0
    ctx.strokeStyle = 'rgba(42, 38, 34, 0.08)'
    ctx.lineWidth = 0.5
    ctx.stroke()
    ctx.beginPath()
    ctx.roundRect(-rw, -rh, rw * 2, rh * 2, 3)
    ctx.clip()
    drawPersonImage(ctx, img, person, -rw, -rh, rw * 2, rh * 2)
  } else {
    ctx.fillStyle = '#FFFFFF'
    ctx.beginPath()
    ctx.arc(0, 0, PERSON_R + 3, 0, Math.PI * 2)
    ctx.fill()
    ctx.shadowColor = 'transparent'
    ctx.shadowBlur = 0
    ctx.strokeStyle = person.isAlive ? COLORS.borderAlive : COLORS.borderDead
    ctx.lineWidth = 1
    ctx.setLineDash([])
    ctx.stroke()
    ctx.beginPath()
    ctx.arc(0, 0, PERSON_R, 0, Math.PI * 2)
    ctx.clip()
    drawPersonImage(ctx, img, person, -PERSON_R, -PERSON_R, PERSON_R * 2, PERSON_R * 2)
  }
}

// ============================================================
// Dessiner l'image ou le placeholder initiales
// ============================================================
function drawPersonImage(ctx, img, person, x, y, w, h) {
  if (img) {
    drawImageCover(ctx, img, x, y, w, h)
    if (!person.isAlive) {
      ctx.fillStyle = 'rgba(235, 230, 223, 0.25)'
      ctx.fillRect(x, y, w, h)
    }
  } else {
    ctx.fillStyle = person.isAlive ? COLORS.nodeAlive : COLORS.nodeDead
    ctx.fillRect(x, y, w, h)
    ctx.fillStyle = COLORS.text
    ctx.font = '400 16px "Newsreader", Georgia, serif'
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillText((person.firstName[0] || '') + (person.lastName[0] || ''), 0, 0)
  }
}

function drawImageCover(ctx, img, x, y, w, h) {
  const sourceW = img.naturalWidth || img.width
  const sourceH = img.naturalHeight || img.height

  if (!sourceW || !sourceH || !w || !h) {
    return
  }

  const sourceRatio = sourceW / sourceH
  const targetRatio = w / h

  let sx = 0
  let sy = 0
  let sw = sourceW
  let sh = sourceH

  if (sourceRatio > targetRatio) {
    sw = sourceH * targetRatio
    sx = (sourceW - sw) / 2
  } else if (sourceRatio < targetRatio) {
    sh = sourceW / targetRatio
    sy = (sourceH - sh) / 2
  }

  ctx.drawImage(img, sx, sy, sw, sh, x, y, w, h)
}

// ============================================================
// Dessiner tous les noeuds
// ============================================================
export function drawNodes(ctx, layoutData, posMap, entrance, entranceActive, elapsed, renderState) {
  const view = renderState.view || null
  layoutData.children.forEach(node => {
    const pos = posMap.get(node.id)
    if (!pos) return
    const { cx, cy } = pos
    if (!pointInView(view, cx, cy)) return

    let nodeProgress = 1
    if (entranceActive) {
      const ns = entrance.nodeSchedule.get(node.id)
      if (ns) {
        nodeProgress = getEntranceProgress(elapsed, ns.startMs, ns.duration)
        if (nodeProgress === 0) return
      }
    }

    if (node._type === 'person') {
      drawPersonNode(ctx, node, pos, nodeProgress, renderState)
    } else if (node._type === 'union') {
      ctx.globalAlpha = nodeProgress
      ctx.fillStyle = COLORS.link
      ctx.beginPath()
      ctx.arc(cx, cy, 2 * nodeProgress, 0, Math.PI * 2)
      ctx.fill()
      ctx.globalAlpha = 1
    } else if (node._type === 'unknown') {
      const unknownScale = 0.3 + nodeProgress * 0.7
      ctx.save()
      ctx.globalAlpha = nodeProgress
      ctx.translate(cx, cy)
      ctx.scale(unknownScale, unknownScale)

      ctx.fillStyle = COLORS.placeholderFill
      ctx.beginPath()
      ctx.arc(0, 0, UNKNOWN_R, 0, Math.PI * 2)
      ctx.fill()

      ctx.strokeStyle = COLORS.placeholderBorder
      ctx.lineWidth = 1.5
      ctx.setLineDash([4, 3])
      ctx.stroke()
      ctx.setLineDash([])

      ctx.fillStyle = COLORS.placeholder
      ctx.font = '400 16px "DM Sans", system-ui, sans-serif'
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'
      ctx.fillText('?', 0, 0)

      ctx.font = '400 italic 10px "Newsreader", Georgia, serif'
      ctx.textBaseline = 'top'
      ctx.fillText('Inconnu', 0, UNKNOWN_R + 4)
      ctx.restore()
    }
  })
}

// ============================================================
// Annotations (drawing, sticker, text)
// ============================================================

function drawDrawingAnnotation(ctx, ann) {
  let paths
  try {
    const parsed = typeof ann.content === 'string' ? JSON.parse(ann.content) : ann.content
    paths = parsed.paths || []
  } catch {
    return
  }

  for (const path of paths) {
    if (!path.points || path.points.length < 2) continue
    ctx.save()
    ctx.strokeStyle = path.color || ann.style?.color || '#93402A'
    ctx.lineWidth = path.width || ann.style?.brushWidth || 3
    ctx.lineCap = 'round'
    ctx.lineJoin = 'round'
    ctx.globalAlpha = ann.style?.opacity ?? 1

    ctx.beginPath()
    ctx.moveTo(path.points[0].x, path.points[0].y)
    for (let i = 1; i < path.points.length; i++) {
      ctx.lineTo(path.points[i].x, path.points[i].y)
    }
    ctx.stroke()
    ctx.restore()
  }
}

function drawStickerAnnotation(ctx, ann) {
  const size = ann.style?.fontSize || 40
  ctx.save()
  ctx.globalAlpha = ann.style?.opacity ?? 1
  ctx.font = `${size}px "Segoe UI Emoji", "Apple Color Emoji", "Noto Color Emoji", sans-serif`
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.fillText(ann.content, 0, 0)
  ctx.restore()
}

function drawTextAnnotation(ctx, ann) {
  const fontSize = ann.style?.fontSize || 18
  const color = ann.style?.color || '#2A2622'
  const stabilo = ann.style?.stabilo || false

  ctx.save()
  ctx.globalAlpha = ann.style?.opacity ?? 1
  ctx.font = `400 ${fontSize}px "Newsreader", Georgia, serif`
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'

  if (stabilo) {
    const metrics = ctx.measureText(ann.content)
    const padX = 6
    const padY = 4
    ctx.fillStyle = 'rgba(248, 228, 219, 0.7)'
    ctx.fillRect(
      -metrics.width / 2 - padX,
      -fontSize / 2 - padY,
      metrics.width + padX * 2,
      fontSize + padY * 2
    )
  }

  ctx.fillStyle = color
  ctx.fillText(ann.content, 0, 0)
  ctx.restore()
}

// Photo annotation image cache (module-level pending set to avoid double-loads)
const photoPendingLoads = new Set()

function drawPhotoAnnotation(ctx, ann, imageCache) {
  if (!imageCache) return
  let parsed = {}
  try {
    parsed = typeof ann.content === 'string' ? JSON.parse(ann.content) : (ann.content || {})
  } catch { return }

  const { url, w: natW, h: natH } = parsed
  if (!url) return

  const size = ann.style?.size || 150
  const aspect = (natW && natH) ? natW / natH : 1
  const drawW = aspect >= 1 ? size : size * aspect
  const drawH = aspect >= 1 ? size / aspect : size

  const img = imageCache.get(url)
  if (!img) {
    // Lazy load
    if (!photoPendingLoads.has(url)) {
      photoPendingLoads.add(url)
      const image = new Image()
      image.crossOrigin = 'anonymous'
      image.onload = () => {
        imageCache.set(url, image)
        photoPendingLoads.delete(url)
      }
      image.onerror = () => photoPendingLoads.delete(url)
      image.src = url
    }
    // Placeholder while loading
    ctx.save()
    ctx.fillStyle = 'rgba(210, 105, 74, 0.25)'
    ctx.strokeStyle = 'rgba(147, 64, 42, 0.4)'
    ctx.lineWidth = 1.5
    ctx.beginPath()
    ctx.roundRect(-drawW / 2, -drawH / 2, drawW, drawH, 6)
    ctx.fill()
    ctx.stroke()
    ctx.restore()
    return
  }

  ctx.save()
  const r = 6
  ctx.beginPath()
  ctx.roundRect(-drawW / 2, -drawH / 2, drawW, drawH, r)
  ctx.clip()
  ctx.drawImage(img, -drawW / 2, -drawH / 2, drawW, drawH)
  ctx.restore()
}

function drawSelectionBorder(ctx, ann) {
  let w = 40
  let h = 40

  if (ann.type === 'text') {
    const fontSize = ann.style?.fontSize || 18
    ctx.font = `400 ${fontSize}px "Newsreader", Georgia, serif`
    const metrics = ctx.measureText(ann.content)
    w = metrics.width + 16
    h = fontSize + 12
  } else if (ann.type === 'sticker') {
    const size = ann.style?.fontSize || 40
    w = size + 12
    h = size + 12
  } else if (ann.type === 'photo') {
    const size = ann.style?.size || 150
    let aspect = 1
    try {
      const parsed = typeof ann.content === 'string' ? JSON.parse(ann.content) : ann.content
      if (parsed.w && parsed.h) aspect = parsed.w / parsed.h
    } catch { /* ignore */ }
    w = (aspect >= 1 ? size : size * aspect) + 10
    h = (aspect >= 1 ? size / aspect : size) + 10
  } else if (ann.type === 'drawing') {
    // For drawings, skip selection border (complex bounding box)
    return
  }

  ctx.save()
  ctx.strokeStyle = '#93402A'
  ctx.lineWidth = 1.5
  ctx.setLineDash([5, 3])
  ctx.strokeRect(-w / 2, -h / 2, w, h)
  ctx.setLineDash([])
  ctx.restore()
}

export function drawAnnotations(
  ctx,
  annotationList,
  selectedAnnotationId,
  activeDrawingPath,
  stickerPreview,
  draggingAnnotationId,
  dragLiftProgress = 0,
  entranceAlpha = 1,
  imageCache = null,
) {
  if (entranceAlpha <= 0) return
  if (!annotationList || annotationList.length === 0) {
    // Still draw active path if drawing in progress
    if (activeDrawingPath) {
      drawActiveDrawingPath(ctx, activeDrawingPath)
    }
    if (stickerPreview) {
      drawStickerPreview(ctx, stickerPreview)
    }
    return
  }

  const sorted = [...annotationList].sort((a, b) => (a.zIndex || 0) - (b.zIndex || 0))

  for (const ann of sorted) {
    const isBeingDragged = ann.id === draggingAnnotationId
    const lift = isBeingDragged ? dragLiftProgress : 0

    ctx.save()
    ctx.globalAlpha *= entranceAlpha
    ctx.translate(ann.x, ann.y)

    // Lift/fly effect when dragging: scale up + drop shadow, animated via dragLiftProgress
    if (lift > 0) {
      ctx.translate(0, -4 * lift)
      const s = 1 + 0.15 * lift
      ctx.scale(s, s)
      ctx.shadowColor = `rgba(42, 38, 34, ${0.4 * lift})`
      ctx.shadowBlur = 28 * lift
      ctx.shadowOffsetX = 0
      ctx.shadowOffsetY = 12 * lift
    }

    if (ann.style?.rotation) ctx.rotate(ann.style.rotation)

    switch (ann.type) {
      case 'drawing':
        drawDrawingAnnotation(ctx, ann)
        break
      case 'sticker':
        drawStickerAnnotation(ctx, ann)
        break
      case 'text':
        drawTextAnnotation(ctx, ann)
        break
      case 'photo':
        drawPhotoAnnotation(ctx, ann, imageCache)
        break
    }

    // Reset shadow before drawing selection border
    if (lift > 0) {
      ctx.shadowColor = 'transparent'
      ctx.shadowBlur = 0
      ctx.shadowOffsetX = 0
      ctx.shadowOffsetY = 0
    }

    if (ann.id === selectedAnnotationId) {
      drawSelectionBorder(ctx, ann)
    }

    ctx.restore()
  }

  // Draw current in-progress drawing path
  if (activeDrawingPath) {
    ctx.save()
    ctx.globalAlpha *= entranceAlpha
    drawActiveDrawingPath(ctx, activeDrawingPath)
    ctx.restore()
  }

  // Draw sticker preview following cursor
  if (stickerPreview) {
    ctx.save()
    ctx.globalAlpha *= entranceAlpha
    drawStickerPreview(ctx, stickerPreview)
    ctx.restore()
  }
}

function drawStickerPreview(ctx, preview) {
  // preview = { emoji, x, y, fontSize }
  if (!preview.emoji || preview.x < -9000) return
  const size = preview.fontSize || 40
  ctx.save()
  ctx.globalAlpha = 0.5
  ctx.font = `${size}px "Segoe UI Emoji", "Apple Color Emoji", "Noto Color Emoji", sans-serif`
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.fillText(preview.emoji, preview.x, preview.y)
  ctx.restore()
}

function drawActiveDrawingPath(ctx, pathData) {
  if (!pathData.points || pathData.points.length < 2) return
  ctx.save()
  ctx.strokeStyle = pathData.color || '#93402A'
  ctx.lineWidth = pathData.width || 3
  ctx.lineCap = 'round'
  ctx.lineJoin = 'round'

  ctx.beginPath()
  ctx.moveTo(pathData.points[0].x, pathData.points[0].y)
  for (let i = 1; i < pathData.points.length; i++) {
    ctx.lineTo(pathData.points[i].x, pathData.points[i].y)
  }
  ctx.stroke()
  ctx.restore()
}

// ============================================================
// Badge lien de parenté
// ============================================================
export function drawPathLabel(ctx, pathLabelRef, pathLabelAlpha, pathNodesRef, posMap) {
  if (!pathLabelRef || pathLabelAlpha <= 0.02) return

  const personNodesOnPath = pathNodesRef.filter(id => id.startsWith('p-'))
  if (personNodesOnPath.length < 2) return

  const midIdx = Math.floor(personNodesOnPath.length / 2)
  const midPos1 = posMap.get(personNodesOnPath[midIdx - 1])
  const midPos2 = posMap.get(personNodesOnPath[midIdx])
  if (!midPos1 || !midPos2) return

  const labelX = (midPos1.cx + midPos2.cx) / 2
  const labelY = (midPos1.cy + midPos2.cy) / 2 - 20

  ctx.save()
  ctx.globalAlpha = pathLabelAlpha * 0.9

  ctx.font = '500 11px "DM Sans", system-ui, sans-serif'
  const metrics = ctx.measureText(pathLabelRef)
  const pillW = metrics.width + 16
  const pillH = 22

  ctx.fillStyle = 'rgba(42, 38, 34, 0.85)'
  ctx.beginPath()
  ctx.roundRect(labelX - pillW / 2, labelY - pillH / 2, pillW, pillH, pillH / 2)
  ctx.fill()

  ctx.fillStyle = '#FFFFFF'
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.fillText(pathLabelRef, labelX, labelY)

  ctx.restore()
}
