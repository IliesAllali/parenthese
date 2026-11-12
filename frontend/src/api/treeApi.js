import { API_BASE_URL, apiRequest, bearer } from './client'
import { readContributorName } from '../utils/contributorName.js'

export async function resolveTreeBySlug(slug) {
  const data = await apiRequest(`/api/arbre/${encodeURIComponent(slug)}`)
  return {
    id: data?.tree?.id || '',
    slug: data?.tree?.slug || '',
    name: data?.tree?.name || '',
    description: data?.tree?.description || null,
  }
}

export async function unlockTreeAccess(treeId, password, userToken = '') {
  const data = await apiRequest(`/trees/${encodeURIComponent(treeId)}/access/unlock`, {
    method: 'POST',
    headers: userToken ? bearer(userToken) : {},
    body: JSON.stringify({ password }),
  })

  return data
}

// Rattache à un compte un accès partagé déjà ouvert (jeton d'arbre en poche), sans redemander le mot de passe
export async function linkTreeAccess(treeId, accessToken, userToken) {
  const data = await apiRequest(`/trees/${encodeURIComponent(treeId)}/access/link`, {
    method: 'POST',
    headers: bearer(userToken),
    body: JSON.stringify({ accessToken }),
  })

  return data
}

export async function fetchTreeGraph(treeId, token) {
  // Prénom retenu sur cet appareil : le serveur l'inscrit au journal des visites
  const visitorName = readContributorName()
  const data = await apiRequest(`/trees/${encodeURIComponent(treeId)}/graph?t=${Date.now()}`, {
    method: 'GET',
    cache: 'no-store',
    headers: {
      ...bearer(token),
      ...(visitorName ? { 'X-Visitor-Name': encodeURIComponent(visitorName) } : {}),
    },
  })

  return {
    treeId: data?.treeId || treeId,
    rootPersonId: data?.rootPersonId || null,
    graph: data?.graph || { persons: [], unions: [], filiations: [], medias: [] },
    mediaToken: data?.mediaToken || '',
    surnameUppercase: Boolean(data?.display?.surnameUppercase),
  }
}

// Frise de vie d'une personne : événements, précisions de date, lieux des unions
export async function fetchPersonLife(treeId, personId, token) {
  return apiRequest(`/trees/${encodeURIComponent(treeId)}/persons/${encodeURIComponent(personId)}/life`, {
    method: 'GET',
    headers: bearer(token),
  })
}

// Moments saisis dans l'onglet Vie (administrateurs)
export async function createLifeEvent(treeId, personId, payload, token) {
  return apiRequest(`/trees/${encodeURIComponent(treeId)}/persons/${encodeURIComponent(personId)}/life/events`, {
    method: 'POST',
    idempotent: true,
    headers: bearer(token),
    body: JSON.stringify(payload),
  })
}

export async function updateLifeEvent(treeId, eventId, payload, token) {
  return apiRequest(`/trees/${encodeURIComponent(treeId)}/life/events/${encodeURIComponent(eventId)}`, {
    method: 'PATCH',
    headers: bearer(token),
    body: JSON.stringify(payload),
  })
}

export async function deleteLifeEvent(treeId, eventId, token, { keepalive = false } = {}) {
  return apiRequest(`/trees/${encodeURIComponent(treeId)}/life/events/${encodeURIComponent(eventId)}`, {
    method: 'DELETE',
    keepalive,
    headers: bearer(token),
  })
}

export async function listTrees(token) {
  const data = await apiRequest('/trees', {
    method: 'GET',
    headers: bearer(token),
  })

  return {
    trees: Array.isArray(data?.trees) ? data.trees : [],
    lastOpenedTree: data?.lastOpenedTree || null,
  }
}

export async function getTree(treeId, token) {
  const data = await apiRequest(`/trees/${encodeURIComponent(treeId)}`, {
    method: 'GET',
    headers: bearer(token),
  })

  return {
    tree: data?.tree || null,
    role: data?.role || '',
  }
}

export async function createTree(payload, token) {
  const data = await apiRequest('/trees', {
    method: 'POST',
    headers: bearer(token),
    body: JSON.stringify(payload),
  })

  return data.tree
}

export async function updateTree(treeId, payload, token) {
  const data = await apiRequest(`/trees/${encodeURIComponent(treeId)}`, {
    method: 'PATCH',
    headers: bearer(token),
    body: JSON.stringify(payload),
  })

  return data.tree
}

export async function deleteTree(treeId, token) {
  const data = await apiRequest(`/trees/${encodeURIComponent(treeId)}`, {
    method: 'DELETE',
    headers: bearer(token),
  })

  return data
}

export async function createPerson(treeId, payload, token) {
  const data = await apiRequest(`/trees/${encodeURIComponent(treeId)}/persons`, {
    method: 'POST',
    headers: bearer(token),
    body: JSON.stringify(payload),
  })

  return data.person
}

export async function updatePerson(treeId, personId, payload, token) {
  const data = await apiRequest(`/trees/${encodeURIComponent(treeId)}/persons/${encodeURIComponent(personId)}`, {
    method: 'PATCH',
    headers: bearer(token),
    body: JSON.stringify(payload),
  })

  return data.person
}

export async function deletePerson(treeId, personId, token, { keepalive = false } = {}) {
  const data = await apiRequest(`/trees/${encodeURIComponent(treeId)}/persons/${encodeURIComponent(personId)}`, {
    method: 'DELETE',
    keepalive,
    headers: bearer(token),
  })

  return data
}

export async function createUnion(treeId, payload, token) {
  const data = await apiRequest(`/trees/${encodeURIComponent(treeId)}/unions`, {
    method: 'POST',
    headers: bearer(token),
    body: JSON.stringify(payload),
  })

  return data.union
}

export async function createParentChildLink(treeId, payload, token) {
  const data = await apiRequest(`/trees/${encodeURIComponent(treeId)}/links`, {
    method: 'POST',
    headers: bearer(token),
    body: JSON.stringify(payload),
  })

  return data.link
}

// Type, date et lieu d'un couple, depuis l'onglet Vie
export async function updateUnion(treeId, unionId, payload, token) {
  const data = await apiRequest(`/trees/${encodeURIComponent(treeId)}/unions/${encodeURIComponent(unionId)}`, {
    method: 'PATCH',
    headers: bearer(token),
    body: JSON.stringify(payload),
  })

  return data.union
}

export async function deleteUnion(treeId, unionId, token) {
  const data = await apiRequest(`/trees/${encodeURIComponent(treeId)}/unions/${encodeURIComponent(unionId)}`, {
    method: 'DELETE',
    headers: bearer(token),
  })

  return data
}

// Ordre d'une fratrie : chaque enfant, dans l'ordre voulu, avec ses liens vers ses parents
export async function reorderSiblings(treeId, order, token) {
  return apiRequest(`/trees/${encodeURIComponent(treeId)}/links/order`, {
    method: 'PUT',
    headers: bearer(token),
    body: JSON.stringify({ order }),
  })
}

// Lien parent-enfant modifié (type de filiation : naissance ou adoption)
export async function updateParentChildLink(treeId, linkId, payload, token) {
  const data = await apiRequest(`/trees/${encodeURIComponent(treeId)}/links/${encodeURIComponent(linkId)}`, {
    method: 'PATCH',
    headers: bearer(token),
    body: JSON.stringify(payload),
  })

  return data.link
}

export async function deleteParentChildLink(treeId, linkId, token) {
  const data = await apiRequest(`/trees/${encodeURIComponent(treeId)}/links/${encodeURIComponent(linkId)}`, {
    method: 'DELETE',
    headers: bearer(token),
  })

  return data
}

export async function rotateTreePasswords(treeId, payload, token) {
  const data = await apiRequest(`/trees/${encodeURIComponent(treeId)}/access/passwords`, {
    method: 'PATCH',
    headers: bearer(token),
    body: JSON.stringify(payload),
  })

  return data
}

export async function fetchSharePassword(treeId, token) {
  return apiRequest(`/trees/${encodeURIComponent(treeId)}/access/passwords`, {
    method: 'GET',
    headers: bearer(token),
  })
}

export async function rememberSharePassword(treeId, password, token) {
  return apiRequest(`/trees/${encodeURIComponent(treeId)}/access/passwords/remember`, {
    method: 'POST',
    headers: bearer(token),
    body: JSON.stringify({ password }),
  })
}

export async function fetchTreeSettings(treeId, token) {
  const data = await apiRequest(`/trees/${encodeURIComponent(treeId)}/settings`, {
    method: 'GET',
    headers: bearer(token),
  })

  return data?.settings || null
}

export async function updateTreeSettings(treeId, payload, token) {
  const data = await apiRequest(`/trees/${encodeURIComponent(treeId)}/settings`, {
    method: 'PATCH',
    headers: bearer(token),
    body: JSON.stringify(payload),
  })

  return data?.settings || null
}

// Journal des visites (administrateurs de l'arbre)
export async function listTreeVisits(treeId, token) {
  const data = await apiRequest(`/trees/${encodeURIComponent(treeId)}/visits`, {
    method: 'GET',
    headers: bearer(token),
  })

  return {
    summary: data?.summary || { last7: { visits: 0, visitors: 0 }, last30: { visits: 0, visitors: 0 } },
    recent: Array.isArray(data?.recent) ? data.recent : [],
  }
}

export async function submitContributionSession(treeId, payload, token) {
  const data = await apiRequest(`/trees/${encodeURIComponent(treeId)}/contributions/sessions`, {
    method: 'POST',
    idempotent: true,
    headers: bearer(token),
    body: JSON.stringify(payload),
  })

  return data
}

export async function listContributionSessions(treeId, token, status = 'pending') {
  const query = status ? `?status=${encodeURIComponent(status)}` : ''
  const data = await apiRequest(`/trees/${encodeURIComponent(treeId)}/contributions/sessions${query}`, {
    method: 'GET',
    headers: bearer(token),
  })

  return Array.isArray(data?.sessions) ? data.sessions : []
}

export async function reviewContributionSession(treeId, sessionId, payload, token) {
  const data = await apiRequest(`/trees/${encodeURIComponent(treeId)}/contributions/sessions/${encodeURIComponent(sessionId)}/review`, {
    method: 'POST',
    headers: bearer(token),
    body: JSON.stringify(payload),
  })

  return data
}

// État d'une proposition envoyée (en attente, acceptée, refusée) : la famille retire ses fantômes une fois relue
export async function fetchContributionStatus(treeId, sessionId, token) {
  const data = await apiRequest(`/trees/${encodeURIComponent(treeId)}/contributions/sessions/${encodeURIComponent(sessionId)}/status`, {
    method: 'GET',
    headers: bearer(token),
  })

  return data?.status || null
}

export async function uploadAnnotationPhoto(treeId, payload, token) {
  const data = await apiRequest(`/trees/${encodeURIComponent(treeId)}/annotation-photos`, {
    method: 'POST',
    idempotent: true,
    headers: bearer(token),
    body: JSON.stringify(payload),
  })

  return data // { photoId, photoPath }
}

export async function uploadPersonMedia(treeId, personId, payload, token) {
  const data = await apiRequest(`/trees/${encodeURIComponent(treeId)}/persons/${encodeURIComponent(personId)}/media`, {
    method: 'POST',
    idempotent: true,
    headers: bearer(token),
    body: JSON.stringify(payload),
  })

  return data.media
}

export async function reorderPersonMedia(treeId, personId, orderedMediaIds, token) {
  const data = await apiRequest(`/trees/${encodeURIComponent(treeId)}/persons/${encodeURIComponent(personId)}/media/reorder`, {
    method: 'PATCH',
    headers: bearer(token),
    body: JSON.stringify({ orderedMediaIds }),
  })

  return data
}

export async function deletePersonMedia(treeId, personId, mediaId, token, { keepalive = false } = {}) {
  const data = await apiRequest(
    `/trees/${encodeURIComponent(treeId)}/persons/${encodeURIComponent(personId)}/media/${encodeURIComponent(mediaId)}`,
    {
      method: 'DELETE',
      keepalive,
      headers: bearer(token),
    },
  )

  return data
}

// Modifier un souvenir (titre, moment de vie, texte de citation) : administrateurs seulement
export async function updatePersonMedia(treeId, personId, mediaId, payload, token) {
  const data = await apiRequest(
    `/trees/${encodeURIComponent(treeId)}/persons/${encodeURIComponent(personId)}/media/${encodeURIComponent(mediaId)}`,
    {
      method: 'PATCH',
      headers: bearer(token),
      body: JSON.stringify(payload),
    },
  )

  return data
}

// Personnes identifiées sur un souvenir : la liste remplace la précédente. Administrateur, enregistré tout de
// suite ; famille, une proposition (status « pending ») relue par l'administrateur
export async function updateMediaPeople(treeId, mediaId, payload, token) {
  return apiRequest(
    `/trees/${encodeURIComponent(treeId)}/media/${encodeURIComponent(mediaId)}/people`,
    {
      method: 'PUT',
      headers: bearer(token),
      body: JSON.stringify(payload),
    },
  )
}

export async function uploadPersonAvatar(treeId, personId, payload, token) {
  const data = await apiRequest(`/trees/${encodeURIComponent(treeId)}/persons/${encodeURIComponent(personId)}/avatar`, {
    method: 'POST',
    headers: bearer(token),
    body: JSON.stringify(payload),
  })

  return data
}

// Cadrage du portrait ({ x, y, zoom }) ou null pour le cadrage par défaut
export async function saveAvatarCrop(treeId, personId, crop, token) {
  const data = await apiRequest(`/trees/${encodeURIComponent(treeId)}/persons/${encodeURIComponent(personId)}/avatar/crop`, {
    method: 'PUT',
    headers: bearer(token),
    body: JSON.stringify({ crop }),
  })

  return data
}

export async function deletePersonAvatar(treeId, personId, token) {
  const data = await apiRequest(`/trees/${encodeURIComponent(treeId)}/persons/${encodeURIComponent(personId)}/avatar`, {
    method: 'DELETE',
    headers: bearer(token),
  })

  return data
}

export async function batchAnnotations(treeId, payload, token) {
  const data = await apiRequest(`/trees/${encodeURIComponent(treeId)}/annotations/batch`, {
    method: 'POST',
    headers: bearer(token),
    body: JSON.stringify(payload),
  })

  return data
}

export async function exportGedcom(treeId, token) {
  const resp = await fetch(`${API_BASE_URL}/trees/${encodeURIComponent(treeId)}/export/gedcom`, {
    headers: bearer(token),
  })
  if (!resp.ok) {
    throw new Error('export_failed')
  }
  const blob = await resp.blob()
  const disposition = resp.headers.get('Content-Disposition') ?? ''
  const filenameMatch = disposition.match(/filename="([^"]+)"/)
  const filename = filenameMatch ? filenameMatch[1] : 'arbre.ged'
  return { blob, filename }
}

export async function importGedcom(treeId, fileContent, token) {
  const data = await apiRequest(`/trees/${encodeURIComponent(treeId)}/import/gedcom`, {
    method: 'POST',
    headers: bearer(token),
    body: JSON.stringify({ content: fileContent }),
    // Un gros arbre se crée en une transaction d'une minute au plus côté serveur
    timeoutMs: 3 * 60_000,
  })
  return data
}
