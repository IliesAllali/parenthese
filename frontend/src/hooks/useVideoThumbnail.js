import { useState } from 'react'

// Miniature d'une vidéo YouTube : à montrer tant qu'elle existe et ne tombe pas en erreur (404 : pas encore de
// miniature, instance sans accès à Internet). Une autre adresse remet l'essai à zéro.
export function useVideoThumbnail(src) {
  const [failedSrc, setFailedSrc] = useState(null)
  return { showImage: Boolean(src) && failedSrc !== src, onError: () => setFailedSrc(src) }
}
