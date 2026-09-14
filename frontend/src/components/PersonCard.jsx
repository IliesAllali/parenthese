import { useState, useEffect, useRef, forwardRef } from 'react'
import { Save, Trash2, Plus, X, Search, Check } from 'lucide-react'
import { getParents, getChildren, getPersonUnions, getPersonMedias, filiations, persons, unions } from '../data/mockData'
import GeoMediaThumbnail from './GeoMediaThumbnail'
import './PersonCard.css'

const TYPE_LABELS = {
  photo: 'Photo',
  video: 'Vidéo',
  audio: 'Audio',
  document: 'Document',
  citation: 'Citation',
  geojson: 'Carte GPS',
  gpx: 'Trace GPX',
}

const PersonCard = ({
  person,
  onClose,
  onMediaSelect,
  editMode = false,
  canManageMedia = false,
  onManageMedia,
  onAvatarUpload,
  onAvatarDelete,
  avatarActionLoading = false,
  avatarActionError = '',
  isAdmin = false,
  onSave,
  onDelete,
  onAddRelation,
  onRemoveRelation,
  relationActionLoading = false,
  relationActionSuccess = '',
  relationActionError = '',
}) => {
  const [tab, setTab] = useState('infos')

  // État local pour les modifications en mode édition
  const [edits, setEdits] = useState({})
  const [hasChanges, setHasChanges] = useState(false)
  const [saving, setSaving] = useState(false)
  const [saveSuccess, setSaveSuccess] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)

  // Inline relation search state
  const [activeRelationSearch, setActiveRelationSearch] = useState(null) // 'parent' | 'spouse' | 'child' | null
  const [relationSearchQuery, setRelationSearchQuery] = useState('')
  const relationSearchRef = useRef(null)
  const avatarInputRef = useRef(null)

  // Reset edits quand la personne change
  useEffect(() => {
    setEdits({})
    setHasChanges(false)
    setShowDeleteConfirm(false)
    setActiveRelationSearch(null)
    setRelationSearchQuery('')
    setSaveSuccess(false)
  }, [person.id])

  // Focus search input when relation search opens
  useEffect(() => {
    if (activeRelationSearch) {
      setTimeout(() => relationSearchRef.current?.focus(), 50)
    }
  }, [activeRelationSearch])

  // Close relation search on click outside
  useEffect(() => {
    if (!activeRelationSearch) return

    function handleClick(e) {
      if (!e.target.closest('.relation-search-inline')) {
        setActiveRelationSearch(null)
        setRelationSearchQuery('')
      }
    }

    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [activeRelationSearch])

  const getEditValue = (field, fallback) => {
    return field in edits ? edits[field] : (fallback ?? '')
  }

  const handleFieldChange = (field, value) => {
    setEdits(prev => ({ ...prev, [field]: value }))
    setHasChanges(true)
  }

  const handleSave = async () => {
    if (!hasChanges || !onSave) return
    setSaving(true)
    try {
      await onSave(person.id, edits)
      setHasChanges(false)
      setSaveSuccess(true)
      setTimeout(() => setSaveSuccess(false), 2000)
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = () => {
    if (!onDelete) return
    onDelete(person.id)
    setShowDeleteConfirm(false)
  }

  const handleAvatarFileChange = async (event) => {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (!file || !onAvatarUpload) return
    await onAvatarUpload(person.id, file)
  }

  // Relation actions
  const handleRelationAdd = (targetPerson, relationType) => {
    onAddRelation?.(person.id, targetPerson.id, relationType)
    setActiveRelationSearch(null)
    setRelationSearchQuery('')
  }

  const handleRelationRemove = (targetPersonId, relationType) => {
    onRemoveRelation?.(person.id, targetPersonId, relationType)
  }

  const toYear = (val) => {
    if (val === null || val === undefined) return Number.NaN
    if (Number.isFinite(val)) return Number(val)
    const m = String(val).match(/^(\d{4})/)
    return m ? Number(m[1]) : Number.NaN
  }

  const birthYearNumber = toYear(person.birthYear ?? person.birthDate)
  const deathYearNumber = toYear(person.deathYear ?? person.deathDate)
  const hasBirthYear = Number.isFinite(birthYearNumber)
  const hasDeathYear = Number.isFinite(deathYearNumber)
  const age = hasBirthYear
    ? person.isAlive
      ? new Date().getFullYear() - birthYearNumber
      : hasDeathYear
        ? deathYearNumber - birthYearNumber
        : null
    : null

  const parentsList = getParents(person.id)
  const childrenList = getChildren(person.id)
  const personUnions = getPersonUnions(person.id)
  const childFiliations = filiations
    .filter((f) => String(f.childId) === String(person.id))
    .sort((a, b) => (a.displayOrder || 0) - (b.displayOrder || 0))
  const preferredFiliation = (() => {
    if (childFiliations.length === 0) return null

    // Prefer an explicit union-based parentage when present.
    const viaUnion = childFiliations.find((f) => f.unionId && unions.some((u) => String(u.id) === String(f.unionId)))
    if (viaUnion) return viaUnion

    // If multiple parents exist, avoid stale "parent unique" metadata.
    if (parentsList.length > 1) {
      return childFiliations.find((f) => (f.parentageType || 'biologique') === 'biologique') || childFiliations[0]
    }

    return childFiliations[0]
  })()
  const personMedias = getPersonMedias(person.id)

  // Filter persons for relation search (exclude current person + already linked)
  const getFilteredPersonsForRelation = (relationType) => {
    const excludeIds = new Set([person.id])

    // Exclude persons already in that relation
    if (relationType === 'parent') {
      parentsList.forEach(p => excludeIds.add(p.id))
    } else if (relationType === 'child') {
      childrenList.forEach(c => excludeIds.add(c.id))
    } else if (relationType === 'spouse') {
      personUnions.forEach(u => {
        excludeIds.add(u.partner1Id === person.id ? u.partner2Id : u.partner1Id)
      })
      // Basic guardrail: never propose direct parent/child as spouse.
      parentsList.forEach(p => excludeIds.add(p.id))
      childrenList.forEach(c => excludeIds.add(c.id))
    }

    return persons.filter(p => {
      if (excludeIds.has(p.id)) return false
      if (!relationSearchQuery) return true
      const fullName = `${p.firstName} ${p.lastName || ''}`.toLowerCase()
      return fullName.includes(relationSearchQuery.toLowerCase())
    })
  }

  const getParentageLabel = () => {
    if (!preferredFiliation) return null
    if (preferredFiliation.unionId) {
      const union = unions.find(u => u.id === preferredFiliation.unionId)
      if (union) {
        const p1 = persons.find(p => p.id === union.partner1Id)
        const p2 = persons.find(p => p.id === union.partner2Id)
        return `${p1?.firstName || '?'} + ${p2?.firstName || '?'} (${union.unionType})`
      }
    }

    if (preferredFiliation.parentId && parentsList.length <= 1) {
      const parent = persons.find(p => p.id === preferredFiliation.parentId)
      if (preferredFiliation.parentageType === 'inconnu') {
        return `${parent?.firstName || '?'} (parent unique, autre parent inconnu)`
      }
      return `${parent?.firstName || '?'} (parent unique)`
    }
    return null
  }

  const renderMediaIcon = (media) => {
    if (media.type === 'photo') {
      return media.url
        ? <img src={media.url} alt="" />
        : <span>&#128247;</span>
    }

    if (media.type === 'video') return <span>&#9654;</span>
    if (media.type === 'audio') return <span>&#9835;</span>
    if (media.type === 'document') return <span>&#128196;</span>
    if (media.type === 'citation') return <span>&laquo;</span>

    if (media.type === 'geojson' || media.type === 'gpx') {
      return <GeoMediaThumbnail media={media} className="person-card-media-thumb" />
    }

    return <span>{media.type?.toUpperCase?.() || '?'}</span>
  }

  // Rendu d'un champ éditable ou lecture seule
  const renderEditableValue = ({ field, value, placeholder, type = 'text' }) => {
    if (!editMode) {
      const isEmptyValue = value === null || value === undefined || value === ''
      return <span className="value">{isEmptyValue ? '-' : value}</span>
    }
    return (
      <input
        type={type}
        className="value value--editable"
        value={getEditValue(field, value)}
        onChange={(e) => handleFieldChange(field, e.target.value)}
        placeholder={placeholder || '...'}
      />
    )
  }

  return (
    <div className={`person-card ${editMode ? 'person-card--edit-mode' : ''}`}>
      <button className="close-btn" onClick={onClose}>
        <X size={18} strokeWidth={2} />
      </button>

      {/* Indicateur mode édition */}
      {editMode && (
        <div className="person-card-edit-indicator">
          <span className="person-card-edit-dot" />
          Édition
        </div>
      )}

      <div className="card-content">
        <div className="avatar-section">
          <div className="avatar-frame">
            {person.photo ? (
              <img src={person.photo} alt={`${person.firstName} ${person.lastName}`} />
            ) : (
              <div className="avatar-placeholder">
                {person.firstName[0]}{person.lastName[0]}
              </div>
            )}
          </div>
          {editMode && (
            <div className="avatar-edit-actions">
              <input
                ref={avatarInputRef}
                type="file"
                accept="image/*"
                className="avatar-edit-input"
                onChange={handleAvatarFileChange}
                disabled={avatarActionLoading}
              />
              <button
                type="button"
                className="avatar-edit-btn"
                onClick={() => avatarInputRef.current?.click()}
                disabled={avatarActionLoading}
              >
                {person.photo ? 'Modifier avatar' : 'Ajouter avatar'}
              </button>
              {person.photo && (
                <button
                  type="button"
                  className="avatar-edit-btn avatar-edit-btn--danger"
                  onClick={() => onAvatarDelete?.(person.id)}
                  disabled={avatarActionLoading}
                >
                  Retirer avatar
                </button>
              )}
              {avatarActionError && (
                <div className="avatar-edit-error">{avatarActionError}</div>
              )}
            </div>
          )}
        </div>

        <div className="info-header">
          {editMode ? (
            <div className="info-header-edit">
              <input
                type="text"
                className="person-name-input"
                value={getEditValue('firstName', person.firstName)}
                onChange={(e) => handleFieldChange('firstName', e.target.value)}
                placeholder="Prénom"
              />
              <input
                type="text"
                className="person-name-input person-name-input--last"
                value={getEditValue('lastName', person.lastName)}
                onChange={(e) => handleFieldChange('lastName', e.target.value)}
                placeholder="Nom"
              />
            </div>
          ) : (
            <h2 className="person-name">
              {person.firstName} <span className="last-name">{person.lastName}</span>
            </h2>
          )}
          {person.isAlive && (
            <div className="status-badge alive">Vivant(e)</div>
          )}
        </div>

        {/* Onglets */}
        <div className="card-tabs">
          <button
            className={`card-tab ${tab === 'infos' ? 'active' : ''}`}
            onClick={() => setTab('infos')}
          >
            Infos
          </button>
          {editMode && (
            <button
              className={`card-tab ${tab === 'relations' ? 'active' : ''}`}
              onClick={() => setTab('relations')}
            >
              Relations
            </button>
          )}
          <button
            className={`card-tab ${tab === 'medias' ? 'active' : ''}`}
            onClick={() => setTab('medias')}
          >
            Médias{personMedias.length > 0 ? ` (${personMedias.length})` : ''}
          </button>
        </div>

        <div className="card-tab-content">
          {tab === 'infos' && (
            <div className="details">
              {/* --- État civil --- */}
              <div className="detail-section-title">État civil</div>

              <div className="detail-row">
                <span className="label">Né(e)</span>
                {renderEditableValue({ field: 'birthYear', value: person.birthDate || person.birthYear, placeholder: 'Date de naissance', type: 'date' })}
              </div>

              {(person.birthPlace || editMode) && (
                <div className="detail-row">
                  <span className="label">Lieu</span>
                  {renderEditableValue({ field: 'birthPlace', value: person.birthPlace || '', placeholder: 'Lieu de naissance' })}
                </div>
              )}

              {(person.birthName || editMode) && (
                <div className="detail-row">
                  <span className="label">Nom de naissance</span>
                  {renderEditableValue({ field: 'birthName', value: person.birthName || '', placeholder: 'Nom de naissance' })}
                </div>
              )}

              {editMode && (
                <div className="detail-row">
                  <span className="label">Statut</span>
                  <button
                    type="button"
                    className={`alive-toggle ${getEditValue('isAlive', person.isAlive) ? 'alive-toggle--alive' : 'alive-toggle--deceased'}`}
                    onClick={() => handleFieldChange('isAlive', !getEditValue('isAlive', person.isAlive))}
                  >
                    <span className="alive-toggle-dot" />
                    {getEditValue('isAlive', person.isAlive) ? 'Vivant(e)' : 'Décédé(e)'}
                  </button>
                </div>
              )}

              {(!getEditValue('isAlive', person.isAlive) || (!editMode && !person.isAlive)) && (
                <div className="detail-row">
                  <span className="label">Décédé(e)</span>
                  {renderEditableValue({ field: 'deathYear', value: person.deathDate || person.deathYear || '', placeholder: 'Date de décès', type: 'date' })}
                </div>
              )}

              {!editMode && (
                <div className="detail-row">
                  <span className="label">Âge</span>
                  <span className="value">
                    {age === null
                      ? '-'
                      : person.isAlive
                        ? `${age} ans`
                        : `${age} ans (au décès)`}
                  </span>
                </div>
              )}

              {(person.region || editMode) && (
                <div className="detail-row">
                  <span className="label">Région</span>
                  {renderEditableValue({ field: 'region', value: person.region || '', placeholder: 'Région' })}
                </div>
              )}

              {(person.nationality || editMode) && (
                <div className="detail-row">
                  <span className="label">Nationalité</span>
                  {renderEditableValue({ field: 'nationality', value: person.nationality || '', placeholder: 'Nationalité' })}
                </div>
              )}

              {(person.profession || editMode) && (
                <div className="detail-row">
                  <span className="label">Métier</span>
                  {renderEditableValue({ field: 'profession', value: person.profession || '', placeholder: 'Métier' })}
                </div>
              )}

              {/* --- Famille (lecture seule) --- */}
              {!editMode && (parentsList.length > 0 || personUnions.length > 0 || childrenList.length > 0) && (
                <>
                  <div className="detail-section-title">Famille</div>

                  {parentsList.length > 0 && (
                    <div className="detail-row">
                      <span className="label">Parents</span>
                      <span className="value">
                        {getParentageLabel() || parentsList.map(p => `${p.firstName} ${p.lastName}`).join(' & ')}
                      </span>
                    </div>
                  )}

                  {preferredFiliation && preferredFiliation.parentageType !== 'biologique' && parentsList.length <= 1 && (
                    <div className="detail-row">
                      <span className="label">Type</span>
                      <span className="value parentage-type">
                        {preferredFiliation.parentageType === 'adoption' ? 'Adoption' : 'Parent inconnu'}
                      </span>
                    </div>
                  )}

                  {personUnions.length > 0 && (
                    <div className="detail-row">
                      <span className="label">{personUnions.length > 1 ? 'Unions' : 'Union'}</span>
                      <span className="value">
                        {personUnions.map(u => {
                          const partnerId = u.partner1Id === person.id ? u.partner2Id : u.partner1Id
                          const partner = persons.find(p => p.id === partnerId)
                          const yearRange = u.startYear
                            ? u.endYear ? `${u.startYear}-${u.endYear}` : `depuis ${u.startYear}`
                            : ''
                          return `${partner?.firstName || '?'} ${partner?.lastName || ''} ${yearRange ? `(${yearRange})` : ''}`
                        }).join(' / ')}
                      </span>
                    </div>
                  )}

                  {childrenList.length > 0 && (
                    <div className="detail-row">
                      <span className="label">Enfants</span>
                      <span className="value">
                        {childrenList.map(c => c.firstName).join(', ')}
                      </span>
                    </div>
                  )}
                </>
              )}

              {/* --- Notes --- */}
              {(person.note || editMode) && (
                <>
                  <div className="detail-section-title">Notes</div>
                  {editMode ? (
                    <textarea
                      className="detail-note detail-note--editable"
                      value={getEditValue('note', person.note || '')}
                      onChange={(e) => handleFieldChange('note', e.target.value)}
                      placeholder="Ajouter une note..."
                      rows={3}
                    />
                  ) : (
                    <div className="detail-note">{person.note}</div>
                  )}
                </>
              )}
            </div>
          )}

          {/* Onglet Relations (mode édition uniquement) */}
          {tab === 'relations' && editMode && (
            <div className="details">
              {(relationActionLoading || relationActionSuccess || relationActionError) && (
                <div
                  className={`relation-feedback ${
                    relationActionError
                      ? 'relation-feedback--error'
                      : relationActionSuccess
                        ? 'relation-feedback--success'
                        : 'relation-feedback--loading'
                  }`}
                >
                  {relationActionLoading
                    ? 'Mise à jour des liens...'
                    : relationActionError || relationActionSuccess}
                </div>
              )}
              <div className="detail-section-title">Parents</div>
              {parentsList.length > 0 ? (
                parentsList.map(p => (
                  <div key={p.id} className="relation-row">
                    <div className="relation-avatar-mini">
                      {p.photo
                        ? <img src={p.photo} alt="" />
                        : <span>{p.firstName[0]}</span>
                      }
                    </div>
                    <span className="relation-name">{p.firstName} {p.lastName}</span>
                    <button
                      type="button"
                      className="relation-remove"
                      aria-label={`Retirer ${p.firstName}`}
                      onClick={() => handleRelationRemove(p.id, 'parent')}
                      disabled={relationActionLoading}
                    >
                      <X size={14} strokeWidth={2} />
                    </button>
                  </div>
                ))
              ) : (
                <div className="relation-empty">Aucun parent défini</div>
              )}
              {activeRelationSearch === 'parent' ? (
                <RelationSearchInline
                  ref={relationSearchRef}
                  query={relationSearchQuery}
                  onQueryChange={setRelationSearchQuery}
                  results={getFilteredPersonsForRelation('parent')}
                  onSelect={(p) => handleRelationAdd(p, 'parent')}
                  onClose={() => { setActiveRelationSearch(null); setRelationSearchQuery('') }}
                  placeholder="Rechercher un parent..."
                />
              ) : (
                <button type="button" className="relation-add-btn" onClick={() => setActiveRelationSearch('parent')} disabled={relationActionLoading}>
                  <Plus size={14} strokeWidth={2} />
                  Ajouter un parent
                </button>
              )}

              <div className="detail-section-title">Conjoint·e·s</div>
              {personUnions.length > 0 ? (
                personUnions.map(u => {
                  const partnerId = u.partner1Id === person.id ? u.partner2Id : u.partner1Id
                  const partner = persons.find(p => p.id === partnerId)
                  return (
                    <div key={u.id} className="relation-row">
                      <div className="relation-avatar-mini">
                        {partner?.photo
                          ? <img src={partner.photo} alt="" />
                          : <span>{partner?.firstName?.[0] || '?'}</span>
                        }
                      </div>
                      <span className="relation-name">{partner?.firstName} {partner?.lastName || ''}</span>
                      <span className="relation-meta">{u.unionType}</span>
                      <button
                        type="button"
                        className="relation-remove"
                        aria-label={`Retirer ${partner?.firstName}`}
                        onClick={() => handleRelationRemove(partnerId, 'spouse')}
                        disabled={relationActionLoading}
                      >
                        <X size={14} strokeWidth={2} />
                      </button>
                    </div>
                  )
                })
              ) : (
                <div className="relation-empty">Aucun·e conjoint·e</div>
              )}
              {activeRelationSearch === 'spouse' ? (
                <RelationSearchInline
                  ref={relationSearchRef}
                  query={relationSearchQuery}
                  onQueryChange={setRelationSearchQuery}
                  results={getFilteredPersonsForRelation('spouse')}
                  onSelect={(p) => handleRelationAdd(p, 'spouse')}
                  onClose={() => { setActiveRelationSearch(null); setRelationSearchQuery('') }}
                  placeholder="Rechercher un·e conjoint·e..."
                />
              ) : (
                <button type="button" className="relation-add-btn" onClick={() => setActiveRelationSearch('spouse')} disabled={relationActionLoading}>
                  <Plus size={14} strokeWidth={2} />
                  Ajouter un·e conjoint·e
                </button>
              )}

              <div className="detail-section-title">Enfants</div>
              {childrenList.length > 0 ? (
                childrenList.map(c => (
                  <div key={c.id} className="relation-row">
                    <div className="relation-avatar-mini">
                      {c.photo
                        ? <img src={c.photo} alt="" />
                        : <span>{c.firstName[0]}</span>
                      }
                    </div>
                    <span className="relation-name">{c.firstName} {c.lastName}</span>
                    <button
                      type="button"
                      className="relation-remove"
                      aria-label={`Retirer ${c.firstName}`}
                      onClick={() => handleRelationRemove(c.id, 'child')}
                      disabled={relationActionLoading}
                    >
                      <X size={14} strokeWidth={2} />
                    </button>
                  </div>
                ))
              ) : (
                <div className="relation-empty">Aucun enfant</div>
              )}
              {activeRelationSearch === 'child' ? (
                <RelationSearchInline
                  ref={relationSearchRef}
                  query={relationSearchQuery}
                  onQueryChange={setRelationSearchQuery}
                  results={getFilteredPersonsForRelation('child')}
                  onSelect={(p) => handleRelationAdd(p, 'child')}
                  onClose={() => { setActiveRelationSearch(null); setRelationSearchQuery('') }}
                  placeholder="Rechercher un enfant..."
                />
              ) : (
                <button type="button" className="relation-add-btn" onClick={() => setActiveRelationSearch('child')} disabled={relationActionLoading}>
                  <Plus size={14} strokeWidth={2} />
                  Ajouter un enfant
                </button>
              )}
            </div>
          )}

          {tab === 'medias' && (
            <div>
              <div className="media-list">
                {personMedias.length === 0 ? (
                  <div className="media-empty">Aucun média associé</div>
                ) : (
                  personMedias.map(media => (
                    <button
                      key={media.id}
                      className="media-item"
                      onClick={() => onMediaSelect?.(media, person)}
                    >
                      <div className={`media-item-icon ${media.type}`}>
                        {renderMediaIcon(media)}

                      </div>
                      <div className="media-item-info">
                        <span className="media-item-label">{media.label}</span>
                        <span className="media-item-type">{TYPE_LABELS[media.type] || media.type}</span>
                      </div>
                    </button>
                  ))
                )}
              </div>
              {editMode && canManageMedia && (
                <div className="media-manage-footer">
                  <button type="button" className="media-manage-btn media-manage-btn--footer" onClick={() => onManageMedia?.()}>
                    Ajouter / Gérer des médias
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Actions mode édition */}
        {editMode && (
          <div className="person-card-actions">
            <button
              type="button"
              className={`person-card-save ${saveSuccess ? 'person-card-save--success' : ''}`}
              disabled={(!hasChanges && !saveSuccess) || saving}
              onClick={handleSave}
            >
              {saveSuccess ? (
                <>
                  <Check size={16} strokeWidth={2.5} />
                  Enregistré
                </>
              ) : (
                <>
                  <Save size={16} strokeWidth={2} />
                  {saving ? 'Enregistrement...' : 'Sauvegarder'}
                </>
              )}
            </button>

            {isAdmin && (
              <>
                {showDeleteConfirm ? (
                  <div className="person-card-delete-confirm">
                    <span className="person-card-delete-text">Supprimer cette personne ?</span>
                    <button type="button" className="person-card-delete-yes" onClick={handleDelete}>
                      Confirmer
                    </button>
                    <button type="button" className="person-card-delete-no" onClick={() => setShowDeleteConfirm(false)}>
                      Annuler
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    className="person-card-delete"
                    onClick={() => setShowDeleteConfirm(true)}
                  >
                    <Trash2 size={14} strokeWidth={2} />
                    Supprimer
                  </button>
                )}
              </>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

/**
 * Inline searchable dropdown for adding relations
 * Appears in-place when clicking "+ Ajouter un parent/conjoint/enfant"
 */
const RelationSearchInline = forwardRef(function RelationSearchInline(
  { query, onQueryChange, results, onSelect, onClose, placeholder },
  ref
) {
  const filtered = results.slice(0, 6)

  return (
    <div className="relation-search-inline">
      <div className="relation-search-inline-input-wrap">
        <Search size={13} strokeWidth={2} className="relation-search-inline-icon" />
        <input
          ref={ref}
          type="text"
          className="relation-search-inline-input"
          value={query}
          onChange={(e) => onQueryChange(e.target.value)}
          placeholder={placeholder}
          autoComplete="off"
          onKeyDown={(e) => {
            if (e.key === 'Escape') {
              e.stopPropagation()
              onClose()
            }
          }}
        />
        <button type="button" className="relation-search-inline-close" onClick={onClose}>
          <X size={13} strokeWidth={2} />
        </button>
      </div>
      {filtered.length > 0 ? (
        <ul className="relation-search-inline-list">
          {filtered.map((p) => (
            <li key={p.id}>
              <button
                type="button"
                className="relation-search-inline-item"
                onClick={() => onSelect(p)}
              >
                <div className="relation-search-inline-avatar">
                  {p.photo
                    ? <img src={p.photo} alt="" />
                    : <span>{p.firstName[0]}{(p.lastName || '')[0] || ''}</span>
                  }
                </div>
                <div className="relation-search-inline-info">
                  <span className="relation-search-inline-name">
                    {p.firstName} {p.lastName || ''}
                  </span>
                  {p.birthYear && (
                    <span className="relation-search-inline-year">{p.birthYear}</span>
                  )}
                </div>
              </button>
            </li>
          ))}
        </ul>
      ) : query ? (
        <div className="relation-search-inline-empty">Aucun résultat</div>
      ) : null}
    </div>
  )
})

export default PersonCard


