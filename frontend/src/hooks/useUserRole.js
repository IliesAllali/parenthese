import { useMemo } from 'react'

function normalize(value) {
  return String(value || '').trim().toLowerCase()
}

/**
 * Hook pour déterminer le rôle et les permissions de l'utilisateur courant
 *
 * @param {Object} params
 * @param {Object} params.treeContext - Contexte de l'arbre actuel
 * @param {boolean} params.authenticated - L'utilisateur est-il authentifié
 * @returns {Object} Informations sur le rôle et permissions
 */
export function useUserRole({ treeContext, authenticated }) {
  return useMemo(() => {
    const role = normalize(treeContext.role)
    const accessMode = normalize(treeContext.accessMode)

    // Déterminer le rôle effectif
    const isOwner = role === 'owner'
    const isAdmin = role === 'owner' || role === 'admin'
    const isMember = role === 'member' && accessMode === 'member'
    const isContributor = role === 'contributor' || (accessMode === 'share' && role === 'contributor')
    const isVisitor = role === 'visitor' || (!role && accessMode === 'share')

    // Permissions dérivées
    const canEdit = isAdmin
    const canContribute = isContributor || isMember
    const canViewContributions = isAdmin
    const canManageSharing = isOwner
    const canAccessSettings = isAdmin

    // Déterminer le type de navbar à afficher
    let navbarType = 'public'
    if (isAdmin) {
      navbarType = 'admin'
    } else if (authenticated && (isMember || isContributor)) {
      navbarType = 'contributor_auth'
    } else if (isContributor) {
      navbarType = 'contributor_anon'
    } else if (isVisitor) {
      navbarType = 'visitor'
    }

    return {
      // Rôles
      isOwner,
      isAdmin,
      isMember,
      isContributor,
      isVisitor,

      // Permissions
      canEdit,
      canContribute,
      canViewContributions,
      canManageSharing,
      canAccessSettings,

      // Type de navbar
      navbarType,

      // État authentification
      authenticated,

      // Info brute
      role,
      accessMode,
    }
  }, [treeContext, authenticated])
}
