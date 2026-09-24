import { useEffect, useId, useMemo, useState } from 'react'
import { X } from 'lucide-react'
import {
  buildOpenStreetMapEmbedUrl,
  buildOpenStreetMapUrl,
  buildProjectedMapData,
  parseGeoJsonMapText,
  parseGpxMapText,
} from '../utils/geoMedia'
import './MediaViewer.css'

const HTTP_URL_RE = /^https?:\/\/\S+$/i

const MediaViewer = ({ media, person, onClose }) => {
  const [mapState, setMapState] = useState({ loading: false, error: '', data: null })
  const svgUid = useId().replace(/:/g, '')
  const mapGridId = `media-map-grid-${svgUid}`
  const mapGlowId = `media-map-glow-${svgUid}`

  const handleOverlayClick = (event) => {
    if (event.target === event.currentTarget) onClose()
  }

  const birthYearLabel = person?.birthYear ?? '-'
  const personYears = person
    ? person.deathYear
      ? `${birthYearLabel} - ${person.deathYear}`
      : `${birthYearLabel}`
    : ''

  const mediaType = media?.type || ''
  const mediaSource = String(media?.source || '').trim()
  const isMediaSourceUrl = HTTP_URL_RE.test(mediaSource)
  const mediaUrl = media?.urlHd || media?.url || ''
  const normalizedMimeType = String(media?.mimeType || '').toLowerCase()
  const isPdfDocument = mediaType === 'document' && (
    normalizedMimeType.includes('pdf') ||
    /\.pdf(?:$|\?)/i.test(mediaUrl)
  )
  const isGeoMedia = mediaType === 'geojson' || mediaType === 'gpx'

  useEffect(() => {
    if (!isGeoMedia || !mediaUrl) {
      setMapState({ loading: false, error: '', data: null })
      return
    }

    let cancelled = false

    async function loadMapPayload() {
      setMapState({ loading: true, error: '', data: null })

      try {
        const response = await fetch(mediaUrl, { cache: 'no-store' })
        if (!response.ok) {
          throw new Error('map_fetch_failed')
        }

        const text = await response.text()
        const raw = mediaType === 'geojson'
          ? parseGeoJsonMapText(text)
          : parseGpxMapText(text)
        const projected = buildProjectedMapData(raw)

        if (!cancelled) {
          setMapState({ loading: false, error: '', data: projected })
        }
      } catch {
        if (!cancelled) {
          setMapState({ loading: false, error: 'Impossible de visualiser cette carte.', data: null })
        }
      }
    }

    loadMapPayload()

    return () => {
      cancelled = true
    }
  }, [isGeoMedia, mediaType, mediaUrl])

  const openStreetMapUrl = useMemo(() => buildOpenStreetMapUrl(mapState.data), [mapState.data])
  const openStreetMapEmbedUrl = useMemo(() => buildOpenStreetMapEmbedUrl(mapState.data), [mapState.data])
  const focusLabel = useMemo(() => {
    const focus = mapState.data?.focusCoordinate
    if (!focus) {
      return ''
    }
    const [lon, lat] = focus
    return `${Number(lat).toFixed(5)}, ${Number(lon).toFixed(5)}`
  }, [mapState.data])
  const isSinglePointOnly = Boolean(
    mapState.data &&
    mapState.data.stats.pathCount === 0 &&
    mapState.data.stats.pointCount === 1,
  )

  const typeLabels = useMemo(() => ({
    photo: 'Photo',
    video: 'Vidéo',
    audio: 'Voix',
    document: 'Document',
    citation: 'Citation',
    geojson: 'Carte GPS',
    gpx: 'Trace GPX',
  }), [])

  const renderPhoto = () => {
    if (!mediaUrl) {
      return (
        <div className="media-document-container">
          <div className="media-document-text">Photo non disponible</div>
        </div>
      )
    }

    return (
      <div className="media-photo-frame">
        <img src={mediaUrl} alt={media?.label || 'Photo'} />
      </div>
    )
  }

  const renderVideo = () => {
    if (!mediaUrl) {
      return (
        <div className="media-video-container">
          <div className="media-video-text">Video non disponible</div>
        </div>
      )
    }

    if (normalizedMimeType === 'video/youtube') {
      // Extract YouTube video ID and build embed URL
      const watchMatch = mediaUrl.match(/[?&]v=([^&]+)/)
      const shortMatch = mediaUrl.match(/youtu\.be\/([^/?]+)/)
      const videoId = (watchMatch?.[1] || shortMatch?.[1] || '').split('?')[0]
      if (!videoId) {
        return (
          <div className="media-video-container">
            <div className="media-video-text">Lien YouTube invalide</div>
          </div>
        )
      }
      const embedUrl = `https://www.youtube.com/embed/${videoId}`
      return (
        <div className="media-video-container media-video-container--youtube">
          <iframe
            className="media-video-player media-video-player--youtube"
            src={embedUrl}
            title={media?.label || 'Vidéo YouTube'}
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
          />
        </div>
      )
    }

    return (
      <video className="media-video-player" src={mediaUrl} controls preload="metadata" />
    )
  }

  const renderAudio = () => {
    if (!mediaUrl) {
      return (
        <>
          <div className="media-audio-container">
            <div className="media-audio-grooves" />
            <div className="media-audio-label-circle">
              <div className="media-audio-hole" />
            </div>
          </div>
          <div className="media-audio-text">Audio non disponible</div>
        </>
      )
    }

    return (
      <div className="media-audio-player-wrap">
        <audio className="media-audio-player" src={mediaUrl} controls preload="metadata" />
      </div>
    )
  }

  const renderDocument = () => {
    if (!mediaUrl) {
      return (
        <div className="media-document-container">
          <div className="media-document-corner" />
          <div className="media-document-lines">
            {Array.from({ length: 6 }, (_, index) => (
              <div key={index} className="media-document-line" />
            ))}
          </div>
          <div className="media-document-text">Document non disponible</div>
        </div>
      )
    }

    if (isPdfDocument) {
      return (
        <div className="media-document-viewer">
          <iframe
            className="media-document-pdf"
            src={mediaUrl}
            title={media?.label || 'Document PDF'}
          />
          <div className="media-document-actions">
            <a className="media-document-download" href={mediaUrl} target="_blank" rel="noreferrer">
              Ouvrir le PDF dans un nouvel onglet
            </a>
          </div>
        </div>
      )
    }

    return (
      <div className="media-document-container">
        <div className="media-document-corner" />
        <div className="media-document-lines">
          {Array.from({ length: 6 }, (_, index) => (
            <div key={index} className="media-document-line" />
          ))}
        </div>
        <div className="media-document-text">Apercu limite pour ce format</div>
        <div className="media-document-actions">
          <a className="media-document-download" href={mediaUrl} target="_blank" rel="noreferrer">
            Telecharger / ouvrir le document
          </a>
        </div>
      </div>
    )
  }

  const renderGeoMap = () => {
    if (!mediaUrl) {
      return (
        <div className="media-map-viewer">
          <div className="media-map-status">Fichier cartographique non disponible.</div>
        </div>
      )
    }

    if (mapState.loading) {
      return (
        <div className="media-map-viewer">
          <div className="media-map-status">Chargement de la carte...</div>
        </div>
      )
    }

    if (mapState.error || !mapState.data) {
      return (
        <div className="media-map-viewer">
          <div className="media-map-status">{mapState.error || 'Visualisation indisponible.'}</div>
          <div className="media-map-actions">
            <a className="media-map-open" href={mediaUrl} target="_blank" rel="noreferrer">
              Ouvrir le fichier
            </a>
          </div>
        </div>
      )
    }

    return (
      <div className="media-map-viewer">
        <div className="media-map-context">
          {isSinglePointOnly && openStreetMapEmbedUrl ? (
            <iframe
              className="media-map-embed"
              src={openStreetMapEmbedUrl}
              title="Carte OpenStreetMap"
              loading="lazy"
              referrerPolicy="no-referrer-when-downgrade"
            />
          ) : (
            <svg
              className="media-map-svg media-map-svg--standalone"
              viewBox={`0 0 ${mapState.data.width} ${mapState.data.height}`}
              preserveAspectRatio="none"
              role="img"
              aria-label="Apercu cartographique du media"
            >
              <defs>
                <pattern id={mapGridId} width="22" height="22" patternUnits="userSpaceOnUse">
                  <path d="M 22 0 L 0 0 0 22" className="media-map-grid" />
                </pattern>
                <radialGradient id={mapGlowId} cx="52%" cy="42%" r="82%">
                  <stop offset="0%" className="media-map-bg-center" />
                  <stop offset="100%" className="media-map-bg-edge" />
                </radialGradient>
              </defs>

              <rect x="0" y="0" width={mapState.data.width} height={mapState.data.height} fill={`url(#${mapGlowId})`} />
              <rect x="0" y="0" width={mapState.data.width} height={mapState.data.height} fill={`url(#${mapGridId})`} />

              {mapState.data.paths.map((path, pathIndex) => (
                <polyline
                  key={`path-${pathIndex}`}
                  className="media-map-trace"
                  points={path.map((point) => `${point.x},${point.y}`).join(' ')}
                />
              ))}

              {mapState.data.points.map((point, pointIndex) => (
                <g key={`pt-${pointIndex}`}>
                  <circle className="media-map-point-ring" cx={point.x} cy={point.y} r="7" />
                  <circle className="media-map-point" cx={point.x} cy={point.y} r="3.5" />
                </g>
              ))}
            </svg>
          )}
        </div>

        <div className="media-map-meta">
          <span>{mapState.data.stats.pathCount} trace(s)</span>
          <span>{mapState.data.stats.pointCount} point(s)</span>
          <span>{mapState.data.stats.vertexCount} coordonnee(s)</span>
          {focusLabel && <span>Centre: {focusLabel}</span>}
        </div>

        <div className="media-map-actions">
          {openStreetMapUrl && (
            <a className="media-map-open" href={openStreetMapUrl} target="_blank" rel="noreferrer">
              Ouvrir dans OpenStreetMap
            </a>
          )}
          <a className="media-map-open" href={mediaUrl} target="_blank" rel="noreferrer">
            Ouvrir le fichier source
          </a>
        </div>
      </div>
    )
  }

  const renderContent = () => {
    switch (mediaType) {
      case 'photo':
        return renderPhoto()
      case 'video':
        return renderVideo()
      case 'audio':
        return renderAudio()
      case 'document':
        return renderDocument()
      case 'geojson':
      case 'gpx':
        return renderGeoMap()
      case 'citation':
        return (
            <blockquote className="media-citation-container">
              <p className="media-citation-text">« {media?.label || 'Citation sans texte'} »</p>
            </blockquote>
        )
      default:
        return null
    }
  }

  if (!media) return null

  return (
    <div className="pz-overlay media-viewer-overlay" onClick={handleOverlayClick}>
      <div
        className={`media-viewer-card media-viewer-card--${mediaType}`}
        role="dialog"
        aria-modal="true"
        aria-label={media?.label || typeLabels[mediaType] || 'Souvenir'}
      >
        <button
          type="button"
          className="pz-btn pz-btn--ghost pz-btn--icon media-viewer-close"
          onClick={onClose}
          aria-label="Fermer le souvenir"
        >
          <X size={18} strokeWidth={2.25} />
        </button>

        <div className="mv-stage">
          {renderContent()}
        </div>

        <div className="mv-caption">
          {mediaType !== 'citation' && media?.label && (
            <h2 className="mv-title">{media.label}</h2>
          )}
          <div className="mv-meta">
            <span className="mv-person">
              {person?.photo ? (
                <img className="mv-person-avatar" src={person.photo} alt="" />
              ) : (
                <span className="mv-person-avatar mv-person-initial">{person?.firstName?.[0] || '?'}</span>
              )}
              <span className="mv-person-name">{person?.firstName} <em>{person?.lastName}</em></span>
              {personYears && <span className="mv-person-years">{personYears}</span>}
            </span>
            <span className="pz-tag">{typeLabels[mediaType] || mediaType}</span>
          </div>
          {mediaSource && (
            <p className="mv-source">
              Source{' '}
              {isMediaSourceUrl ? (
                <a href={mediaSource} target="_blank" rel="noreferrer">{mediaSource}</a>
              ) : (
                <span>{mediaSource}</span>
              )}
            </p>
          )}
        </div>
      </div>
    </div>
  )
}

export default MediaViewer
