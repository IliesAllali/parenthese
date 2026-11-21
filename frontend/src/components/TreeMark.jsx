import PortraitThumb from './PortraitThumb.jsx'
import { initialOf } from '../utils/initial.js'
import { treeImageSrc } from '../utils/treeVisual.js'

// Pastille d'un arbre : sa photo recadrée, sinon son icône, sinon la première lettre de son nom.
// `base` est la classe de la pastille là où elle s'affiche (pz-tree-mono, navm-tree-mono…), qui en fixe la taille ;
// les variantes --emoji et --photo retirent la couleur de fond de la lettre.
export default function TreeMark({ name, icon = null, image = null, base, className = '' }) {
  const src = treeImageSrc(image)
  const variant = src ? `${base}--photo` : icon ? `${base}--emoji` : ''
  const classes = [base, variant, className].filter(Boolean).join(' ')
  return (
    <span className={classes} aria-hidden="true">
      {src ? <PortraitThumb src={src} crop={image?.crop || null} /> : icon || initialOf(name)}
    </span>
  )
}
