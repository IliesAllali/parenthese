import { Check, ChevronRight, LogOut, Plus, Settings } from 'lucide-react'
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

  const displayName = linkedPersonName || userDisplayName || 'Mon compte'

  return (
    <div className="avatar-menu account-menu pz-menu" role="menu">
      <button type="button" className="am-head" onClick={onAccountClick} role="menuitem">
        <span className="am-head-mono" aria-hidden="true">{displayName.trim().charAt(0).toUpperCase()}</span>
        <span className="am-head-text">
          <strong>{displayName}</strong>
          <span>{userEmail || 'Mon compte'}</span>
        </span>
        <ChevronRight size={16} aria-hidden="true" className="am-head-chevron" />
      </button>

      <div className="pz-menu-sep" />
      <p className="pz-menu-label">{hasSeveralTrees ? 'Vos arbres' : 'Arbre ouvert'}</p>

      {hasSeveralTrees ? (
        trees.map((tree) => {
          const isActive = String(tree.id) === String(activeTreeId)
          return (
            <button
              key={tree.id}
              type="button"
              role="menuitem"
              className={`pz-menu-item ${isActive ? 'is-active' : ''}`}
              onClick={() => onSelectTree?.(tree.id)}
            >
              <span className="am-tree-mono" aria-hidden="true">{(tree.name || '?').trim().charAt(0).toUpperCase()}</span>
              <span className="am-tree-name">{tree.name}</span>
              {isActive && <Check size={16} aria-hidden="true" className="am-check" />}
            </button>
          )
        })
      ) : (
        <div className="pz-menu-item am-single" aria-current="true">
          <span className="am-tree-mono" aria-hidden="true">{currentTreeName.trim().charAt(0).toUpperCase()}</span>
          <span className="am-tree-name">{currentTreeName}</span>
        </div>
      )}

      <button type="button" role="menuitem" className="pz-menu-item" onClick={onCreateTree}>
        <Plus size={16} aria-hidden="true" />
        <span>Créer un nouvel arbre</span>
      </button>

      <div className="pz-menu-sep" />

      <button type="button" role="menuitem" className="pz-menu-item" onClick={onSettings}>
        <Settings size={16} aria-hidden="true" />
        <span>Paramètres de l'arbre</span>
      </button>

      <button type="button" role="menuitem" className="pz-menu-item pz-menu-item--danger" onClick={onLogout}>
        <LogOut size={16} aria-hidden="true" />
        <span>Déconnexion</span>
      </button>
    </div>
  )
}

export default AvatarMenu
