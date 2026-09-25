// Prénom de la personne qui contribue, retenu sur cet appareil pour ne pas le redemander.
const STORAGE_KEY = 'parenthese_contributor_name'

export function readContributorName() {
  try {
    return localStorage.getItem(STORAGE_KEY) || ''
  } catch {
    return ''
  }
}

export function saveContributorName(name) {
  const value = String(name || '').trim().slice(0, 120)
  if (!value) return
  try {
    localStorage.setItem(STORAGE_KEY, value)
  } catch {
    // stockage indisponible : le prénom sera redemandé
  }
}
