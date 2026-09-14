import { useEffect, useRef, useState } from 'react'
import { MousePointer2, Pencil, Type, Star, Trash2, Image } from 'lucide-react'
import DrawingOptions from './DrawingOptions'
import TextOptions from './TextOptions'
import StickerPicker from './StickerPicker'
import SizeOptions from './SizeOptions'
import './AnnotationToolbar.css'

const TOOLS = [
  { id: 'pointer', label: 'Sélection', Icon: MousePointer2 },
  { id: 'drawing', label: 'Dessin', Icon: Pencil },
  { id: 'text', label: 'Texte', Icon: Type },
  { id: 'sticker', label: 'Sticker', Icon: Star },
  { id: 'photo', label: 'Photo', Icon: Image },
]

const RESIZABLE_TYPES = ['sticker', 'text', 'photo']

function getSizeConfig(annotationType) {
  if (annotationType === 'sticker') return { min: 20, max: 120, label: 'Taille' }
  if (annotationType === 'text')    return { min: 10, max: 60,  label: 'Taille' }
  if (annotationType === 'photo')   return { min: 50, max: 500, label: 'Taille' }
  return null
}

export default function AnnotationToolbar({
  activeTool,
  onToolChange,
  currentStyle,
  onStyleChange,
  selectedAnnotationId,
  selectedAnnotation,
  selectedSticker,
  onStickerSelect,
  onDelete,
  onResizeSelected,
  onPhotoFileSelected,
  isDragging,
  isOverTrash,
}) {
  const [expandedPanel, setExpandedPanel] = useState(null)
  const photoInputRef = useRef(null)

  const handleToolClick = (toolId) => {
    onToolChange(toolId)
    if (toolId === 'drawing' || toolId === 'text' || toolId === 'sticker') {
      setExpandedPanel(toolId)
    } else if (toolId === 'photo') {
      setExpandedPanel(null)
      // Open file picker immediately when photo tool is activated
      photoInputRef.current?.click()
    } else {
      setExpandedPanel(null)
    }
  }

  // Auto-show resize panel when a resizable annotation is selected in pointer mode
  useEffect(() => {
    if (
      activeTool === 'pointer' &&
      selectedAnnotation &&
      RESIZABLE_TYPES.includes(selectedAnnotation.type)
    ) {
      setExpandedPanel('resize')
    } else if (expandedPanel === 'resize') {
      setExpandedPanel(null)
    }
  }, [activeTool, selectedAnnotation?.id, selectedAnnotation?.type]) // eslint-disable-line react-hooks/exhaustive-deps

  const sizeConfig = getSizeConfig(selectedAnnotation?.type)
  const sizeValue = selectedAnnotation?.type === 'photo'
    ? (selectedAnnotation?.style?.size || 150)
    : (selectedAnnotation?.style?.fontSize || currentStyle.fontSize)

  return (
    <div className={`annotation-toolbar${isDragging ? ' annotation-toolbar--dragging' : ''}`}>
      {/* Hidden file input for photo tool */}
      <input
        ref={photoInputRef}
        type="file"
        accept="image/*"
        style={{ display: 'none' }}
        onChange={(e) => {
          const file = e.target.files?.[0]
          if (file && onPhotoFileSelected) onPhotoFileSelected(file)
          e.target.value = ''
        }}
      />

      <div className="annotation-toolbar__tools">
        {TOOLS.map((tool) => (
          <button
            key={tool.id}
            className={`annotation-toolbar__btn${activeTool === tool.id ? ' annotation-toolbar__btn--active' : ''}`}
            onClick={() => handleToolClick(tool.id)}
            title={tool.label}
          >
            <tool.Icon size={20} strokeWidth={2} />
          </button>
        ))}

        <div className="annotation-toolbar__separator" />

        <button
          className={`annotation-toolbar__btn annotation-toolbar__btn--delete${isDragging ? ' annotation-toolbar__btn--drag-target' : ''}${isOverTrash ? ' annotation-toolbar__btn--drag-over' : ''}`}
          onClick={onDelete}
          disabled={!selectedAnnotationId && !isDragging}
          title="Supprimer"
          data-annotation-trash=""
        >
          <Trash2 size={isOverTrash ? 24 : 20} strokeWidth={2} />
        </button>
      </div>

      {expandedPanel === 'drawing' && activeTool === 'drawing' && (
        <div className="annotation-toolbar__panel">
          <DrawingOptions
            currentStyle={currentStyle}
            onStyleChange={onStyleChange}
          />
        </div>
      )}

      {expandedPanel === 'text' && activeTool === 'text' && (
        <div className="annotation-toolbar__panel">
          <TextOptions
            currentStyle={currentStyle}
            onStyleChange={onStyleChange}
          />
        </div>
      )}

      {expandedPanel === 'sticker' && activeTool === 'sticker' && (
        <div className="annotation-toolbar__panel">
          <StickerPicker
            selected={selectedSticker}
            onSelect={onStickerSelect}
          />
        </div>
      )}

      {expandedPanel === 'resize' && sizeConfig && selectedAnnotation && (
        <div className="annotation-toolbar__panel">
          <SizeOptions
            label={sizeConfig.label}
            min={sizeConfig.min}
            max={sizeConfig.max}
            value={sizeValue}
            onChange={onResizeSelected}
          />
        </div>
      )}
    </div>
  )
}
