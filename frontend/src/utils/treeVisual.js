import { API_BASE_URL } from '../api/client'
import { buildMediaUrl } from './mediaToken.js'

// Visuel d'un arbre, un seul à la fois : la photo, sinon l'icône (un emoji), sinon la première lettre du nom.

// Icônes proposées, sans ordre de famille (Patch, 21/11). 🧡 retirée : au format du menu, on la confond avec ❤️.
// Un arbre qui l'a déjà la garde, elle n'est plus proposée.
export const TREE_ICONS = ['🌳', '🌿', '🌻', '🌸', '🍂', '🌾', '🏡', '⛰️', '🌊', '🐚', '⛵', '❤️', '⭐', '🕊️', '☀️', '🌙', '📖', '📷', '✉️', '🎵']

// Ce que l'API dit du visuel d'un arbre (liste du compte, paramètres, graphe)
export function visualOf(tree) {
  return { icon: tree?.image ? null : tree?.icon || null, image: tree?.image || null }
}

// Choix du visuel tel que le champ des paramètres le montre : la photo, sinon l'icône, sinon la lettre
export function visualModeOf(tree) {
  return { mode: tree?.image ? 'photo' : tree?.icon ? 'icon' : 'letter', icon: tree?.icon || null }
}

// Ce que « Enregistrer » envoie du visuel. La lettre (null) ou une icône : envoyée, elle retire la photo.
// La photo, elle, est déjà enregistrée à la validation du recadrage : rien à envoyer.
export function visualPayload(visual) {
  if (visual.mode === 'photo') return {}
  return { icon: visual.mode === 'icon' ? visual.icon : null }
}

// Adresse de la photo. Celle de la liste du compte porte déjà le jeton de son arbre ; celle d'une invitation se lit
// avec le lien (sous /api, comme la page d'invitation) ; les autres prennent le jeton médias de l'arbre ouvert.
export function treeImageSrc(image) {
  const path = image?.urlPath
  if (!path) return null
  if (path.startsWith('/invitations/')) return `${API_BASE_URL}/api${path}`
  if (path.includes('token=')) return `${API_BASE_URL}${path}`
  return buildMediaUrl(path, API_BASE_URL)
}
