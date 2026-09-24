import './DrawingOptions.css'

const COLORS = [
  '#93402A', '#2A2622', '#C0392B', '#2980B9',
  '#27AE60', '#F39C12', '#8E44AD', '#2C3E50',
]

const BRUSH_WIDTHS = [
  { value: 2, label: 'Fin' },
  { value: 5, label: 'Moyen' },
  { value: 10, label: 'Epais' },
]

export default function DrawingOptions({ currentStyle, onStyleChange }) {
  return (
    <div className="drawing-options">
      <div className="drawing-options__section">
        <span className="drawing-options__label">Couleur</span>
        <div className="drawing-options__colors">
          {COLORS.map((color) => (
            <button
              key={color}
              className={`drawing-options__color-btn${currentStyle.color === color ? ' drawing-options__color-btn--active' : ''}`}
              style={{ background: color }}
              onClick={() => onStyleChange({ ...currentStyle, color })}
              title={color}
            />
          ))}
        </div>
      </div>

      <div className="drawing-options__section">
        <span className="drawing-options__label">Epaisseur</span>
        <div className="drawing-options__widths">
          {BRUSH_WIDTHS.map((bw) => (
            <button
              key={bw.value}
              className={`drawing-options__width-btn${currentStyle.brushWidth === bw.value ? ' drawing-options__width-btn--active' : ''}`}
              onClick={() => onStyleChange({ ...currentStyle, brushWidth: bw.value })}
              title={bw.label}
            >
              <span
                className="drawing-options__width-preview"
                style={{ height: bw.value, background: currentStyle.color }}
              />
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
