import { useCallback, useMemo, useState } from 'react'
import { API_BASE_URL } from '../api/client'
import { fetchTreeGraph, unlockTreeAccess } from '../api/treeApi'
import { loadGraphData, persons as graphPersons, resetToDemoData } from '../data/mockData'
import { getShareErrorMessage } from '../utils/errorMessages'

export const TREE_ID_FROM_ENV = (import.meta.env.VITE_TREE_ID || '').trim()

const TOKEN_STORAGE_PREFIX = 'tree_access_token_'

function normalizeRole(role) {
  return String(role || '').trim().toLowerCase()
}

export function getTreeTokenStorageKey(treeId) {
  return `${TOKEN_STORAGE_PREFIX}${treeId}`
}

// Rôle porté par un jeton d'accès partagé (payload JWT, sans vérification : le serveur tranche)
export function readTreeAccessRole(token) {
  try {
    const payload = JSON.parse(atob(String(token).split('.')[1].replace(/-/g, '+').replace(/_/g, '/')))
    return payload?.role === 'contributor' ? 'contributor' : 'visitor'
  } catch {
    return 'visitor'
  }
}

export function getSlugFromPathname() {
  const match = window.location.pathname.match(/^\/arbre\/([^/]+)$/)
  return match ? decodeURIComponent(match[1]) : null
}

export function useTreeAccess() {
  const [treeContext, setTreeContext] = useState({
    treeId: '',
    treeName: '',
    treeDescription: '',
    treeOwnerName: '',
    treeOwnerEmail: '',
    role: '',
    accessMode: '',
    rootPersonId: null,
    accessToken: '',
  })
  const [bootState, setBootState] = useState('loading')
  const [gateLoading, setGateLoading] = useState(false)
  const [gateError, setGateError] = useState('')
  const [selectedPerson, setSelectedPerson] = useState(null)
  const [selectedMedia, setSelectedMedia] = useState(null)
  const [wizardState, setWizardState] = useState({ visible: false, loading: false, error: '' })
  const [graphRevision, setGraphRevision] = useState(0)

  const canEditCurrentTree = useMemo(() => {
    const role = normalizeRole(treeContext.role)
    return role === 'owner' || role === 'admin'
  }, [treeContext.role])
  const canSubmitContribution = useMemo(() => {
    const role = normalizeRole(treeContext.role)
    return Boolean(role) && role !== 'visitor'
  }, [treeContext.role])

  const openTreeGraph = async (treeId, token, options = {}) => {
    const graphPayload = await fetchTreeGraph(treeId, token)
    loadGraphData(graphPayload.graph, {
      authToken: token,
      apiBaseUrl: API_BASE_URL,
      avatarCacheBust: Date.now(),
    })
    if (options.relayout !== false) {
      setGraphRevision((current) => current + 1)
    }
    const preferredRootPersonId = options.rootPersonId ?? graphPayload.rootPersonId ?? null
    const rootPerson = preferredRootPersonId
      ? graphPersons.find((person) => String(person.id) === String(preferredRootPersonId)) || null
      : null
    setSelectedPerson(rootPerson)
    setSelectedMedia(null)

    setTreeContext((current) => ({
      treeId,
      treeName: options.treeName ?? current.treeName,
      treeDescription: options.treeDescription ?? current.treeDescription,
      treeOwnerName: options.treeOwnerName ?? current.treeOwnerName,
      treeOwnerEmail: options.treeOwnerEmail ?? current.treeOwnerEmail,
      role: normalizeRole(options.role ?? current.role),
      accessMode: options.accessMode ?? current.accessMode,
      rootPersonId: preferredRootPersonId,
      accessToken: token,
    }))

    const effectiveRole = normalizeRole(options.role)
    const shouldPromptWizard =
      Boolean(options.promptWizard) &&
      (effectiveRole === 'owner' || effectiveRole === 'admin') &&
      Array.isArray(graphPayload?.graph?.persons) &&
      graphPayload.graph.persons.length === 0

    if (shouldPromptWizard) {
      setWizardState({ visible: true, loading: false, error: '' })
    } else {
      setWizardState((current) => ({ ...current, visible: false, loading: false, error: '' }))
    }

    setBootState('ready')
    return graphPayload
  }

  const refreshCurrentTreeGraph = async (options = {}) => {
    await openTreeGraph(treeContext.treeId, treeContext.accessToken, {
      treeName: treeContext.treeName,
      treeDescription: treeContext.treeDescription,
      treeOwnerName: treeContext.treeOwnerName,
      treeOwnerEmail: treeContext.treeOwnerEmail,
      role: treeContext.role,
      accessMode: treeContext.accessMode,
      rootPersonId: treeContext.rootPersonId,
      promptWizard: false,
      relayout: options.relayout !== false,
      avatarCacheBust: options.avatarCacheBust,
    })
  }

  const bumpGraphRevision = useCallback(() => {
    setGraphRevision((current) => current + 1)
  }, [])

  const handleUnlock = async (treeId, password, options = {}) => {
    setGateLoading(true)
    setGateError('')

    try {
      const access = await unlockTreeAccess(treeId, password, options.userToken || '')
      localStorage.setItem(getTreeTokenStorageKey(treeId), access.token)
      await openTreeGraph(treeId, access.token, {
        treeName: options.treeName ?? treeContext.treeName,
        treeDescription: options.treeDescription ?? treeContext.treeDescription,
        treeOwnerName: options.treeOwnerName ?? treeContext.treeOwnerName,
        treeOwnerEmail: options.treeOwnerEmail ?? treeContext.treeOwnerEmail,
        role: access.role,
        accessMode: 'share',
        promptWizard: false,
      })
      return access
    } catch (error) {
      setGateError(getShareErrorMessage(error))
      return null
    } finally {
      setGateLoading(false)
    }
  }

  const handleMediaSelect = (media, person) => {
    setSelectedMedia({ media, person })
  }

  const setWizardVisibility = (visible, error = '') => {
    setWizardState((current) => ({
      ...current,
      visible,
      error,
    }))
  }

  const handleSkipWizard = () => {
    setWizardState({ visible: false, loading: false, error: '' })
  }

  const handleUseDemo = () => {
    resetToDemoData()
    setGraphRevision((current) => current + 1)
    setSelectedPerson(null)
    setSelectedMedia(null)
    setGateError('')
    setWizardState({ visible: false, loading: false, error: '' })
    setTreeContext({
      treeId: '',
      treeName: '',
      treeDescription: '',
      treeOwnerName: '',
      treeOwnerEmail: '',
      role: '',
      accessMode: 'demo',
      rootPersonId: null,
      accessToken: '',
    })
    setBootState('ready')
  }

  return {
    treeContext, setTreeContext,
    bootState, setBootState,
    gateLoading, gateError, setGateError,
    selectedPerson, setSelectedPerson,
    selectedMedia, setSelectedMedia,
    wizardState, setWizardState,
    graphRevision,
    bumpGraphRevision,
    canEditCurrentTree,
    canSubmitContribution,
    openTreeGraph,
    refreshCurrentTreeGraph,
    handleUnlock,
    handleMediaSelect,
    setWizardVisibility,
    handleSkipWizard,
    handleUseDemo,
  }
}
