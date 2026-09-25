import { PAREN_LEFT, PAREN_RIGHT } from './pzMarkPaths.js'

/**
 * Symbole du logo, le rond entre parenthèses.
 * state : 'rest' (le rond), 'loading' (trois points qui respirent),
 * 'merging' (les points se rejoignent, léger rebond). Styles dans index.css.
 */
export default function PzMark({ state = 'rest', className = '' }) {
  return (
    <svg
      className={`pz-mark is-${state}${className ? ` ${className}` : ''}`}
      viewBox="-951.9 -1596.5 1903.7 1704.9"
      aria-hidden="true"
      focusable="false"
    >
      <g className="pz-mark-par" transform="scale(1,-1)">
        <path d={PAREN_LEFT} />
        <path d={PAREN_RIGHT} />
      </g>
      {[0, 1, 2].map((i) => (
        <g key={i} className={`pz-mark-p pz-mark-p${i}`}>
          <g className="pz-mark-s">
            <circle className="pz-mark-c" cx="0" cy="-744" r="424.3" />
          </g>
        </g>
      ))}
    </svg>
  )
}
