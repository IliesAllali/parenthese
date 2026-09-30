// Plafond d'échecs par arbre, en plus de la limite par adresse : un mot de passe de partage est choisi par
// une famille (« 123soleil »), un dictionnaire envoyé depuis beaucoup d'adresses finirait par le trouver.
// Au-delà du plafond, l'arbre refuse les essais jusqu'à la fin de la fenêtre, même le bon mot de passe.
// En mémoire : l'API tourne en un seul processus (pm2 fork, un conteneur).

const WINDOW_MS = 15 * 60 * 1000
const MAX_FAILURES = 30

const failuresByTree = new Map<string, number[]>()

function recentFailures(treeId: string, now: number): number[] {
  const recent = (failuresByTree.get(treeId) ?? []).filter((at) => now - at < WINDOW_MS)
  if (recent.length > 0) {
    failuresByTree.set(treeId, recent)
  } else {
    failuresByTree.delete(treeId)
  }
  return recent
}

export function isTreeUnlockLocked(treeId: string, now = Date.now()): boolean {
  return recentFailures(treeId, now).length >= MAX_FAILURES
}

export function recordTreeUnlockFailure(treeId: string, now = Date.now()): void {
  const recent = recentFailures(treeId, now)
  recent.push(now)
  failuresByTree.set(treeId, recent)
}

export function resetTreeUnlockGuard(): void {
  failuresByTree.clear()
}
