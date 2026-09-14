import { Trash2 } from 'lucide-react'
import './DropTrashZone.css'

export default function DropTrashZone({ visible, isOver }) {
  if (!visible) return null

  return (
    <div className={`drop-trash-zone${isOver ? ' drop-trash-zone--over' : ''}`}>
      <div className="drop-trash-zone__circle">
        <Trash2
          size={isOver ? 28 : 22}
          strokeWidth={2}
          className="drop-trash-zone__icon"
        />
      </div>
      <span className="drop-trash-zone__label">
        {isOver ? 'Relâcher pour supprimer' : 'Glisser ici pour supprimer'}
      </span>
    </div>
  )
}
