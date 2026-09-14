import { useState, useRef, useCallback, useEffect } from 'react'

/**
 * Seuils de proximité pour détection de liens
 */
const PROXIMITY_THRESHOLDS = {
  CHILD: 150, // Pixels en dessous pour détecter lien enfant
  SPOUSE: 120, // Pixels côte-à-côte pour détecter lien conjoint
  SIBLING: 100, // Pixels même niveau pour détecter lien frère/sœur
}

/**
 * Détecte le type de lien selon position relative
 * @param {Object} dragPos - Position drag {x, y}
 * @param {Object} personPos - Position personne proche {x, y}
 * @param {number} distance - Distance euclidienne
 * @returns {string|null} Type de lien ('child', 'spouse', 'sibling') ou null
 */
function detectLinkType(dragPos, personPos, distance) {
  const dx = dragPos.x - personPos.x
  const dy = dragPos.y - personPos.y

  // Angle pour déterminer direction

  // ENFANT : en dessous (angle ~90°, dy > 0)
  if (dy > 50 && Math.abs(dx) < PROXIMITY_THRESHOLDS.CHILD && distance < PROXIMITY_THRESHOLDS.CHILD) {
    return 'child'
  }

  // CONJOINT : à côté (angle ~0° ou ~180°, dy faible)
  if (Math.abs(dy) < 60 && Math.abs(dx) < PROXIMITY_THRESHOLDS.SPOUSE && distance < PROXIMITY_THRESHOLDS.SPOUSE) {
    return 'spouse'
  }

  // FRÈRE/SŒUR : même niveau vertical (dy faible mais dx moyen)
  if (Math.abs(dy) < 80 && Math.abs(dx) < PROXIMITY_THRESHOLDS.SIBLING + 50 && distance < PROXIMITY_THRESHOLDS.SIBLING + 50) {
    return 'sibling'
  }

  return null
}

/**
 * Hook pour gérer le drag-and-drop d'ajout de personne
 * Détecte automatiquement la proximité avec personnes existantes
 *
 * @param {Object} options
 * @param {Function} options.getPersonPositions - Fonction qui retourne [{id, x, y, person}]
 * @param {Function} options.onDrop - Callback au drop (dragPos, closestPerson, linkType)
 * @returns {Object} API du drag
 */
export function useAddPersonDrag({ getPersonPositions, onDrop }) {
  const [isDragging, setIsDragging] = useState(false)
  const [dragPosition, setDragPosition] = useState({ x: 0, y: 0 })
  const [closestPerson, setClosestPerson] = useState(null)
  const [linkType, setLinkType] = useState(null)

  const dragStartPos = useRef({ x: 0, y: 0 })
  const buttonStartPos = useRef({ x: 0, y: 0 })

  /**
   * Démarre le drag
   */
  const handleDragStart = useCallback((event, buttonPosition) => {
    setIsDragging(true)
    dragStartPos.current = {
      x: event.clientX,
      y: event.clientY,
    }
    buttonStartPos.current = buttonPosition
    setDragPosition(buttonPosition)
  }, [])

  /**
   * Update position pendant le drag + détection proximité
   */
  const handleDragMove = useCallback((event) => {
    if (!isDragging) return

    const dx = event.clientX - dragStartPos.current.x
    const dy = event.clientY - dragStartPos.current.y

    const newPos = {
      x: buttonStartPos.current.x + dx,
      y: buttonStartPos.current.y + dy,
    }

    setDragPosition(newPos)

    // Détection proximité
    const personPositions = getPersonPositions?.() || []
    if (personPositions.length === 0) {
      setClosestPerson(null)
      setLinkType(null)
      return
    }

    // Trouver la personne la plus proche
    let minDistance = Infinity
    let closest = null

    for (const personPos of personPositions) {
      const dx = newPos.x - personPos.x
      const dy = newPos.y - personPos.y
      const distance = Math.sqrt(dx * dx + dy * dy)

      if (distance < minDistance) {
        minDistance = distance
        closest = personPos
      }
    }

    // Si une personne proche trouvée, déterminer le type de lien
    if (closest && minDistance < 200) {
      const detectedLinkType = detectLinkType(newPos, closest, minDistance)
      setClosestPerson(closest)
      setLinkType(detectedLinkType)
    } else {
      setClosestPerson(null)
      setLinkType(null)
    }
  }, [isDragging, getPersonPositions])

  /**
   * Termine le drag
   */
  const handleDragEnd = useCallback(() => {
    if (!isDragging) return

    setIsDragging(false)

    // Callback avec infos drop
    onDrop?.({
      position: dragPosition,
      closestPerson,
      linkType,
    })

    // Reset
    setClosestPerson(null)
    setLinkType(null)
  }, [isDragging, dragPosition, closestPerson, linkType, onDrop])

  /**
   * Cancel drag (ESC)
   */
  const handleDragCancel = useCallback(() => {
    setIsDragging(false)
    setClosestPerson(null)
    setLinkType(null)
    setDragPosition({ x: 0, y: 0 })
  }, [])

  // Listeners globaux pour drag
  useEffect(() => {
    if (!isDragging) return

    const handleMouseMove = (e) => handleDragMove(e)
    const handleMouseUp = () => handleDragEnd()
    const handleEscape = (e) => {
      if (e.key === 'Escape') handleDragCancel()
    }

    document.addEventListener('mousemove', handleMouseMove)
    document.addEventListener('mouseup', handleMouseUp)
    document.addEventListener('keydown', handleEscape)

    return () => {
      document.removeEventListener('mousemove', handleMouseMove)
      document.removeEventListener('mouseup', handleMouseUp)
      document.removeEventListener('keydown', handleEscape)
    }
  }, [isDragging, handleDragMove, handleDragEnd, handleDragCancel])

  return {
    isDragging,
    dragPosition,
    closestPerson,
    linkType,
    handleDragStart,
    handleDragCancel,
  }
}
