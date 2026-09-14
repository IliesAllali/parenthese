import './ProximityFeedback.css'

/**
 * Feedback visuel de proximité pendant le drag
 * Affiche ligne pointillée + glow sur personne proche + badge type lien
 *
 * @param {Object} props
 * @param {boolean} props.visible - Afficher le feedback
 * @param {Object} props.dragPosition - Position drag {x, y}
 * @param {Object} props.closestPerson - Personne proche {id, x, y, person}
 * @param {string} props.linkType - Type de lien ('child', 'spouse', 'sibling')
 */
function ProximityFeedback({ visible, dragPosition, closestPerson, linkType }) {
  if (!visible || !closestPerson || !linkType) return null

  const { x: personX, y: personY } = closestPerson
  const { x: dragX, y: dragY } = dragPosition

  // Position badge au milieu de la ligne
  const badgeX = (dragX + personX) / 2
  const badgeY = (dragY + personY) / 2

  // Labels
  const linkLabels = {
    child: 'Enfant',
    spouse: 'Conjoint',
    sibling: 'Frère·Sœur',
  }

  return (
    <>
      {/* Ligne pointillée */}
      <div className="proximity-line">
        <svg className="proximity-line-svg">
          <line
            x1={dragX}
            y1={dragY}
            x2={personX}
            y2={personY}
            className={`proximity-line-path ${linkType}`}
          />
        </svg>
      </div>

      {/* Badge type lien */}
      <div
        className={`proximity-badge ${linkType}`}
        style={{
          left: `${badgeX}px`,
          top: `${badgeY}px`,
          transform: 'translate(-50%, -50%)',
        }}
      >
        {linkLabels[linkType] || 'Lien'}
      </div>

      {/* Glow sur personne proche */}
      <div
        className="proximity-highlight"
        style={{
          left: `${personX - 50}px`,
          top: `${personY - 50}px`,
        }}
      >
        <div className={`proximity-highlight-glow ${linkType}`} />
      </div>
    </>
  )
}

export default ProximityFeedback
