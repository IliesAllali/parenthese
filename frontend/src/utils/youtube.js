// Une vidéo YouTube se reconnaît à son identifiant de 11 caractères, quelle que soit
// la forme collée : lien de la barre d'adresse, lien de partage, lien d'intégration,
// Short, direct, ou le code <iframe> complet donné par le bouton Intégrer.
const VIDEO_ID_RE = /^[A-Za-z0-9_-]{11}$/
const YOUTUBE_HOST_RE = /^(?:www\.|m\.|music\.)?(?:youtube\.com|youtube-nocookie\.com|youtu\.be)$/i
const IFRAME_SRC_RE = /<iframe[^>]*\ssrc\s*=\s*["']([^"']+)["']/i
const PATH_ID_RE = /^\/(?:embed|shorts|live|v)\/([^/?#]+)/

export const youtubeVideoId = (value) => {
  if (typeof value !== 'string') return null
  const text = value.trim()
  const iframeSrc = text.match(IFRAME_SRC_RE)?.[1]
  let url
  try {
    url = new URL(iframeSrc ?? text)
  } catch {
    return null
  }
  if (url.protocol !== 'https:' && url.protocol !== 'http:') return null
  if (!YOUTUBE_HOST_RE.test(url.hostname)) return null

  const id = url.hostname.toLowerCase().endsWith('youtu.be')
    ? url.pathname.slice(1).split('/')[0]
    : url.searchParams.get('v') ?? url.pathname.match(PATH_ID_RE)?.[1]
  return id && VIDEO_ID_RE.test(id) ? id : null
}

// Le lien enregistré est toujours la forme courte de la barre d'adresse
export const youtubeWatchUrl = (value) => {
  const id = youtubeVideoId(value)
  return id ? `https://www.youtube.com/watch?v=${id}` : null
}

// youtube-nocookie : pas de cookie YouTube tant que la vidéo n'est pas lancée
export const youtubeEmbedUrl = (value) => {
  const id = youtubeVideoId(value)
  return id ? `https://www.youtube-nocookie.com/embed/${id}` : null
}
