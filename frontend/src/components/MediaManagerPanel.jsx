import { useMemo, useState } from 'react'
import { getAcceptForMediaType } from '../utils/mediaUpload'
import GeoMediaThumbnail from './GeoMediaThumbnail'
import './MediaManagerPanel.css'

const YOUTUBE_RE = /^https:\/\/(www\.)?(youtube\.com|youtu\.be)\//
const HTTP_URL_RE = /^https?:\/\/\S+$/i

const MediaManagerPanel = ({
  visible,
  person,
  medias,
  loading,
  errorMessage,
  onClose,
  onUpload,
  onMove,
  onDelete,
}) => {
  const [caption, setCaption] = useState('')
  const [source, setSource] = useState('')
  const [file, setFile] = useState(null)
  const [mediaType, setMediaType] = useState('photo')
  const [citationText, setCitationText] = useState('')
  const [videoMode, setVideoMode] = useState('file') // 'file' | 'youtube'
  const [youtubeUrl, setYoutubeUrl] = useState('')

  const isCitation = mediaType === 'citation'
  const isYoutubeVideo = mediaType === 'video' && videoMode === 'youtube'
  const canUpload = useMemo(() => {
    if (loading) {
      return false
    }

    if (isCitation) {
      return citationText.trim().length > 0
    }

    if (isYoutubeVideo) {
      return YOUTUBE_RE.test(youtubeUrl.trim())
    }

    return Boolean(file)
  }, [citationText, file, isCitation, isYoutubeVideo, loading, youtubeUrl])
  const fileAccept = useMemo(() => getAcceptForMediaType(mediaType), [mediaType])

  if (!visible || !person) {
    return null
  }

  const handleSubmit = async (event) => {
    event.preventDefault()
    if (!canUpload) {
      return
    }

    await onUpload({
      file,
      caption: caption.trim() || null,
      source: source.trim() || null,
      mediaType,
      citationText: citationText.trim(),
      youtubeUrl: isYoutubeVideo ? youtubeUrl.trim() : null,
    })
    setFile(null)
    setCaption('')
    setSource('')
    setMediaType('photo')
    setCitationText('')
    setVideoMode('file')
    setYoutubeUrl('')
  }

  const handleOverlayClick = (event) => {
    if (event.target === event.currentTarget) {
      onClose()
    }
  }

  const renderSource = (value) => {
    const normalized = String(value || '').trim()
    if (!normalized) {
      return null
    }

    if (HTTP_URL_RE.test(normalized)) {
      return (
        <a href={normalized} target="_blank" rel="noreferrer">
          {normalized}
        </a>
      )
    }

    return normalized
  }

  return (
    <div className="media-manager-modal-overlay" onClick={handleOverlayClick}>
      <div className="media-manager-modal-card">
        <div className="media-manager-modal-header">
          <div className="media-manager-modal-title-wrap">
            <h1>Médias</h1>
            <p>{person.firstName} {person.lastName}</p>
          </div>
          <button type="button" className="media-manager-close" onClick={onClose}>Fermer</button>
        </div>

        <form className="media-manager-modal-form" onSubmit={handleSubmit}>
          <label htmlFor="mediaUploadType">Type de media</label>
          <select
            id="mediaUploadType"
            value={mediaType}
            onChange={(event) => {
              setMediaType(event.target.value)
              setFile(null)
              setCitationText('')
              setVideoMode('file')
              setYoutubeUrl('')
            }}
          >
            <option value="photo">Photo (max 5 Mo)</option>
            <option value="video">Video (max 20 Mo)</option>
            <option value="audio">Audio (max 20 Mo)</option>
            <option value="document">Document (max 20 Mo)</option>
            <option value="geojson">Carte GPS GeoJSON (max 20 Mo)</option>
            <option value="gpx">Trace GPX (max 20 Mo)</option>
            <option value="citation">Citation (texte)</option>
          </select>

          {mediaType === 'video' && (
            <div className="media-manager-video-mode">
              <label>
                <input
                  type="radio"
                  name="videoMode"
                  value="file"
                  checked={videoMode === 'file'}
                  onChange={() => { setVideoMode('file'); setYoutubeUrl('') }}
                />
                {' '}Fichier video
              </label>
              <label>
                <input
                  type="radio"
                  name="videoMode"
                  value="youtube"
                  checked={videoMode === 'youtube'}
                  onChange={() => { setVideoMode('youtube'); setFile(null) }}
                />
                {' '}Lien YouTube
              </label>
            </div>
          )}

          {!isCitation && !isYoutubeVideo && (
            <>
              <label htmlFor="mediaUploadFile">
                Fichier {mediaType === 'photo' ? '(max 5 Mo)' : '(max 20 Mo)'}
              </label>
              <input
                id="mediaUploadFile"
                type="file"
                accept={fileAccept}
                onChange={(event) => setFile(event.target.files?.[0] || null)}
              />
            </>
          )}

          {isYoutubeVideo && (
            <>
              <label htmlFor="mediaUploadYoutube">URL YouTube</label>
              <input
                id="mediaUploadYoutube"
                type="url"
                value={youtubeUrl}
                onChange={(event) => setYoutubeUrl(event.target.value)}
                placeholder="https://www.youtube.com/watch?v=..."
              />
            </>
          )}

          {isCitation && (
            <>
              <label htmlFor="mediaUploadCitation">Texte de la citation</label>
              <textarea
                id="mediaUploadCitation"
                className="media-manager-modal-textarea"
                value={citationText}
                onChange={(event) => setCitationText(event.target.value)}
                placeholder="Saisissez la citation..."
                rows={4}
              />
            </>
          )}

          <label htmlFor="mediaUploadCaption">Legende (optionnel)</label>
          <input
            id="mediaUploadCaption"
            type="text"
            value={caption}
            onChange={(event) => setCaption(event.target.value)}
          />

          <label htmlFor="mediaUploadSource">Source (optionnel: texte ou lien)</label>
          <input
            id="mediaUploadSource"
            type="text"
            value={source}
            onChange={(event) => setSource(event.target.value)}
            placeholder="https://... ou description de la source"
          />

          <button type="submit" disabled={!canUpload}>
            {loading ? 'Upload...' : 'Uploader'}
          </button>
        </form>

        {errorMessage && <div className="media-manager-modal-error">{errorMessage}</div>}

        <div className="media-manager-modal-list">
          {medias.length === 0 ? (
            <div className="media-manager-modal-empty">Aucun media pour cette personne.</div>
          ) : (
            medias.map((media, index) => (
              <div key={media.id} className="media-manager-modal-item">
                <div className="media-manager-modal-preview">
                  {media.type === 'photo' && media.url ? (
                    <img src={media.url} alt="" />
                  ) : media.type === 'geojson' || media.type === 'gpx' ? (
                    <GeoMediaThumbnail media={media} className="media-manager-modal-preview-map" />
                  ) : (
                    <span>{media.type === 'citation' ? 'Citation' : media.type.toUpperCase()}</span>
                  )}
                </div>
                <div className="media-manager-modal-meta">
                  <strong>{media.label || `Media ${index + 1}`}</strong>
                  <span>Type: {media.type}</span>
                  {media.source && <span>Source: {renderSource(media.source)}</span>}
                  <span>Ordre: {media.displayOrder || index + 1}</span>
                </div>
                <div className="media-manager-modal-actions">
                  <button type="button" className="media-manager-action-ghost" onClick={() => onMove(media.id, -1)} disabled={loading || index === 0}>
                    Monter
                  </button>
                  <button
                    type="button"
                    className="media-manager-action-ghost"
                    onClick={() => onMove(media.id, 1)}
                    disabled={loading || index === medias.length - 1}
                  >
                    Descendre
                  </button>
                  <button type="button" className="media-manager-action-danger" onClick={() => onDelete(media.id)} disabled={loading}>Supprimer</button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  )
}

export default MediaManagerPanel
