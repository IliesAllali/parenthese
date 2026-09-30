import { useEffect, useRef } from 'react'
import { persons, medias } from '../../data/mockData'

const MAX_CACHE_SIZE = 200

// onImageLoaded : appelé à chaque image chargée, pour redessiner une scène immobile
export function useImageCache(revisionKey = 0, onImageLoaded = null) {
  const imageCache = useRef(new Map())
  const pendingLoads = useRef(new Set())

  useEffect(() => {
    const allUrls = new Set()
    persons.forEach((p) => { if (p.photo) allUrls.add(p.photo) })
    // Seules les photos sont dessinées : une vidéo YouTube chargée ici partait chez youtube.com
    // dès l'ouverture de l'arbre, sans que personne ait lancé la vidéo.
    medias.forEach((m) => { if (m.url && m.type === 'photo') allUrls.add(m.url) })

    allUrls.forEach((url) => {
      if (imageCache.current.has(url) || pendingLoads.current.has(url)) {
        return
      }

      // LRU: remove oldest cached entry when full.
      if (imageCache.current.size >= MAX_CACHE_SIZE) {
        const firstKey = imageCache.current.keys().next().value
        imageCache.current.delete(firstKey)
      }

      pendingLoads.current.add(url)

      const img = new Image()
      img.onload = () => {
        imageCache.current.set(url, img)
        pendingLoads.current.delete(url)
        onImageLoaded?.()
      }
      img.onerror = () => {
        const retry = new Image()
        retry.onload = () => {
          imageCache.current.set(url, retry)
          pendingLoads.current.delete(url)
          onImageLoaded?.()
        }
        retry.onerror = () => pendingLoads.current.delete(url)
        retry.src = url
      }
      img.src = url
    })
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [revisionKey])

  return imageCache
}
