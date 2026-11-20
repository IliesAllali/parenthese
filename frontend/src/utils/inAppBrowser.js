// Navigateurs intégrés aux applis (Facebook, Messenger, Instagram, LinkedIn, TikTok, Snapchat, WeChat, Line, et toute
// WebView Android) : Google y refuse la connexion (erreur 403 « disallowed_useragent »). Les liens de famille s'ouvrent
// souvent là. Les autres fournisseurs OIDC (Authentik, Keycloak…) n'ont pas cette règle.
const IN_APP_BROWSER = /FBAN|FBAV|FB_IAB|FBIOS|Instagram|LinkedInApp|musical_ly|BytedanceWebview|Snapchat|MicroMessenger|\bLine\/|; wv\)/i

export function isInAppBrowser(userAgent = globalThis.navigator?.userAgent || '') {
  return IN_APP_BROWSER.test(userAgent)
}

export function providerBlockedHere(providerName, userAgent) {
  return /google/i.test(providerName || '') && isInAppBrowser(userAgent)
}
