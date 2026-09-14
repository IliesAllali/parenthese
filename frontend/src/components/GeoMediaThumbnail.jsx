import { useEffect, useId, useState } from 'react'
import { buildProjectedMapData, parseGeoJsonMapText, parseGpxMapText } from '../utils/geoMedia'
import './GeoMediaThumbnail.css'

const thumbCache = new Map()

function getCacheKey(mediaType, mediaUrl) {
  return `${mediaType || ''}:${mediaUrl || ''}`
}

function isGeoMediaType(type) {
  return type === 'geojson' || type === 'gpx'
}

const GeoMediaThumbnail = ({ media, className = '' }) => {
  const [state, setState] = useState({ loading: true, error: false, data: null })
  const svgUid = useId().replace(/:/g, '')
  const mediaType = media?.type || ''
  const mediaUrl = media?.urlHd || media?.url || ''

  useEffect(() => {
    if (!isGeoMediaType(mediaType) || !mediaUrl) {
      setState({ loading: false, error: true, data: null })
      return
    }

    const cacheKey = getCacheKey(mediaType, mediaUrl)
    const cached = thumbCache.get(cacheKey)
    if (cached) {
      setState(cached)
      return
    }

    let cancelled = false

    async function loadMap() {
      setState({ loading: true, error: false, data: null })

      try {
        const response = await fetch(mediaUrl, { cache: 'force-cache' })
        if (!response.ok) {
          throw new Error('thumb_fetch_failed')
        }

        const text = await response.text()
        const raw = mediaType === 'geojson'
          ? parseGeoJsonMapText(text)
          : parseGpxMapText(text)
        const projected = buildProjectedMapData(raw, {
          width: 180,
          height: 120,
          minPadding: 0.008,
          paddingFactor: 0.22,
        })
        const nextState = { loading: false, error: false, data: projected }

        if (!cancelled) {
          thumbCache.set(cacheKey, nextState)
          setState(nextState)
        }
      } catch {
        const nextState = { loading: false, error: true, data: null }
        if (!cancelled) {
          setState(nextState)
        }
      }
    }

    loadMap()

    return () => {
      cancelled = true
    }
  }, [mediaType, mediaUrl])

  const rootClassName = `geo-media-thumb ${mediaType} ${className}`.trim()
  if (state.loading) {
    return <div className={rootClassName}><span className="geo-media-thumb__status">...</span></div>
  }

  if (state.error || !state.data) {
    return (
      <div className={rootClassName}>
        <span className="geo-media-thumb__fallback">{mediaType === 'gpx' ? 'GPX' : 'MAP'}</span>
      </div>
    )
  }

  const gridId = `geo-grid-${svgUid}`
  const glowId = `geo-glow-${svgUid}`

  return (
    <div className={rootClassName}>
      <svg
        className="geo-media-thumb__svg"
        viewBox={`0 0 ${state.data.width} ${state.data.height}`}
        preserveAspectRatio="none"
        role="img"
        aria-label="Miniature cartographique"
      >
        <defs>
          <pattern id={gridId} width="18" height="18" patternUnits="userSpaceOnUse">
            <path d="M 18 0 L 0 0 0 18" className="geo-media-thumb__grid" />
          </pattern>
          <radialGradient id={glowId} cx="52%" cy="43%" r="78%">
            <stop offset="0%" className="geo-media-thumb__bg-center" />
            <stop offset="100%" className="geo-media-thumb__bg-edge" />
          </radialGradient>
        </defs>

        <rect x="0" y="0" width={state.data.width} height={state.data.height} fill={`url(#${glowId})`} />
        <rect x="0" y="0" width={state.data.width} height={state.data.height} fill={`url(#${gridId})`} />

        {state.data.paths.map((path, idx) => (
          <polyline
            key={`thumb-path-${idx}`}
            className="geo-media-thumb__path"
            points={path.map((point) => `${point.x},${point.y}`).join(' ')}
          />
        ))}

        {state.data.points.map((point, idx) => (
          <g key={`thumb-point-${idx}`}>
            <circle className="geo-media-thumb__point-ring" cx={point.x} cy={point.y} r="5.2" />
            <circle className="geo-media-thumb__point-core" cx={point.x} cy={point.y} r="2.5" />
          </g>
        ))}
      </svg>
    </div>
  )
}

export default GeoMediaThumbnail
