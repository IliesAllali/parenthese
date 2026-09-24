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
    <div
      className={`add-person-panel ${visible ? 'add-person-panel--open' : ''}`}
      ref={panelRef}
      role="dialog"
      aria-labelledby="addPersonTitle"
      aria-hidden={!visible}
    >
      <div className="apn-head">
        <div className="pz-modal-head">
          <p className="pz-eyebrow">Nouvelle fiche</p>
          <h2 id="addPersonTitle" className="pz-title">Ajouter <em>quelqu'un</em></h2>
        </div>
        <button type="button" className="pz-btn pz-btn--ghost pz-btn--icon apn-close" onClick={onClose} aria-label="Fermer">
          <X size={18} strokeWidth={2} />
        </button>
      </div>

      <form className="apn-form" onSubmit={handleSubmit}>
        <div className="apn-scroll">
          <div className="pz-row2">
            <div className="pz-field">
              <label htmlFor="ap-firstName">Prénom</label>
              <input
                ref={firstNameRef}
                id="ap-firstName"
                type="text"
                className={touched.firstName && !firstName.trim() ? 'apn-input--error' : ''}
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                onBlur={() => setTouched((t) => ({ ...t, firstName: true }))}
                placeholder="Marie"
                autoComplete="off"
                aria-invalid={touched.firstName && !firstName.trim()}
              />
            </div>
            <div className="pz-field">
              <label htmlFor="ap-lastName">Nom</label>
              <input
                id="ap-lastName"
                type="text"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                placeholder="Dupont"
                autoComplete="off"
              />
            </div>
          </div>
          {touched.firstName && !firstName.trim() && (
            <p className="apn-error-text">Il faut au moins un prénom.</p>
          )}

          <div className="pz-field">
            <label htmlFor="ap-birthName">Nom de naissance <span className="apn-optional">si différent</span></label>
            <input
              id="ap-birthName"
              type="text"
              value={birthName}
              onChange={(e) => setBirthName(e.target.value)}
              placeholder="Martin"
              autoComplete="off"
            />
          </div>

          <div className="pz-row2">
            <div className="pz-field">
              <label htmlFor="ap-birthDate">Naissance</label>
              <input id="ap-birthDate" type="date" value={birthDate} onChange={(e) => setBirthDate(e.target.value)} />
            </div>
            <div className="pz-field">
              <label htmlFor="ap-deathDate">Décès</label>
              <input id="ap-deathDate" type="date" value={deathDate} onChange={(e) => setDeathDate(e.target.value)} />
            </div>
          </div>

          <section className="apn-section">
            <h3 className="pz-eyebrow">Place dans la famille</h3>

            <div className="pz-tabs apn-types" role="radiogroup" aria-label="Type de lien">
              {Object.entries(relationTypeLabels).map(([type, label]) => (
                <button
                  key={type}
                  type="button"
                  role="radio"
                  aria-checked={selectedRelationType === type}
                  className={`pz-tab ${selectedRelationType === type ? 'is-active' : ''}`}
                  onClick={() => setSelectedRelationType(type)}
                >
                  {label.replace(/ de$/, '')}
                </button>
              ))}
            </div>

            <div className="pz-field relation-dropdown-wrapper apn-relation">
              <label htmlFor="ap-relationSearch">{relationTypeLabels[selectedRelationType]}</label>
              <div className="apn-search">
                <Search size={15} strokeWidth={2} className="apn-search-icon" />
                <input
                  id="ap-relationSearch"
                  type="text"
                  value={relationSearch}
                  onChange={(e) => {
                    setRelationSearch(e.target.value)
                    setRelationDropdownOpen(true)
                  }}
                  onFocus={() => setRelationDropdownOpen(true)}
                  placeholder="Chercher dans l'arbre"
                  autoComplete="off"
                />
                <ChevronDown size={15} strokeWidth={2} className="apn-search-chevron" />
              </div>

              {relationDropdownOpen && filteredPersons.length > 0 && (
                <ul className="apn-dropdown">
                  {filteredPersons.slice(0, 8).map((p) => (
                    <li key={p.id}>
                      <button type="button" className="apn-dropdown-item" onClick={() => handleAddRelation(p)}>
                        <span className="apn-avatar" aria-hidden="true">
                          {p.photo ? <img src={p.photo} alt="" /> : (p.firstName || '?').charAt(0)}
                        </span>
                        <span className="apn-dropdown-name">{p.firstName} <em>{p.lastName || ''}</em></span>
                        {(p.birthYear || p.birthDate) && (
                          <span className="apn-dropdown-date">{p.birthYear || String(p.birthDate).slice(0, 4)}</span>
                        )}
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            {relations.length > 0 && (
              <div className="apn-links">
                {relations.map((rel) => (
                  <div key={rel.personId} className="apn-link">
                    <span className="apn-link-type">{relationTypeLabels[rel.type]}</span>
                    <span className="apn-link-name">{rel.personName}</span>
                    <button
                      type="button"
                      className="pz-btn pz-btn--ghost pz-btn--icon apn-link-remove"
                      onClick={() => handleRemoveRelation(rel.personId)}
                      aria-label={`Retirer ${rel.personName}`}
                    >
                      <X size={14} strokeWidth={2.2} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </section>

          {error && <div className="pz-error" role="alert">{error}</div>}
        </div>

        <div className="apn-actions">
          <button type="button" className="pz-btn pz-btn--ghost" onClick={onClose}>
            Annuler
          </button>
          <button type="submit" className="pz-btn pz-btn--primary" disabled={!isValid || loading}>
            <UserPlus size={16} strokeWidth={2} />
            {loading ? 'Ajout…' : 'Ajouter cette personne'}
          </button>
        </div>
      </form>
    </div>
  )
}

export default AddPersonPanel
