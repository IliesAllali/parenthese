// Les mots et dessins posés sur l'arbre par qui le gère : un seul envoi, en sortant de la modification ou en
// quittant la page (#253). Un envoi fait en quittant la page n'a pas de réponse : il est gardé ici avec sa clé
// Idempotency-Key, et renvoyé au retour. Le serveur rejoue la première réponse s'il l'avait déjà reçu, sans doublon.

export function buildAnnotationBatch(draft = {}) {
  const added = new Set(draft.addedAnnotations || [])
  const modified = new Set(draft.modifiedAnnotations || [])
  const data = draft.annotationsData || []
  const fields = (a) => ({ x: a.x, y: a.y, content: a.content, style: a.style || {}, zIndex: a.zIndex || 0 })
  return {
    create: data.filter((a) => added.has(a.id)).map((a) => ({ type: a.type, ...fields(a) })),
    update: data.filter((a) => modified.has(a.id)).map((a) => ({ id: a.id, ...fields(a) })),
    delete: draft.deletedAnnotations || [],
  }
}

export function isEmptyBatch(batch) {
  return !batch || (batch.create.length === 0 && batch.update.length === 0 && batch.delete.length === 0)
}

const pendingKey = (treeId) => `pz-annotations-envoi-${treeId}`

export function newBatchKey() {
  return globalThis.crypto?.randomUUID?.() || `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 14)}`
}

export function readPendingBatch(treeId) {
  try {
    const parsed = JSON.parse(localStorage.getItem(pendingKey(treeId)) || 'null')
    return parsed && typeof parsed.key === 'string' && parsed.batch ? parsed : null
  } catch {
    return null
  }
}

export function writePendingBatch(treeId, pending) {
  try {
    localStorage.setItem(pendingKey(treeId), JSON.stringify(pending))
    return true
  } catch {
    return false
  }
}

export function clearPendingBatch(treeId) {
  try { localStorage.removeItem(pendingKey(treeId)) } catch { /* rien à faire */ }
}

// Un refus du serveur (4xx hors limite de débit) ne passera pas mieux au prochain retour : on l'abandonne
export function isFinalFailure(error) {
  const status = Number(error?.status)
  return status >= 400 && status < 500 && status !== 408 && status !== 429
}
