import { t } from '../i18n/index.js'
import { PORTRAIT_SHAPES } from '../utils/portraitCrop.js'

// Accordés à « Portraits », le libellé du réglage
const SHAPE_LABELS = { varied: t('Variés'), round: t('Ronds'), square: t('Carrés'), polaroid: t('Polaroïd') }

// Forme des portraits, réglage de l'arbre (Paramètres de l'arbre, Affichage). « Variés » garde une forme par
// personne ; les autres choix mettent toute la famille dans la même. Le choix fait en recadrant une photo reste.
const PortraitShapeField = ({ value = 'varied', disabled = false, onChange }) => (
  <div className="ts-portrait-shape">
    <span className="ts-choice-text">
      <strong id="settingsPortraitShapeLabel">{t('Portraits')}</strong>
      <span className="pz-tabs ts-portrait-shapes" role="radiogroup" aria-labelledby="settingsPortraitShapeLabel">
        {PORTRAIT_SHAPES.map((shape) => (
          <button
            key={shape}
            type="button"
            role="radio"
            aria-checked={value === shape}
            className={`pz-tab ${value === shape ? 'is-active' : ''}`}
            onClick={() => { if (value !== shape) onChange?.(shape) }}
            disabled={disabled}
          >
            {SHAPE_LABELS[shape]}
          </button>
        ))}
      </span>
    </span>
  </div>
)

export default PortraitShapeField
