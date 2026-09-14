import { useMemo, useState } from 'react'

const AccountPanel = ({
  visible,
  userDisplayName = '',
  userEmail = '',
  linkedPerson = null,
  selectedPersonId = '',
  people = [],
  onSelectPerson,
  onClose,
}) => {
  const [query, setQuery] = useState('')

  const filteredPeople = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase()
    const source = Array.isArray(people) ? people : []
    if (!normalizedQuery) {
      return source.slice(0, 40)
    }

    return source
      .filter((person) => `${person.firstName || ''} ${person.lastName || ''}`.toLowerCase().includes(normalizedQuery))
      .slice(0, 40)
  }, [people, query])

  if (!visible) {
    return null
  }

  return (
    <div className="account-overlay account-overlay--open">
      <div className="account-card">
        <div className="account-header">
          <div className="account-header-text">
            <h1>Compte</h1>
            {userEmail && <p>{userEmail}</p>}
          </div>
          <button type="button" className="ghost" onClick={onClose}>Fermer</button>
        </div>

        <div className="account-linked">
          <h2>Profil lié dans cet arbre</h2>
          <div className="account-linked-person">
            <div className="account-linked-avatar">
              {linkedPerson?.photo ? (
                <img src={linkedPerson.photo} alt="" />
              ) : (
                <span>{(linkedPerson?.firstName || userDisplayName || 'C').charAt(0).toUpperCase()}</span>
              )}
            </div>
            <div className="account-linked-meta">
              <strong>
                {linkedPerson ? `${linkedPerson.firstName || ''} ${linkedPerson.lastName || ''}`.trim() : userDisplayName || 'Compte'}
              </strong>
              <span>
                {linkedPerson
                  ? 'Cette personne est utilisée pour votre nom et photo de profil.'
                  : 'Aucune personne liée pour le moment.'}
              </span>
            </div>
          </div>
        </div>

        <div className="account-pick">
          <h2>Je suis cette personne</h2>
          <input
            type="text"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Rechercher une personne..."
          />

          <div className="account-person-list">
            {filteredPeople.length === 0 ? (
              <div className="account-empty">Aucun résultat.</div>
            ) : (
              filteredPeople.map((person) => {
                const isSelected = String(selectedPersonId) === String(person.id)
                return (
                  <button
                    key={person.id}
                    type="button"
                    className={`account-person-item ${isSelected ? 'active' : ''}`}
                    onClick={() => onSelectPerson?.(person.id)}
                  >
                    <div className="account-person-avatar">
                      {person.photo ? <img src={person.photo} alt="" /> : <span>{(person.firstName || '?').charAt(0)}</span>}
                    </div>
                    <div className="account-person-name">
                      {person.firstName} {person.lastName || ''}
                    </div>
                    {isSelected && <span className="account-person-tag">Lié</span>}
                  </button>
                )
              })
            )}
          </div>

          {selectedPersonId && (
            <button type="button" className="ghost" onClick={() => onSelectPerson?.(null)}>
              Retirer la liaison
            </button>
          )}
        </div>
      </div>
      <button type="button" className="account-backdrop" aria-label="Fermer" onClick={onClose} />
    </div>
  )
}

export default AccountPanel
