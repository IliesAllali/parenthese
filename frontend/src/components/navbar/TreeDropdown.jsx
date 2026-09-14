import { Trees } from 'lucide-react'
import './TreeDropdown.css'

/**
 * Dropdown de sélection d'arbres
 * Affiche la liste des arbres accessibles + option création
 *
 * @param {Object} props
 * @param {Array} props.trees - Liste des arbres [{id, name, role, thumb}]
 * @param {string} props.activeTreeId - ID de l'arbre actif
 * @param {Function} props.onSelect - Handler sélection arbre (treeId)
 * @param {Function} props.onCreate - Handler création nouvel arbre
 */
function TreeDropdown({ trees = [], activeTreeId, onSelect, onCreate }) {
  // Séparer arbres par type
  const myTrees = trees.filter(t => t.role === 'owner' || t.role === 'admin')
  const sharedTrees = trees.filter(t => t.role !== 'owner' && t.role !== 'admin')
  const mockTree = trees.find(t => t.isMockTree)

  return (
    <div className="tree-dropdown">
      {/* Mes arbres */}
      {myTrees.length > 0 && (
        <div className="tree-dropdown-section">
          <div className="tree-dropdown-section-title">Mes arbres</div>
          {myTrees.map(tree => (
            <button
              key={tree.id}
              type="button"
              className={`tree-dropdown-item ${tree.id === activeTreeId ? 'active' : ''}`}
              onClick={() => onSelect(tree.id)}
            >
              <div className="tree-dropdown-item-thumb">
                {tree.thumb ? (
                  <img src={tree.thumb} alt="" />
                ) : (
                  <span className="tree-dropdown-item-icon"><Trees size={18} strokeWidth={2} /></span>
                )}
              </div>
              <div className="tree-dropdown-item-info">
                <div className="tree-dropdown-item-name">{tree.name}</div>
                <div className="tree-dropdown-item-role">
                  {tree.role === 'owner' ? 'Propriétaire' : 'Admin'}
                </div>
              </div>
            </button>
          ))}
        </div>
      )}

      {/* Arbres partagés */}
      {sharedTrees.length > 0 && (
        <div className="tree-dropdown-section">
          <div className="tree-dropdown-section-title">Arbres partagés</div>
          {sharedTrees.map(tree => (
            <button
              key={tree.id}
              type="button"
              className={`tree-dropdown-item ${tree.id === activeTreeId ? 'active' : ''}`}
              onClick={() => onSelect(tree.id)}
            >
              <div className="tree-dropdown-item-thumb">
                {tree.thumb ? (
                  <img src={tree.thumb} alt="" />
                ) : (
                  <span className="tree-dropdown-item-icon"><Trees size={18} strokeWidth={2} /></span>
                )}
              </div>
              <div className="tree-dropdown-item-info">
                <div className="tree-dropdown-item-name">{tree.name}</div>
                <div className="tree-dropdown-item-role">
                  {tree.role === 'contributor' ? 'Contributeur' : 'Visiteur'}
                </div>
              </div>
            </button>
          ))}
        </div>
      )}

      {/* Arbre mock */}
      {mockTree && (
        <div className="tree-dropdown-section">
          <div className="tree-dropdown-section-title">Exemple</div>
          <button
            type="button"
            className={`tree-dropdown-item ${mockTree.id === activeTreeId ? 'active' : ''}`}
            onClick={() => onSelect(mockTree.id)}
          >
            <div className="tree-dropdown-item-thumb">
              <span className="tree-dropdown-item-icon">✨</span>
            </div>
            <div className="tree-dropdown-item-info">
              <div className="tree-dropdown-item-name">{mockTree.name}</div>
              <div className="tree-dropdown-item-role">Arbre exemple</div>
            </div>
          </button>
        </div>
      )}

      {/* Actions */}
      <div className="tree-dropdown-actions">
        <button
          type="button"
          className="tree-dropdown-create"
          onClick={onCreate}
        >
          <span className="tree-dropdown-create-icon">+</span>
          <span>Créer un nouvel arbre</span>
        </button>
      </div>
    </div>
  )
}

export default TreeDropdown
