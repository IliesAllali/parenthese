import './TextOptions.css'

const COLORS = [
  '#93402A', '#2A2622', '#C0392B', '#2980B9',
  '#27AE60', '#F39C12', '#8E44AD', '#2C3E50',
]

const FONT_SIZES = [
  { value: 14, label: 'Petit' },
  { value: 18, label: 'Normal' },
  { value: 24, label: 'Grand' },
  { value: 32, label: 'Très grand' },
]

export default function TextOptions({ currentStyle, onStyleChange }) {
  return (
    <div className="text-options">
      <div className="text-options__section">
        <span className="text-options__label">Couleur</span>
        <div className="text-options__colors">
          {COLORS.map((color) => (
            <button
              key={color}
              className={`text-options__color-btn${currentStyle.color === color ? ' text-options__color-btn--active' : ''}`}
              style={{ background: color }}
              onClick={() => onStyleChange({ ...currentStyle, color })}
              title={color}
            />
          ))}
        </div>
      </div>

      <div className="text-options__section">
        <span className="text-options__label">Taille</span>
        <div className="text-options__sizes">
          {FONT_SIZES.map((fs) => (
            <button
              key={fs.value}
              className={`text-options__size-btn${currentStyle.fontSize === fs.value ? ' text-options__size-btn--active' : ''}`}
              onClick={() => onStyleChange({ ...currentStyle, fontSize: fs.value })}
            >
              {fs.value}
            </button>
          ))}
        </div>
      </div>

      <div className="text-options__section">
        <label className="text-options__toggle">
          <input
            type="checkbox"
            checked={currentStyle.stabilo || false}
            onChange={(e) => onStyleChange({ ...currentStyle, stabilo: e.target.checked })}
          />
          <span className="text-options__toggle-track">
            <span className="text-options__toggle-thumb" />
          </span>
          <span className="text-options__toggle-label">Stabilo</span>
        </label>
      </div>
    </div>
  )
}
