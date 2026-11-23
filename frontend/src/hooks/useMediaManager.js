import { useEffect, useState } from 'react'
import { uploadPersonMedia, reorderPersonMedia, deletePersonMedia, updatePersonMedia, updateMediaPeople, fetchPersonLife, uploadMediaThumbnail } from '../api/treeApi'
import { getPersonMedias, setMediaThumbnail } from '../data/mockData'
import { fileToBase64, getAccountErrorMessage } from '../utils/errorMessages'
import { getUploadMimeType, resolveUploadMediaType, validateMediaFile } from '../utils/mediaUpload'
import { prepareImageForUpload } from '../utils/photoImport.js'
import { captureVideoFrame, isVideoFileMime, videoThumbnailField } from '../utils/videoFrame.js'
import { readContributorName, saveContributorName } from '../utils/contributorName'
import { t } from '../i18n/index.js'

// Vidéos dont la miniature a déjà été tentée pendant cette session (réussie ou non) : une seule fois chacune
const thumbnailAttempts = new Set()

// Souvenir envoyé par la famille : en attente de la relecture du propriétaire
function noticeFor(created) {
  return created?.status === 'pending'
    ? t("Merci, c'est envoyé. Le souvenir apparaîtra dans la fiche quand la personne qui gère l'arbre l'aura accepté.")
    : ''
}

export function useMediaManager({
  canEditCurrentTree,
  canSubmitContribution,
  selectedPerson,
  treeContext,
  refreshCurrentTreeGraph,
  refreshTreeAndKeepSelection,
  bumpAssetRevision,
}) {
  const [mediaManagerState, setMediaManagerState] = useState({ visible: false, loading: false, error: '', notice: '' })

  const selectedPersonMedias = selectedPerson ? getPersonMedias(selectedPerson.id) : []

  const canUploadMedia = canEditCurrentTree || canSubmitContribution

  // Fichier vidéo envoyé avant les miniatures : quand il passe sous les yeux de qui gère l'arbre (la fiche de la
  // personne ouverte), son navigateur prend l'image et l'envoie, une fois. Jamais chez la famille ni un visiteur.
  const missingThumbnailIds = canEditCurrentTree
    ? selectedPersonMedias
      .filter((media) => media.type === 'video' && !media.thumbUrl && media.url && isVideoFileMime(media.mimeType) && !thumbnailAttempts.has(media.id))
      .map((media) => media.id)
      .join(',')
    : ''
  useEffect(() => {
    if (!missingThumbnailIds || !treeContext.treeId || !treeContext.accessToken) return
    const { treeId, accessToken } = treeContext
    const pending = selectedPersonMedias.filter((media) => missingThumbnailIds.split(',').includes(media.id))
    pending.forEach((media) => thumbnailAttempts.add(media.id))
    ;(async () => {
      // Une vidéo après l'autre : le navigateur n'en décode qu'une à la fois
      for (const media of pending) {
        const thumbnailBase64 = await captureVideoFrame(media.url)
        if (!thumbnailBase64) continue
        try {
          const saved = await uploadMediaThumbnail(treeId, media.id, thumbnailBase64, accessToken)
          // Posée sur le souvenir sans recharger l'arbre : la fiche ouverte et la vidéo en lecture restent
          if (saved?.thumbUrlPath && setMediaThumbnail(media.id, saved.thumbUrlPath)) bumpAssetRevision?.()
        } catch {
          // Refusée ou déjà là : la vignette sombre reste
        }
      }
    })()
  }, [missingThumbnailIds]) // eslint-disable-line react-hooks/exhaustive-deps

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
    people = [],
  }) => {
    if (!canUploadMedia || !selectedPerson || !treeContext.treeId || !treeContext.accessToken) {
      return false
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
        return true
      } catch (error) {
        setMediaManagerState((current) => ({ ...current, loading: false, error: getAccountErrorMessage(error) }))
        return false
      }
    }

    const resolvedType = resolveUploadMediaType(file, mediaType)
    const resolvedCitationText = String(citationText || caption || '').trim()
    // Photo de téléphone trop lourde (souvent plus de 5 Mo) : réduite avant l'envoi, comme les portraits
    if (resolvedType === 'photo') file = await prepareImageForUpload(file)
    const validationError = validateMediaFile(file, resolvedType, { citationText: resolvedCitationText })
    if (validationError) {
      setMediaManagerState((current) => ({
        ...current,
        loading: false,
        error: validationError,
      }))
      return false
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
            // Qui est sur la photo, dit à l'envoi : relu avec le souvenir quand il vient de la famille
            ...(resolvedType === 'photo' && people.length ? { people } : {}),
            ...(await videoThumbnailField(file, resolvedType)),
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
      return true
    } catch (error) {
      setMediaManagerState((current) => ({
        ...current,
        loading: false,
        error: getAccountErrorMessage(error),
      }))
      return false
    }
  }

  // Fichier d'un moment de l'onglet Vie (photo, vidéo, enregistrement, acte en PDF…) : envoyé comme un
  // souvenir de la personne et rattaché au moment. Pour la famille, il rejoint la relecture du moment.
  // Renvoie le souvenir créé ; une erreur remonte avec un message lisible.
  const uploadMomentFile = async (personId, file, { lifeEventId, caption = null, submittedByLabel = null } = {}) => {
    if (!canUploadMedia || !treeContext.treeId || !treeContext.accessToken) throw new Error(t('Action non autorisée.'))
    const type = resolveUploadMediaType(file, 'auto')
    if (type === 'photo') file = await prepareImageForUpload(file)
    const validationError = validateMediaFile(file, type, {})
    if (validationError) throw new Error(validationError)
    try {
      const created = await uploadPersonMedia(
        treeContext.treeId,
        personId,
        {
          type,
          fileName: file.name || 'fichier',
          mimeType: getUploadMimeType(file, type),
          sizeBytes: file.size,
          dataBase64: await fileToBase64(file),
          caption: caption || null,
          source: null,
          lifeEventId,
          ...(await videoThumbnailField(file, type)),
          ...(submittedByLabel ? { submittedByLabel } : {}),
        },
        treeContext.accessToken,
      )
      return created
    } catch (error) {
      throw new Error(getAccountErrorMessage(error), { cause: error })
    }
  }

  // Après l'enregistrement d'un moment : les nouveaux souvenirs apparaissent dans la fiche
  const refreshMomentMedia = (personId) => refreshAfterMediaMutation(personId)

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

  // Modifier un souvenir (visionneuse) : le serveur refuse tout autre rôle que l'administrateur
  const handleUpdatePersonMedia = async (personId, mediaId, payload) => {
    if (!canEditCurrentTree || !treeContext.treeId || !treeContext.accessToken) {
      throw new Error('forbidden')
    }

    await updatePersonMedia(treeContext.treeId, personId, mediaId, payload, treeContext.accessToken)
    await refreshAfterMediaMutation(personId)
  }

  // Personnes identifiées sur un souvenir : administrateur, appliqué et arbre rafraîchi ; famille, une
  // proposition (status « pending »), rien ne change avant la relecture
  const handleUpdateMediaPeople = async (ownerPersonId, mediaId, people) => {
    if (!canUploadMedia || !treeContext.treeId || !treeContext.accessToken) {
      throw new Error('forbidden')
    }
    const name = canEditCurrentTree ? '' : readContributorName()
    const result = await updateMediaPeople(
      treeContext.treeId,
      mediaId,
      { people, ...(name ? { submittedByLabel: name } : {}) },
      treeContext.accessToken,
    )
    if (result?.status === 'approved') await refreshAfterMediaMutation(ownerPersonId)
    return result
  }

  const loadPersonLifeEvents = (personId) => fetchPersonLife(treeContext.treeId, personId, treeContext.accessToken)

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
    uploadMomentFile,
    refreshMomentMedia,
    handleDeletePersonMedia,
    handleUpdatePersonMedia,
    handleUpdateMediaPeople,
    loadPersonLifeEvents,
    resetMediaManager,
  }
}
