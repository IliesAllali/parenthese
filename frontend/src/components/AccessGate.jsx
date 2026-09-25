import { useEffect, useState } from 'react'
import logoUrl from '../assets/parenthese-logo.svg?url'
import './AccountScreens.css'
import PzBusy from './PzBusy.jsx'

const AccessGate = ({
  initialTreeId,
  treeName,
  treeDescription = '',
  treeOwnerName = '',
  treeNotFound = false,
  loading,
  errorMessage,
  onSubmit,
  onUseAccount,
}) => {
  const [treeId, setTreeId] = useState(initialTreeId || '')
  const [password, setPassword] = useState('')

  useEffect(() => {
    setTreeId(initialTreeId || '')
  }, [initialTreeId])

  const handleSubmit = async (event) => {
    event.preventDefault()
    if (!treeId || !password || loading) {
      return
    }

    await onSubmit(treeId.trim(), password)
  }

  // Jamais d'adresse email avant le mot de passe : seul un nom explicite peut s'afficher
  const ownerLabel = treeOwnerName || ''

  return (
    <div className="access-gate pz-screen">
      <div className="pz-screen-inner">
        <img src={logoUrl} alt="Parenthèse" className="pz-screen-logo" />

        <form className="pz-card pz-screen-card" onSubmit={handleSubmit}>
          <div className="pz-auth-head">
            <p className="pz-eyebrow">Arbre partagé</p>
            {treeNotFound ? (
              <h1 className="pz-title">Cet arbre est <em>introuvable</em></h1>
            ) : (
              <h1 className="pz-title">
                {treeName ? <>Ouvrir <em>{treeName}</em></> : <>Ouvrir un arbre <em>partagé</em></>}
              </h1>
            )}
            <p className="pz-sub">
              {treeNotFound
                ? "Le lien est peut-être incomplet, ou l'arbre a été supprimé. Demandez un nouveau lien à la personne qui vous l'a envoyé."
                : treeName
                  ? 'Entrez le mot de passe reçu avec le lien. Pas besoin de compte pour regarder.'
                  : "Entrez le code et le mot de passe reçus avec votre lien de partage."}
            </p>
          </div>

          {!treeNotFound && (ownerLabel || treeDescription) && (
            <div className="pz-gate-owner">
              {ownerLabel && (
                <span className="pz-gate-mono" aria-hidden="true">{ownerLabel.trim().charAt(0).toUpperCase()}</span>
              )}
              <div className="pz-gate-owner-text">
                {ownerLabel && <p className="access-gate-tree-meta pz-small">Partagé par <strong>{ownerLabel}</strong></p>}
                {treeDescription && <p className="pz-small">{treeDescription}</p>}
              </div>
            </div>
          )}

          {!treeNotFound && (
            <div className="pz-auth-form">
              {!initialTreeId && (
                <div className="pz-field">
                  <label htmlFor="treeId">Code de l'arbre</label>
                  <input
                    id="treeId"
                    type="text"
                    value={treeId}
                    onChange={(event) => setTreeId(event.target.value)}
                    disabled={loading}
                    placeholder="Il commence souvent par cm"
                    autoComplete="off"
                    required
                  />
                </div>
              )}

              <div className="pz-field">
                <label htmlFor="sharePassword">Mot de passe de partage</label>
                <input
                  id="sharePassword"
                  type="password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  disabled={loading}
                  autoFocus={Boolean(initialTreeId)}
                  required
                />
              </div>
            </div>
          )}

          {errorMessage && <div className="access-gate-error pz-error" role="alert">{errorMessage}</div>}

          {!treeNotFound && (
            <button type="submit" className="pz-btn pz-btn--primary pz-btn--block" disabled={loading}>
              <PzBusy busy={loading} busyLabel="Ouverture de l'arbre">Ouvrir l'arbre</PzBusy>
            </button>
          )}

          {treeNotFound && onUseAccount && (
            <button type="button" className="pz-btn pz-btn--primary pz-btn--block" onClick={() => onUseAccount('register')} disabled={loading}>
              Créer mon arbre
            </button>
          )}
        </form>

        {onUseAccount && !treeNotFound && (
          <div className="pz-account-foot">
            <button type="button" className="pz-btn pz-btn--ghost pz-btn--sm" onClick={() => onUseAccount('login')} disabled={loading}>
              Se connecter avec un compte
            </button>
            <button type="button" className="pz-btn pz-btn--ghost pz-btn--sm" onClick={() => onUseAccount('register')} disabled={loading}>
              Créer un compte
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

export default AccessGate
