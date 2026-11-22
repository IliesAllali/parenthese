import { t } from '../i18n/index.js'
import { deceasedLabel } from '../utils/lifeStatus.js'

// « En vie » et « Décédé(e) » côte à côte, celle qui vaut est marquée : le même contrôle que le sexe
export default function LifeStatusChoice({ deceased, sex, onChange, className = '', labelledBy }) {
  const options = [
    { value: false, label: t('En vie') },
    { value: true, label: deceasedLabel(sex) },
  ]
  return (
    <div className={`pz-tabs ${className}`.trim()} role="radiogroup" aria-labelledby={labelledBy}>
      {options.map(({ value, label }) => (
        <button
          key={String(value)}
          type="button"
          role="radio"
          aria-checked={deceased === value}
          className={`pz-tab ${deceased === value ? 'is-active' : ''}`}
          onClick={() => onChange(value)}
        >
          {label}
        </button>
      ))}
    </div>
  )
}
