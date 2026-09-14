import { useEffect, useMemo, useState } from 'react'

const AccountDashboard = ({
  authenticated,
  loading,
  errorMessage,
  trees,
  activeTreeId,
  defaultMode = 'login',
  pendingTreeName = '',
  onLogin,
  onRegister,
  onOpenTree,
  onStartTreeWizard,
  onLogout,
  onDeleteAccount,
  onBackToAccess,
  onUseDemo,
}) => {
  const [mode, setMode] = useState(defaultMode === 'register' ? 'register' : 'login')
  const [firstName, setFirstName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [deleteModalOpen, setDeleteModalOpen] = useState(false)
  const [deletePassword, setDeletePassword] = useState('')
  const [deleteError, setDeleteError] = useState('')
  const [deleting, setDeleting] = useState(false)

  const openDeleteModal = () => {
    setDeletePassword('')
    setDeleteError('')
    setDeleteModalOpen(true)
  }

  const closeDeleteModal = () => {
    if (deleting) return
    setDeleteModalOpen(false)
    setDeletePassword('')
    setDeleteError('')
  }

  const handleDeleteSubmit = async (event) => {
    event.preventDefault()
    if (deleting || !deletePassword || !onDeleteAccount) return

    setDeleting(true)
    setDeleteError('')
    const errorMessage = await onDeleteAccount(deletePassword)
    setDeleting(false)

    if (errorMessage) {
      setDeleteError(errorMessage)
      return
    }

    setDeleteModalOpen(false)
    setDeletePassword('')
  }

  useEffect(() => {
    setMode(defaultMode === 'register' ? 'register' : 'login')
  }, [defaultMode])

  const isRegister = mode === 'register'

  const canSubmitAuth = useMemo(() => {
    if (loading) return false
    if (!email.trim()) return false
    if (password.length < 8) return false
    if (isRegister && !firstName.trim()) return false
    return true
  }, [email, firstName, isRegister, loading, password.length])

  const handleAuthSubmit = async (event) => {
    event.preventDefault()
    if (!canSubmitAuth) {
      return
    }

    const safeEmail = email.trim().toLowerCase()
    if (isRegister) {
      await onRegister?.(firstName.trim(), safeEmail, password)
      return
    }
    await onLogin(safeEmail, password)
  }

  if (!authenticated) {
    return (
      <div className="account-dashboard">
        <div className="account-dashboard-card auth-only">
          <h1>Parenthèse</h1>
          <p className="account-subtitle">
            {isRegister ? 'Créez votre compte.' : 'Votre histoire familiale, vivante et partagée.'}
          </p>
          {pendingTreeName && (
            <p className="account-pending-tree">
              Vous reviendrez ensuite sur l'arbre « {pendingTreeName} », rattaché à votre compte.
            </p>
          )}

          <form className="account-form" onSubmit={handleAuthSubmit}>
            {isRegister && (
              <>
                <label htmlFor="accountFirstName">Prénom</label>
                <input
                  id="accountFirstName"
                  type="text"
                  autoComplete="given-name"
                  value={firstName}
                  maxLength={100}
                  onChange={(event) => setFirstName(event.target.value)}
                  required
                />
              </>
            )}

            <label htmlFor="accountEmail">Email</label>
            <input
              id="accountEmail"
              type="email"
              autoComplete="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              required
            />

            <label htmlFor="accountPassword">Mot de passe</label>
            <input
              id="accountPassword"
              type="password"
              autoComplete={isRegister ? 'new-password' : 'current-password'}
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              minLength={8}
              required
            />
            {isRegister && <p className="account-hint">8 caractères minimum.</p>}

            {errorMessage && <div className="account-error">{errorMessage}</div>}

            <button type="submit" disabled={!canSubmitAuth}>
              {loading ? 'Traitement...' : isRegister ? 'Créer mon compte' : 'Se connecter'}
            </button>
            {isRegister && (
              <p className="account-hint">
                En créant un compte, vous acceptez{' '}
                <a href="https://parenthese.io/donnees-et-vie-privee/" target="_blank" rel="noopener noreferrer">
                  la façon dont Parenthèse traite vos données
                </a>
                .
              </p>
            )}
          </form>

          <div className="account-divider">ou</div>

          <div className="account-secondary-actions">
            <button
              type="button"
              className="account-secondary-btn account-signup-toggle"
              onClick={() => setMode(isRegister ? 'login' : 'register')}
              disabled={loading}
            >
              {isRegister ? "J'ai déjà un compte" : 'Créer un compte'}
            </button>
            <button
              type="button"
              className="account-secondary-btn account-shared-link"
              onClick={onBackToAccess}
              disabled={loading}
            >
              Accéder avec un lien partagé
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="account-dashboard">
      <div className="account-dashboard-card">
        <h1>Votre compte</h1>
        <p>Choisissez un arbre ou créez-en un nouveau.</p>

        {errorMessage && <div className="account-error">{errorMessage}</div>}

        <div className="tree-list">
          {trees.length === 0 ? (
            <div className="tree-empty">Aucun arbre pour le moment.</div>
          ) : (
            trees.map((tree) => (
              <button
                key={tree.id}
                type="button"
                className={`tree-item ${activeTreeId === tree.id ? 'active' : ''}`}
                onClick={() => onOpenTree(tree.id)}
              >
                <span className="tree-name">{tree.name}</span>
              </button>
            ))
          )}
        </div>

        <button type="button" onClick={onStartTreeWizard} disabled={loading}>
          Créer un nouvel arbre
        </button>

        <div className="account-actions">
          <button type="button" className="ghost" onClick={onLogout} disabled={loading}>
            Déconnexion
          </button>
          <button type="button" className="ghost" onClick={onBackToAccess} disabled={loading}>
            Accès par mot de passe partagé
          </button>
          {onUseDemo && (
            <button type="button" className="ghost" onClick={onUseDemo} disabled={loading}>
              Essayer la démo
            </button>
          )}
        </div>

        {onDeleteAccount && (
          <div className="account-delete-zone">
            <button type="button" className="account-delete-link" onClick={openDeleteModal} disabled={loading}>
              Supprimer mon compte
            </button>
          </div>
        )}
      </div>

      {deleteModalOpen && (
        <div className="settings-delete-modal-overlay" onClick={closeDeleteModal}>
          <div
            className="settings-delete-modal account-delete-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="accountDeleteTitle"
            onClick={(event) => event.stopPropagation()}
          >
            <h3 id="accountDeleteTitle">Supprimer mon compte</h3>
            <p>Cette suppression est définitive, elle ne pourra pas être annulée.</p>
            <ul className="account-delete-list">
              <li>Votre compte et votre adresse email sont effacés.</li>
              <li>
                Les arbres que vous avez créés sont supprimés avec toutes leurs personnes et tous leurs médias,
                pour toute la famille qui y avait accès.
              </li>
              <li>Les arbres partagés avec vous restent à leurs propriétaires. Vous n'y aurez simplement plus accès.</li>
            </ul>

            <form className="account-delete-form" onSubmit={handleDeleteSubmit}>
              <label htmlFor="accountDeletePassword">Mot de passe actuel</label>
              <input
                id="accountDeletePassword"
                type="password"
                autoComplete="current-password"
                value={deletePassword}
                onChange={(event) => setDeletePassword(event.target.value)}
                disabled={deleting}
                autoFocus
                required
              />

              {deleteError && <div className="account-error">{deleteError}</div>}

              <div className="settings-delete-actions">
                <button type="button" className="ghost" onClick={closeDeleteModal} disabled={deleting}>
                  Annuler
                </button>
                <button type="submit" className="danger-action" disabled={deleting || !deletePassword}>
                  {deleting ? 'Suppression...' : 'Supprimer définitivement'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

export default AccountDashboard
