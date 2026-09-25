import { useState } from 'react'
import { uploadPersonMedia, reorderPersonMedia, deletePersonMedia } from '../api/treeApi'
import { getPersonMedias } from '../data/mockData'
import { fileToBase64, getAccountErrorMessage } from '../utils/errorMessages'
import { getUploadMimeType, resolveUploadMediaType, validateMediaFile } from '../utils/mediaUpload'
import { saveContributorName } from '../utils/contributorName'

// Souvenir envoyé par la famille : en attente de la relecture du propriétaire
function noticeFor(created) {
  return created?.status === 'pending'
    ? "Merci, c'est envoyé. Le souvenir apparaîtra dans la fiche quand la personne qui gère l'arbre l'aura accepté."
    : ''
}

export function useMediaManager({
  canEditCurrentTree,
  canSubmitContribution,
  selectedPerson,
  treeContext,
  refreshCurrentTreeGraph,
  refreshTreeAndKeepSelection,
}) {
  const [mediaManagerState, setMediaManagerState] = useState({ visible: false, loading: false, error: '', notice: '' })

  const selectedPersonMedias = selectedPerson ? getPersonMedias(selectedPerson.id) : []

  const canUploadMedia = canEditCurrentTree || canSubmitContribution

  const handleOpenMediaManager = () => {
    if (!canUploadMedia || !selectedPerson) {
      return
    }

    setMediaManagerState({ visible: true, loading: false, error: '', notice: '' })
  }

  const handleCloseMediaManager = () => {
    setMediaManagerState((current) => ({
      ...current,
      visible: false,
      error: '',
    }))
  }

  const refreshAfterMediaMutation = async (personId) => {
    if (typeof refreshTreeAndKeepSelection === 'function') {
      await refreshTreeAndKeepSelection(personId, { relayout: false })
      return
    }

    await refreshCurrentTreeGraph({ relayout: false })
  }

  const handleUploadPersonMedia = async ({
    file,
    caption,
    source = null,
    mediaType,
    citationText = '',
    youtubeUrl = null,
    submittedByLabel = null,
  }) => {
    if (!canUploadMedia || !selectedPerson || !treeContext.treeId || !treeContext.accessToken) {
      return
    }

    // Prénom de la personne qui propose (famille), retenu pour la fois suivante
    const byLabel = submittedByLabel ? { submittedByLabel } : {}
    if (submittedByLabel) saveContributorName(submittedByLabel)

    const personId = selectedPerson.id

    // YouTube video — no file needed
    if (mediaType === 'video' && youtubeUrl) {
      setMediaManagerState((current) => ({ ...current, loading: true, error: '', notice: '' }))
      try {
        const created = await uploadPersonMedia(
          treeContext.treeId,
          personId,
          {
            type: 'video',
            mimeType: 'video/youtube',
            youtubeUrl,
            caption: caption || null,
            source,
            ...byLabel,
          },
          treeContext.accessToken,
        )
        await refreshAfterMediaMutation(personId)
        setMediaManagerState((current) => ({ ...current, loading: false, error: '', notice: noticeFor(created) }))
      } catch (error) {
        setMediaManagerState((current) => ({ ...current, loading: false, error: getAccountErrorMessage(error) }))
      }
      return
    }

    const resolvedType = resolveUploadMediaType(file, mediaType)
    const resolvedCitationText = String(citationText || caption || '').trim()
    const validationError = validateMediaFile(file, resolvedType, { citationText: resolvedCitationText })
    if (validationError) {
      setMediaManagerState((current) => ({
        ...current,
        loading: false,
        error: validationError,
      }))
      return
    }

    setMediaManagerState((current) => ({
      ...current,
      loading: true,
      error: '',
      notice: '',
    }))

    try {
      let created = null
      if (resolvedType === 'citation') {
        created = await uploadPersonMedia(
          treeContext.treeId,
          personId,
          {
            type: 'citation',
            caption: resolvedCitationText,
            source,
            ...byLabel,
          },
          treeContext.accessToken,
        )
      } else {
        const dataBase64 = await fileToBase64(file)

        created = await uploadPersonMedia(
          treeContext.treeId,
          personId,
          {
            type: resolvedType,
            fileName: file.name || 'upload.jpg',
            mimeType: getUploadMimeType(file, resolvedType),
            sizeBytes: file.size,
            dataBase64,
            caption,
            source,
            ...byLabel,
          },
          treeContext.accessToken,
        )
      }

      await refreshAfterMediaMutation(personId)

      setMediaManagerState((current) => ({
        ...current,
        loading: false,
        error: '',
        notice: noticeFor(created),
      }))
    } catch (error) {
      setMediaManagerState((current) => ({
        ...current,
        loading: false,
        error: getAccountErrorMessage(error),
      }))
    }
  }

  const handleMovePersonMedia = async (mediaId, direction) => {
    if (!canEditCurrentTree || !selectedPerson || !treeContext.treeId || !treeContext.accessToken) {
      return
    }

    const personId = selectedPerson.id

    const orderedIds = selectedPersonMedias.map((media) => media.id)
    const currentIndex = orderedIds.findIndex((id) => id === mediaId)
    if (currentIndex < 0) {
      return
    }

    const nextIndex = currentIndex + direction
    if (nextIndex < 0 || nextIndex >= orderedIds.length) {
      return
    }

    const reordered = [...orderedIds]
    const [moved] = reordered.splice(currentIndex, 1)
    reordered.splice(nextIndex, 0, moved)

    setMediaManagerState((current) => ({
      ...current,
      loading: true,
      error: '',
    }))

    try {
      await reorderPersonMedia(treeContext.treeId, personId, reordered, treeContext.accessToken)
      await refreshAfterMediaMutation(personId)
      setMediaManagerState((current) => ({
        ...current,
        loading: false,
      }))
    } catch (error) {
      setMediaManagerState((current) => ({
        ...current,
        loading: false,
        error: getAccountErrorMessage(error),
      }))
    }
  }

  const handleDeletePersonMedia = async (mediaId) => {
    if (!canEditCurrentTree || !selectedPerson || !treeContext.treeId || !treeContext.accessToken) {
      return
    }

    const personId = selectedPerson.id

    setMediaManagerState((current) => ({
      ...current,
      loading: true,
      error: '',
    }))

    try {
      await deletePersonMedia(treeContext.treeId, personId, mediaId, treeContext.accessToken)
      await refreshAfterMediaMutation(personId)
      setMediaManagerState((current) => ({
        ...current,
        loading: false,
      }))
    } catch (error) {
      setMediaManagerState((current) => ({
        ...current,
        loading: false,
        error: getAccountErrorMessage(error),
      }))
    }
  }

  const resetMediaManager = () => {
    setMediaManagerState({ visible: false, loading: false, error: '' })
  }

  return {
    mediaManagerState,
    selectedPersonMedias,
    handleOpenMediaManager,
    handleCloseMediaManager,
    handleUploadPersonMedia,
    handleMovePersonMedia,
    handleDeletePersonMedia,
    resetMediaManager,
  }
}
