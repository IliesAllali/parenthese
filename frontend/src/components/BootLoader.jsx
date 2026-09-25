import { useEffect, useRef, useState } from 'react'
import { useBooting } from '../bootSignal.js'
import PzMark from './PzMark.jsx'

// N'apparaît que si l'attente dépasse SHOW_AFTER, reste au moins MIN_VISIBLE pour ne pas
// clignoter, puis les points se rejoignent et l'écran s'efface sur ce qui est prêt dessous.
const SHOW_AFTER = 400
const MIN_VISIBLE = 900
const MERGE = 420
const FADE = 200

export default function BootLoader() {
  const booting = useBooting()
  const [phase, setPhase] = useState('hidden') // hidden | rest | loading | merging | out
  const shownAt = useRef(0)

  useEffect(() => {
    const timers = []
    const later = (fn, ms) => timers.push(setTimeout(fn, ms))

    if (booting) {
      later(() => {
        shownAt.current = performance.now()
        setPhase('rest')
        // une image au repos d'abord, pour que la division en trois points se voie
        requestAnimationFrame(() => requestAnimationFrame(() => setPhase('loading')))
      }, SHOW_AFTER)
    } else if (shownAt.current) {
      const wait = Math.max(0, MIN_VISIBLE - (performance.now() - shownAt.current))
      later(() => setPhase('merging'), wait)
      later(() => setPhase('out'), wait + MERGE)
      later(() => {
        setPhase('hidden')
        shownAt.current = 0
      }, wait + MERGE + FADE)
    }
    return () => timers.forEach(clearTimeout)
  }, [booting])

  if (phase === 'hidden') return null

  const markState = phase === 'out' ? 'merging' : phase
  return (
    <div className={`pz-boot${phase === 'out' ? ' is-out' : ''}`} role="status">
      <PzMark state={markState} />
      <span className="pz-sr">{booting ? "Ouverture de l'arbre" : 'Arbre prêt'}</span>
    </div>
  )
}
