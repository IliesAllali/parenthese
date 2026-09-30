// Jeton de lecture des médias de l'arbre ouvert, fourni par le serveur avec le graphe.
// Les images sont chargées par <img src>, sans en-tête : leur adresse porte ce jeton, jamais la
// session du compte (qui finissait dans l'historique, les journaux et les liens copiés).
let currentMediaToken = ''

export function setMediaToken(token) {
  currentMediaToken = typeof token === 'string' ? token : ''
}

export function getMediaToken() {
  return currentMediaToken
}

// Adresse d'un fichier servi par l'API. Une adresse externe (YouTube) ne reçoit jamais de jeton.
export function buildMediaUrl(pathOrUrl, apiBaseUrl = '', token = currentMediaToken) {
  if (!pathOrUrl) {
    return null
  }

  if (/^https?:\/\//.test(pathOrUrl)) {
    return pathOrUrl
  }

  const url = `${apiBaseUrl}${pathOrUrl}`
  return token ? `${url}${url.includes('?') ? '&' : '?'}token=${encodeURIComponent(token)}` : url
}
