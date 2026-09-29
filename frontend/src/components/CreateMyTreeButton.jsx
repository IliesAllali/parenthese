import { useState, useMemo } from 'react'
import './CreateMyTreeButton.css'
import PzBusy from './PzBusy.jsx'
import { t } from '../i18n/index.js'

function normalizeSlug(input) {
  return input
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

const CreateMyTreeButton = ({ onCreateTree, loading }) => {
  const [open, setOpen] = useState(false)
  const [name, setName] = useState('')
  const [error, setError] = useState('')

  const slug = useMemo(() => normalizeSlug(name.trim()), [name])
  const canSubmit = name.trim().length >= 2 && slug.length >= 3 && !loading

  const handleOpen = () => {
    setError('')
    setOpen(true)
  }

  const handleClose = () => {
    setOpen(false)
    setName('')
    setError('')
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!canSubmit) return
    setError('')
    const result = await onCreateTree(name.trim())
    if (result !== null && result !== undefined) {
      setError(typeof result === 'string' ? result : t('Erreur lors de la création. Essayez un autre nom.'))
    }
  }

  return (
    <>
      {!open && (
        <button className="cmt-pill" type="button" onClick={handleOpen}>
          {t('Créer mon arbre')}
        </button>
      )}

      {open && (
        <div className="cmt-panel">
          <div className="cmt-panel-header">
            <span className="cmt-panel-title">{t('Créer votre arbre dès maintenant')}</span>
            <button type="button" className="cmt-panel-close" onClick={handleClose} aria-label={t('Fermer')}>
              ✕
            </button>
          </div>
          <div className="cmt-panel-body">
            <form onSubmit={handleSubmit}>
              <label className="cmt-label" htmlFor="firstTreeName">
                {t('Nom de la famille')}
              </label>
              <input
                id="firstTreeName"
                className="cmt-input"
                type="text"
                autoFocus
                maxLength={120}
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder={t('Ex : Famille Martin')}
                required
              />
              {slug && (
                <div className="cmt-slug-preview">
                  {t('Adresse :')} <code>{slug}</code>
                </div>
              )}
              {error && <div className="cmt-error">{error}</div>}
              <button type="submit" className="cmt-btn-create" disabled={!canSubmit}>
                <PzBusy busy={loading} busyLabel={t("Création de l'arbre")}>{t("Créer l'arbre")}</PzBusy>
              </button>
            </form>
          </div>
        </div>
      )}
    </>
  )
}

export default CreateMyTreeButton
