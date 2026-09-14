import { useEffect, useRef } from 'react'
import { AlertTriangle, Save, X, ArrowLeft } from 'lucide-react'
import './EditConfirmModal.css'

/**
 * Modal de confirmation à la désactivation du mode édition
 * Apparaît si des modifications non-sauvegardées existent
 *
 * 3 options :
 * - Continuer l'édition (retour)
 * - Enregistrer brouillon et quitter
 * - Abandonner les modifications
 */
function EditConfirmModal({ visible, onContinue, onSaveAndQuit, onDiscard }) {
  const continueRef = useRef(null)

  // Focus sur "Continuer" à l'ouverture + trap ESC
  useEffect(() => {
    if (!visible) return

    continueRef.current?.focus()

    function handleKeyDown(e) {
      if (e.key === 'Escape') {
        onContinue()
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [visible, onContinue])

  if (!visible) return null

  return (
    <div className="edit-confirm-backdrop" onClick={onContinue}>
      <div
        className="edit-confirm-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="edit-confirm-title"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="edit-confirm-icon">
          <AlertTriangle size={28} strokeWidth={1.8} />
        </div>

        <h2 id="edit-confirm-title" className="edit-confirm-title">
          Quitter le mode édition ?
        </h2>

        <p className="edit-confirm-message">
          Vous avez des modifications non enregistrées sur le serveur.
        </p>

        <div className="edit-confirm-actions">
          <button
            ref={continueRef}
            type="button"
            className="edit-confirm-btn edit-confirm-btn--continue"
            onClick={onContinue}
          >
            <ArrowLeft size={16} strokeWidth={2} />
            Continuer l'édition
          </button>

          <button
            type="button"
            className="edit-confirm-btn edit-confirm-btn--save"
            onClick={onSaveAndQuit}
          >
            <Save size={16} strokeWidth={2} />
            Enregistrer et quitter
          </button>

          <button
            type="button"
            className="edit-confirm-btn edit-confirm-btn--discard"
            onClick={onDiscard}
          >
            <X size={16} strokeWidth={2} />
            Abandonner
          </button>
        </div>
      </div>
    </div>
  )
}

export default EditConfirmModal
