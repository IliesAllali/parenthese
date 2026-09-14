export const MAX_IMAGE_BYTES = 5 * 1024 * 1024
export const MAX_FILE_BYTES = 20 * 1024 * 1024

export function inferMediaTypeFromMimeType(mimeType) {
  const normalized = String(mimeType || '').toLowerCase()

  if (normalized.startsWith('image/')) {
    return 'photo'
  }

  if (normalized.startsWith('video/')) {
    return 'video'
  }

  if (normalized.startsWith('audio/')) {
    return 'audio'
  }

  if (normalized === 'application/geo+json' || normalized === 'text/geojson') {
    return 'geojson'
  }

  if (normalized === 'application/gpx+xml') {
    return 'gpx'
  }

  return 'document'
}

export function resolveUploadMediaType(file, requestedType = 'photo') {
  if (requestedType && requestedType !== 'auto') {
    return requestedType
  }

  return inferMediaTypeFromMimeType(file?.type)
}

export function getUploadMimeType(file, mediaType) {
  if (file?.type) {
    return file.type
  }

  if (mediaType === 'video') {
    return 'video/mp4'
  }

  if (mediaType === 'audio') {
    return 'audio/mpeg'
  }

  if (mediaType === 'document') {
    return 'application/octet-stream'
  }

  if (mediaType === 'geojson') {
    return 'application/geo+json'
  }

  if (mediaType === 'gpx') {
    return 'application/gpx+xml'
  }

  return 'image/jpeg'
}

export function validateMediaFile(file, mediaType, options = {}) {
  if (mediaType === 'citation') {
    const citationText = String(options.citationText || '').trim()
    return citationText ? '' : 'Saisissez le texte de la citation.'
  }

  if (!file) {
    return 'Selectionnez un fichier.'
  }

  if (!Number.isFinite(file.size) || file.size <= 0) {
    return 'Fichier invalide.'
  }

  if (file.size > MAX_FILE_BYTES) {
    return 'Fichier trop volumineux (max 20 Mo).'
  }

  if (mediaType === 'photo' && file.size > MAX_IMAGE_BYTES) {
    return 'Image trop volumineuse (max 5 Mo).'
  }

  return ''
}

export function getAcceptForMediaType(mediaType) {
  if (mediaType === 'citation') {
    return ''
  }

  if (mediaType === 'video') {
    return 'video/*'
  }

  if (mediaType === 'audio') {
    return 'audio/*'
  }

  if (mediaType === 'document') {
    return '.pdf,.doc,.docx,.txt,application/pdf,text/plain'
  }

  if (mediaType === 'geojson') {
    return '.geojson,application/geo+json,application/json,text/geojson,text/plain'
  }

  if (mediaType === 'gpx') {
    return '.gpx,application/gpx+xml,application/xml,text/xml,text/plain'
  }

  return 'image/*'
}
