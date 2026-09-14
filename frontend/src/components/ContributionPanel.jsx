import { useEffect, useState } from 'react'
import { Check, X, ChevronDown } from 'lucide-react'

// ─── helpers ────────────────────────────────────────────────────────────────

function formatAction(action) {
  if (action === 'create') return 'Création'
  if (action === 'update') return 'Modification'
  if (action === 'delete') return 'Suppression'
  if (action === 'reorder') return 'Réorganisation'
  return 'Changement'
}

function formatEntityType(entityType) {
  if (entityType === 'person') return 'personne'
  if (entityType === 'union') return 'union'
  if (entityType === 'parent_child_link') return 'lien parent-enfant'
  if (entityType === 'annotation') return 'annotation'
  return 'élément'
}

function formatAnnotationType(type) {
  if (type === 'sticker') return 'Sticker'
  if (type === 'drawing') return 'Dessin'
  if (type === 'text') return 'Texte'
  if (type === 'photo') return 'Photo canvas'
  return 'Annotation'
}

const PERSON_FIELD_LABELS = {
  firstName: 'Prénom',
  lastName: 'Nom',
  birthName: 'Nom de naissance',
  birthDate: 'Date de naissance',
  deathDate: 'Date de décès',
  birthPlace: 'Lieu de naissance',
  profession: 'Métier',
  nationality: 'Nationalité',
  region: 'Région',
  notes: 'Notes',
}

function displayVal(v) {
  if (v === null || v === undefined || v === '') return null
  return String(v)
}

function getPersonDisplayName(change) {
  if (change.entityType === 'annotation') {
    const data = change.afterJson || change.after || {}
    return formatAnnotationType(data.type)
  }
  const data = (change.afterJson && typeof change.afterJson === 'object')
    ? change.afterJson
    : (change.beforeJson && typeof change.beforeJson === 'object' ? change.beforeJson : null)
  if (!data) return null
  const name = `${data.firstName || ''} ${data.lastName || ''}`.trim()
  return name || null
}

function getFieldRows(change) {
  if (change.entityType !== 'person') return []
  const after = change.afterJson
  if (!after || typeof after !== 'object') return []
  const before = (change.beforeJson && typeof change.beforeJson === 'object') ? change.beforeJson : null

  return Object.entries(after)
    .filter(([key]) => PERSON_FIELD_LABELS[key])
    .map(([key, newVal]) => ({
      key,
      label: PERSON_FIELD_LABELS[key],
      oldVal: before !== null ? before[key] : undefined,
      newVal,
    }))
    .filter(({ newVal, oldVal }) => {
      if (oldVal !== undefined) return true
      return newVal !== null && newVal !== undefined && newVal !== ''
    })
}

function getAnnotationPreview(change) {
  const data = change.afterJson || change.after || {}
  const type = data.type
  if (!type) return null
  if (type === 'sticker') return { type, emoji: data.content || '?' }
  if (type === 'text') return { type, text: data.content || '' }
  if (type === 'drawing') return { type, color: data.style?.color || '#5D524B' }
  if (type === 'photo') {
    try {
      const parsed = typeof data.content === 'string' ? JSON.parse(data.content) : data.content
      return { type, url: parsed?.url || null }
    } catch { return { type } }
  }
  return { type }
}

function formatSessionDate(value) {
  if (!value) return ''
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return ''
  return date.toLocaleString('fr-FR', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  })
}

// ─── component ──────────────────────────────────────────────────────────────

const ContributionPanel = ({
  visible,
  treeId,
  canModerate,
  loading,
  errorMessage,
  inviteShareUrl,
  inviteKnownPasswords,
  inviteSaving,
  inviteError,
  inviteMessage,
  sessions,
  reviewingSessionId,
  onClose,
  onRefresh,
  onRotatePasswords,
  onReviewSession,
}) => {
  const [decisionMap, setDecisionMap] = useState({})
  const [collapsedSessions, setCollapsedSessions] = useState(new Set())
  const [confirmApproveAll, setConfirmApproveAll] = useState(null)
  const [showVisitorPassword, setShowVisitorPassword] = useState(false)
  const [showContributorPassword, setShowContributorPassword] = useState(false)
  const [editingVisitorPassword, setEditingVisitorPassword] = useState(false)
  const [editingContributorPassword, setEditingContributorPassword] = useState(false)
  const [newVisitorPassword, setNewVisitorPassword] = useState('')
  const [newContributorPassword, setNewContributorPassword] = useState('')
  const [inviteLocalError, setInviteLocalError] = useState('')
  const [copyFeedback, setCopyFeedback] = useState('')

  // Load persisted decisions from localStorage
  useEffect(() => {
    if (!treeId) return
    try {
      const saved = localStorage.getItem(`contrib_decisions_${treeId}`)
      if (saved) setDecisionMap(JSON.parse(saved))
    } catch { /* ignore */ }
  }, [treeId])

  // Persist decisions to localStorage on change
  useEffect(() => {
    if (!treeId) return
    try {
      localStorage.setItem(`contrib_decisions_${treeId}`, JSON.stringify(decisionMap))
    } catch { /* ignore */ }
  }, [treeId, decisionMap])

  const toggleCollapse = (sessionId) => {
    setCollapsedSessions((prev) => {
      const next = new Set(prev)
      next.has(sessionId) ? next.delete(sessionId) : next.add(sessionId)
      return next
    })
  }

  const toggleChangeDecision = (sessionId, changeId, decision) => {
    setDecisionMap((current) => {
      const prev = current[sessionId]?.[changeId] || ''
      const next = prev === decision ? '' : decision
      return { ...current, [sessionId]: { ...(current[sessionId] || {}), [changeId]: next } }
    })
  }

  const getChangeDecision = (sessionId, changeId) =>
    decisionMap?.[sessionId]?.[changeId] || ''

  const buildChangeDecisions = (sessionId) => {
    const raw = decisionMap[sessionId] || {}
    return Object.entries(raw)
      .filter(([, d]) => d === 'approved' || d === 'rejected')
      .map(([changeId, decision]) => ({ changeId, decision }))
  }

  const getSessionSummary = (sessionId, changes) => {
    const decisions = decisionMap[sessionId] || {}
    let approved = 0, rejected = 0, pending = 0
    for (const ch of (changes || [])) {
      const d = decisions[ch.id] || ''
      if (d === 'approved') approved++
      else if (d === 'rejected') rejected++
      else pending++
    }
    return { approved, rejected, pending, total: (changes || []).length }
  }

  const applyDecisions = (sessionId, changes) => {
    const explicit = buildChangeDecisions(sessionId)
    const explicitIds = new Set(explicit.map((d) => d.changeId))
    const allDecisions = [
      ...explicit,
      ...(changes || [])
        .filter((ch) => !explicitIds.has(ch.id))
        .map((ch) => ({ changeId: ch.id, decision: 'rejected' })),
    ]
    onReviewSession(sessionId, { decision: 'rejected', changeDecisions: allDecisions })
  }

  useEffect(() => {
    if (!visible) return undefined
    const handleKeyDown = (e) => { if (e.key === 'Escape') onClose?.() }
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [visible, onClose])

  useEffect(() => {
    if (!copyFeedback) return undefined
    const t = window.setTimeout(() => setCopyFeedback(''), 1800)
    return () => window.clearTimeout(t)
  }, [copyFeedback])

  useEffect(() => {
    if (!visible) return
    setEditingVisitorPassword(false)
    setEditingContributorPassword(false)
    setNewVisitorPassword('')
    setNewContributorPassword('')
    setInviteLocalError('')
  }, [inviteKnownPasswords?.contributor, inviteKnownPasswords?.visitor, visible])

  const handleCopy = async (value, label) => {
    const text = String(value || '').trim()
    if (!text) return
    try { await navigator.clipboard.writeText(text); setCopyFeedback(label) }
    catch { setCopyFeedback('Copie indisponible') }
  }

  const handleSaveVisitorPassword = async (e) => {
    e.preventDefault()
    setInviteLocalError('')
    if (newVisitorPassword.trim().length < 8) { setInviteLocalError('Minimum 8 caractères.'); return }
    if (inviteKnownPasswords?.contributor && newVisitorPassword.trim() === inviteKnownPasswords.contributor) {
      setInviteLocalError('Les mots de passe Visiteur et Contributeur doivent être différents.'); return
    }
    const result = await onRotatePasswords?.({ visitorPassword: newVisitorPassword.trim(), contributorPassword: '' })
    if (result?.ok) { setEditingVisitorPassword(false); setNewVisitorPassword('') }
  }

  const handleSaveContributorPassword = async (e) => {
    e.preventDefault()
    setInviteLocalError('')
    if (newContributorPassword.trim().length < 8) { setInviteLocalError('Minimum 8 caractères.'); return }
    if (inviteKnownPasswords?.visitor && newContributorPassword.trim() === inviteKnownPasswords.visitor) {
      setInviteLocalError('Les mots de passe Visiteur et Contributeur doivent être différents.'); return
    }
    const result = await onRotatePasswords?.({ visitorPassword: '', contributorPassword: newContributorPassword.trim() })
    if (result?.ok) { setEditingContributorPassword(false); setNewContributorPassword('') }
  }

  return (
    <div
      className={`contrib-overlay ${visible ? 'contrib-overlay--open' : ''}`}
      onClick={() => visible && onClose?.()}
      aria-hidden={!visible}
    >
      <div
        className="contrib-card"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label="Panel contributions"
      >
        <div className="contrib-header">
          <div className="contrib-header-text">
            <h1>Contributions</h1>
            <p>Validation des propositions de modification</p>
          </div>
          <button type="button" className="ghost" onClick={onClose}>Fermer</button>
        </div>

        {canModerate ? (
          <div className="contrib-list-section">

            {/* ── Section invitation ── */}
            <div className="contrib-invite">
              <div className="contrib-invite-top">
                <strong className="contrib-invite-title">Invitez vos proches à alimenter l'arbre</strong>
                {copyFeedback && <span className="contrib-copy-feedback">{copyFeedback}</span>}
              </div>
              <div className="contrib-invite-link">
                <code className="contrib-link-url">{inviteShareUrl || 'Lien indisponible'}</code>
                <button type="button" className="contrib-pill-btn contrib-pill-btn--ghost" disabled={!inviteShareUrl} onClick={() => handleCopy(inviteShareUrl, 'Lien copié')}>Copier</button>
              </div>
              <div className="contrib-invite-passwords">
                {/* Visiteur */}
                <div className="contrib-role-row">
                  <span className="contrib-role-badge">Visiteur</span>
                  {editingVisitorPassword ? (
                    <form className="contrib-pass-edit-inline" onSubmit={handleSaveVisitorPassword}>
                      <input className="contrib-pass-edit-input" type="password" value={newVisitorPassword} placeholder="Nouveau MDP (8+ car.)" autoFocus onChange={(e) => setNewVisitorPassword(e.target.value)} />
                      <button type="submit" className="contrib-pill-btn contrib-pill-btn--save" disabled={inviteSaving}>{inviteSaving ? '...' : 'Enregistrer'}</button>
                      <button type="button" className="contrib-pill-btn contrib-pill-btn--ghost" onClick={() => { setEditingVisitorPassword(false); setNewVisitorPassword(''); setInviteLocalError('') }}>Annuler</button>
                    </form>
                  ) : (
                    <>
                      <button type="button" className={`contrib-pass-reveal${inviteKnownPasswords?.visitor && !showVisitorPassword ? ' contrib-pass-reveal--blurred' : ''}`} onClick={() => setShowVisitorPassword((v) => !v)} disabled={!inviteKnownPasswords?.visitor} title={showVisitorPassword ? 'Cliquer pour masquer' : 'Cliquer pour révéler'}>{inviteKnownPasswords?.visitor || 'Non défini'}</button>
                      <button type="button" className="contrib-pill-btn contrib-pill-btn--edit" disabled={inviteSaving} onClick={() => setEditingVisitorPassword(true)}>Éditer</button>
                    </>
                  )}
                </div>
                {/* Contributeur */}
                <div className="contrib-role-row">
                  <span className="contrib-role-badge contrib-role-badge--contrib">Contributeur</span>
                  {editingContributorPassword ? (
                    <form className="contrib-pass-edit-inline" onSubmit={handleSaveContributorPassword}>
                      <input className="contrib-pass-edit-input" type="password" value={newContributorPassword} placeholder="Nouveau MDP (8+ car.)" autoFocus onChange={(e) => setNewContributorPassword(e.target.value)} />
                      <button type="submit" className="contrib-pill-btn contrib-pill-btn--save" disabled={inviteSaving}>{inviteSaving ? '...' : 'Enregistrer'}</button>
                      <button type="button" className="contrib-pill-btn contrib-pill-btn--ghost" onClick={() => { setEditingContributorPassword(false); setNewContributorPassword(''); setInviteLocalError('') }}>Annuler</button>
                    </form>
                  ) : (
                    <>
                      <button type="button" className={`contrib-pass-reveal${inviteKnownPasswords?.contributor && !showContributorPassword ? ' contrib-pass-reveal--blurred' : ''}`} onClick={() => setShowContributorPassword((v) => !v)} disabled={!inviteKnownPasswords?.contributor} title={showContributorPassword ? 'Cliquer pour masquer' : 'Cliquer pour révéler'}>{inviteKnownPasswords?.contributor || 'Non défini'}</button>
                      <button type="button" className="contrib-pill-btn contrib-pill-btn--edit" disabled={inviteSaving} onClick={() => setEditingContributorPassword(true)}>Éditer</button>
                    </>
                  )}
                </div>
              </div>
              {(inviteLocalError || inviteError) && <div className="contrib-error">{inviteLocalError || inviteError}</div>}
              {inviteMessage && <div className="contrib-ok">{inviteMessage}</div>}
            </div>

            {/* ── En-tête sessions ── */}
            <div className="contrib-list-header">
              <div className="contrib-list-heading">
                <h2>Propositions en attente</h2>
                <p>Approuvez ou rejetez chaque modification individuellement</p>
              </div>
              <div className="contrib-list-header-actions">
                <span className="contrib-count">{sessions.length || 0}</span>
                <button type="button" className="ghost" onClick={onRefresh} disabled={loading}>Actualiser</button>
              </div>
            </div>

            {errorMessage && <div className="contrib-error">{errorMessage}</div>}

            {loading ? (
              <div className="contrib-empty">Chargement...</div>
            ) : sessions.length === 0 ? (
              <div className="contrib-empty">Aucune proposition en attente.</div>
            ) : (
              <div className="contrib-list">
                {sessions.map((session) => {
                  const summary = getSessionSummary(session.id, session.changes)
                  const isReviewing = reviewingSessionId === session.id
                  const hasDecisions = summary.approved + summary.rejected > 0
                  const isCollapsed = collapsedSessions.has(session.id)

                  return (
                    <div key={session.id} className="contrib-item contrib-item-stack">

                      {/* ── En-tête de session (cliquable pour collapse) ── */}
                      <div
                        className="contrib-item-main contrib-item-main--clickable"
                        onClick={() => toggleCollapse(session.id)}
                        role="button"
                        tabIndex={0}
                        onKeyDown={(e) => e.key === 'Enter' && toggleCollapse(session.id)}
                      >
                        <div className="contrib-item-top">
                          <strong className="contrib-session-title">{session.title || 'Session sans titre'}</strong>
                          <div className="contrib-session-top-right">
                            {formatSessionDate(session.createdAt) && (
                              <span className="contrib-session-date">{formatSessionDate(session.createdAt)}</span>
                            )}
                            <ChevronDown
                              size={16}
                              strokeWidth={2}
                              className={`contrib-collapse-icon${isCollapsed ? '' : ' contrib-collapse-icon--up'}`}
                            />
                          </div>
                        </div>
                        <div className="contrib-item-meta">
                          <span className="contrib-meta-pill">par {session.submittedByLabel || 'Contributeur'}</span>
                          <span className="contrib-meta-sep">·</span>
                          <span className="contrib-meta-pill">{summary.total} modification{summary.total > 1 ? 's' : ''}</span>
                          {hasDecisions && (
                            <>
                              <span className="contrib-meta-sep">·</span>
                              {summary.approved > 0 && <span className="contrib-decision-summary contrib-decision-summary--ok">{summary.approved} ✓</span>}
                              {summary.rejected > 0 && <span className="contrib-decision-summary contrib-decision-summary--ko">{summary.rejected} ✗</span>}
                              {summary.pending > 0 && <span className="contrib-decision-summary contrib-decision-summary--pending">{summary.pending} en attente</span>}
                            </>
                          )}
                          {summary.pending === 0 && summary.total > 0 && (
                            <span className="contrib-all-decided-badge">✓ Complet</span>
                          )}
                        </div>
                        {session.comment && (
                          <p className="contrib-session-comment">« {session.comment} »</p>
                        )}
                      </div>

                      {/* ── Cartes de changement (collapsibles) ── */}
                      {!isCollapsed && (() => {
                        // Grouper les changements par entityType
                        const groupOrder = ['person', 'union', 'parent_child_link', 'annotation']
                        const groupLabels = { person: 'Personnes', union: 'Unions', parent_child_link: 'Liens', annotation: 'Annotations' }
                        const groupMap = {}
                        for (const ch of (session.changes || [])) {
                          const key = ch.entityType || 'other'
                          if (!groupMap[key]) groupMap[key] = []
                          groupMap[key].push(ch)
                        }
                        const orderedKeys = [
                          ...groupOrder.filter((k) => groupMap[k]),
                          ...Object.keys(groupMap).filter((k) => !groupOrder.includes(k)),
                        ]
                        const hasMultipleGroups = orderedKeys.length > 1

                        const renderChangeCard = (change) => {
                          const decision = getChangeDecision(session.id, change.id)
                          const isApproved = decision === 'approved'
                          const isRejected = decision === 'rejected'
                          const personName = getPersonDisplayName(change)
                          const fields = getFieldRows(change)
                          const annPreview = change.entityType === 'annotation' ? getAnnotationPreview(change) : null

                          return (
                            <div
                              key={change.id}
                              className={`contrib-change-card${isApproved ? ' contrib-change-card--approved' : ''}${isRejected ? ' contrib-change-card--rejected' : ''}`}
                            >
                              <div className="contrib-change-card-head">
                                <span className={`contrib-action-badge contrib-action-badge--${change.action}`}>
                                  {formatAction(change.action)}
                                </span>
                                <span className="contrib-change-entity-name">
                                  {personName || formatEntityType(change.entityType)}
                                </span>
                                {change.conflictState === 'needs_review' && (
                                  <span className="contrib-conflict-badge">⚠ Conflit</span>
                                )}
                                <div className="contrib-card-decisions">
                                  <button
                                    type="button"
                                    className={`contrib-decision-icon contrib-decision-icon--approve${isApproved ? ' active' : ''}`}
                                    onClick={(e) => { e.stopPropagation(); toggleChangeDecision(session.id, change.id, 'approved') }}
                                    disabled={isReviewing}
                                    title="Approuver"
                                  >
                                    <Check size={13} strokeWidth={2.5} />
                                  </button>
                                  <button
                                    type="button"
                                    className={`contrib-decision-icon contrib-decision-icon--reject${isRejected ? ' active' : ''}`}
                                    onClick={(e) => { e.stopPropagation(); toggleChangeDecision(session.id, change.id, 'rejected') }}
                                    disabled={isReviewing}
                                    title="Rejeter"
                                  >
                                    <X size={13} strokeWidth={2.5} />
                                  </button>
                                </div>
                              </div>

                              {annPreview && (
                                <div className="contrib-annotation-preview">
                                  {annPreview.type === 'sticker' && <span className="contrib-ann-emoji">{annPreview.emoji}</span>}
                                  {annPreview.type === 'text' && <span className="contrib-ann-text">«&nbsp;{(annPreview.text || '').slice(0, 120)}&nbsp;»</span>}
                                  {annPreview.type === 'drawing' && (
                                    <span className="contrib-ann-drawing" style={{ borderLeftColor: annPreview.color }}>Dessin libre</span>
                                  )}
                                  {annPreview.type === 'photo' && annPreview.url && (
                                    <img src={annPreview.url} className="contrib-ann-photo" alt="Photo canvas" onError={(e) => { e.currentTarget.style.display = 'none' }} />
                                  )}
                                  {annPreview.type === 'photo' && !annPreview.url && (
                                    <span className="contrib-ann-text">Photo (aperçu indisponible)</span>
                                  )}
                                </div>
                              )}

                              {fields.length > 0 && (
                                <div className="contrib-change-fields">
                                  {fields.map(({ key, label, oldVal, newVal }) => (
                                    <div key={key} className="contrib-field-row">
                                      <span className="contrib-field-label">{label}</span>
                                      {oldVal !== undefined ? (
                                        <span className="contrib-field-diff">
                                          <span className="contrib-field-old">{displayVal(oldVal) ?? '—'}</span>
                                          <span className="contrib-field-arrow">→</span>
                                          <span className="contrib-field-new">{displayVal(newVal) ?? '—'}</span>
                                        </span>
                                      ) : (
                                        <span className="contrib-field-new">{displayVal(newVal) ?? '—'}</span>
                                      )}
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>
                          )
                        }

                        return (
                          <>
                            <div className="contrib-change-list">
                              {orderedKeys.map((groupKey) => (
                                <div key={groupKey} className="contrib-change-group">
                                  {hasMultipleGroups && (
                                    <div className="contrib-group-header">{groupLabels[groupKey] || groupKey}</div>
                                  )}
                                  {groupMap[groupKey].map(renderChangeCard)}
                                </div>
                              ))}
                            </div>

                            {/* ── Actions de session ── */}
                            <div className="contrib-session-footer">
                              {hasDecisions ? (
                                <>
                                  <button
                                    type="button"
                                    className="contrib-apply-btn"
                                    onClick={() => applyDecisions(session.id, session.changes)}
                                    disabled={isReviewing}
                                  >
                                    {isReviewing ? 'Traitement...' : `Appliquer les décisions${summary.pending > 0 ? ` (${summary.pending} non décidée${summary.pending > 1 ? 's' : ''} → rejetée${summary.pending > 1 ? 's' : ''})` : ''}`}
                                  </button>
                                  <div className="contrib-session-quick">
                                    {confirmApproveAll === session.id ? (
                                      <div className="contrib-confirm-approve">
                                        <span>Tout approuver ?</span>
                                        <button type="button" className="contrib-confirm-yes" onClick={() => { setConfirmApproveAll(null); onReviewSession(session.id, { decision: 'approved' }) }} disabled={isReviewing}>Oui</button>
                                        <button type="button" className="contrib-confirm-no" onClick={() => setConfirmApproveAll(null)}>Non</button>
                                      </div>
                                    ) : (
                                      <button type="button" className="contrib-quick-btn" onClick={() => setConfirmApproveAll(session.id)} disabled={isReviewing}>Tout approuver</button>
                                    )}
                                    <button type="button" className="contrib-quick-btn" onClick={() => onReviewSession(session.id, { decision: 'rejected' })} disabled={isReviewing}>Tout rejeter</button>
                                  </div>
                                </>
                              ) : (
                                <div className="contrib-session-quick contrib-session-quick--full">
                                  {confirmApproveAll === session.id ? (
                                    <div className="contrib-confirm-approve">
                                      <span>Confirmer l'approbation de toutes les modifications ?</span>
                                      <button type="button" className="contrib-confirm-yes" onClick={() => { setConfirmApproveAll(null); onReviewSession(session.id, { decision: 'approved' }) }} disabled={isReviewing}>Oui, tout approuver</button>
                                      <button type="button" className="contrib-confirm-no" onClick={() => setConfirmApproveAll(null)}>Annuler</button>
                                    </div>
                                  ) : (
                                    <button
                                      type="button"
                                      className="contrib-apply-btn contrib-apply-btn--approve"
                                      onClick={() => setConfirmApproveAll(session.id)}
                                      disabled={isReviewing}
                                    >
                                      {isReviewing ? 'Traitement...' : 'Tout approuver'}
                                    </button>
                                  )}
                                  <button type="button" className="contrib-quick-btn" onClick={() => onReviewSession(session.id, { decision: 'rejected' })} disabled={isReviewing}>Tout rejeter</button>
                                </div>
                              )}
                            </div>
                          </>
                        )
                      })()}

                    </div>
                  )
                })}
              </div>
            )}
          </div>
        ) : (
          <div className="contrib-readonly">
            Ce panneau est réservé à l'administration de l'arbre.
          </div>
        )}
      </div>
    </div>
  )
}

export default ContributionPanel
