import { useRef, useEffect } from 'react'
import './TextInputOverlay.css'

export default function TextInputOverlay({
  textInputState,
  currentStyle,
  onCommit,
  onCancel,
}) {
  const inputRef = useRef(null)

  useEffect(() => {
    if (textInputState && inputRef.current) {
      inputRef.current.focus()
    }
  }, [textInputState])

  if (!textInputState) return null

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      const text = inputRef.current?.value.trim()
      if (text) onCommit(text)
      else onCancel()
    }
    if (e.key === 'Escape') {
      e.preventDefault()
      onCancel()
    }
  }

  const handleBlur = () => {
    const text = inputRef.current?.value.trim()
    if (text) onCommit(text)
    else onCancel()
  }

  return (
    <div
      className="text-input-overlay"
      style={{
        left: textInputState.screenX,
        top: textInputState.screenY,
      }}
    >
      <input
        ref={inputRef}
        className="text-input-overlay__input"
        type="text"
        placeholder="Saisir du texte..."
        style={{
          color: currentStyle.color,
          fontSize: currentStyle.fontSize,
          background: currentStyle.stabilo
            ? 'rgba(237, 182, 164, 0.5)'
            : 'rgba(255, 255, 255, 0.85)',
        }}
        onKeyDown={handleKeyDown}
        onBlur={handleBlur}
      />
    </div>
  )
}
