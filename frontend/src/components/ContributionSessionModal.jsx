import { useState, useEffect } from 'react'
import { Send, X } from 'lucide-react'
import './ContributionSessionModal.css'
import PzBusy from './PzBusy.jsx'
import { readContributorName } from '../utils/contributorName'

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
function ContributionSessionModal({ visible, changes = [], recap = {}, loading = false, error = '', askName = true, onSubmit, onCancel }) {
  const [comment, setComment] = useState('')
  const [name, setName] = useState('')

  // Reset à l'ouverture ; le prénom déjà donné sur cet appareil est repris
  useEffect(() => {
    if (visible) {
      setComment('')
      setName(readContributorName())
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
    if (askName && !name.trim()) return
    onSubmit({ comment: comment.trim(), name: name.trim() })
  }

  const totalChanges = (recap.added || 0) + (recap.modified || 0) + (recap.deleted || 0)

  if (!visible) return null

  return (
    <div className="pz-overlay" onClick={onCancel}>
      <div
        className="pz-modal contrib-session-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="contrib-session-title"
        onClick={(e) => e.stopPropagation()}
      >
        <button type="button" className="pz-btn pz-btn--ghost pz-btn--icon pz-modal-close" onClick={onCancel} aria-label="Fermer">
          <X size={18} strokeWidth={2} />
        </button>

        <div className="pz-modal-head">
          <p className="pz-eyebrow">Votre contribution</p>
          <h2 id="contrib-session-title" className="pz-title">Envoyer vos <em>modifications</em></h2>
          <p className="pz-sub">La personne qui gère l'arbre les relit, puis elles apparaissent pour toute la famille.</p>
        </div>

        {totalChanges > 0 && (
          <div className="cs-recap">
            {recap.added > 0 && <span className="pz-tag cs-tag cs-tag--added">{recap.added} ajout{recap.added > 1 ? 's' : ''}</span>}
            {recap.modified > 0 && <span className="pz-tag cs-tag cs-tag--modified">{recap.modified} modification{recap.modified > 1 ? 's' : ''}</span>}
            {recap.deleted > 0 && <span className="pz-tag cs-tag cs-tag--deleted">{recap.deleted} suppression{recap.deleted > 1 ? 's' : ''}</span>}
          </div>
        )}

        {changes.length > 0 && (
          <ul className="cs-changes">
            {changes.map((ch, i) => (
              <li key={i} className="cs-change">
                <span className={`cs-dot cs-dot--${ch.action}`} aria-hidden="true" />
                <span className="cs-change-action">{formatAction(ch.action)}</span>
                <span className="cs-change-label">{ch.label}</span>
              </li>
            ))}
          </ul>
        )}

        <form className="cs-form" onSubmit={handleSubmit}>
          {askName && (
            <div className="pz-field">
              <label htmlFor="cs-name">Votre prénom</label>
              <input
                id="cs-name"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value.slice(0, 120))}
                placeholder="Pour que la famille sache qui a ajouté quoi"
                autoComplete="given-name"
                required
              />
            </div>
          )}
          <div className="pz-field">
            <label htmlFor="cs-comment">
              Un mot pour accompagner <span className="cs-optional">facultatif</span>
            </label>
            <textarea
              id="cs-comment"
              value={comment}
              onChange={(e) => setComment(e.target.value.slice(0, 500))}
              placeholder="Par exemple, j'ai ajouté les photos du mariage de mes grands-parents"
              rows={3}
              maxLength={500}
            />
            <span className="pz-hint cs-count">{comment.length} / 500</span>
          </div>

          {error && <div className="pz-error" role="alert">{error}</div>}

          <div className="pz-modal-actions">
            <button type="button" className="pz-btn pz-btn--ghost" onClick={onCancel} disabled={loading}>
              Annuler
            </button>
            <button type="submit" className="pz-btn pz-btn--primary" disabled={loading || (askName && !name.trim())}>
              <Send size={16} strokeWidth={2} />
              <PzBusy busy={loading} busyLabel="Envoi en cours">Envoyer mes contributions</PzBusy>
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default ContributionSessionModal
