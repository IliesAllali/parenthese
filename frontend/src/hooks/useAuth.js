import { useState } from 'react'
import {
  deleteAccount,
  exchangeOidcCode,
  fetchAccountProfile,
  fetchLastOpenedTree,
  keepProvisionalAccount,
  loginUser,
  logoutUser,
  registerUser,
  startProvisionalAccount,
  resumeProvisionalSession,
  updateLastOpenedTree,
} from '../api/authApi'
import { listTrees } from '../api/treeApi'
import { getSource, trackAppEvent } from '../utils/analytics'
import { getAccountDeletionErrorMessage, getAccountErrorMessage } from '../utils/errorMessages'
import { clearAccountLocalData } from '../utils/localHygiene.js'

const USER_TOKEN_STORAGE_KEY = 'user_auth_token'
const USER_PROFILE_STORAGE_KEY = 'user_auth_profile'

function saveUserProfile(user) {
  if (!user) {
    localStorage.removeItem(USER_PROFILE_STORAGE_KEY)
    return
  }

  localStorage.setItem(USER_PROFILE_STORAGE_KEY, JSON.stringify(user))
}

function loadUserProfile() {
  const raw = localStorage.getItem(USER_PROFILE_STORAGE_KEY)
  if (!raw) {
    return null
  }

  try {
    const parsed = JSON.parse(raw)
    return parsed && typeof parsed === 'object' ? parsed : null
  } catch {
    return null
  }
}

export function useAuth() {
  const [userAuth, setUserAuth] = useState({ token: '', user: loadUserProfile() })
  const [accountTrees, setAccountTrees] = useState([])
  const [lastOpenedTree, setLastOpenedTree] = useState(null)
  const [accountLoading, setAccountLoading] = useState(false)
  const [accountError, setAccountError] = useState('')

  const authenticated = Boolean(userAuth.token)
  // Arbre fait avant le compte (#251) : session sans email, à garder avant 30 jours
  const provisional = authenticated && userAuth.user?.provisional === true

  // Prénom du compte : lu sur le serveur, gardé dans le profil local pour le bandeau de la porte
  const refreshAccountProfile = async (token) => {
    try {
      const response = await fetchAccountProfile(token)
      if (!response?.user) return
      const merged = { ...(loadUserProfile() || {}), ...response.user }
      saveUserProfile(merged)
      setUserAuth((current) => (current.token === token ? { ...current, user: merged } : current))
    } catch {
      // Profil non lu : le bandeau reste neutre, la session n'est pas touchée
    }
  }

  const loadAccountTrees = async (token) => {
    const [response] = await Promise.all([listTrees(token), refreshAccountProfile(token)])
    const trees = Array.isArray(response?.trees) ? response.trees : []
    const lastTree = response?.lastOpenedTree || null
    setAccountTrees(trees)
    setLastOpenedTree(lastTree)
    return { trees, lastOpenedTree: lastTree }
  }

  // Session ouverte : jeton et profil gardés sur l'appareil, puis les arbres du compte
  const openSession = async (token, user) => {
    if (loadUserProfile()?.provisional === true && user?.provisional !== true) trackAppEvent('account_kept', { source: getSource() })
    localStorage.setItem(USER_TOKEN_STORAGE_KEY, token)
    saveUserProfile(user || null)
    setUserAuth({ token, user })
    await Promise.all([
      loadAccountTrees(token),
      fetchLastOpenedTree(token).then((lastTree) => {
        if (lastTree) setLastOpenedTree(lastTree)
      }).catch(() => {}),
    ])
  }

  // Depuis un arbre provisoire, la session part avec la connexion : l'arbre rejoint le compte retrouvé
  const handleLogin = (email, password) => signIn(() => loginUser(email, password, provisional ? userAuth.token : ''))

  // Retour d'une connexion OIDC : le jeton de passage devient une session, comme une connexion par mot de passe
  const handleOidcExchange = (code) => signIn(() => exchangeOidcCode(code))

  const signIn = async (request) => {
    setAccountLoading(true)
    setAccountError('')

    try {
      const result = await request()
      const storedProfile = loadUserProfile()
      const mergedUser = {
        ...(storedProfile && storedProfile.email === result.user?.email ? storedProfile : {}),
        ...(result.user || {}),
      }
      await openSession(result.token, mergedUser)
      return true
    } catch (error) {
      setAccountError(getAccountErrorMessage(error))
      return false
    } finally {
      setAccountLoading(false)
    }
  }

  const handleRegister = async (firstName, email, password, invitationToken) => {
    setAccountLoading(true)
    setAccountError('')

    try {
      const result = await registerUser(firstName, email, password, invitationToken)
      const mergedUser = {
        ...(result.user || {}),
        firstName: firstName || result.user?.firstName || '',
      }
      await openSession(result.token, mergedUser)
      return true
    } catch (error) {
      setAccountError(getAccountErrorMessage(error))
      return false
    } finally {
      setAccountLoading(false)
    }
  }

  // « Créer mon arbre » sans compte : la session du compte provisoire, ouverte comme une autre
  const handleStartProvisional = async (firstName) => {
    const result = await startProvisionalAccount(firstName)
    localStorage.setItem(USER_TOKEN_STORAGE_KEY, result.token)
    saveUserProfile(result.user)
    setUserAuth({ token: result.token, user: result.user })
    return result.token
  }

  // Au chargement : la session provisoire revient (du cookie si le stockage est vide) et ses 30 jours repartent.
  // Renvoie la visite d'avant, ou null sans arbre provisoire. Un arbre effacé entre-temps vide la session gardée.
  const resumeProvisional = async () => {
    const stored = restoreUserToken()
    if (stored && loadUserProfile()?.provisional !== true) return null
    try {
      const result = await resumeProvisionalSession(stored || '')
      localStorage.setItem(USER_TOKEN_STORAGE_KEY, result.token)
      saveUserProfile(result.user)
      setUserAuth({ token: result.token, user: result.user })
      return { lastVisitAt: result.lastVisitAt || null }
    } catch (error) {
      if (stored && error?.status === 401) clearStoredUserToken()
      return null
    }
  }

  // « Gardez votre arbre » par email et mot de passe : une session de compte remplace la session provisoire
  const handleKeep = async (email, password) => {
    setAccountLoading(true)
    setAccountError('')
    try {
      const result = await keepProvisionalAccount(userAuth.token, email, password)
      await openSession(result.token, { ...(userAuth.user || {}), ...result.user })
      return true
    } catch (error) {
      setAccountError(getAccountErrorMessage(error))
      return false
    } finally {
      setAccountLoading(false)
    }
  }

  const handleLogout = async () => {
    const token = userAuth.token
    setAccountLoading(true)
    setAccountError('')

    try {
      if (token) {
        await logoutUser(token)
      }
    } catch {
      // ignore logout errors and clear local session anyway
    } finally {
      localStorage.removeItem(USER_TOKEN_STORAGE_KEY)
      // Brouillons, fiche « c'est moi » et profil : rien du compte ne reste pour la personne suivante
      clearAccountLocalData()
      setUserAuth({ token: '', user: null })
      setAccountTrees([])
      setLastOpenedTree(null)
      setAccountLoading(false)
    }
  }

  const restoreUserToken = () => localStorage.getItem(USER_TOKEN_STORAGE_KEY)

  const clearStoredUserToken = () => {
    localStorage.removeItem(USER_TOKEN_STORAGE_KEY)
    localStorage.removeItem(USER_PROFILE_STORAGE_KEY)
    setUserAuth({ token: '', user: null })
    setAccountTrees([])
    setLastOpenedTree(null)
  }

  // Renvoie null en cas de succès (session locale effacée), sinon un message d'erreur affichable.
  const handleDeleteAccount = async (confirmation) => {
    const token = userAuth.token
    if (!token) {
      return getAccountDeletionErrorMessage({ status: 401 })
    }

    try {
      await deleteAccount(token, confirmation)
    } catch (error) {
      return getAccountDeletionErrorMessage(error, confirmation)
    }

    clearStoredUserToken()
    clearAccountLocalData()
    return null
  }

  const persistLastOpenedTree = async (payload) => {
    if (!userAuth.token) {
      return null
    }

    try {
      const updated = await updateLastOpenedTree(userAuth.token, payload)
      if (updated) setLastOpenedTree(updated)
      return updated
    } catch {
      return null
    }
  }

  return {
    userAuth, setUserAuth,
    accountTrees,
    lastOpenedTree,
    accountLoading, setAccountLoading,
    accountError, setAccountError,
    authenticated,
    provisional,
    loadAccountTrees,
    handleLogin,
    handleRegister,
    handleStartProvisional,
    handleKeep,
    resumeProvisional,
    handleOidcExchange,
    handleLogout,
    handleDeleteAccount,
    restoreUserToken,
    restoreUserProfile: loadUserProfile,
    clearStoredUserToken,
    persistLastOpenedTree,
  }
}
