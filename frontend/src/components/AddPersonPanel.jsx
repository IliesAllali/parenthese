import { useState, useEffect, useRef } from 'react'
import { UserPlus, X, Search, ChevronDown } from 'lucide-react'
import './AddPersonPanel.css'

/**
 * Panneau slide-in gauche pour ajouter une personne
 * Visible uniquement en mode édition
 *
 * Features:
 * - Slide-in depuis la gauche (400px desktop, 90% mobile)
 * - Focus auto sur Prénom à l'ouverture
 * - Validation temps-réel (required)
 * - Section Relations avec dropdown searchable
 * - Reste ouvert après ajout réussi (reset form)
 *
 * @param {Object} props
 * @param {boolean} props.visible - Afficher le panneau
 * @param {Array} props.persons - Liste des personnes existantes pour les relations
 * @param {boolean} props.loading - Soumission en cours
 * @param {string} props.error - Message d'erreur
 * @param {Function} props.onSubmit - Handler soumission (formData)
 * @param {Function} props.onClose - Handler fermeture
 */
function AddPersonPanel({ visible, persons = [], loading = false, error = '', onSubmit, onClose }) {
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [birthName, setBirthName] = useState('')
  const [birthDate, setBirthDate] = useState('')
  const [deathDate, setDeathDate] = useState('')
  const [relations, setRelations] = useState([])
  const [relationSearch, setRelationSearch] = useState('')
  const [relationDropdownOpen, setRelationDropdownOpen] = useState(false)
  const [selectedRelationType, setSelectedRelationType] = useState('parent')
  const [touched, setTouched] = useState({})
  const [justAdded, setJustAdded] = useState(false)

  const firstNameRef = useRef(null)
  const panelRef = useRef(null)

  // Focus sur Prénom à l'ouverture
  useEffect(() => {
    if (visible) {
      setTimeout(() => firstNameRef.current?.focus(), 300)
    }
  }, [visible])

  // ESC pour fermer
  useEffect(() => {
    if (!visible) return

    function handleKeyDown(e) {
      if (e.key === 'Escape') {
        onClose()
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [visible, onClose])

  // Fermer dropdown relation au clic extérieur
  useEffect(() => {
    if (!relationDropdownOpen) return

    function handleClick(e) {
      if (!e.target.closest('.relation-dropdown-wrapper')) {
        setRelationDropdownOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [relationDropdownOpen])

  // Reset form après ajout réussi
  useEffect(() => {
    if (justAdded && !loading && !error) {
      setFirstName('')
      setLastName('')
      setBirthName('')
      setBirthDate('')
      setDeathDate('')
      setRelations([])
      setTouched({})
      setJustAdded(false)
      firstNameRef.current?.focus()
    }
  }, [justAdded, loading, error])

  const filteredPersons = persons.filter((p) => {
    if (!relationSearch) return true
    const fullName = `${p.firstName || ''} ${p.lastName || ''}`.toLowerCase()
    return fullName.includes(relationSearch.toLowerCase())
  })

  const handleAddRelation = (person) => {
    // Éviter les doublons
    if (relations.some((r) => r.personId === person.id)) return

    setRelations((prev) => [
      ...prev,
      { personId: person.id, personName: `${person.firstName} ${person.lastName || ''}`.trim(), type: selectedRelationType },
    ])
    setRelationSearch('')
    setRelationDropdownOpen(false)
  }

  const handleRemoveRelation = (personId) => {
    setRelations((prev) => prev.filter((r) => r.personId !== personId))
  }

  const handleSubmit = (e) => {
    e.preventDefault()

    if (!firstName.trim()) {
      setTouched({ firstName: true })
      firstNameRef.current?.focus()
      return
    }

    setJustAdded(true)

    onSubmit({
      firstName: firstName.trim(),
      lastName: lastName.trim(),
      birthName: birthName.trim() || null,
      birthDate: birthDate || null,
      deathDate: deathDate || null,
      relations,
    })
  }

  const isValid = firstName.trim().length > 0

  const relationTypeLabels = {
    parent: 'Parent de',
    child: 'Enfant de',
    spouse: 'Conjoint·e de',
    sibling: 'Frère·Sœur de',
  }

  return (
    <div className={`add-person-panel ${visible ? 'add-person-panel--open' : ''}`} ref={panelRef}>
      <div className="add-person-header">
        <div className="add-person-header-title">
          <UserPlus size={20} strokeWidth={2} />
          <h2>Ajouter une personne</h2>
        </div>
        <button
          type="button"
          className="add-person-close"
          onClick={onClose}
          aria-label="Fermer"
        >
          <X size={20} strokeWidth={2} />
        </button>
      </div>

      <form className="add-person-form" onSubmit={handleSubmit}>
        {/* Prénom (requis) */}
        <div className="add-person-field">
          <label htmlFor="ap-firstName" className="add-person-label">
            Prénom <span className="add-person-required">*</span>
          </label>
          <input
            ref={firstNameRef}
            id="ap-firstName"
            type="text"
            className={`add-person-input ${touched.firstName && !firstName.trim() ? 'add-person-input--error' : ''}`}
            value={firstName}
            onChange={(e) => setFirstName(e.target.value)}
            onBlur={() => setTouched((t) => ({ ...t, firstName: true }))}
            placeholder="Ex : Marie"
            autoComplete="off"
          />
          {touched.firstName && !firstName.trim() && (
            <span className="add-person-error-text">Le prénom est requis</span>
          )}
        </div>

        {/* Nom */}
        <div className="add-person-field">
          <label htmlFor="ap-lastName" className="add-person-label">Nom</label>
          <input
            id="ap-lastName"
            type="text"
            className="add-person-input"
            value={lastName}
            onChange={(e) => setLastName(e.target.value)}
            placeholder="Ex : Dupont"
            autoComplete="off"
          />
        </div>

        {/* Nom de naissance */}
        <div className="add-person-field">
          <label htmlFor="ap-birthName" className="add-person-label">Nom de naissance</label>
          <input
            id="ap-birthName"
            type="text"
            className="add-person-input"
            value={birthName}
            onChange={(e) => setBirthName(e.target.value)}
            placeholder="Ex : Martin"
            autoComplete="off"
          />
        </div>

        {/* Dates en ligne */}
        <div className="add-person-row">
          <div className="add-person-field">
            <label htmlFor="ap-birthDate" className="add-person-label">Date de naissance</label>
            <input
              id="ap-birthDate"
              type="date"
              className="add-person-input"
              value={birthDate}
              onChange={(e) => setBirthDate(e.target.value)}
            />
          </div>
          <div className="add-person-field">
            <label htmlFor="ap-deathDate" className="add-person-label">Date de décès</label>
            <input
              id="ap-deathDate"
              type="date"
              className="add-person-input"
              value={deathDate}
              onChange={(e) => setDeathDate(e.target.value)}
            />
          </div>
        </div>

        {/* Section Relations */}
        <div className="add-person-section">
          <h3 className="add-person-section-title">Relations</h3>

          {/* Type de relation */}
          <div className="add-person-field">
            <label htmlFor="ap-relationType" className="add-person-label">Type de lien</label>
            <div className="relation-type-pills">
              {Object.entries(relationTypeLabels).map(([type, label]) => (
                <button
                  key={type}
                  type="button"
                  className={`relation-type-pill ${selectedRelationType === type ? 'relation-type-pill--active' : ''}`}
                  onClick={() => setSelectedRelationType(type)}
                >
                  {label.split(' ')[0]}
                </button>
              ))}
            </div>
          </div>

          {/* Recherche personne existante */}
          <div className="add-person-field relation-dropdown-wrapper">
            <label className="add-person-label">
              {relationTypeLabels[selectedRelationType]}
            </label>
            <div className="relation-search-wrapper">
              <Search size={14} strokeWidth={2} className="relation-search-icon" />
              <input
                type="text"
                className="add-person-input relation-search-input"
                value={relationSearch}
                onChange={(e) => {
                  setRelationSearch(e.target.value)
                  setRelationDropdownOpen(true)
                }}
                onFocus={() => setRelationDropdownOpen(true)}
                placeholder="Rechercher une personne..."
                autoComplete="off"
              />
              <ChevronDown size={14} strokeWidth={2} className="relation-search-chevron" />
            </div>

            {relationDropdownOpen && filteredPersons.length > 0 && (
              <ul className="relation-dropdown-list">
                {filteredPersons.slice(0, 8).map((p) => (
                  <li key={p.id}>
                    <button
                      type="button"
                      className="relation-dropdown-item"
                      onClick={() => handleAddRelation(p)}
                    >
                      <span className="relation-dropdown-name">
                        {p.firstName} {p.lastName || ''}
                      </span>
                      {p.birthDate && (
                        <span className="relation-dropdown-date">{p.birthDate}</span>
                      )}
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* Relations ajoutées */}
          {relations.length > 0 && (
            <div className="relation-tags">
              {relations.map((rel) => (
                <div key={rel.personId} className="relation-tag">
                  <span className="relation-tag-type">{relationTypeLabels[rel.type].split(' ')[0]}</span>
                  <span className="relation-tag-name">{rel.personName}</span>
                  <button
                    type="button"
                    className="relation-tag-remove"
                    onClick={() => handleRemoveRelation(rel.personId)}
                    aria-label={`Retirer ${rel.personName}`}
                  >
                    <X size={12} strokeWidth={2.5} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Erreur */}
        {error && (
          <div className="add-person-error" role="alert">{error}</div>
        )}

        {/* Actions */}
        <div className="add-person-actions">
          <button
            type="submit"
            className="add-person-submit"
            disabled={!isValid || loading}
          >
            {loading ? 'Ajout en cours...' : 'Ajouter cette personne'}
          </button>
          <button
            type="button"
            className="add-person-cancel"
            onClick={onClose}
          >
            Annuler
          </button>
        </div>
      </form>
    </div>
  )
}

export default AddPersonPanel
