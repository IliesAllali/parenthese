import { Play } from 'lucide-react'
import { useVideoThumbnail } from '../hooks/useVideoThumbnail.js'
import './VideoThumb.css'

// Vignette d'une vidéo YouTube : sa miniature, servie par Parenthèse (le navigateur ne contacte YouTube qu'à la
// lecture), le triangle de lecture par-dessus. Sans miniature, ou si elle ne se charge pas : le fond sombre et le
// triangle seuls, comme avant.
export default function VideoThumb({ src, className = '', iconSize = 18 }) {
  const { showImage, onError } = useVideoThumbnail(src)
  return (
    <span className={`video-thumb${showImage ? ' video-thumb--image' : ''}${className ? ` ${className}` : ''}`}>
      {showImage && <img src={src} alt="" loading="lazy" onError={onError} />}
      <span className="video-thumb-play" aria-hidden="true">
        <Play size={iconSize} fill="currentColor" strokeWidth={0} />
      </span>
    </span>
  )
}
