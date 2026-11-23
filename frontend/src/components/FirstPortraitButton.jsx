import { useEffect, useRef } from 'react'
import { t } from '../i18n/index.js'
import { COLORS, INIT_MAX_SCALE, NODE_LABEL_LINE, NODE_LABEL_Y, PERSON_W } from './galaxy/constants'
import { drawFirstPortrait, FIRST_PORTRAIT_HALF } from './galaxy/renderers'
import './FirstPortraitButton.css'

// Arbre vide (Patch, 23/11, variation 2 de la planche) : le premier portrait, là où la première personne
// apparaîtra (centre du canevas) et à sa taille au zoom d'arrivée (INIT_MAX_SCALE). Le portrait et sa pastille
// sont dessinés par le code du canevas ; le prénom et la ligne en dessous sont du texte, placés comme sur un nœud.
export default function FirstPortraitButton({ onClick }) {
  const canvasRef = useRef(null)

  useEffect(() => {
    const canvas = canvasRef.current
    const ctx = canvas?.getContext?.('2d')
    if (!ctx) return
    // Dessiné à la taille affichée (zoom compris) : net malgré le scale CSS du bouton
    const ratio = (window.devicePixelRatio || 1) * INIT_MAX_SCALE
    const px = Math.round(FIRST_PORTRAIT_HALF * 2 * ratio)
    canvas.width = px
    canvas.height = px
    ctx.setTransform(ratio, 0, 0, ratio, px / 2, px / 2)
    drawFirstPortrait(ctx)
  }, [])

  const style = {
    '--fp-scale': INIT_MAX_SCALE,
    '--fp-half': `${FIRST_PORTRAIT_HALF}px`,
    '--fp-width': `${PERSON_W}px`,
    '--fp-name-y': `${FIRST_PORTRAIT_HALF + NODE_LABEL_Y}px`,
    '--fp-line-y': `${FIRST_PORTRAIT_HALF + NODE_LABEL_Y + NODE_LABEL_LINE}px`,
    '--fp-ink': COLORS.text,
    '--fp-muted': COLORS.textLight,
    '--fp-hover': COLORS.borderAlive,
  }

  return (
    <button type="button" className="first-portrait" style={style} onClick={onClick} aria-label={t('Ajouter une première personne')}>
      <canvas ref={canvasRef} className="first-portrait-frame" aria-hidden="true" />
      <span className="first-portrait-name" aria-hidden="true">{t('Vous')}</span>
      <span className="first-portrait-line" aria-hidden="true">{t('Commencez par vous')}</span>
    </button>
  )
}
