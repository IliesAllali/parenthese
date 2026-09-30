// Ménage du stockage local de l'appareil.
//
// Ce qui reste volontairement : le prénom de la personne qui contribue, la langue choisie, les
// accueils déjà vus, les accès aux arbres partagés.

// Le mot de passe de partage était autrefois recopié ici (invite_password_<arbre>_<rôle>).
// Il est gardé par le serveur désormais : toute copie restante est effacée au démarrage.
const LEGACY_PREFIXES = ['invite_password_']

// Ce qui appartient au compte connecté et ne doit pas rester pour la personne suivante sur
// l'appareil : brouillons d'édition, fiche « c'est moi » par arbre, profil du compte.
const ACCOUNT_PREFIXES = ['edit-draft-', 'account_self_person_']
const ACCOUNT_KEYS = ['user_auth_profile']

function defaultStorage() {
  try {
    return globalThis.localStorage || null
  } catch {
    return null
  }
}

function removeMatchingKeys(storage, prefixes, exactKeys = []) {
  if (!storage) return
  try {
    const doomed = []
    for (let i = 0; i < storage.length; i += 1) {
      const key = storage.key(i)
      if (key && (exactKeys.includes(key) || prefixes.some((prefix) => key.startsWith(prefix)))) {
        doomed.push(key)
      }
    }
    doomed.forEach((key) => storage.removeItem(key))
  } catch {
    // Stockage indisponible (navigation privée, quota) : rien à nettoyer
  }
}

export function sweepLegacyLocalData(storage = defaultStorage()) {
  removeMatchingKeys(storage, LEGACY_PREFIXES)
}

export function clearAccountLocalData(storage = defaultStorage()) {
  removeMatchingKeys(storage, ACCOUNT_PREFIXES, ACCOUNT_KEYS)
}
