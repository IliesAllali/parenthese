import { useState, useEffect, useRef } from 'react'
import { UserPlus, X } from 'lucide-react'
import './InlinePersonForm.css'

/**
 * Mini-formulaire inline pour créer une personne après drop
 * Affiche le type de lien créé et demande les infos de base
 *
 * @param {Object} props
 * @param {boolean} props.visible - Afficher le formulaire
 * @param {Object} props.position - Position d'affichage {x, y}
 * @param {string} props.linkType - Type de lien ('child', 'spouse', 'sibling', null)
 * @param {Object} props.linkedPerson - Personne liée (si linkType)
 * @param {Function} props.onSubmit - Callback soumission (formData)
 * @param {Function} props.onCancel - Callback annulation
 * @param {boolean} props.loading - État chargement
 */
function InlinePersonForm({
  visible,
  position,
  linkType,
  linkedPerson,
  onSubmit,
  onCancel,
  loading = false,
}) {
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    birthDate: '',
    birthPlace: '',
  })

  const firstInputRef = useRef(null)

  // Reset form au show
  useEffect(() => {
    if (visible) {
      setFormData({
        firstName: '',
        lastName: '',
        birthDate: '',
        birthPlace: '',
      })
      // Focus premier input
      setTimeout(() => firstInputRef.current?.focus(), 100)
    }
  }, [visible])

  // Handle ESC
  useEffect(() => {
    if (!visible) return

    const handleEscape = (e) => {
      if (e.key === 'Escape') onCancel?.()
    }

    document.addEventListener('keydown', handleEscape)
    return () => document.removeEventListener('keydown', handleEscape)
  }, [visible, onCancel])

  if (!visible) return null

  const handleChange = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }))
  }

  const handleSubmit = (e) => {
    e.preventDefault()
    if (!formData.firstName.trim()) return

    onSubmit?.({
      ...formData,
      linkType,
      linkedPersonId: linkedPerson?.id,
    })
  }

  const isValid = formData.firstName.trim().length > 0

  // Labels type lien
  const linkLabels = {
    child: 'Enfant de',
    spouse: 'Conjoint de',
    sibling: 'Frère·Sœur de',
  }

  const linkTitle = {
    child: 'Nouvel enfant',
    spouse: 'Nouveau conjoint',
    sibling: 'Nouveau frère/sœur',
  }

  const title = linkType ? linkTitle[linkType] : 'Nouvelle personne'

  return (
    <>
      {/* Overlay */}
      <div className="inline-person-form-overlay" onClick={onCancel} />

      {/* Form */}
      <form
        className={`inline-person-form ${loading ? 'loading' : ''}`}
        style={{
          left: `${position.x}px`,
          top: `${position.y}px`,
          transform: 'translate(-50%, -50%)',
        }}
        onSubmit={handleSubmit}
      >
        {/* Header */}
        <div className="inline-person-form-header">
          <h3 className="inline-person-form-title">
            <span className="inline-person-form-icon"><UserPlus size={20} strokeWidth={2} /></span>
            {title}
          </h3>
          <button
            type="button"
            className="inline-person-form-close"
            onClick={onCancel}
            aria-label="Fermer"
          >
            <X size={18} strokeWidth={2} />
          </button>
        </div>

        {/* Badge lien */}
        {linkType && linkedPerson && (
          <div className={`inline-person-form-badge ${linkType}`}>
            {linkLabels[linkType]} {linkedPerson.person?.firstName} {linkedPerson.person?.lastName}
          </div>
        )}

        {/* Fields */}
        <div className="inline-person-form-fields">
          <div className="inline-person-form-field">
            <label className="inline-person-form-label">
              Prénom <span className="required">*</span>
            </label>
            <input
              ref={firstInputRef}
              type="text"
              className="inline-person-form-input"
              placeholder="Jean"
              value={formData.firstName}
              onChange={(e) => handleChange('firstName', e.target.value)}
              disabled={loading}
            />
          </div>

          <div className="inline-person-form-field">
            <label className="inline-person-form-label">Nom</label>
            <input
              type="text"
              className="inline-person-form-input"
              placeholder="Dupont"
              value={formData.lastName}
              onChange={(e) => handleChange('lastName', e.target.value)}
              disabled={loading}
            />
          </div>

          <div className="inline-person-form-row">
            <div className="inline-person-form-field">
              <label className="inline-person-form-label">Date naissance</label>
              <input
                type="text"
                className="inline-person-form-input"
                placeholder="1990-05-15"
                value={formData.birthDate}
                onChange={(e) => handleChange('birthDate', e.target.value)}
                disabled={loading}
              />
            </div>

            <div className="inline-person-form-field">
              <label className="inline-person-form-label">Lieu naissance</label>
              <input
                type="text"
                className="inline-person-form-input"
                placeholder="Paris"
                value={formData.birthPlace}
                onChange={(e) => handleChange('birthPlace', e.target.value)}
                disabled={loading}
              />
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="inline-person-form-actions">
          <button
            type="button"
            className="inline-person-form-button cancel"
            onClick={onCancel}
            disabled={loading}
          >
            Annuler
          </button>
          <button
            type="submit"
            className="inline-person-form-button submit"
            disabled={!isValid || loading}
          >
            {loading ? 'Création...' : 'Créer'}
          </button>
        </div>
      </form>
    </>
  )
}

export default InlinePersonForm
