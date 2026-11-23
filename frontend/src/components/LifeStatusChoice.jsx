import { t } from '../i18n/index.js'
import { deceasedLabel } from '../utils/lifeStatus.js'

// « En vie » et « Décédé(e) » côte à côte, celle qui vaut est marquée : le même contrôle que le sexe.
// Un groupe de boutons radio : Tab tombe sur l'option choisie (pas sur « En vie » quand « Décédé(e) » vaut),
// les flèches passent de l'une à l'autre.
export default function LifeStatusChoice({ deceased, sex, onChange, className = '', labelledBy }) {
  const options = [
    { value: false, label: t('En vie') },
    { value: true, label: deceasedLabel(sex) },
  ]
  const onKeyDown = (e) => {
    if (!['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(e.key)) return
    e.preventDefault()
    onChange(!deceased)
    const next = e.currentTarget.parentElement?.querySelector(`[data-value="${String(!deceased)}"]`)
    next?.focus()
  }
  return (
    <div className={`pz-tabs ${className}`.trim()} role="radiogroup" aria-labelledby={labelledBy}>
      {options.map(({ value, label }) => (
        <button
          key={String(value)}
          type="button"
          role="radio"
          data-value={String(value)}
          aria-checked={deceased === value}
          tabIndex={Boolean(deceased) === value ? 0 : -1}
          className={`pz-tab ${deceased === value ? 'is-active' : ''}`}
          onClick={() => onChange(value)}
          onKeyDown={onKeyDown}
        >
          {label}
        </button>
      ))}
    </div>
  )
}
