import './NavButton.css'

/**
 * Bouton de navigation contextuel
 * Style glassmorphism
 *
 * @param {Object} props
 * @param {string} props.icon - Emoji ou texte de l'icône
 * @param {string} props.label - Label au hover (tooltip)
 * @param {Function} props.onClick - Handler du clic
 * @param {boolean} props.active - État actif (pour toggle)
 * @param {boolean} props.disabled - État désactivé
 * @param {number} props.badge - Nombre à afficher dans le badge (optionnel)
 * @param {string} props.badgeColor - Couleur du badge ('orange' | 'gray')
 */
function NavButton({
  icon,
  label,
  onClick,
  active = false,
  disabled = false,
  badge = null,
  badgeColor = 'orange',
}) {
  return (
    <button
      type="button"
      className={`nav-button ${active ? 'active' : ''} ${disabled ? 'disabled' : ''}`}
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      title={label}
    >
      <span className="nav-button-icon">{icon}</span>
      {badge !== null && badge > 0 && (
        <span className={`nav-button-badge ${badgeColor}`}>
          {badge > 99 ? '99+' : badge}
        </span>
      )}
    </button>
  )
}

export default NavButton
