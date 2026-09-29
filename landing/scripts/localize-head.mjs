// Réécrit les balises de langue du <head> de index.html (écrit en français) pour une autre langue :
// lang, title, description, canonical, Open Graph, Twitter et JSON-LD. Utilisé par scripts/prerender.mjs.
// Chaque remplacement doit trouver sa cible, sinon erreur : un head à moitié traduit ne part pas en prod.

const escapeAttr = (value) => value.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;')
const escapeText = (value) => value.replace(/&/g, '&amp;').replace(/</g, '&lt;')
const escapeJson = (value) => JSON.stringify(value).slice(1, -1)

export function localizeHead(html, meta) {
  const rules = [
    [/<html lang="[^"]*">/, `<html lang="${meta.lang}">`],
    [/<title>[^<]*<\/title>/, `<title>${escapeText(meta.title)}</title>`],
    [/(<meta name="description" content=")[^"]*(")/, `$1${escapeAttr(meta.description)}$2`],
    [/(<link rel="canonical" href=")[^"]*(")/, `$1${meta.url}$2`],
    [/(<meta property="og:locale"\s+content=")[^"]*(")/, `$1${meta.ogLocale}$2`],
    [/(<meta property="og:url"\s+content=")[^"]*(")/, `$1${meta.url}$2`],
    [/(<meta property="og:title"\s+content=")[^"]*(")/, `$1${escapeAttr(meta.title)}$2`],
    [/(<meta property="og:description"\s+content=")[^"]*(")/, `$1${escapeAttr(meta.socialDescription)}$2`],
    [/(<meta property="og:image:alt"\s+content=")[^"]*(")/, `$1${escapeAttr(meta.imageAlt)}$2`],
    [/(<meta name="twitter:title"\s+content=")[^"]*(")/, `$1${escapeAttr(meta.title)}$2`],
    [/(<meta name="twitter:description"\s+content=")[^"]*(")/, `$1${escapeAttr(meta.socialDescription)}$2`],
    [/("inLanguage": ")[^"]*(")/g, `$1${meta.schemaLanguage}$2`],
    [/("applicationCategory"[\s\S]*?"description": ")[^"]*(")/, `$1${escapeJson(meta.appDescription)}$2`],
  ]

  return rules.reduce((out, [pattern, replacement]) => {
    if (!pattern.test(out)) throw new Error(`Balise introuvable dans le head : ${pattern}`)
    pattern.lastIndex = 0
    return out.replace(pattern, replacement)
  }, html)
}
