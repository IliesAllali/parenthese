// Annotation photo : le client enregistrait `url`, l'adresse de l'image AVEC la session de son auteur
// (?token=…), lisible par tous ceux qui ouvrent l'arbre. Le serveur ne garde que `photoPath` et le
// client reconstruit l'adresse au chargement. À la lecture, les anciennes valeurs sont nettoyées aussi.

function parsePhotoContent(content: string): Record<string, unknown> | null {
  if (!content.startsWith('{')) return null
  try {
    const parsed = JSON.parse(content)
    if (parsed && typeof parsed === 'object' && !Array.isArray(parsed) && ('photoPath' in parsed || 'url' in parsed)) {
      return parsed as Record<string, unknown>
    }
  } catch {
    // pas du JSON : texte libre
  }
  return null
}

export class InvalidAnnotationContentError extends Error {}

// Écriture : photoPath obligatoirement une photo de cet arbre, url retirée
export function sanitizeAnnotationContentForWrite(content: string, treeId: string): string {
  const parsed = parsePhotoContent(content)
  if (!parsed) return content

  const photoPath = parsed.photoPath
  const expectedPrefix = `/trees/${treeId}/annotation-photos/`
  if (
    typeof photoPath !== 'string' ||
    !photoPath.startsWith(expectedPrefix) ||
    !/^[A-Za-z0-9-]+$/.test(photoPath.slice(expectedPrefix.length))
  ) {
    throw new InvalidAnnotationContentError('invalid_annotation_photo_path')
  }

  const { url: _url, ...rest } = parsed
  return JSON.stringify(rest)
}

// Lecture : jamais d'adresse enregistrée renvoyée
export function sanitizeAnnotationContentForRead(content: string): string {
  const parsed = parsePhotoContent(content)
  if (!parsed || !('url' in parsed)) return content
  const { url: _url, ...rest } = parsed
  return JSON.stringify(rest)
}
