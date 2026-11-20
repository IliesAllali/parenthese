import { API_BASE_URL, apiRequest, bearer } from './client'

// provisionalToken : session d'un arbre provisoire (#251) ; l'arbre rejoint le compte retrouvé
export async function loginUser(email, password, provisionalToken = '') {
  const data = await apiRequest('/auth/login', {
    method: 'POST',
    ...(provisionalToken ? { headers: bearer(provisionalToken) } : {}),
    body: JSON.stringify({ email, password }),
  })

  return data
}

// invitationToken : lien d'invitation à co-gérer un arbre, qui ouvre un compte même inscription fermée
export async function registerUser(firstName, email, password, invitationToken) {
  const data = await apiRequest('/auth/register', {
    method: 'POST',
    body: JSON.stringify({ firstName, email, password, ...(invitationToken ? { invitationToken } : {}) }),
  })

  return data
}

export async function logoutUser(token) {
  const data = await apiRequest('/auth/logout', {
    method: 'POST',
    headers: bearer(token),
  })

  return data
}

// confirmation : { password } pour un compte à mot de passe, { confirmEmail } pour un compte né d'une connexion OIDC
export async function deleteAccount(token, confirmation) {
  const data = await apiRequest('/auth/me', {
    method: 'DELETE',
    headers: bearer(token),
    body: JSON.stringify(confirmation),
  })

  return data
}

// Profil du compte connecté (prénom compris), pour une session restaurée sur un autre appareil
export async function fetchAccountProfile(token) {
  const data = await apiRequest('/auth/me', {
    method: 'GET',
    headers: bearer(token),
  })

  return data
}

export async function fetchLastOpenedTree(token) {
  const data = await apiRequest('/auth/me/last-tree', {
    method: 'GET',
    headers: bearer(token),
  })

  return data?.lastTree || null
}

export async function updateLastOpenedTree(token, payload) {
  const data = await apiRequest('/auth/me/last-tree', {
    method: 'PUT',
    headers: bearer(token),
    body: JSON.stringify(payload),
  })

  return data?.lastTree || null
}

// Options de l'instance : inscription ouverte ou fermée, connexion par mot de passe, fournisseur OIDC
export async function fetchAuthOptions() {
  return apiRequest('/auth/options', { method: 'GET' })
}

// Adresse qui part chez le fournisseur OIDC ; returnTo ramène sur l'arbre partagé ouvert (validé par l'API)
export function oidcStartUrl(returnTo = '/') {
  return `${API_BASE_URL}/auth/oidc/start?returnTo=${encodeURIComponent(returnTo)}`
}

// Relier le fournisseur au compte connecté : un ticket de deux minutes, à usage unique, puis le départ OIDC qui le porte
export async function requestOidcLinkTicket(token) {
  const data = await apiRequest('/auth/oidc/link', {
    method: 'POST',
    headers: bearer(token),
  })

  return data?.ticket
}

export function oidcLinkUrl(ticket) {
  return `${API_BASE_URL}/auth/oidc/start?link=${encodeURIComponent(ticket)}`
}

// Jeton de passage reçu au retour du fournisseur, échangé une seule fois contre une session
export async function exchangeOidcCode(code) {
  return apiRequest('/auth/oidc/exchange', {
    method: 'POST',
    body: JSON.stringify({ code }),
  })
}

// « Créer mon arbre » sans compte : un compte provisoire, effacé au bout de 30 jours s'il n'est pas gardé (#251)
// credentials : le serveur double la session d'un cookie (voir resumeProvisionalSession), y compris quand l'API
// n'est pas à l'adresse de l'app (développement, auto-hébergement sur deux domaines)
export async function startProvisionalAccount(firstName) {
  return apiRequest('/auth/provisional', {
    method: 'POST',
    credentials: 'include',
    body: JSON.stringify({ firstName: firstName || null }),
  })
}

// « Gardez votre arbre » : le compte provisoire reçoit un email et un mot de passe, même compte, même arbre
export async function keepProvisionalAccount(token, email, password) {
  return apiRequest('/auth/keep', {
    method: 'POST',
    credentials: 'include',
    headers: bearer(token),
    body: JSON.stringify({ email, password }),
  })
}

// Retour sur un arbre provisoire : la session revient du cookie posé par le serveur quand le navigateur a vidé son
// stockage (Safari le fait après 7 jours sans visite), et les 30 jours repartent de cette visite
export async function resumeProvisionalSession(token = '') {
  return apiRequest('/auth/provisional/resume', {
    method: 'POST',
    credentials: 'include',
    headers: token ? bearer(token) : {},
  })
}
