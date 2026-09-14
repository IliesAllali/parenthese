import { useRef, useEffect, useState } from 'react'
import { Plus, Baby, Heart, Users, MapPin } from 'lucide-react'
import './AddPersonButton.css'

/**
 * Bouton FAB draggable pour ajouter une personne
 * Utilisé en mode édition pour drag-and-drop dans la galaxie
 *
 * @param {Object} props
 * @param {boolean} props.isDragging - État dragging (du hook)
 * @param {Object} props.dragPosition - Position drag {x, y}
 * @param {Function} props.onDragStart - Handler début drag
 * @param {string} props.linkType - Type de lien détecté ('child', 'spouse', 'sibling')
 */
function AddPersonButton({ isDragging, dragPosition, onDragStart, linkType }) {
  const buttonRef = useRef(null)
  const [entering, setEntering] = useState(true)

  // Animation d'entrée
  useEffect(() => {
    const timer = setTimeout(() => setEntering(false), 500)
    return () => clearTimeout(timer)
  }, [])

  const handleMouseDown = (e) => {
    e.preventDefault()
    if (!buttonRef.current) return

    const rect = buttonRef.current.getBoundingClientRect()
    const buttonPosition = {
      x: rect.left + rect.width / 2,
      y: rect.top + rect.height / 2,
    }

    onDragStart?.(e, buttonPosition)
  }

  // Position inline si dragging
  const style = isDragging
    ? {
        left: `${dragPosition.x - 32}px`,
        top: `${dragPosition.y - 32}px`,
        transition: 'none',
      }
    : {}

  // Message tooltip selon linkType
  let tooltipText = 'Glisser pour ajouter une personne'
  if (isDragging) {
    if (linkType === 'child') tooltipText = 'Ajouter un enfant'
    else if (linkType === 'spouse') tooltipText = 'Ajouter un conjoint'
    else if (linkType === 'sibling') tooltipText = 'Ajouter un frère/sœur'
    else tooltipText = 'Relâcher pour créer'
  }

  return (
    <>
      <button
        ref={buttonRef}
        type="button"
        className={`add-person-button ${isDragging ? 'dragging' : ''} ${entering ? 'entering' : ''}`}
        style={style}
        onMouseDown={handleMouseDown}
        aria-label="Ajouter une personne"
      >
        <span className="add-person-button-icon"><Plus size={28} strokeWidth={1.5} /></span>
        <span className="add-person-button-tooltip">{tooltipText}</span>
      </button>

      {/* Hint pendant drag */}
      {isDragging && (
        <div className="add-person-drag-hint">
          {linkType === 'child' && <><Baby size={16} strokeWidth={2} /> Enfant</>}
          {linkType === 'spouse' && <><Heart size={16} strokeWidth={2} /> Conjoint</>}
          {linkType === 'sibling' && <><Users size={16} strokeWidth={2} /> Frère·Sœur</>}
          {!linkType && <><MapPin size={16} strokeWidth={2} /> Positionnez la personne</>}
        </div>
      )}
    </>
  )
}

export default AddPersonButton
