import { useEffect, useState } from 'react'

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
    <div className="access-gate">
      <div className="access-gate-mock-blur" aria-hidden="true">
        <div className="access-gate-mock-card access-gate-mock-card-main" />
        <div className="access-gate-mock-card access-gate-mock-card-side" />
        <div className="access-gate-mock-dot" />
      </div>

      <form className="access-gate-card" onSubmit={handleSubmit}>
        <h1>Accès à votre arbre</h1>
        {treeNotFound ? (
          <p>Cet arbre n'existe pas ou n'est plus disponible.</p>
        ) : (
          <p>
            {treeName
              ? `Entrez le mot de passe partagé pour ouvrir "${treeName}".`
              : "Entrez les informations reçues avec votre lien de partage pour ouvrir l'arbre familial."}
          </p>
        )}

        {!treeNotFound && (treeName || treeDescription || ownerLabel) && (
          <div className="access-gate-tree-info">
            {treeName && <div className="access-gate-tree-name">{treeName}</div>}
            {ownerLabel && <div className="access-gate-tree-meta">Partagé par : {ownerLabel}</div>}
            {treeDescription && <div className="access-gate-tree-desc">{treeDescription}</div>}
          </div>
        )}

        {!treeNotFound && (
          <>
            <label htmlFor="treeId">Code de l'arbre partagé</label>
            <input
              id="treeId"
              type="text"
              value={treeId}
              onChange={(event) => setTreeId(event.target.value)}
              disabled={Boolean(initialTreeId) || loading}
              placeholder="Ex: cm..."
              required
            />

            <label htmlFor="sharePassword">Mot de passe de partage</label>
            <input
              id="sharePassword"
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              disabled={loading}
              placeholder="********"
              required
            />
          </>
        )}

        {errorMessage && <div className="access-gate-error">{errorMessage}</div>}

        {!treeNotFound && (
          <button type="submit" disabled={loading}>
            {loading ? 'Connexion...' : "Ouvrir l'arbre"}
          </button>
        )}

        {treeNotFound && onUseAccount && (
          <button type="button" className="ghost" onClick={() => onUseAccount('register')} disabled={loading}>
            Créer mon arbre
          </button>
        )}

        {onUseAccount && !treeNotFound && (
          <>
            <button type="button" className="ghost" onClick={() => onUseAccount('login')} disabled={loading}>
              Se connecter avec un compte
            </button>
            <button type="button" className="ghost" onClick={() => onUseAccount('register')} disabled={loading}>
              Créer un compte
            </button>
          </>
        )}
      </form>
    </div>
  )
}

export default AccessGate
