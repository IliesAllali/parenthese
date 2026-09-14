import { useState, useEffect } from 'react'
import { Send, X } from 'lucide-react'
import './ContributionSessionModal.css'

function formatAction(action) {
  if (action === 'create') return 'Ajout'
  if (action === 'update') return 'Modification'
  if (action === 'delete') return 'Suppression'
  return 'Changement'
}

/**
 * Modal de finalisation de session contribution
 * Pour les contributeurs : commentaire optionnel + récap + liste des changements
 *
 * @param {Object} props
 * @param {boolean} props.visible - Afficher la modal
 * @param {Array}  props.changes - Liste des changements { entityType, action, label }
 * @param {Object} props.recap - Récap des modifications { added, modified, deleted }
 * @param {boolean} props.loading - Soumission en cours
 * @param {string} props.error - Message d'erreur
 * @param {Function} props.onSubmit - Handler soumission ({ comment })
 * @param {Function} props.onCancel - Handler annulation
 */
function ContributionSessionModal({ visible, changes = [], recap = {}, loading = false, error = '', onSubmit, onCancel }) {
  const [comment, setComment] = useState('')

  // Reset à l'ouverture
  useEffect(() => {
    if (visible) {
      setComment('')
    }
  }, [visible])

  // ESC pour fermer
  useEffect(() => {
    if (!visible) return

    function handleKeyDown(e) {
      if (e.key === 'Escape') onCancel()
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [visible, onCancel])

  const handleSubmit = (e) => {
    e.preventDefault()
    onSubmit({ comment: comment.trim() })
  }

  const totalChanges = (recap.added || 0) + (recap.modified || 0) + (recap.deleted || 0)

  if (!visible) return null

  return (
    <div className="contrib-session-backdrop" onClick={onCancel}>
      <div
        className="contrib-session-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="contrib-session-title"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          className="contrib-session-close"
          onClick={onCancel}
          aria-label="Fermer"
        >
          <X size={18} strokeWidth={2} />
        </button>

        <div className="contrib-session-header">
          <Send size={24} strokeWidth={1.8} className="contrib-session-icon" />
          <h2 id="contrib-session-title" className="contrib-session-title">
            Finaliser votre contribution
          </h2>
          <p className="contrib-session-subtitle">
            Vos modifications seront soumises à validation par le propriétaire de l'arbre.
          </p>
        </div>

        {/* Récap modifications */}
        {totalChanges > 0 && (
          <div className="contrib-session-recap">
            {recap.added > 0 && (
              <span className="contrib-recap-tag contrib-recap-tag--added">
                {recap.added} ajouté{recap.added > 1 ? 's' : ''}
              </span>
            )}
            {recap.modified > 0 && (
              <span className="contrib-recap-tag contrib-recap-tag--modified">
                {recap.modified} modifié{recap.modified > 1 ? 's' : ''}
              </span>
            )}
            {recap.deleted > 0 && (
              <span className="contrib-recap-tag contrib-recap-tag--deleted">
                {recap.deleted} supprimé{recap.deleted > 1 ? 's' : ''}
              </span>
            )}
          </div>
        )}

        {/* Liste détaillée des changements */}
        {changes.length > 0 && (
          <div className="contrib-session-changes">
            {changes.map((ch, i) => (
              <div key={i} className="contrib-session-change-row">
                <span className={`contrib-session-change-badge contrib-session-change-badge--${ch.action}`}>
                  {formatAction(ch.action)}
                </span>
                <span className="contrib-session-change-label">{ch.label}</span>
              </div>
            ))}
          </div>
        )}

        <form className="contrib-session-form" onSubmit={handleSubmit}>
          <div className="contrib-session-field">
            <label htmlFor="cs-comment" className="contrib-session-label">
              Message <span className="contrib-session-optional">(optionnel)</span>
            </label>
            <textarea
              id="cs-comment"
              className="contrib-session-textarea"
              value={comment}
              onChange={(e) => setComment(e.target.value.slice(0, 500))}
              placeholder="Ajoutez un mot pour le propriétaire de l'arbre..."
              rows={3}
              maxLength={500}
            />
            <span className="contrib-session-count">{comment.length}/500</span>
          </div>

          {error && (
            <div className="contrib-session-error" role="alert">{error}</div>
          )}

          <div className="contrib-session-actions">
            <button
              type="submit"
              className="contrib-session-submit"
              disabled={loading}
            >
              <Send size={16} strokeWidth={2} />
              {loading ? 'Envoi en cours...' : 'Envoyer mes contributions'}
            </button>
            <button
              type="button"
              className="contrib-session-cancel"
              onClick={onCancel}
              disabled={loading}
            >
              Annuler
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default ContributionSessionModal
