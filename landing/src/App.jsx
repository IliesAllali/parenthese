import { useEffect, useRef, useState } from 'react'
import { analytics } from './analytics.js'
import { getEntranceProgress, seededFloat } from './heroGraphMath.js'

// ─── Design atoms ─────────────────────────────────────────────────────────────

function Logo({ size = 40 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 400 400" fill="none" xmlns="http://www.w3.org/2000/svg" aria-label="Parenthèse">
      <rect width="400" height="400" rx="59" fill="#F7F1E6" />
      <path d="M174.887 159.122C169.851 167.606 163.424 170.911 155.806 170.911C151.516 170.911 146.062 170.294 139.361 168.956L139.214 168.926L139.066 168.904L136.494 168.511C130.481 167.577 124.376 166.512 118.179 165.315C111.028 163.933 103.992 162.551 97.0728 161.169L96.9257 161.139L96.7773 161.117C89.662 160.051 83.4359 159.49 78.1617 159.49C69.1859 159.49 61.0961 161.278 54.0787 164.947C47.0981 168.596 41.4507 173.962 37.0058 180.803L36.9938 180.822L36.9817 180.84C28.1973 194.726 24 213.38 24 236.509V272H51.2117V237.548C51.2117 222.972 53.9416 212.085 58.96 204.553C61.3391 201.15 64.3726 198.736 68.0205 197.145C71.7017 195.54 76.2888 194.653 81.9743 194.653C86.8306 194.653 92.1966 195.123 98.0908 196.096C104.072 197.473 110.278 198.85 116.708 200.225L116.728 200.23L116.75 200.234C123.508 201.63 130.268 202.852 137.031 203.902C144.293 205.343 151.478 206.074 158.579 206.074C164.902 206.074 170.875 204.335 176.414 201.175C181.975 198.003 186.682 193.552 190.634 188.003C194.375 182.751 197.378 176.456 199.706 169.182C202.04 176.425 205.273 182.755 209.461 188.131C218.173 199.364 228.964 206.074 242.115 206.074C248.993 206.074 255.953 205.342 262.986 203.9C269.977 202.849 276.746 201.626 283.292 200.225C289.729 198.848 295.941 197.47 301.929 196.091C307.578 195.123 312.823 194.653 317.68 194.653C323.365 194.653 327.952 195.54 331.633 197.145C335.285 198.738 338.321 201.156 340.701 204.565C345.714 212.097 348.441 222.98 348.441 237.548V272H376V236.509C376 214.043 371.791 195.592 363.04 181.394L363.018 181.359L362.599 180.706C358.225 174.002 352.689 168.723 345.867 165.094C338.785 161.328 330.596 159.49 321.492 159.49C316.218 159.49 309.992 160.051 302.877 161.117L302.708 161.142L302.541 161.177C295.867 162.555 288.96 163.935 281.821 165.315C274.739 166.683 267.776 167.88 260.934 168.904L260.786 168.926L260.639 168.956C253.938 170.294 248.485 170.911 244.194 170.911C236.556 170.911 230.009 167.586 224.748 159.09C219.607 150.411 216.658 138.373 216.205 122.739L216.096 119H183.904L183.796 122.739C183.341 138.378 180.276 150.405 174.92 159.068L174.903 159.095L174.887 159.122Z" fill="#9A734C" />
    </svg>
  )
}

// Film grain overlay — à placer en absolu dans un conteneur relative
function Grain({ opacity = 0.045 }) {
  return (
    <div
      aria-hidden="true"
      className="absolute inset-0 pointer-events-none z-10"
      style={{
        backgroundImage: `radial-gradient(circle at 20% 20%, rgba(0,0,0,${opacity}) 0.4px, transparent 0.4px),
                          radial-gradient(circle at 80% 60%, rgba(0,0,0,${opacity}) 0.4px, transparent 0.4px)`,
        backgroundSize: '180px 180px',
        mixBlendMode: 'multiply',
      }}
    />
  )
}

// Conteneur global 1200px de large max
function Container({ children, className = '' }) {
  return (
    <div className={`w-full max-w-[1200px] mx-auto ${className}`}>
      {children}
    </div>
  )
}

// Icônes features
function IconGalaxy() {
  return (
    <svg width="26" height="26" viewBox="0 0 28 28" fill="none">
      <circle cx="14" cy="14" r="3.5" fill="#A67C52" />
      <circle cx="5" cy="8" r="2.5" fill="#A67C52" opacity="0.6" />
      <circle cx="23" cy="8" r="2.5" fill="#A67C52" opacity="0.6" />
      <circle cx="5" cy="20" r="2.5" fill="#A67C52" opacity="0.6" />
      <circle cx="23" cy="20" r="2.5" fill="#A67C52" opacity="0.6" />
      <line x1="14" y1="14" x2="5" y2="8" stroke="#A67C52" strokeWidth="1.2" opacity="0.5" />
      <line x1="14" y1="14" x2="23" y2="8" stroke="#A67C52" strokeWidth="1.2" opacity="0.5" />
      <line x1="14" y1="14" x2="5" y2="20" stroke="#A67C52" strokeWidth="1.2" opacity="0.5" />
      <line x1="14" y1="14" x2="23" y2="20" stroke="#A67C52" strokeWidth="1.2" opacity="0.5" />
    </svg>
  )
}
function IconShare() {
  return (
    <svg width="26" height="26" viewBox="0 0 28 28" fill="none">
      <path d="M18 4L24 10M24 10L18 16M24 10H10C7.79 10 6 11.79 6 14V22" stroke="#A67C52" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}
function IconHeart() {
  return (
    <svg width="26" height="26" viewBox="0 0 28 28" fill="none">
      <path d="M14 22C14 22 5 16.5 5 10.5C5 8.01 7.01 6 9.5 6C11.24 6 12.78 7.01 13.5 8.5C14.22 7.01 15.76 6 17.5 6C19.99 6 22 8.01 22 10.5C22 16.5 14 22 14 22Z" stroke="#A67C52" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}
function IconArrowRight({ size = 14 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <path d="M3.25 8H12.25" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
      <path d="M8.75 4.5L12.25 8L8.75 11.5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}
function IconArrowDown({ size = 14 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <path d="M8 3.25V12.25" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
      <path d="M4.5 8.75L8 12.25L11.5 8.75" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

// ─── Mini graphe hero (noeuds interactifs) ───────────────────────────────────

function HeroGraph({ className = '' }) {
  const canvasRef = useRef(null)
  const containerRef = useRef(null)

  useEffect(() => {
    const canvas = canvasRef.current
    const container = containerRef.current
    if (!canvas || !container) return

    const WORLD_W = 760
    const WORLD_H = 530
    const PERSON_R = 62
    const ORBIT_RADIUS = 96
    const ORBIT_MEDIA_SIZE = 30

    const ENTRANCE_GEN_DELAY = 500
    const ENTRANCE_NODE_DURATION = 700
    const ENTRANCE_NODE_STAGGER = 80
    const ENTRANCE_LINE_DELAY = 200
    const ENTRANCE_LINE_DURATION = 500
    const ENTRANCE_ORBIT_DELAY = 300
    const ENTRANCE_ORBIT_DURATION = 400
    const ENTRANCE_ORBIT_STAGGER = 100

    const TARGET_FRAME_MS = 1000 / 45

    const nodes = [
      {
        id: 'p-mother',
        firstName: 'Camille',
        years: '1987',
        frameType: 'polaroid',
        photo: '/hero/photos/women-44.webp',
        x: 158,
        y: 168,
        medias: [
          { type: 'photo', url: '/hero/photos/souvenir-1519741497674.webp' },
          { type: 'audio' },
          { type: 'document' },
        ],
      },
      {
        id: 'p-father',
        firstName: 'Alex',
        years: '1985',
        frameType: 'rect',
        photo: '/hero/photos/men-32.webp',
        x: 602,
        y: 168,
        medias: [
          { type: 'photo', url: '/hero/photos/souvenir-1511895426328.webp' },
          { type: 'video' },
          { type: 'citation' },
        ],
      },
      {
        id: 'p-child',
        firstName: 'Lya',
        years: '2012',
        frameType: 'round',
        photo: '/hero/photos/women-65.webp',
        x: 380,
        y: 432,
        medias: [
          { type: 'photo', url: '/hero/photos/souvenir-1503919545889.webp' },
          { type: 'photo', url: '/hero/photos/souvenir-1472162072942.webp' },
          { type: 'document' },
        ],
      },
    ]

    const schedule = {
      nodeStart: new Map(),
      orbitStart: new Map(),
      coupleStart: 0,
      filiationStart: 0,
    }

    schedule.nodeStart.set('p-mother', 0)
    schedule.nodeStart.set('p-father', ENTRANCE_NODE_STAGGER)
    schedule.nodeStart.set('p-child', ENTRANCE_GEN_DELAY + ENTRANCE_NODE_STAGGER * 0.7)

    let totalEntranceMs = 0

    nodes.forEach((node) => {
      const base = schedule.nodeStart.get(node.id) + ENTRANCE_NODE_DURATION + ENTRANCE_ORBIT_DELAY
      totalEntranceMs = Math.max(totalEntranceMs, schedule.nodeStart.get(node.id) + ENTRANCE_NODE_DURATION)
      node.medias.forEach((_, idx) => {
        const orbitStart = base + idx * ENTRANCE_ORBIT_STAGGER
        schedule.orbitStart.set(`${node.id}:${idx}`, orbitStart)
        totalEntranceMs = Math.max(totalEntranceMs, orbitStart + ENTRANCE_ORBIT_DURATION)
      })
    })

    schedule.coupleStart = Math.max(
      schedule.nodeStart.get('p-mother'),
      schedule.nodeStart.get('p-father'),
    ) + ENTRANCE_NODE_DURATION * 0.5 + ENTRANCE_LINE_DELAY * 0.3
    schedule.filiationStart = schedule.coupleStart + ENTRANCE_LINE_DELAY * 0.65

    totalEntranceMs = Math.max(totalEntranceMs, schedule.coupleStart + ENTRANCE_LINE_DURATION)
    totalEntranceMs = Math.max(totalEntranceMs, schedule.filiationStart + ENTRANCE_LINE_DURATION)

    const imageCache = new Map()
    const pending = new Set()
    const floating = new Map()
    const runtime = {
      reducedMotion: false,
      inView: true,
      tabVisible: !document.hidden,
      running: false,
      rafId: 0,
      startTime: -1,
      lastFrameTs: 0,
      mouseX: -1,
      mouseY: -1,
      targetHovers: new Map(),
    }

    const mq = window.matchMedia('(prefers-reduced-motion: reduce)')
    runtime.reducedMotion = mq.matches

    nodes.forEach((node) => {
      runtime.targetHovers.set(node.id, 0)
      floating.set(node.id, {
        offsetX: (seededFloat(node.id, 1) - 0.5) * 10,
        offsetY: (seededFloat(node.id, 2) - 0.5) * 10,
        phaseX: seededFloat(node.id, 3) * Math.PI * 2,
        phaseY: seededFloat(node.id, 4) * Math.PI * 2,
        floatSpeedX: 0.00032 + seededFloat(node.id, 5) * 0.00018,
        floatSpeedY: 0.00033 + seededFloat(node.id, 6) * 0.00018,
        floatAmpX: 0.9 + seededFloat(node.id, 7) * 0.7,
        floatAmpY: 0.9 + seededFloat(node.id, 8) * 0.7,
        frameRotation: (seededFloat(node.id, 9) - 0.5) * 0.11,
        labelRotation: (seededFloat(node.id, 10) - 0.5) * 0.08,
        orbitSlots: node.medias.map((_, idx) => {
          const orbitBase = node.id === 'p-child' ? ORBIT_RADIUS - 18 : ORBIT_RADIUS
          const safeArc = Math.PI * 1.5
          const baseAngle = 3 * Math.PI / 4 + (safeArc * (idx + 0.5) / 3)
          return {
            angle: baseAngle + (seededFloat(`${node.id}-orbit-${idx}`, 11) - 0.5) * 0.38,
            dist: orbitBase + (seededFloat(`${node.id}-orbit-${idx}`, 12) - 0.5) * 14,
            rot: (seededFloat(`${node.id}-orbit-${idx}`, 13) - 0.5) * 0.26,
          }
        }),
      })
    })

    const ensureImage = (url) => {
      if (!url || imageCache.has(url) || pending.has(url)) return
      pending.add(url)
      const image = new Image()
      image.onload = () => {
        imageCache.set(url, image)
        pending.delete(url)
        startLoop()
      }
      image.onerror = () => {
        pending.delete(url)
        startLoop()
      }
      image.src = url
    }

    nodes.forEach((node) => {
      ensureImage(node.photo)
      node.medias.forEach((media) => ensureImage(media.url))
    })

    const drawImageCover = (ctx, img, x, y, w, h) => {
      const sourceW = img.naturalWidth || img.width
      const sourceH = img.naturalHeight || img.height
      if (!sourceW || !sourceH || !w || !h) return

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

    const drawPartialBezier = (ctx, x0, y0, cp1x, cp1y, cp2x, cp2y, x3, y3, t) => {
      if (t <= 0) return
      if (t >= 1) {
        ctx.beginPath()
        ctx.moveTo(x0, y0)
        ctx.bezierCurveTo(cp1x, cp1y, cp2x, cp2y, x3, y3)
        ctx.stroke()
        return
      }

      const mt = 1 - t
      const q1x = mt * x0 + t * cp1x
      const q1y = mt * y0 + t * cp1y
      const q2x = mt * cp1x + t * cp2x
      const q2y = mt * cp1y + t * cp2y
      const q3x = mt * cp2x + t * x3
      const q3y = mt * cp2y + t * y3
      const r1x = mt * q1x + t * q2x
      const r1y = mt * q1y + t * q2y
      const r2x = mt * q2x + t * q3x
      const r2y = mt * q2y + t * q3y
      const sx = mt * r1x + t * r2x
      const sy = mt * r1y + t * r2y

      ctx.beginPath()
      ctx.moveTo(x0, y0)
      ctx.bezierCurveTo(q1x, q1y, r1x, r1y, sx, sy)
      ctx.stroke()
    }

    const drawFadingRay = (ctx, fromX, fromY, toX, toY, alpha = 0.5) => {
      const gradient = ctx.createLinearGradient(fromX, fromY, toX, toY)
      gradient.addColorStop(0, `rgba(0,0,0,${alpha})`)
      gradient.addColorStop(0.58, `rgba(0,0,0,${alpha})`)
      gradient.addColorStop(1, 'rgba(0,0,0,0)')

      ctx.strokeStyle = gradient
      ctx.lineWidth = 0.55
      ctx.lineCap = 'round'
      ctx.beginPath()
      ctx.moveTo(fromX, fromY)
      ctx.lineTo(toX, toY)
      ctx.stroke()
    }

    const drawMediaContent = (ctx, media, size) => {
      const half = size
      const loaded = media.url ? imageCache.get(media.url) : null

      if (media.type === 'photo' && loaded) {
        ctx.save()
        ctx.beginPath()
        ctx.roundRect(-half, -half, half * 2, half * 2, 1)
        ctx.clip()
        drawImageCover(ctx, loaded, -half, -half, half * 2, half * 2)
        ctx.restore()
        return
      }

      if (media.type === 'audio') {
        ctx.fillStyle = '#2C2825'
        ctx.beginPath()
        ctx.arc(0, 0, half, 0, Math.PI * 2)
        ctx.fill()
        ctx.strokeStyle = 'rgba(254, 249, 237, 0.08)'
        ctx.lineWidth = 0.5
        for (let r = 4; r < half; r += 3) {
          ctx.beginPath()
          ctx.arc(0, 0, r, 0, Math.PI * 2)
          ctx.stroke()
        }
        ctx.fillStyle = '#A67C52'
        ctx.beginPath()
        ctx.arc(0, 0, 5.5, 0, Math.PI * 2)
        ctx.fill()
        return
      }

      if (media.type === 'video') {
        ctx.fillStyle = '#3A3530'
        ctx.beginPath()
        ctx.roundRect(-half, -half, half * 2, half * 2, 1)
        ctx.fill()
        ctx.fillStyle = 'rgba(254, 249, 237, 0.72)'
        ctx.beginPath()
        ctx.moveTo(-4, -5)
        ctx.lineTo(-4, 5)
        ctx.lineTo(5, 0)
        ctx.closePath()
        ctx.fill()
        return
      }

      if (media.type === 'citation') {
        ctx.fillStyle = '#F5EDCF'
        ctx.beginPath()
        ctx.roundRect(-half, -half, half * 2, half * 2, 1)
        ctx.fill()
        ctx.fillStyle = '#A67C52'
        ctx.font = `450 ${half * 1.1}px "Bradford LL", "Iowan Old Style", "Palatino Linotype", serif`
        ctx.textAlign = 'center'
        ctx.textBaseline = 'middle'
        ctx.fillText('"', 0, -half * 0.2)
        return
      }

      ctx.fillStyle = '#F0E8D8'
      ctx.beginPath()
      ctx.moveTo(-half, -half)
      ctx.lineTo(half - 5, -half)
      ctx.lineTo(half, -half + 5)
      ctx.lineTo(half, half)
      ctx.lineTo(-half, half)
      ctx.closePath()
      ctx.fill()
      ctx.fillStyle = 'rgba(93, 82, 75, 0.15)'
      for (let idx = 0; idx < 5; idx += 1) {
        const y = -half + 8 + idx * 6
        const w = idx === 4 ? half * 0.7 : half * 1.35
        ctx.fillRect(-half + 4, y, w, 1.5)
      }
    }

    const drawFrame = (ctx, frameType, node, image) => {
      if (frameType === 'polaroid') {
        const side = PERSON_R + 4
        const pad = 4
        const bottomPad = 12
        ctx.fillStyle = '#FEF9ED'
        ctx.beginPath()
        ctx.roundRect(-side - pad, -side - pad, (side + pad) * 2, (side + pad) + side + bottomPad, 3)
        ctx.fill()
        ctx.shadowColor = 'transparent'
        ctx.shadowBlur = 0
        ctx.strokeStyle = 'rgba(93, 82, 75, 0.08)'
        ctx.lineWidth = 0.5
        ctx.stroke()
        ctx.beginPath()
        ctx.roundRect(-side, -side, side * 2, side * 2, 2)
        ctx.clip()
        if (image) drawImageCover(ctx, image, -side, -side, side * 2, side * 2)
      } else if (frameType === 'rect') {
        const rw = PERSON_R + 12
        const rh = PERSON_R - 8
        const pad = 3
        ctx.fillStyle = '#FEF9ED'
        ctx.beginPath()
        ctx.roundRect(-rw - pad, -rh - pad, (rw + pad) * 2, (rh + pad) * 2, 5)
        ctx.fill()
        ctx.shadowColor = 'transparent'
        ctx.shadowBlur = 0
        ctx.strokeStyle = 'rgba(93, 82, 75, 0.08)'
        ctx.lineWidth = 0.5
        ctx.stroke()
        ctx.beginPath()
        ctx.roundRect(-rw, -rh, rw * 2, rh * 2, 3)
        ctx.clip()
        if (image) drawImageCover(ctx, image, -rw, -rh, rw * 2, rh * 2)
      } else {
        ctx.fillStyle = '#FEF9ED'
        ctx.beginPath()
        ctx.arc(0, 0, PERSON_R + 3, 0, Math.PI * 2)
        ctx.fill()
        ctx.shadowColor = 'transparent'
        ctx.shadowBlur = 0
        ctx.strokeStyle = '#A67C52'
        ctx.lineWidth = 1
        ctx.stroke()
        ctx.beginPath()
        ctx.arc(0, 0, PERSON_R, 0, Math.PI * 2)
        ctx.clip()
        if (image) drawImageCover(ctx, image, -PERSON_R, -PERSON_R, PERSON_R * 2, PERSON_R * 2)
      }

      if (!image) {
        ctx.fillStyle = '#F7ECD9'
        ctx.fillRect(-PERSON_R, -PERSON_R, PERSON_R * 2, PERSON_R * 2)
        ctx.fillStyle = '#5D524B'
        ctx.font = '450 22px "Bradford LL", "Iowan Old Style", "Palatino Linotype", serif'
        ctx.textAlign = 'center'
        ctx.textBaseline = 'middle'
        ctx.fillText(node.firstName[0], 0, 0)
      }
    }

    const shouldRun = () => runtime.inView && runtime.tabVisible

    const stopLoop = () => {
      if (runtime.rafId) window.cancelAnimationFrame(runtime.rafId)
      runtime.rafId = 0
      runtime.running = false
      runtime.lastFrameTs = 0
    }

    const queueFrame = () => {
      runtime.rafId = window.requestAnimationFrame(render)
      runtime.running = true
    }

    const startLoop = (resetStart = false) => {
      if (resetStart) runtime.startTime = -1
      if (!shouldRun()) return
      if (runtime.running) return
      queueFrame()
    }

    const render = (timestamp) => {
      if (!shouldRun()) {
        stopLoop()
        return
      }

      if (runtime.lastFrameTs > 0 && timestamp - runtime.lastFrameTs < TARGET_FRAME_MS) {
        queueFrame()
        return
      }
      runtime.lastFrameTs = timestamp

      if (runtime.startTime < 0) runtime.startTime = timestamp
      const reduced = runtime.reducedMotion
      const elapsed = reduced ? totalEntranceMs + 200 : (timestamp - runtime.startTime)

      const cssW = canvas.clientWidth
      const cssH = canvas.clientHeight
      if (cssW < 2 || cssH < 2) {
        queueFrame()
        return
      }

      const dpr = Math.min(window.devicePixelRatio || 1, 2)
      const pxW = Math.max(1, Math.round(cssW * dpr))
      const pxH = Math.max(1, Math.round(cssH * dpr))
      if (canvas.width !== pxW || canvas.height !== pxH) {
        canvas.width = pxW
        canvas.height = pxH
      }

      const ctx = canvas.getContext('2d')
      if (!ctx) {
        queueFrame()
        return
      }

      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
      ctx.clearRect(0, 0, cssW, cssH)

      const isMobileLayout = window.innerWidth <= 768
      const pad = isMobileLayout ? 10 : 26
      const baseScale = Math.min((cssW - pad * 2) / WORLD_W, (cssH - pad * 2) / WORLD_H)
      const scale = isMobileLayout ? baseScale * 1.18 : baseScale
      const tx = (cssW - WORLD_W * scale) / 2
      const ty = (cssH - WORLD_H * scale) / 2
      ctx.save()
      ctx.translate(tx, ty)
      ctx.scale(scale, scale)

      const positions = new Map()
      nodes.forEach((node) => {
        const rd = floating.get(node.id)
        const nodeP = getEntranceProgress(elapsed, schedule.nodeStart.get(node.id), ENTRANCE_NODE_DURATION, reduced)
        if (nodeP <= 0) return

        const floatX = reduced ? 0 : Math.sin(timestamp * rd.floatSpeedX + rd.phaseX) * rd.floatAmpX
        const floatY = reduced ? 0 : Math.sin(timestamp * rd.floatSpeedY + rd.phaseY) * rd.floatAmpY

        positions.set(node.id, {
          x: node.x + rd.offsetX + floatX,
          y: node.y + rd.offsetY + floatY,
          p: nodeP,
        })
      })

      const mother = positions.get('p-mother')
      const father = positions.get('p-father')
      const child = positions.get('p-child')
      const union = mother && father
        ? { x: (mother.x + father.x) / 2, y: (mother.y + father.y) / 2 + 7 }
        : null

      const coupleP = getEntranceProgress(elapsed, schedule.coupleStart, ENTRANCE_LINE_DURATION, reduced)
      if (mother && father && union && coupleP > 0) {
        const left = mother.x < father.x ? mother : father
        const right = mother.x < father.x ? father : mother

        const leftStart = { x: left.x + PERSON_R, y: left.y }
        const rightStart = { x: right.x - PERSON_R, y: right.y }

        ctx.strokeStyle = '#000000'
        ctx.lineWidth = 0.5
        ctx.lineCap = 'round'
        ctx.globalAlpha = coupleP

        drawPartialBezier(
          ctx,
          leftStart.x,
          leftStart.y,
          leftStart.x + (union.x - leftStart.x) * 0.55,
          leftStart.y,
          union.x - (union.x - leftStart.x) * 0.1,
          union.y,
          union.x,
          union.y,
          coupleP,
        )

        drawPartialBezier(
          ctx,
          rightStart.x,
          rightStart.y,
          rightStart.x + (union.x - rightStart.x) * 0.55,
          rightStart.y,
          union.x - (union.x - rightStart.x) * 0.1,
          union.y,
          union.x,
          union.y,
          coupleP,
        )

        ctx.globalAlpha = 1
      }

      const filiationP = getEntranceProgress(elapsed, schedule.filiationStart, ENTRANCE_LINE_DURATION, reduced)
      if (child && union && filiationP > 0) {
        const sx = union.x
        const sy = union.y
        const ex = child.x
        const ey = child.y - PERSON_R
        const dy = ey - sy

        ctx.strokeStyle = '#000000'
        ctx.lineWidth = 0.5
        ctx.lineCap = 'round'
        ctx.globalAlpha = Math.min(1, filiationP * 1.5)
        drawPartialBezier(ctx, sx, sy, sx, sy + dy * 0.75, ex, ey - dy * 0.15, ex, ey, filiationP)
        ctx.globalAlpha = 1
      }

      if (mother && father && child) {
        const motherRayAlpha = 0.52 * mother.p
        const fatherRayAlpha = 0.52 * father.p
        const childRayAlpha = 0.56 * child.p

        drawFadingRay(
          ctx,
          mother.x - 2,
          mother.y - PERSON_R + 2,
          mother.x - 12,
          mother.y - PERSON_R - 156,
          motherRayAlpha,
        )
        drawFadingRay(
          ctx,
          father.x + 2,
          father.y - PERSON_R + 2,
          father.x + 12,
          father.y - PERSON_R - 156,
          fatherRayAlpha,
        )
        drawFadingRay(
          ctx,
          child.x + PERSON_R - 2,
          child.y + 1,
          child.x + PERSON_R + 156,
          child.y + 9,
          childRayAlpha,
        )
      }

      if (union && filiationP > 0.15) {
        ctx.fillStyle = '#000000'
        ctx.globalAlpha = filiationP
        ctx.beginPath()
        ctx.arc(union.x, union.y, 2.2, 0, Math.PI * 2)
        ctx.fill()
        ctx.globalAlpha = 1
      }

      nodes.forEach((node) => {
        const pos = positions.get(node.id)
        if (!pos) return

        const rd = floating.get(node.id)
        const personImg = imageCache.get(node.photo)
        const nodeP = pos.p

        let hVal = runtime.targetHovers.get(node.id) || 0
        let targetH = 0

        if (runtime.mouseX >= 0 && runtime.mouseY >= 0) {
          const cx = tx + pos.x * scale
          const cy = ty + pos.y * scale
          const dx = runtime.mouseX - cx
          const dy = runtime.mouseY - cy
          if (dx * dx + dy * dy < (PERSON_R * scale * 1.5) ** 2) {
            targetH = 1
          }
        }

        hVal += (targetH - hVal) * 0.15
        runtime.targetHovers.set(node.id, hVal)
        const nodeHover = hVal

        if (Math.abs(targetH - hVal) > 0.01) {
          queueFrame()
        }

        node.medias.forEach((media, idx) => {
          const key = `${node.id}:${idx}`
          const orbitP = getEntranceProgress(elapsed, schedule.orbitStart.get(key), ENTRANCE_ORBIT_DURATION, reduced)
          if (orbitP <= 0) return

          const slot = rd.orbitSlots[idx]
          const mx = pos.x + Math.cos(slot.angle) * slot.dist
          const my = pos.y + Math.sin(slot.angle) * slot.dist
          const mediaScale = (0.3 + orbitP * 0.7)
          const size = ORBIT_MEDIA_SIZE

          ctx.save()
          ctx.globalAlpha = nodeP * orbitP
          ctx.translate(mx, my)
          ctx.scale(mediaScale, mediaScale)
          ctx.rotate(slot.rot)

          ctx.shadowColor = 'rgba(93, 82, 75, 0.18)'
          ctx.shadowBlur = 4
          ctx.shadowOffsetY = 1

          ctx.fillStyle = '#FEF9ED'
          ctx.beginPath()
          ctx.roundRect(-size - 2, -size - 2, (size + 2) * 2, (size + 2) * 2 + 4, 2)
          ctx.fill()

          ctx.shadowColor = 'transparent'
          ctx.shadowBlur = 0
          drawMediaContent(ctx, media, size)
          ctx.restore()
        })

        const glowR = PERSON_R + 12 + nodeHover * 6
        const glowAlpha = 0.15 + nodeHover * 0.1
        const nodeGlow = ctx.createRadialGradient(pos.x, pos.y, PERSON_R * 0.6, pos.x, pos.y, glowR)
        nodeGlow.addColorStop(0, `rgba(166, 124, 82, ${glowAlpha * nodeP})`)
        nodeGlow.addColorStop(1, 'rgba(166, 124, 82, 0)')
        ctx.fillStyle = nodeGlow
        ctx.beginPath()
        ctx.arc(pos.x, pos.y, glowR, 0, Math.PI * 2)
        ctx.fill()

        const scaleIn = (0.3 + nodeP * 0.7) * (1 + nodeHover * 0.1)
        const frameRot = reduced ? rd.frameRotation * 0.5 : rd.frameRotation

        ctx.save()
        ctx.globalAlpha = nodeP
        ctx.translate(pos.x, pos.y)
        ctx.scale(scaleIn, scaleIn)
        ctx.rotate(frameRot)
        ctx.shadowColor = `rgba(93, 82, 75, ${0.15 + nodeHover * 0.1})`
        ctx.shadowBlur = 10 + nodeHover * 14
        ctx.shadowOffsetY = 3 + nodeHover * 4
        drawFrame(ctx, node.frameType, node, personImg)
        ctx.restore()

        ctx.save()
        ctx.globalAlpha = nodeP
        ctx.translate(pos.x, pos.y + PERSON_R + 30)
        ctx.rotate(rd.labelRotation)
        ctx.fillStyle = '#5D524B'
        ctx.font = '450 22px "Bradford LL", "Iowan Old Style", "Palatino Linotype", serif'
        ctx.textAlign = 'center'
        ctx.textBaseline = 'middle'
        ctx.fillText(node.firstName, 0, 0)
        ctx.fillStyle = '#8B7355'
        ctx.font = '400 16px "Red Hat Mono", ui-monospace, monospace'
        ctx.fillText(node.years, 0, 22)
        ctx.restore()
      })

      ctx.restore()

      const entranceDone = elapsed > totalEntranceMs + 250
      if (reduced && entranceDone) {
        stopLoop()
        return
      }

      queueFrame()
    }

    const onMotionPreferenceChange = () => {
      runtime.reducedMotion = mq.matches
      startLoop(true)
    }

    const onVisibilityChange = () => {
      runtime.tabVisible = !document.hidden
      if (!runtime.tabVisible) {
        stopLoop()
      } else {
        startLoop()
      }
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        runtime.inView = Boolean(entry?.isIntersecting)
        if (runtime.inView) {
          startLoop()
        } else {
          stopLoop()
        }
      },
      { threshold: 0.12 },
    )

    const onMouseMove = (e) => {
      const rect = canvas.getBoundingClientRect()
      runtime.mouseX = e.clientX - rect.left
      runtime.mouseY = e.clientY - rect.top
      startLoop()
    }

    const onMouseLeave = () => {
      runtime.mouseX = -1
      runtime.mouseY = -1
      startLoop()
    }

    observer.observe(container)
    canvas.addEventListener('mousemove', onMouseMove)
    canvas.addEventListener('mouseleave', onMouseLeave)
    document.addEventListener('visibilitychange', onVisibilityChange)
    mq.addEventListener('change', onMotionPreferenceChange)

    startLoop(true)

    return () => {
      stopLoop()
      observer.disconnect()
      canvas.removeEventListener('mousemove', onMouseMove)
      canvas.removeEventListener('mouseleave', onMouseLeave)
      document.removeEventListener('visibilitychange', onVisibilityChange)
      mq.removeEventListener('change', onMotionPreferenceChange)
    }
  }, [])

  return (
    <div ref={containerRef} className={`relative w-full max-w-2xl mx-auto lg:mx-0 ${className}`} data-reveal data-hero-galaxy>
      <canvas
        ref={canvasRef}
        className="block w-full h-[40svh] sm:h-[clamp(420px,92vw,560px)]"
        aria-label="Mini galaxie familiale"
      />
    </div>
  )
}

// ─── Header ───────────────────────────────────────────────────────────────────

function Header({ onCta, elevated }) {
  return (
    <div className="fixed top-4 left-0 right-0 z-40 px-4 sm:px-6 pointer-events-none">
      <Container>
        <div
          className="pointer-events-auto flex items-center justify-between gap-2 sm:gap-4 px-3 sm:px-6 py-3 rounded-[18px] border border-cosmos-brown/10 transition-shadow"
          style={{
            background: 'rgba(254,249,237,0.90)',
            backdropFilter: 'blur(14px)',
            WebkitBackdropFilter: 'blur(14px)',
            boxShadow: elevated ? '0 6px 14px rgba(0,0,0,0.035)' : '0 2px 6px rgba(0,0,0,0.02)',
          }}
        >
          <div className="flex items-center gap-3">
            <Logo size={32} />
            <span className="hidden sm:inline font-bradford text-lg text-cosmos-brown tracking-[0.01em]">
              Parenthèse
            </span>
          </div>

          <div className="flex items-center gap-1 sm:gap-2">
            <button
              onClick={() => document.getElementById('demo')?.scrollIntoView({ behavior: 'smooth' })}
              className="px-3 sm:px-5 py-2 rounded-pill border border-cosmos-brown/20 bg-white/40 text-cosmos-brown/80 font-mono text-xs sm:text-sm hover:border-cosmos-brown/40 hover:bg-white/60 active:scale-95 transition-all duration-300"
            >
              <span className="sm:hidden">Démo</span>
              <span className="hidden sm:inline">Découvrir</span>
            </button>
            <button
              onClick={onCta}
              className="px-3 sm:px-5 py-2 rounded-pill bg-cosmos-gold text-cosmos-cream font-mono text-xs sm:text-sm hover:bg-[#A67C52]/90 hover:shadow-[0_4px_12px_rgba(166,124,82,0.15)] hover:-translate-y-0.5 active:scale-95 transition-all duration-300"
            >
              Créer mon arbre
            </button>
          </div>
        </div>
      </Container>
    </div>
  )
}

// ─── Démo inline ──────────────────────────────────────────────────────────────

function InlineDemo() {
  const [active, setActive] = useState(false)
  const [loaded, setLoaded] = useState(false)
  const [entered, setEntered] = useState(false)
  const [shouldLoad, setShouldLoad] = useState(false)
  const [isMobile, setIsMobile] = useState(() => window.matchMedia('(max-width: 768px)').matches)
  const sectionRef = useRef(null)

  // L'iframe de l'app (500 Ko de JS + la galaxie) ne se charge qu'à l'approche de la section,
  // pour ne pas alourdir le premier affichage de la landing (TBT, LCP).
  useEffect(() => {
    const el = sectionRef.current
    if (!el || shouldLoad) return
    if (!('IntersectionObserver' in window)) { setShouldLoad(true); return }
    const observer = new IntersectionObserver((entries) => {
      if (entries.some((entry) => entry.isIntersecting)) { setShouldLoad(true); observer.disconnect() }
    }, { rootMargin: '400px 0px' })
    observer.observe(el)
    return () => observer.disconnect()
  }, [shouldLoad])

  // Déactivation automatique au scroll (l'iframe ne vole pas le scroll)
  useEffect(() => {
    const onScroll = () => { if (active) setActive(false) }
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [active])

  // Animation d'entree immediate, independante du scroll
  useEffect(() => {
    const frameId = window.requestAnimationFrame(() => setEntered(true))
    return () => window.cancelAnimationFrame(frameId)
  }, [])

  useEffect(() => {
    const media = window.matchMedia('(max-width: 768px)')
    const onChange = (event) => setIsMobile(event.matches)
    setIsMobile(media.matches)
    media.addEventListener('change', onChange)
    return () => media.removeEventListener('change', onChange)
  }, [])

  return (
    <section
      id="demo"
      ref={sectionRef}
      className="relative px-4 sm:px-6 pt-12 sm:pt-0 pb-10"
      style={{
        marginTop: '0px',
        background: 'linear-gradient(180deg, #fff6e2 0%, #fef9ed 46%, #f5e9d6 100%)',
      }}
    >
      <Container>
        <div className="max-w-3xl mx-auto mb-6 sm:mb-8 text-center" data-reveal>
          <span
            className="inline-flex items-center px-3 py-1.5 rounded-pill border border-cosmos-brown/12 font-mono text-xs tracking-wider uppercase bg-white/60 backdrop-blur-sm shadow-sm"
            style={{ color: 'rgba(93, 82, 75, 0.8)' }}
          >
            Démo interactive
          </span>
          <h2 className="mt-5 font-bradford text-3xl sm:text-4xl text-cosmos-brown leading-tight">
            Une exploration familiale qui se comprend en quelques secondes.
          </h2>
          <p className="mt-4 text-cosmos-brown/80 text-base sm:text-lg leading-relaxed">
            Ouvrez un portrait, consultez les souvenirs, puis naviguez de génération en génération naturellement.
          </p>
        </div>

        <div
          className="relative max-w-[1120px] mx-auto rounded-[14px] overflow-hidden border border-cosmos-brown/12 bg-[#f7eddd] shadow-[0_4px_14px_rgba(93,82,75,0.06)]"
          style={{
            opacity: entered ? 1 : 0,
            transform: entered ? 'translateY(0) scale(1)' : 'translateY(30px) scale(0.985)',
            filter: entered ? 'blur(0px)' : 'blur(2px)',
            transition: 'opacity 0.75s ease, transform 0.85s cubic-bezier(0.22,1,0.36,1), filter 0.75s ease',
          }}
        >
          <div
            className="relative"
            style={isMobile
              ? { minHeight: '66vh', height: '88vw', maxHeight: '780px' }
              : { minHeight: '52vh', height: '56vw', maxHeight: '720px' }}
          >
            {!loaded && (
              <div className="absolute inset-0 flex items-center justify-center z-10 bg-[#f7eddd]">
                <span className="text-cosmos-brown/60 font-mono text-sm tracking-wide">{shouldLoad ? 'Chargement de la démo…' : 'Démo interactive'}</span>
              </div>
            )}

            <iframe
              src={shouldLoad ? 'https://app.parenthese.io/?embed' : undefined}
              title="Démo Parenthèse"
              loading="lazy"
              className="w-full h-full border-0"
              sandbox="allow-scripts allow-same-origin"
              onLoad={() => { if (shouldLoad) setLoaded(true) }}
              style={{
                pointerEvents: active ? 'auto' : 'none',
                opacity: loaded ? 1 : 0,
                width: isMobile ? '122%' : '100%',
                height: isMobile ? '122%' : '100%',
                transform: isMobile ? 'scale(0.82)' : 'none',
                transformOrigin: 'top left',
                transition: 'opacity 0.4s ease',
              }}
            />

            {!active && loaded && (
              <div
                role="button"
                tabIndex={0}
                onClick={() => setActive(true)}
                onKeyDown={(e) => e.key === 'Enter' && setActive(true)}
                className="absolute inset-0 flex items-center justify-center cursor-pointer z-20"
                style={{ background: 'linear-gradient(180deg, rgba(254,249,237,0.08) 0%, rgba(20,15,10,0.20) 100%)' }}
                aria-label="Entrer dans la démo"
              >
                <div
                  className="flex items-center gap-2 px-5 py-2.5 rounded-[9px] border border-cosmos-brown/15 text-cosmos-brown"
                  style={{ background: 'rgba(254, 249, 237, 0.96)' }}
                >
                  <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-cosmos-gold/14">
                    <svg width="12" height="12" viewBox="0 0 16 16" fill="none">
                      <path d="M6 4l5 4-5 4V4Z" fill="currentColor" />
                    </svg>
                  </span>
                  <span className="font-bradford text-base leading-none tracking-[0.01em]">
                    Entrer dans la démo
                  </span>
                </div>
              </div>
            )}

          </div>
        </div>
      </Container>
    </section>
  )
}

// ─── App ──────────────────────────────────────────────────────────────────────

// Les CTA mènent à la création de compte dans l'app
const APP_SIGNUP_URL = 'https://app.parenthese.io/?account=register&source=landing'

export default function App() {
  const [headerElevated, setHeaderElevated] = useState(false)
  const [sharedReturnUrl, setSharedReturnUrl] = useState('')
  const scrollMilestonesRef = useRef({ half: false, full: false })

  const source = new URLSearchParams(window.location.search).get('source') || 'direct'
  const buildEventProps = (extra = {}) => ({
    source,
    referrer: document.referrer || 'none',
    viewport: window.innerWidth < 768 ? 'mobile' : 'desktop',
    ...extra,
  })

  useEffect(() => {
    analytics.capture('page_viewed', buildEventProps())
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (source !== 'app-shared') {
      setSharedReturnUrl('')
      return
    }

    const returnUrlFromQuery = new URLSearchParams(window.location.search).get('return_url') || ''

    try {
      if (returnUrlFromQuery) {
        sessionStorage.setItem('parenthese_return_url', returnUrlFromQuery)
        setSharedReturnUrl(returnUrlFromQuery)
        return
      }

      const fromSession = sessionStorage.getItem('parenthese_return_url') || ''
      setSharedReturnUrl(fromSession)
    } catch {
      setSharedReturnUrl(returnUrlFromQuery)
    }
  }, [source])

  // Parallaxe douce + header flottant inspiré de microsoft.ai
  useEffect(() => {
    const onScroll = () => {
      const y = window.scrollY || 0
      setHeaderElevated(y > 12)

      const doc = document.documentElement
      const scrollHeight = Math.max(0, doc.scrollHeight - window.innerHeight)
      const progress = scrollHeight > 0 ? y / scrollHeight : 1

      if (!scrollMilestonesRef.current.half && progress >= 0.5) {
        scrollMilestonesRef.current.half = true
        analytics.capture('scroll_depth_50', buildEventProps())
      }

      if (!scrollMilestonesRef.current.full && progress >= 0.99) {
        scrollMilestonesRef.current.full = true
        analytics.capture('scroll_depth_100', buildEventProps())
      }
    }
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  // Révélations douces des sections
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) entry.target.classList.add('is-visible')
        })
      },
      { threshold: 0.22, rootMargin: '0px 0px -5% 0px' }
    )
    document.querySelectorAll('[data-reveal]').forEach((el) => observer.observe(el))
    return () => observer.disconnect()
  }, [])

  // Vers la création de compte dans l'app. L'événement hero_cta_clicked est conservé pour le funnel PostHog.
  const goToSignup = (placement = 'hero') => {
    analytics.capture('hero_cta_clicked', buildEventProps({ placement }))
    analytics.capture('signup_cta_clicked', buildEventProps({ placement }))
    window.location.assign(APP_SIGNUP_URL)
  }

  const scrollToDemo = () => {
    document.getElementById('demo').scrollIntoView({ behavior: 'smooth' })
  }

  return (
    <div className="min-h-screen bg-cosmos-cream font-bradford text-cosmos-brown">

      {/* ─── HEADER ─────────────────────────────────────────────────── */}
      <Header onCta={() => goToSignup('header')} elevated={headerElevated} />
      <main>

      {/* ─── HERO ────────────────────────────────────────────────────── */}
      <section className="relative px-4 sm:px-6 overflow-hidden min-h-[100svh] sm:min-h-[78vh] pt-[124px] pb-6 sm:pb-0">
        <div className="absolute inset-0" style={{ background: 'linear-gradient(180deg, #fff5df 0%, #fef9ed 52%, #fff5df 100%)' }} />
        <Grain opacity={0.032} />

        <Container className="relative z-20 grid lg:grid-cols-[1.05fr,0.95fr] items-start lg:items-center gap-8 sm:gap-10 min-h-[calc(100svh-148px)] sm:min-h-0">
          <HeroGraph className="order-1 lg:order-2" />

          <div className="order-2 lg:order-1 -mt-3 sm:mt-0 min-h-[60svh] sm:min-h-0 flex flex-col justify-start gap-4 text-center lg:text-left max-w-xl mx-auto lg:mx-0" data-reveal>
            <h1 className="font-bradford text-5xl sm:text-6xl leading-tight text-cosmos-brown">
              Votre histoire familiale, <em>vivante</em> et partagée.
            </h1>
            <p className="w-[88%] sm:w-[82%] lg:w-[90%] mx-auto lg:mx-0 text-base sm:text-lg text-cosmos-brown/80 leading-relaxed mt-1">
              {source === 'app-shared'
                ? "Vous venez de découvrir Parenthèse à travers le lien d'une famille. Créez la vôtre en quelques minutes."
                : "Une galaxie de votre famille. Des photos, des anecdotes, des voix. Partageable en un lien, sans compte, sans friction. Pour ceux qui veulent garder la mémoire vivante avant qu'elle disparaisse."}
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center lg:justify-start mt-2">
              <button
                onClick={() => goToSignup('hero')}
                className="inline-flex items-center justify-center gap-2 px-7 py-4 rounded-pill bg-cosmos-gold text-cosmos-cream font-mono text-base hover:bg-[#A67C52]/90 hover:-translate-y-0.5 active:scale-95 transition-all duration-300 shadow-[0_4px_16px_rgba(166,124,82,0.15)] hover:shadow-[0_8px_24px_rgba(166,124,82,0.2)]"
              >
                Créer mon arbre
                <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-cosmos-cream/20 transition-colors">
                  <IconArrowRight size={12} />
                </span>
              </button>
              <button
                onClick={() => document.getElementById('demo')?.scrollIntoView({ behavior: 'smooth' })}
                className="inline-flex items-center justify-center gap-2 px-7 py-4 rounded-pill border border-cosmos-brown/15 bg-white/30 backdrop-blur-sm text-cosmos-brown/80 font-mono text-base hover:border-cosmos-brown/30 hover:bg-white/50 active:scale-95 transition-all duration-300 shadow-[0_2px_10px_rgba(93,82,75,0.02)] hover:shadow-[0_4px_16px_rgba(93,82,75,0.05)]"
              >
                Voir la démo
                <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-cosmos-brown/[0.06]">
                  <IconArrowDown size={12} />
                </span>
              </button>
            </div>
          </div>
        </Container>
      </section>

      {/* ─── DÉMO INLINE ────────────────────────────────────────────── */}
      <InlineDemo />

      {/* ─── CONSTAT ────────────────────────────────────────────────── */}
      <section className="relative bg-cosmos-surface py-24 px-6 overflow-hidden">
        <Grain opacity={0.05} />
        <Container className="relative z-20" data-reveal>
          <div className="max-w-2xl mx-auto text-center">
            <h2 className="font-bradford text-3xl sm:text-4xl mb-6 text-cosmos-brown">
              Beaucoup d'outils de généalogie ne visent pas le même usage.
            </h2>
            <p className="text-cosmos-brown/80 text-lg leading-relaxed">
              Ils sont souvent pensés pour documenter précisément des données et mener des recherches.
              Parenthèse vise autre chose: rendre les souvenirs familiaux simples à explorer et à transmettre.
            </p>
            <p className="mt-4 text-cosmos-brown/80 text-lg leading-relaxed">
              Une interface chaleureuse, compréhensible en quelques secondes, pour toute la famille.
            </p>
          </div>
        </Container>
      </section>

      {/* ─── SOLUTION ───────────────────────────────────────────────── */}
      <section className="bg-cosmos-cream py-24 px-6">
        <Container data-reveal>
          <div className="max-w-4xl mx-auto">
            <h2 className="font-bradford text-3xl sm:text-4xl text-center mb-16 text-cosmos-brown">
              Parenthèse, c'est votre famille<br className="hidden sm:block" /> comme vous ne l'avez jamais vue.
            </h2>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-10">
              {[
                {
                  icon: <IconGalaxy />,
                  title: 'Une galaxie vivante',
                  text: 'Chaque membre est un nœud. Cliquez dessus : ses photos, ses anecdotes, ses vidéos, sa voix. Une expérience, pas une base de données.',
                },
                {
                  icon: <IconShare />,
                  title: 'Partageable en un lien',
                  text: 'Envoyez le lien à votre famille. Ils voient tout, sans créer de compte. Ils peuvent suggérer des ajouts, corriger des infos, ajouter leurs propres souvenirs.',
                },
                {
                  icon: <IconHeart />,
                  title: 'Pour tout le monde',
                  text: 'Du gamin de 8 ans à la grand-mère de 80 ans. Pas de tutoriel. On comprend en 10 secondes.',
                },
              ].map(({ icon, title, text }) => (
                <div key={title} className="group relative flex flex-col items-center text-center sm:items-start sm:text-left gap-4 p-8 rounded-2xl bg-white/40 backdrop-blur-md border border-white/60 shadow-[0_8px_32px_rgba(93,82,75,0.05)] hover:shadow-[0_12px_44px_rgba(93,82,75,0.08)] hover:-translate-y-1 transition-all duration-300">
                  <div className="absolute inset-0 bg-gradient-to-br from-white/40 to-white/0 rounded-2xl pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                  <div className="relative w-12 h-12 rounded-xl bg-white/80 shadow-sm border border-white flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                    {icon}
                  </div>
                  <h3 className="relative font-bradford font-semibold text-xl text-cosmos-brown mt-2">{title}</h3>
                  <p className="relative text-cosmos-brown/80 leading-relaxed text-base">{text}</p>
                </div>
              ))}
            </div>
          </div>
        </Container>
      </section>

      {/* ─── PREUVE SOCIALE ─────────────────────────────────────────── */}
      <section className="relative py-24 px-6 overflow-hidden" style={{ background: '#F0E6D0' }}>
        <Grain opacity={0.06} />

        {/* Mini constellation décorative */}
        <svg
          viewBox="0 0 400 200"
          fill="none"
          aria-hidden="true"
          className="absolute right-0 bottom-0 w-72 opacity-20 pointer-events-none"
        >
          <circle cx="320" cy="100" r="6" fill="#A67C52" />
          <circle cx="220" cy="60" r="4.5" fill="#A67C52" />
          <circle cx="220" cy="140" r="4.5" fill="#A67C52" />
          <circle cx="140" cy="40" r="3" fill="#A67C52" />
          <circle cx="140" cy="100" r="3" fill="#A67C52" />
          <circle cx="140" cy="160" r="3" fill="#A67C52" />
          <line x1="320" y1="100" x2="220" y2="60" stroke="#A67C52" strokeWidth="1" />
          <line x1="320" y1="100" x2="220" y2="140" stroke="#A67C52" strokeWidth="1" />
          <line x1="220" y1="60" x2="140" y2="40" stroke="#A67C52" strokeWidth="0.8" />
          <line x1="220" y1="60" x2="140" y2="100" stroke="#A67C52" strokeWidth="0.8" />
          <line x1="220" y1="140" x2="140" y2="160" stroke="#A67C52" strokeWidth="0.8" />
        </svg>

        <Container className="relative z-20" data-reveal>
          <div className="max-w-2xl mx-auto text-center">
            <div className="text-cosmos-gold text-3xl mb-6">✦</div>
            <h2 className="font-bradford text-3xl sm:text-4xl mb-8 text-cosmos-brown">
              Déjà utilisé en famille.
            </h2>
            <p className="text-cosmos-brown/80 text-lg leading-relaxed">
              Parenthèse est en test depuis plusieurs mois avec une famille réelle.
              L'interface est belle, stable, et prête. Elle est ouverte à toutes les familles depuis septembre 2026.
            </p>
          </div>
        </Container>
      </section>

      {/* ─── GUIDES ─────────────────────────────────────────────────── */}
      <section className="bg-cosmos-cream py-24 px-6">
        <Container data-reveal>
          <div className="max-w-4xl mx-auto">
            <div className="text-center mb-12">
              <span
                className="inline-flex items-center px-3 py-1.5 rounded-pill border border-cosmos-brown/12 font-mono text-xs tracking-wider uppercase bg-white/60 backdrop-blur-sm shadow-sm"
                style={{ color: 'rgba(93, 82, 75, 0.8)' }}
              >
                Guides
              </span>
              <h2 className="mt-5 font-bradford text-3xl sm:text-4xl text-cosmos-brown leading-tight">
                Avant de commencer, ou pour aller plus loin.
              </h2>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              {[
                {
                  href: '/application-arbre-genealogique/',
                  title: "Quelle application d'arbre généalogique choisir ?",
                  text: 'Geneanet, MyHeritage, Filae, FamilySearch, Parenthèse : rechercher des ancêtres et garder une mémoire vivante ne sont pas le même besoin.',
                },
                {
                  href: '/arbre-genealogique-avec-photos/',
                  title: 'Faire un arbre généalogique avec des photos',
                  text: 'Rassembler, numériser avec un téléphone, nommer et dater, puis ajouter les vidéos et les voix.',
                },
                {
                  href: '/cousinade/',
                  title: 'Organiser une cousinade',
                  text: 'Retrouver toutes les branches, fixer la date, collecter les souvenirs le jour même, et garder une trace que tout le monde retrouve.',
                },
                {
                  href: '/raconter-histoire-de-famille/',
                  title: "Raconter l'histoire de sa famille",
                  text: 'Par qui commencer, les questions qui font parler, enregistrer plutôt qu\'écrire, et où garder ce qu\'on a recueilli.',
                },
              ].map(({ href, title, text }) => (
                <a
                  key={href}
                  href={href}
                  className="group relative flex flex-col gap-3 p-8 rounded-2xl bg-white/40 backdrop-blur-md border border-white/60 shadow-[0_8px_32px_rgba(93,82,75,0.05)] hover:shadow-[0_12px_44px_rgba(93,82,75,0.08)] hover:-translate-y-1 transition-all duration-300"
                >
                  <h3 className="font-bradford text-xl text-cosmos-brown leading-snug">{title}</h3>
                  <p className="text-cosmos-brown/80 leading-relaxed text-base">{text}</p>
                  <span className="mt-auto inline-flex items-center gap-2 pt-2 font-mono text-sm text-cosmos-gold">
                    Lire le guide
                    <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-cosmos-gold/10 group-hover:translate-x-0.5 transition-transform duration-300">
                      <IconArrowRight size={12} />
                    </span>
                  </span>
                </a>
              ))}
            </div>
          </div>
        </Container>
      </section>

      {/* ─── CRÉER SON ARBRE ─────────────────────────────────────────── */}
      <section id="signup" className="bg-cosmos-cream py-24 px-6">
        <Container data-reveal>
          <div className="max-w-lg mx-auto">
            <div className="text-center mb-10">
              <h2 className="font-bradford text-3xl sm:text-4xl mb-4 text-cosmos-brown">
                Créez l'arbre de votre famille.
              </h2>
              <p className="text-cosmos-brown/75 leading-relaxed">
                Un compte, un nom de famille, et vous pouvez déjà inviter les vôtres par un simple lien.
                Ils consultent sans compte, ils contribuent avec un mot de passe, vous gardez la main.
              </p>
            </div>

            <div className="text-center py-10 px-6 rounded-[24px] bg-white border border-cosmos-brown/10 shadow-[0_8px_32px_rgba(93,82,75,0.04)]">
              <button
                type="button"
                onClick={() => goToSignup('footer')}
                className="w-full inline-flex items-center justify-center gap-2 py-4 rounded-pill bg-cosmos-gold text-cosmos-cream font-mono text-base hover:bg-[#A67C52]/90 hover:-translate-y-0.5 active:scale-95 transition-all duration-300 shadow-[0_4px_16px_rgba(166,124,82,0.15)] hover:shadow-[0_8px_24px_rgba(166,124,82,0.2)]"
              >
                Créer mon arbre
                <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-cosmos-cream/20 transition-colors">
                  <IconArrowRight size={12} />
                </span>
              </button>

              {source === 'app-shared' && sharedReturnUrl && (
                <a
                  href={sharedReturnUrl}
                  className="inline-flex items-center gap-2 mt-6 text-cosmos-gold hover:underline font-mono text-sm"
                >
                  Ou retourner explorer l'arbre partagé
                  <IconArrowRight size={12} />
                </a>
              )}

              <p className="text-[11px] sm:text-xs text-cosmos-brown/55 font-mono mt-6 uppercase tracking-wider">
                Gratuit, et ça le restera. Vos données restent les vôtres.
              </p>
            </div>
          </div>
        </Container>
      </section>

      </main>

      {/* ─── FOOTER ─────────────────────────────────────────────────── */}
      <footer className="bg-cosmos-surface border-t border-cosmos-brown/10 py-10 px-6">
        <Container>
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 text-cosmos-brown/60 text-xs sm:text-sm font-mono tracking-wide">
            <div className="flex items-center gap-3">
              <Logo size={22} />
              <span>Parenthèse, 2026</span>
            </div>
            <span>Fait avec soin par <a href="https://iliesallali.design/" className="hover:text-cosmos-gold transition-colors">Ilies Allali</a></span>
            <a
              href="https://app.parenthese.io"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-cosmos-gold transition-colors"
            >
              app.parenthese.io
            </a>
            <a
              href="/donnees-et-vie-privee/"
              className="hover:text-cosmos-gold transition-colors"
            >
              Données et vie privée
            </a>
          </div>
        </Container>
      </footer>
    </div>
  )
}
