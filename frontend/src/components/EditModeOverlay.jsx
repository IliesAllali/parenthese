import { useMemo } from 'react'
import { X } from 'lucide-react'
import './EditModeOverlay.css'
import { t } from '../i18n/index.js'

function EditModeOverlay({ active, hasDraft, role = 'contributor', onDeactivate, onSubmit }) {
  const isAdmin = role === 'admin'

  const borderClass = useMemo(() => (
    `edit-mode-border ${isAdmin ? 'edit-mode-border--admin' : 'edit-mode-border--contributor'}`
  ), [isAdmin])

  const toastLabel = isAdmin ? t('Mode édition actif') : t('Mode contribution actif')
  const submitLabel = isAdmin ? t("Mettre à jour l'arbre") : t('Envoyer les modifications')

  if (!active) return null

  return (
    <>
      <div className={borderClass} aria-hidden="true" />

      <div className={`edit-mode-toast ${isAdmin ? 'edit-mode-toast--admin' : ''}`} role="status" aria-live="polite">
        <span className="edit-mode-toast-text">{toastLabel}</span>

        {onSubmit && (
          <button
            type="button"
            className={`edit-mode-submit ${isAdmin ? 'edit-mode-submit--admin' : ''}`}
            onClick={onSubmit}
            disabled={!hasDraft}
            title={hasDraft ? submitLabel : t('Aucune modification à soumettre')}
          >
            {submitLabel}
          </button>
        )}

        <button
          type="button"
          className="edit-mode-toast-close"
          onClick={onDeactivate}
          aria-label={t('Quitter le mode édition')}
        >
          <X size={16} strokeWidth={2} />
        </button>
      </div>
    </>
  )
}

export default EditModeOverlay
