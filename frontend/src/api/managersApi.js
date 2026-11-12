import { apiRequest, bearer } from './client'

// Co-gestion d'un arbre (issue #145) : gestionnaires, invitations, et la page du lien d'invitation

const tree = (treeId) => `/trees/${encodeURIComponent(treeId)}`

export function listManagers(treeId, token) {
  return apiRequest(`${tree(treeId)}/managers`, { headers: bearer(token) })
}

export function inviteManager(treeId, email, token) {
  return apiRequest(`${tree(treeId)}/invitations`, { method: 'POST', headers: bearer(token), body: JSON.stringify({ email }) })
}

export function renewInvitationLink(treeId, invitationId, token) {
  return apiRequest(`${tree(treeId)}/invitations/${encodeURIComponent(invitationId)}/link`, { method: 'POST', headers: bearer(token) })
}

export function revokeInvitation(treeId, invitationId, token) {
  return apiRequest(`${tree(treeId)}/invitations/${encodeURIComponent(invitationId)}`, { method: 'DELETE', headers: bearer(token) })
}

// Retirer un co-gestionnaire (le propriétaire), ou quitter la gestion (son propre identifiant)
export function removeManager(treeId, userId, token) {
  return apiRequest(`${tree(treeId)}/managers/${encodeURIComponent(userId)}`, { method: 'DELETE', headers: bearer(token) })
}

// Sous /api comme /api/arbre/:slug : nginx ne relaie à l'API que /api (préfixe retiré), /auth et /trees
export function fetchInvitation(invitationToken) {
  return apiRequest(`/api/invitations/${encodeURIComponent(invitationToken)}`)
}

export function acceptInvitation(invitationToken, token) {
  return apiRequest(`/api/invitations/${encodeURIComponent(invitationToken)}/accept`, { method: 'POST', headers: bearer(token) })
}

export function invitationUrl(invitationToken) {
  return `${window.location.origin}/invitation/${invitationToken}`
}
