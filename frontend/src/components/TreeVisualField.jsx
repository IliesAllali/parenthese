import { useEffect, useRef, useState } from 'react'
import { ChevronDown, Crop, ImagePlus } from 'lucide-react'
import { saveTreeImageCrop, uploadTreeImage } from '../api/treeApi'
import { t } from '../i18n/index.js'
import { fileToBase64, getAccountErrorMessage } from '../utils/errorMessages'
import { getUploadMimeType, validateMediaFile } from '../utils/mediaUpload'
import { prepareImageForUpload } from '../utils/photoImport'
import { TREE_ICONS, treeImageSrc } from '../utils/treeVisual.js'
import PortraitCropModal from './PortraitCropModal.jsx'
import PzBusy from './PzBusy.jsx'
import TreeMark from './TreeMark.jsx'

// Visuel de l'arbre, un seul des trois : la première lettre, une icône, ou une photo (Patch, 21/11).
// L'icône et la lettre suivent « Enregistrer » ; la photo s'enregistre à la validation du recadrage, comme un portrait.
// Choisir la lettre ou une icône quand l'arbre a une photo la retire, à l'enregistrement.
//   value : { mode: 'letter' | 'icon' | 'photo', icon }
//   image : la photo enregistrée ({ urlPath, crop }) ou null
export default function TreeVisualField({ treeId, authToken, treeName, value, image, onChange, onImageSaved, disabled = false }) {
  const [menuOpen, setMenuOpen] = useState(false)
  const [crop, setCrop] = useState(null) // { src, initialCrop, file? } pendant le recadrage
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const fileRef = useRef(null)
  const pickRef = useRef(null)

  // Le menu d'icônes se ferme au clic dehors et avec Échap
  useEffect(() => {
    if (!menuOpen) return undefined
    const onPointer = (event) => { if (!pickRef.current?.contains(event.target)) setMenuOpen(false) }
    const onKey = (event) => { if (event.key === 'Escape') setMenuOpen(false) }
    document.addEventListener('pointerdown', onPointer)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('pointerdown', onPointer)
      document.removeEventListener('keydown', onKey)
    }
  }, [menuOpen])

  // L'aperçu local d'une photo choisie est libéré quand la fenêtre se ferme
  useEffect(() => () => { if (crop?.file && crop.src) URL.revokeObjectURL(crop.src) }, [crop])

  const chooseMode = (mode) => {
    setError('')
    if (mode === 'photo') {
      // Pas encore de photo : la galerie s'ouvre, le choix ne change qu'une fois la photo validée
      if (image) onChange({ ...value, mode: 'photo' })
      else fileRef.current?.click()
      return
    }
    if (mode === 'icon') {
      onChange({ mode: 'icon', icon: value.icon || TREE_ICONS[0] })
      setMenuOpen(true)
      return
    }
    onChange({ ...value, mode: 'letter' })
  }

  const onFile = async (event) => {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (!file) return
    setError('')
    const prepared = await prepareImageForUpload(file)
    const invalid = validateMediaFile(prepared, 'photo')
    if (invalid) {
      setError(invalid)
      return
    }
    setCrop({ src: URL.createObjectURL(prepared), file: prepared, initialCrop: null })
  }

  const saveCrop = async (nextCrop) => {
    setBusy(true)
    setError('')
    try {
      const result = crop.file
        ? await uploadTreeImage(treeId, {
          fileName: crop.file.name || 'arbre.jpg',
          mimeType: getUploadMimeType(crop.file, 'photo'),
          sizeBytes: crop.file.size,
          dataBase64: await fileToBase64(crop.file),
          crop: nextCrop,
        }, authToken)
        : await saveTreeImageCrop(treeId, nextCrop, authToken)
      onImageSaved(result?.image || null, Boolean(crop.file))
      setCrop(null)
    } catch (uploadError) {
      setError(getAccountErrorMessage(uploadError))
    } finally {
      setBusy(false)
    }
  }

  const shownIcon = value.mode === 'icon' ? value.icon : null
  const shownImage = value.mode === 'photo' ? image : null

  return (
    <div className="pz-field ts-visual">
      <span className="pz-label" id="settingsTreeVisualLabel">{t("Visuel de l'arbre")}</span>
      <div className="ts-visual-head">
        <TreeMark base="ts-tree-mark" name={treeName} icon={shownIcon} image={shownImage} />
        <div className="ts-visual-meta">
          <strong>{treeName || t('Votre arbre')}</strong>
          <span>{t('Comme dans vos menus et sur la page de la famille')}</span>
        </div>
      </div>

      <div className="pz-tabs ts-visual-modes" role="radiogroup" aria-labelledby="settingsTreeVisualLabel">
        {[['letter', t('Première lettre')], ['icon', t('Icône')], ['photo', t('Photo')]].map(([mode, label]) => (
          <button
            key={mode}
            type="button"
            role="radio"
            aria-checked={value.mode === mode}
            className={`pz-tab ${value.mode === mode ? 'is-active' : ''}`}
            onClick={() => chooseMode(mode)}
            disabled={disabled || busy}
          >
            {label}
          </button>
        ))}
      </div>

      {value.mode === 'icon' && (
        <div className="ts-icon-pick" ref={pickRef}>
          <button
            type="button"
            className="ts-icon-pick-btn"
            aria-haspopup="true"
            aria-expanded={menuOpen}
            onClick={() => setMenuOpen((open) => !open)}
            disabled={disabled}
          >
            <span className="ts-icon-pick-current" aria-hidden="true">{value.icon}</span>
            {t("Changer d'icône")}
            <ChevronDown size={16} aria-hidden="true" />
          </button>
          {menuOpen && (
            <div className="ts-icon-menu" role="radiogroup" aria-label={t('Icônes')}>
              {TREE_ICONS.map((icon) => (
                <button
                  key={icon}
                  type="button"
                  role="radio"
                  aria-checked={value.icon === icon}
                  className="ts-icon"
                  onClick={() => { onChange({ mode: 'icon', icon }); setMenuOpen(false) }}
                >
                  {icon}
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {value.mode === 'photo' && image && (
        <div className="ts-visual-actions">
          <button type="button" className="pz-btn pz-btn--ghost" onClick={() => setCrop({ src: treeImageSrc(image), initialCrop: image.crop })} disabled={disabled || busy}>
            <Crop size={16} aria-hidden="true" />
            {t('Recadrer')}
          </button>
          <button type="button" className="pz-btn pz-btn--ghost" onClick={() => fileRef.current?.click()} disabled={disabled || busy}>
            <ImagePlus size={16} aria-hidden="true" />
            <PzBusy busy={busy && !crop} busyLabel={t('Envoi en cours')}>{t('Changer de photo')}</PzBusy>
          </button>
        </div>
      )}

      <input ref={fileRef} type="file" accept="image/*" hidden onChange={onFile} />

      {image && value.mode !== 'photo' && <p className="pz-hint ts-visual-note">{t('La photo sera retirée en enregistrant.')}</p>}
      {error && !crop && <p className="pz-error" role="alert">{error}</p>}

      {crop && (
        <PortraitCropModal
          src={crop.src}
          name={treeName}
          mode="recrop"
          lockedShape="square"
          initialCrop={crop.initialCrop}
          saving={busy}
          error={error}
          onSave={saveCrop}
          onClose={() => { if (!busy) { setCrop(null); setError('') } }}
        />
      )}
    </div>
  )
}
