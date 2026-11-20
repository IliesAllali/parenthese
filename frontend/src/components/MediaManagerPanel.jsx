import { surnameLabel } from '../utils/personName.js'
import { useEffect, useMemo, useRef, useState } from 'react'
import { readContributorName } from '../utils/contributorName'
import { ArrowDown, ArrowUp, FileText, Image, MapPin, Mic, Plus, Quote, Route, Trash2, Upload, Video, X } from 'lucide-react'
import { getAcceptForMediaType } from '../utils/mediaUpload'
import GeoMediaThumbnail from './GeoMediaThumbnail'
import './MediaManagerPanel.css'
import PzBusy from './PzBusy.jsx'
import { t } from '../i18n/index.js'
import ImmichAssetPicker from './ImmichAssetPicker.jsx'
import { fetchImmichConfig } from '../api/immichApi.js'
import { blurPlaceholder } from '../utils/blurhash.js'
import { youtubeWatchUrl } from '../utils/youtube.js'
import { MediaPeopleList, MediaPeopleMarkers } from './MediaPeople.jsx'

const MEDIA_TYPES = [
  { value: 'photo', label: t('Photo'), Icon: Image },
  { value: 'video', label: t('Vidéo'), Icon: Video },
  { value: 'audio', label: t('Voix'), Icon: Mic },
  { value: 'citation', label: t('Citation'), Icon: Quote },
  { value: 'document', label: t('Document'), Icon: FileText },
  { value: 'geojson', label: t('Carte'), Icon: MapPin },
  { value: 'gpx', label: t('Trace GPX'), Icon: Route },
]
// La famille garde l'essentiel ; carte et trace GPX restent au propriétaire
const FAMILY_TYPES = ['photo', 'video', 'audio', 'citation', 'document']
const TYPE_NAMES = { photo: t('Photo'), video: t('Vidéo'), audio: t('Voix'), citation: t('Citation'), document: t('Document'), geojson: t('Carte'), gpx: t('Trace GPX') }
const TYPE_SHORT = { video: t('Vidéo'), audio: t('Voix'), citation: '«', document: t('Doc') }

const HTTP_URL_RE = /^https?:\/\/\S+$/i

// Une photo choisie, avant l'envoi : qui est dessus se dit sur la photo, comme dans la visionneuse (MediaViewer) :
// on ajoute la personne, puis on touche son visage, et le point y reste
function PhotoDraft({ item, getPerson, allPersons, disabled, onChange, onRemove }) {
  const [activeId, setActiveId] = useState(null)
  const setPeople = (people) => onChange({ ...item, people })
  const place = (event) => {
    if (!activeId) return
    const box = event.currentTarget.getBoundingClientRect()
    const clamp = (value) => Math.min(1, Math.max(0, value))
    const x = Number(clamp((event.clientX - box.left) / box.width).toFixed(4))
    const y = Number(clamp((event.clientY - box.top) / box.height).toFixed(4))
    setPeople(item.people.map((tag) => (tag.personId === activeId ? { ...tag, x, y } : tag)))
    setActiveId(null)
  }
  return (
    <li className="mm-photo">
      <div className={`mv-photo-box is-tagging mm-photo-box${activeId ? ' is-placing' : ''}`} onClick={place}>
        <img src={item.preview} alt="" />
        <MediaPeopleMarkers people={item.people} getPerson={getPerson} activeId={activeId} onOpenPerson={(id) => setActiveId(id)} />
      </div>
      <div className="mm-photo-side">
        <div className="mm-photo-file">
          <span className="mm-photo-name">{item.file.name}</span>
          <button type="button" className="pz-btn pz-btn--ghost pz-btn--sm" onClick={onRemove} disabled={disabled}>{t('Retirer')}</button>
        </div>
        <MediaPeopleList
          people={item.people}
          getPerson={getPerson}
          allPersons={allPersons}
          editing
          canPlace
          activeId={activeId}
          onActivate={setActiveId}
          onAdd={(personId) => { setPeople([...item.people, { personId, x: null, y: null }]); setActiveId(personId) }}
          onRemove={(personId) => { setPeople(item.people.filter((tag) => tag.personId !== personId)); setActiveId((current) => (current === personId ? null : current)) }}
        />
      </div>
    </li>
  )
}

const MediaManagerPanel = ({
  visible,
  person,
  medias,
  loading,
  errorMessage,
  notice = '',
  canManage = true,
  treeId,
  token,
  allPersons = [],
  getPerson = () => null,
  onClose,
  onSent,
  onUpload,
  onMove,
  onDelete,
}) => {
  const [caption, setCaption] = useState('')
  const [source, setSource] = useState('')
  const [file, setFile] = useState(null)
  // Photos choisies d'un coup (comme MomentSheet) : un souvenir par photo, envoyées l'une après l'autre
  const [photos, setPhotos] = useState([])
  const [immichConfigured, setImmichConfigured] = useState(false)
  const [pickingImmich, setPickingImmich] = useState(false)
  // Souvenirs choisis dans Immich : un souvenir par fichier, envoyés l'un après l'autre à l'enregistrement
  const [immichFiles, setImmichFiles] = useState([])
  const [sending, setSending] = useState(false)
  const fileInput = useRef(null)
  const immichAvailable = canManage && immichConfigured
  useEffect(() => {
    let cancelled = false
    if (visible && canManage && treeId && token) fetchImmichConfig(treeId, token).then(({ config }) => {
      if (!cancelled) setImmichConfigured(Boolean(config?.configured))
    }).catch(() => { if (!cancelled) setImmichConfigured(false) })
    return () => { cancelled = true }
  }, [visible, canManage, treeId, token])
  useEffect(() => { if (!visible) { setPickingImmich(false); setImmichConfigured(false); setImmichFiles([]) } }, [visible])
  const [mediaType, setMediaType] = useState('photo')
  const [citationText, setCitationText] = useState('')
  const [videoMode, setVideoMode] = useState('file') // 'file' | 'youtube'
  const [youtubeUrl, setYoutubeUrl] = useState('')
  const [contributorName, setContributorName] = useState(() => readContributorName())
  // Le prénom donné à l'accueil signe l'envoi : le champ n'apparaît que s'il manque à l'ouverture
  const [askName, setAskName] = useState(() => !readContributorName())
  // Le panneau est monté dès le départ : relire le prénom à chaque ouverture (il a pu être donné entre-temps)
  useEffect(() => {
    if (!visible) return
    const known = readContributorName()
    setContributorName((current) => current || known)
    setAskName(!known)
  }, [visible])
  // Aperçus des photos choisies : libérés quand on en retire une, et tous à la fermeture
  const photosRef = useRef(photos)
  useEffect(() => { photosRef.current = photos }, [photos])
  useEffect(() => () => photosRef.current.forEach((item) => URL.revokeObjectURL(item.preview)), [])
  useEffect(() => {
    if (visible) return
    setPhotos((list) => { list.forEach((item) => URL.revokeObjectURL(item.preview)); return [] })
  }, [visible])

  const isCitation = mediaType === 'citation'
  const isYoutubeVideo = mediaType === 'video' && videoMode === 'youtube'
  const canUpload = useMemo(() => {
    if (loading || pickingImmich || sending) {
      return false
    }

    if (!canManage && !contributorName.trim()) {
      return false
    }

    if (immichFiles.length > 0) {
      return true
    }

    if (mediaType === 'photo') {
      return photos.length > 0
    }

    if (isCitation) {
      return citationText.trim().length > 0
    }

    if (isYoutubeVideo) {
      return youtubeWatchUrl(youtubeUrl) !== null
    }

    return Boolean(file)
  }, [canManage, citationText, contributorName, file, immichFiles, isCitation, isYoutubeVideo, loading, mediaType, photos, pickingImmich, sending, youtubeUrl])
  const fileAccept = useMemo(() => getAcceptForMediaType(mediaType), [mediaType])

  if (!visible || !person) {
    return null
  }

  const handleSubmit = async (event) => {
    event.preventDefault()
    if (!canUpload) {
      return
    }

    if (immichFiles.length > 0) {
      // Un souvenir par fichier Immich, titré par son nom de fichier ; on s'arrête à la première erreur
      setSending(true)
      let left = immichFiles
      for (const item of immichFiles) {
        const ok = await onUpload({
          file: item.file,
          caption: item.file.name.replace(/\.[^.]+$/, '') || null,
          source: source.trim() || null,
          mediaType: item.file.type.startsWith('video/') ? 'video' : 'photo',
          citationText: '',
          youtubeUrl: null,
          submittedByLabel: canManage ? null : contributorName.trim(),
        })
        if (ok === false) break
        left = left.filter((entry) => entry.key !== item.key)
        setImmichFiles(left)
      }
      setSending(false)
      if (left.length > 0) return
    } else if (mediaType === 'photo') {
      // Une photo après l'autre, chacune avec ses personnes ; une photo envoyée sort de la liste, pour qu'un nouvel
      // essai n'envoie que celles qui restent
      setSending(true)
      let left = photos
      for (const item of photos) {
        const ok = await onUpload({
          file: item.file,
          caption: caption.trim() || null,
          source: source.trim() || null,
          mediaType: 'photo',
          citationText: '',
          youtubeUrl: null,
          people: item.people,
          submittedByLabel: canManage ? null : contributorName.trim(),
        })
        if (ok === false) break
        URL.revokeObjectURL(item.preview)
        left = left.filter((entry) => entry.key !== item.key)
        setPhotos(left)
      }
      setSending(false)
      if (left.length > 0) return
      if (!canManage) {
        setCaption('')
        onSent?.(photos.length)
        return
      }
    } else {
      const ok = await onUpload({
        file,
        caption: caption.trim() || null,
        source: source.trim() || null,
        mediaType,
        citationText: citationText.trim(),
        youtubeUrl: isYoutubeVideo ? youtubeWatchUrl(youtubeUrl) : null,
        submittedByLabel: canManage ? null : contributorName.trim(),
      })
      if (ok === false) return
      if (!canManage) {
        setFile(null)
        setCaption('')
        setCitationText('')
        setYoutubeUrl('')
        onSent?.(1)
        return
      }
    }
    setFile(null)
    setImmichFiles([])
    setCaption('')
    setSource('')
    setMediaType('photo')
    setCitationText('')
    setVideoMode('file')
    setYoutubeUrl('')
  }

  // Le bouton dit ce qui manque : le prénom, quand le champ est là et vide
  const batch = immichFiles.length || (mediaType === 'photo' ? photos.length : 0)
  const submitLabel = !canManage && askName && !contributorName.trim() && (batch > 0 || file || citationText.trim())
    ? t('Il manque votre prénom')
    : batch > 1 ? t('Ajouter ces {n} souvenirs', { n: batch }) : t('Ajouter ce souvenir')

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

  const addPhotos = (list) => {
    const next = [...list].map((picked) => ({ key: `${picked.name}-${picked.size}-${picked.lastModified}`, file: picked, preview: URL.createObjectURL(picked), people: [] }))
    setPhotos((current) => {
      const merged = [...current]
      for (const item of next) {
        if (merged.some((existing) => existing.key === item.key)) URL.revokeObjectURL(item.preview)
        else merged.push(item)
      }
      return merged
    })
  }
  const removePhoto = (key) => setPhotos((list) => {
    list.filter((item) => item.key === key).forEach((item) => URL.revokeObjectURL(item.preview))
    return list.filter((item) => item.key !== key)
  })

  const changeType = (value) => {
    setMediaType(value)
    setFile(null)
    setPhotos((list) => { list.forEach((item) => URL.revokeObjectURL(item.preview)); return [] })
    setImmichFiles([])
    setCitationText('')
    setVideoMode('file')
    setYoutubeUrl('')
  }

  // Un souvenir choisi dans Immich s'ajoute à la liste ; la galerie reste ouverte pour en cocher d'autres
  const addImmichFile = (picked) => {
    setFile(null)
    if (fileInput.current) fileInput.current.value = ''
    setImmichFiles((list) => (list.some((entry) => entry.file.name === picked.name && entry.file.size === picked.size)
      ? list
      : [...list, { key: `${picked.name}-${picked.size}`, file: picked }]))
  }

  return (
    <div className="pz-overlay media-manager-modal-overlay" onClick={handleOverlayClick}>
      <div className="pz-modal pz-modal--wide media-manager-modal-card" role="dialog" aria-modal="true" aria-labelledby="mediaManagerTitle">
        <div className="pz-modal-head">
          <p className="pz-eyebrow">{canManage ? t('Souvenirs') : t('Ajouter un souvenir pour')}</p>
          <h1 id="mediaManagerTitle" className="pz-title">{person.firstName} <em>{surnameLabel(person.lastName)}</em></h1>
        </div>
        <button type="button" className="pz-btn pz-btn--ghost pz-btn--icon pz-modal-close" onClick={onClose} aria-label={t('Fermer')}>
          <X size={18} aria-hidden="true" />
        </button>

        <form className="mm-form" onSubmit={handleSubmit}>
          <div className="pz-field">
            <span className="pz-label" id="mediaUploadTypeLabel">{canManage ? t('Ajouter') : t('Que voulez-vous ajouter ?')}</span>
            <div className="mm-types" role="radiogroup" aria-labelledby="mediaUploadTypeLabel">
              {MEDIA_TYPES.filter((type) => canManage || FAMILY_TYPES.includes(type.value)).map((type) => (
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
            <div className="pz-tabs mm-video-mode" role="radiogroup" aria-label={t('Source de la vidéo')}>
              <button type="button" role="radio" aria-checked={videoMode === 'file'} className={`pz-tab ${videoMode === 'file' ? 'is-active' : ''}`} onClick={() => { setVideoMode('file'); setYoutubeUrl('') }}>
                {t('Un fichier')}
              </button>
              <button type="button" role="radio" aria-checked={videoMode === 'youtube'} className={`pz-tab ${videoMode === 'youtube' ? 'is-active' : ''}`} onClick={() => { setVideoMode('youtube'); setFile(null) }}>
                {t('Un lien YouTube')}
              </button>
            </div>
          )}

          {pickingImmich && canManage && <ImmichAssetPicker treeId={treeId} token={token} onClose={() => setPickingImmich(false)} onSelect={addImmichFile} />}
          {!isCitation && !isYoutubeVideo && (() => {
            // Immich ne donne que des photos et des vidéos : le lien n'apparaît que pour ces deux types
            const withImmich = immichAvailable && (mediaType === 'photo' || mediaType === 'video')
            // Le lien est un bouton dans le label : un clic dessus n'ouvre pas le sélecteur de fichiers
            const immichLink = withImmich && <button type="button" className="mm-drop-link" disabled={loading || sending} onClick={() => setPickingImmich(true)}>{t('depuis Immich')}</button>
            const count = immichFiles.length
            const isPhoto = mediaType === 'photo'
            const title = count === 1 ? t('1 souvenir choisi dans Immich')
              : count > 1 ? t('{n} souvenirs choisis dans Immich', { n: count })
                : isPhoto ? (photos.length ? t('Ajouter d’autres photos') : t('Choisir des photos'))
                  : file ? file.name : t('Choisir un fichier')
            const hint = count > 0 ? <>{t('En ajouter d’autres')} {immichLink}</>
              : isPhoto ? t('5 Mo au maximum') : file ? '' : t('20 Mo au maximum')
            return (
              <>
              <div className="pz-field">
                <label htmlFor="mediaUploadFile" className="mm-drop">
                  <span className="mm-drop-icon" aria-hidden="true"><Upload size={20} strokeWidth={1.8} /></span>
                  <span className="mm-drop-text">
                    <strong>{title}{withImmich && count === 0 && !file && <> {t('ou')} {immichLink}</>}</strong>
                    {hint && <span>{hint}</span>}
                  </span>
                </label>
                <input
                  id="mediaUploadFile"
                  ref={fileInput}
                  className="mm-drop-input"
                  type="file"
                  accept={fileAccept}
                  multiple={isPhoto}
                  onChange={(event) => {
                    if (isPhoto) { addPhotos(event.target.files || []); event.target.value = '' } else setFile(event.target.files?.[0] || null)
                    setImmichFiles([])
                  }}
                />
                {count > 0 && (
                  <ul className="mm-immich-queue" aria-label={t('Souvenirs choisis dans Immich')}>
                    {immichFiles.map((item) => (
                      <li key={item.key}>
                        <span>{item.file.name}</span>
                        <button type="button" className="pz-btn pz-btn--ghost pz-btn--sm" onClick={() => setImmichFiles((list) => list.filter((entry) => entry.key !== item.key))} disabled={sending}>{t('Retirer')}</button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
              {isPhoto && photos.length > 0 && (
                <ul className="mm-photos" aria-label={t('Photos choisies')}>
                  {photos.map((item) => (
                    <PhotoDraft
                      key={item.key}
                      item={item}
                      getPerson={getPerson}
                      allPersons={allPersons}
                      disabled={sending}
                      onChange={(next) => setPhotos((list) => list.map((entry) => (entry.key === next.key ? next : entry)))}
                      onRemove={() => removePhoto(item.key)}
                    />
                  ))}
                </ul>
              )}
              </>
            )
          })()}

          {isYoutubeVideo && (
            <div className="pz-field">
              <label htmlFor="mediaUploadYoutube">{t('Lien de la vidéo')}</label>
              <input
                id="mediaUploadYoutube"
                type="text"
                inputMode="url"
                autoComplete="off"
                value={youtubeUrl}
                onChange={(event) => setYoutubeUrl(event.target.value)}
                placeholder="https://www.youtube.com/watch?v=…"
              />
            </div>
          )}

          {isCitation && (
            <div className="pz-field">
              <label htmlFor="mediaUploadCitation">{t("Ce qu'elle ou il disait")}</label>
              <textarea
                id="mediaUploadCitation"
                value={citationText}
                onChange={(event) => setCitationText(event.target.value)}
                placeholder={t('On partait à six dans la 4L, le coffre attaché avec une ficelle.')}
                rows={3}
              />
            </div>
          )}

          <div className={canManage ? 'pz-row2' : undefined}>
            {immichFiles.length === 0 && <div className="pz-field">
              <label htmlFor="mediaUploadCaption">{canManage ? t('Titre') : t('Une légende')} <span className="mm-optional">{t('facultatif')}</span></label>
              <input
                id="mediaUploadCaption"
                type="text"
                value={caption}
                onChange={(event) => setCaption(event.target.value)}
                placeholder={t('Été à Quiberon, 1978')}
              />
            </div>}
            {canManage && <div className="pz-field">
              <label htmlFor="mediaUploadSource">{t('Source')} <span className="mm-optional">{t('facultatif')}</span></label>
              <input
                id="mediaUploadSource"
                type="text"
                value={source}
                onChange={(event) => setSource(event.target.value)}
                placeholder={t('Album de famille, ou un lien')}
              />
            </div>}
          </div>

          {!canManage && askName && (
            <div className="pz-field">
              <label htmlFor="mm-contributor-name">{t('Votre prénom')}</label>
              <input
                id="mm-contributor-name"
                type="text"
                value={contributorName}
                onChange={(e) => setContributorName(e.target.value.slice(0, 120))}
                placeholder={t("Pour que la famille sache qui l'a ajouté")}
                autoComplete="given-name"
              />
            </div>
          )}

          {errorMessage && <div className="pz-error" role="alert">{errorMessage}</div>}
          {notice && !errorMessage && <div className="pz-success" role="status">{notice}</div>}

          <div className="pz-modal-actions">
            <button type="submit" className="pz-btn pz-btn--primary" disabled={!canUpload}>
              <Plus size={16} aria-hidden="true" />
              <PzBusy busy={loading || sending} busyLabel={t('Envoi du souvenir')}>{submitLabel}</PzBusy>
            </button>
          </div>
        </form>

        <section className="mm-list-wrap">
          <h2 className="pz-eyebrow">{medias.length > 0 ? t('Déjà là · {n}', { n: medias.length }) : t('Déjà là')}</h2>
          {medias.length === 0 ? (
            <p className="pz-small mm-empty">{canManage ? t('Pas encore de souvenir. Le premier que vous ajoutez apparaît en tête de sa fiche.') : t('Pas encore de souvenir. Le vôtre sera le premier.')}</p>
          ) : (
            <ul className="mm-list">
              {medias.map((media, index) => (
                <li key={media.id} className="mm-item">
                  <span className="mm-preview" aria-hidden="true">
                    {media.type === 'photo' && media.url ? (
                      <img src={media.url} alt="" {...blurPlaceholder(media.blurhash)} />
                    ) : media.type === 'geojson' || media.type === 'gpx' ? (
                      <GeoMediaThumbnail media={media} className="media-manager-modal-preview-map" />
                    ) : (
                      <span>{TYPE_SHORT[media.type] || media.type}</span>
                    )}
                  </span>
                  <span className="mm-meta">
                    <strong>{media.label || t('Souvenir {n}', { n: index + 1 })}</strong>
                    <span>
                      {TYPE_NAMES[media.type] || media.type}
                      {media.source && <> · {renderSource(media.source)}</>}
                    </span>
                  </span>
                  {canManage && <span className="mm-actions">
                    <button type="button" className="pz-btn pz-btn--ghost pz-btn--icon" onClick={() => onMove(media.id, -1)} disabled={loading || index === 0} aria-label={t('Monter')}>
                      <ArrowUp size={16} aria-hidden="true" />
                    </button>
                    <button type="button" className="pz-btn pz-btn--ghost pz-btn--icon" onClick={() => onMove(media.id, 1)} disabled={loading || index === medias.length - 1} aria-label={t('Descendre')}>
                      <ArrowDown size={16} aria-hidden="true" />
                    </button>
                    <button type="button" className="pz-btn pz-btn--danger-ghost pz-btn--icon" onClick={() => onDelete(media.id)} disabled={loading} aria-label={t('Supprimer')}>
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
