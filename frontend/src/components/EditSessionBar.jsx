import { useMemo } from 'react'
import { X } from 'lucide-react'
import './EditModeOverlay.css'

function EditSessionBar({ active, hasDraft, role = 'contributor', onDeactivate, onSubmit }) {
  const isAdmin = role === 'admin'

  const borderClass = useMemo(() => (
    `edit-mode-border ${isAdmin ? 'edit-mode-border--admin' : 'edit-mode-border--contributor'}`
  ), [isAdmin])

  const toastLabel = isAdmin ? "Vous modifiez l'arbre" : 'Vous proposez des modifications'
  const submitLabel = isAdmin ? "Mettre à jour l'arbre" : 'Envoyer les modifications'

  if (!active) return null

  return (
    <>
      <div className={borderClass} aria-hidden="true" />

      <div className={`edit-mode-toast ${isAdmin ? 'edit-mode-toast--admin' : ''}`} role="status" aria-live="polite">
        <span className="edit-mode-toast-dot" aria-hidden="true" />
        <span className="edit-mode-toast-text">{toastLabel}</span>

        {onSubmit && (
          <button
            type="button"
            className="pz-btn pz-btn--primary pz-btn--sm edit-mode-submit"
            onClick={onSubmit}
            disabled={!hasDraft}
            title={hasDraft ? submitLabel : "Aucune modification à envoyer pour l'instant"}
          >
            {submitLabel}
          </button>
        )}

        <button
          type="button"
          className="pz-btn pz-btn--ghost pz-btn--icon edit-mode-toast-close"
          onClick={onDeactivate}
          aria-label="Quitter le mode édition"
        >
          <X size={17} strokeWidth={2} />
        </button>
      </div>
    </>
  )
}

export default EditSessionBar
