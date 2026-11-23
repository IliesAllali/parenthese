// Miniature d'un fichier vidéo, prise par le navigateur : le serveur n'a pas de quoi décoder une vidéo. Une image vers
// la première seconde, 640 px au plus, en JPEG. Si le navigateur ne lit pas la vidéo (HEVC en .mov sur Chrome, fichier
// abîmé) ou tarde plus de quelques secondes : pas de miniature, la vidéo part sans et garde sa vignette sombre.

export const VIDEO_FILE_MIME_TYPES = ['video/mp4', 'video/quicktime', 'video/webm']
export const FRAME_MAX_SIDE = 640
export const FRAME_TIMEOUT_MS = 4000
const JPEG_QUALITY = 0.8

export function isVideoFileMime(mimeType) {
  return VIDEO_FILE_MIME_TYPES.includes(String(mimeType || '').toLowerCase())
}

// Instant de l'image : une seconde, ou 10 % d'une vidéo plus courte que 10 s. Durée inconnue (webm enregistré par un
// navigateur, qui annonce Infinity) : un dixième de seconde.
export function frameTime(duration) {
  if (!Number.isFinite(duration) || duration <= 0) return 0.1
  return Math.min(1, duration * 0.1)
}

// Taille de l'image, proportions gardées, sans agrandir une petite vidéo
export function frameSize(width, height, maxSide = FRAME_MAX_SIDE) {
  if (!(width > 0) || !(height > 0)) return null
  const scale = Math.min(1, maxSide / Math.max(width, height))
  return { width: Math.max(1, Math.round(width * scale)), height: Math.max(1, Math.round(height * scale)) }
}

// « data:image/jpeg;base64,… » → la partie base64 seule ; null si ce n'est pas une image JPEG
export function jpegDataUrlToBase64(dataUrl) {
  const prefix = 'data:image/jpeg;base64,'
  if (typeof dataUrl !== 'string' || !dataUrl.startsWith(prefix) || dataUrl.length <= prefix.length) return null
  return dataUrl.slice(prefix.length)
}

function isCrossOrigin(src) {
  try {
    return new URL(src, window.location.href).origin !== window.location.origin
  } catch {
    return false
  }
}

// Image JPEG (base64) prise dans la vidéo à cette adresse, ou null. N'échoue jamais.
export function captureVideoFrame(src, { timeoutMs = FRAME_TIMEOUT_MS } = {}) {
  if (typeof document === 'undefined' || !src) return Promise.resolve(null)
  return new Promise((resolve) => {
    const video = document.createElement('video')
    let settled = false
    const finish = (value) => {
      if (settled) return
      settled = true
      window.clearTimeout(timer)
      video.removeAttribute('src')
      try { video.load() } catch { /* déjà libérée */ }
      resolve(value)
    }
    const timer = window.setTimeout(() => finish(null), timeoutMs)

    video.muted = true
    video.playsInline = true
    video.preload = 'metadata'
    // Vidéo servie par une autre origine (API sur son propre domaine) : sans CORS, le canevas serait illisible
    if (isCrossOrigin(src)) video.crossOrigin = 'anonymous'

    video.addEventListener('error', () => finish(null))
    video.addEventListener('loadedmetadata', () => {
      try {
        video.currentTime = frameTime(video.duration)
      } catch {
        finish(null)
      }
    })
    video.addEventListener('seeked', () => {
      const size = frameSize(video.videoWidth, video.videoHeight)
      if (!size) return finish(null)
      try {
        const canvas = document.createElement('canvas')
        canvas.width = size.width
        canvas.height = size.height
        const context = canvas.getContext('2d')
        if (!context) return finish(null)
        context.drawImage(video, 0, 0, size.width, size.height)
        finish(jpegDataUrlToBase64(canvas.toDataURL('image/jpeg', JPEG_QUALITY)))
      } catch {
        // Canevas illisible (vidéo d'une autre origine sans CORS)
        finish(null)
      }
    })
    video.src = src
  })
}

// Miniature d'un fichier choisi par la personne, avant l'envoi
export async function captureVideoFileFrame(file, options) {
  if (!file || typeof URL === 'undefined' || typeof URL.createObjectURL !== 'function') return null
  const url = URL.createObjectURL(file)
  try {
    return await captureVideoFrame(url, options)
  } finally {
    URL.revokeObjectURL(url)
  }
}

// Champ à joindre à l'envoi d'un souvenir : la miniature d'une vidéo, rien pour le reste ni si la prise a échoué
export async function videoThumbnailField(file, type, capture = captureVideoFileFrame) {
  if (type !== 'video') return {}
  const thumbnailBase64 = await capture(file).catch(() => null)
  return thumbnailBase64 ? { thumbnailBase64 } : {}
}
