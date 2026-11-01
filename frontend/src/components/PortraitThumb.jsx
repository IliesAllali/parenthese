import { useEffect, useState } from 'react'
import { imagePlacement } from '../utils/portraitCrop.js'
import './PortraitThumb.css'

// Portrait en miniature (listes, puces, visionneuse, menu du compte) avec le recadrage enregistré :
// le même cadrage que la fiche et l'arbre (portraitCrop.js). Le cadre est carré ; l'image se place
// une fois sa taille connue, et reste en « cover » centré jusque-là ou sans cadrage.
export default function PortraitThumb({ src, crop = null, alt = '', className = '' }) {
  const [size, setSize] = useState(null)
  useEffect(() => { setSize(null) }, [src])
  const placement = size && crop ? imagePlacement(size.w, size.h, 1, crop) : null
  const style = placement
    ? { position: 'absolute', maxWidth: 'none', left: `${placement.left}%`, top: `${placement.top}%`, width: `${placement.width}%`, height: `${placement.height}%` }
    : undefined
  return (
    <span className={`portrait-thumb${className ? ` ${className}` : ''}`}>
      <img
        src={src}
        alt={alt}
        onLoad={(event) => setSize({ w: event.currentTarget.naturalWidth, h: event.currentTarget.naturalHeight })}
        style={style}
      />
    </span>
  )
}
