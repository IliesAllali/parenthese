import { t } from '../i18n/index.js'
import { PORTRAIT_SHAPES } from '../utils/portraitCrop.js'

const SHAPE_LABELS = { varied: t('Variées'), round: t('Rondes'), square: t('Carrées'), polaroid: t('Polaroïd') }

// Forme des portraits, réglage de l'arbre (Paramètres de l'arbre, Affichage). « Variées » garde une forme par
// personne ; les autres choix mettent toute la famille dans la même. Le choix fait en recadrant une photo reste.
const PortraitShapeField = ({ value = 'varied', disabled = false, onChange }) => (
  <div className="ts-portrait-shape">
    <span className="ts-choice-text">
      <strong id="settingsPortraitShapeLabel">{t('Forme des portraits')}</strong>
      <small>{t('Variées : ronde, rectangle ou polaroïd selon la personne et sa photo. Le choix vaut pour toute la famille ; une forme choisie en recadrant une photo reste la sienne.')}</small>
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
