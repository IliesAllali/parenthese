// Lien de partage qui ouvre l'arbre sans rien taper (#247) : /arbre/<slug>#cle=<mot de passe>.
// Ce qui suit le « # » n'est jamais envoyé au serveur ni gardé dans ses journaux. Le mot de passe reste :
// sans clé, la porte le demande comme avant, et changer le mot de passe change aussi le lien.

const KEY_PARAM = 'cle'

export function buildShareLink(url, password) {
  if (!url) return ''
  return password ? `${url}#${KEY_PARAM}=${encodeURIComponent(password)}` : url
}

// Lue une fois au chargement, puis retirée de la barre d'adresse : elle ne reste ni dans l'historique ni dans
// un lien recopié depuis le navigateur
export function readShareKey(location = typeof window !== 'undefined' ? window.location : null) {
  if (!location?.hash) return ''
  const params = new URLSearchParams(location.hash.slice(1))
  const key = params.get(KEY_PARAM)?.trim() || ''
  if (!params.has(KEY_PARAM)) return ''
  params.delete(KEY_PARAM)
  const rest = params.toString()
  window.history.replaceState(window.history.state, '', `${location.pathname}${location.search}${rest ? `#${rest}` : ''}`)
  return key
}
