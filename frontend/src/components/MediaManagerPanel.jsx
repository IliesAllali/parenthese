import { useMemo, useState } from 'react'
import { ArrowDown, ArrowUp, FileText, Image, MapPin, Mic, Plus, Quote, Route, Trash2, Upload, Video, X } from 'lucide-react'
import { getAcceptForMediaType } from '../utils/mediaUpload'
import GeoMediaThumbnail from './GeoMediaThumbnail'
import './MediaManagerPanel.css'
import PzBusy from './PzBusy.jsx'

const MEDIA_TYPES = [
  { value: 'photo', label: 'Photo', Icon: Image },
  { value: 'video', label: 'Vidéo', Icon: Video },
  { value: 'audio', label: 'Voix', Icon: Mic },
  { value: 'citation', label: 'Citation', Icon: Quote },
  { value: 'document', label: 'Document', Icon: FileText },
  { value: 'geojson', label: 'Carte', Icon: MapPin },
  { value: 'gpx', label: 'Trace GPX', Icon: Route },
]
const TYPE_NAMES = { photo: 'Photo', video: 'Vidéo', audio: 'Voix', citation: 'Citation', document: 'Document', geojson: 'Carte', gpx: 'Trace GPX' }
const TYPE_SHORT = { video: 'Vidéo', audio: 'Voix', citation: '«', document: 'Doc' }

const YOUTUBE_RE = /^https:\/\/(www\.)?(youtube\.com|youtu\.be)\//
const HTTP_URL_RE = /^https?:\/\/\S+$/i

const MediaManagerPanel = ({
  visible,
  person,
  medias,
  loading,
  errorMessage,
  notice = '',
  canManage = true,
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

  const changeType = (value) => {
    setMediaType(value)
    setFile(null)
    setCitationText('')
    setVideoMode('file')
    setYoutubeUrl('')
  }

  return (
    <div className="pz-overlay media-manager-modal-overlay" onClick={handleOverlayClick}>
      <div className="pz-modal pz-modal--wide media-manager-modal-card" role="dialog" aria-modal="true" aria-labelledby="mediaManagerTitle">
        <div className="pz-modal-head">
          <p className="pz-eyebrow">Souvenirs</p>
          <h1 id="mediaManagerTitle" className="pz-title">{person.firstName} <em>{person.lastName}</em></h1>
        </div>
        <button type="button" className="pz-btn pz-btn--ghost pz-btn--icon pz-modal-close" onClick={onClose} aria-label="Fermer">
          <X size={18} aria-hidden="true" />
        </button>

        <form className="mm-form" onSubmit={handleSubmit}>
          <div className="pz-field">
            <span className="pz-label" id="mediaUploadTypeLabel">Ajouter</span>
            <div className="mm-types" role="radiogroup" aria-labelledby="mediaUploadTypeLabel">
              {MEDIA_TYPES.map((type) => (
                <button
                  key={type.value}
                  type="button"
                  role="radio"
                  aria-checked={mediaType === type.value}
                  className={`mm-type ${mediaType === type.value ? 'is-active' : ''}`}
                  onClick={() => changeType(type.value)}
                >
                  <type.Icon size={18} strokeWidth={1.8} aria-hidden="true" />
                  <span>{type.label}</span>
                </button>
              ))}
            </div>
          </div>

          {mediaType === 'video' && (
            <div className="pz-tabs mm-video-mode" role="radiogroup" aria-label="Source de la vidéo">
              <button type="button" role="radio" aria-checked={videoMode === 'file'} className={`pz-tab ${videoMode === 'file' ? 'is-active' : ''}`} onClick={() => { setVideoMode('file'); setYoutubeUrl('') }}>
                Un fichier
              </button>
              <button type="button" role="radio" aria-checked={videoMode === 'youtube'} className={`pz-tab ${videoMode === 'youtube' ? 'is-active' : ''}`} onClick={() => { setVideoMode('youtube'); setFile(null) }}>
                Un lien YouTube
              </button>
            </div>
          )}

          {!isCitation && !isYoutubeVideo && (
            <div className="pz-field">
              <label htmlFor="mediaUploadFile" className="mm-drop">
                <span className="mm-drop-icon" aria-hidden="true"><Upload size={20} strokeWidth={1.8} /></span>
                <span className="mm-drop-text">
                  <strong>{file ? file.name : 'Choisir un fichier'}</strong>
                  <span>{file ? 'Cliquez pour en choisir un autre' : `${mediaType === 'photo' ? '5 Mo' : '20 Mo'} au maximum`}</span>
                </span>
              </label>
              <input
                id="mediaUploadFile"
                className="mm-drop-input"
                type="file"
                accept={fileAccept}
                onChange={(event) => setFile(event.target.files?.[0] || null)}
              />
            </div>
          )}

          {isYoutubeVideo && (
            <div className="pz-field">
              <label htmlFor="mediaUploadYoutube">Lien de la vidéo</label>
              <input
                id="mediaUploadYoutube"
                type="url"
                value={youtubeUrl}
                onChange={(event) => setYoutubeUrl(event.target.value)}
                placeholder="https://www.youtube.com/watch?v=…"
              />
            </div>
          )}

          {isCitation && (
            <div className="pz-field">
              <label htmlFor="mediaUploadCitation">Ce qu'elle ou il disait</label>
              <textarea
                id="mediaUploadCitation"
                value={citationText}
                onChange={(event) => setCitationText(event.target.value)}
                placeholder="On partait à six dans la 4L, le coffre attaché avec une ficelle."
                rows={3}
              />
            </div>
          )}

          <div className="pz-row2">
            <div className="pz-field">
              <label htmlFor="mediaUploadCaption">Titre <span className="mm-optional">facultatif</span></label>
              <input
                id="mediaUploadCaption"
                type="text"
                value={caption}
                onChange={(event) => setCaption(event.target.value)}
                placeholder="Été à Quiberon, 1978"
              />
            </div>
            <div className="pz-field">
              <label htmlFor="mediaUploadSource">Source <span className="mm-optional">facultatif</span></label>
              <input
                id="mediaUploadSource"
                type="text"
                value={source}
                onChange={(event) => setSource(event.target.value)}
                placeholder="Album de famille, ou un lien"
              />
            </div>
          </div>

          {errorMessage && <div className="pz-error" role="alert">{errorMessage}</div>}
          {notice && !errorMessage && <div className="pz-success" role="status">{notice}</div>}

          <div className="pz-modal-actions">
            <button type="submit" className="pz-btn pz-btn--primary" disabled={!canUpload}>
              <Plus size={16} aria-hidden="true" />
              <PzBusy busy={loading} busyLabel="Envoi du souvenir">Ajouter ce souvenir</PzBusy>
            </button>
          </div>
        </form>

        <section className="mm-list-wrap">
          <h2 className="pz-eyebrow">{medias.length > 0 ? `Déjà là · ${medias.length}` : 'Déjà là'}</h2>
          {medias.length === 0 ? (
            <p className="pz-small mm-empty">Pas encore de souvenir. Le premier que vous ajoutez apparaît en tête de sa fiche.</p>
          ) : (
            <ul className="mm-list">
              {medias.map((media, index) => (
                <li key={media.id} className="mm-item">
                  <span className="mm-preview" aria-hidden="true">
                    {media.type === 'photo' && media.url ? (
                      <img src={media.url} alt="" />
                    ) : media.type === 'geojson' || media.type === 'gpx' ? (
                      <GeoMediaThumbnail media={media} className="media-manager-modal-preview-map" />
                    ) : (
                      <span>{TYPE_SHORT[media.type] || media.type}</span>
                    )}
                  </span>
                  <span className="mm-meta">
                    <strong>{media.label || `Souvenir ${index + 1}`}</strong>
                    <span>
                      {TYPE_NAMES[media.type] || media.type}
                      {media.source && <> · {renderSource(media.source)}</>}
                    </span>
                  </span>
                  {canManage && <span className="mm-actions">
                    <button type="button" className="pz-btn pz-btn--ghost pz-btn--icon" onClick={() => onMove(media.id, -1)} disabled={loading || index === 0} aria-label="Monter">
                      <ArrowUp size={16} aria-hidden="true" />
                    </button>
                    <button type="button" className="pz-btn pz-btn--ghost pz-btn--icon" onClick={() => onMove(media.id, 1)} disabled={loading || index === medias.length - 1} aria-label="Descendre">
                      <ArrowDown size={16} aria-hidden="true" />
                    </button>
                    <button type="button" className="pz-btn pz-btn--danger-ghost pz-btn--icon" onClick={() => onDelete(media.id)} disabled={loading} aria-label="Supprimer">
                      <Trash2 size={16} aria-hidden="true" />
                    </button>
                  </span>}
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </div>
  )
}

export default MediaManagerPanel
