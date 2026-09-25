// Carte d'accueil de la famille : montrée une seule fois par arbre et par navigateur
function welcomeSeenKey(treeId) {
  return `family_welcome_seen_${treeId}`
}

export function hasSeenFamilyWelcome(treeId) {
  if (!treeId) return true
  try {
    return localStorage.getItem(welcomeSeenKey(treeId)) === '1'
  } catch {
    return false
  }
}

export function markFamilyWelcomeSeen(treeId) {
  if (!treeId) return
  try {
    localStorage.setItem(welcomeSeenKey(treeId), '1')
  } catch {
    // Ignore localStorage failures
  }
}
