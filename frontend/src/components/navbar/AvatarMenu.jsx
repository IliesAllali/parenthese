import { LogOut, Plus, Settings } from 'lucide-react'
import './AvatarMenu.css'

function AvatarMenu({
  userDisplayName,
  userEmail,
  linkedPersonName = '',
  trees = [],
  activeTreeId,
  activeTreeName = '',
  onAccountClick,
  onSelectTree,
  onCreateTree,
  onSettings,
  onLogout,
}) {
  const hasSeveralTrees = trees.length > 1
  const currentTreeName = (
    trees.find((entry) => String(entry.id) === String(activeTreeId))?.name
    || activeTreeName
    || trees[0]?.name
    || 'Aucun arbre'
  )

  return (
    <div className="avatar-menu account-menu">
      <button type="button" className="account-menu-header account-menu-header--action" onClick={onAccountClick}>
        <strong>{linkedPersonName || userDisplayName || 'Compte'}</strong>
        <span>{userEmail || 'Ouvrir les options du compte'}</span>
      </button>

      <div className="account-menu-trees">
        {hasSeveralTrees ? (
          trees.map((tree) => (
            <button
              key={tree.id}
              type="button"
              className={`avatar-menu-item tree-choice ${String(tree.id) === String(activeTreeId) ? 'active' : ''}`}
              onClick={() => onSelectTree?.(tree.id)}
            >
              <span className="tree-choice-dot" aria-hidden="true" />
              <span className="tree-choice-name">{tree.name}</span>
              <span className="tree-choice-arrow" aria-hidden="true">{'>'}</span>
            </button>
          ))
        ) : (
          <div className="account-menu-single-tree">
            <span className="tree-choice-dot" aria-hidden="true" />
            <span>{currentTreeName}</span>
          </div>
        )}

        <button
          type="button"
          className="avatar-menu-item tree-create"
          onClick={onCreateTree}
        >
          <span className="avatar-menu-icon"><Plus size={16} /></span>
          <span>Créer un nouvel arbre</span>
        </button>
      </div>

      <div className="avatar-menu-separator" />

      <button type="button" className="avatar-menu-item" onClick={onSettings}>
        <span className="avatar-menu-icon"><Settings size={16} /></span>
        <span>Paramètres de l'arbre</span>
      </button>

      <button type="button" className="avatar-menu-item danger" onClick={onLogout}>
        <span className="avatar-menu-icon"><LogOut size={16} /></span>
        <span>Déconnexion</span>
      </button>
    </div>
  )
}

export default AvatarMenu
