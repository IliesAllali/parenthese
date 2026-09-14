export function getShareErrorMessage(error) {
  if (error?.status === 401) {
    return 'Mot de passe invalide ou accès expiré.'
  }

  if (error?.status === 404) {
    return 'Arbre introuvable.'
  }

  if (error?.status === 429) {
    return 'Trop de tentatives. Réessayez dans une minute.'
  }

  return 'Connexion backend impossible. Vérifiez API/DB puis réessayez.'
}

export function getAccountErrorMessage(error) {
  const errorCode = error?.payload?.error || error?.message || ''

  if (errorCode === 'image_too_large') {
    return 'Image trop volumineuse (maximum 5 Mo).'
  }

  if (errorCode === 'invalid_avatar_mime_type') {
    return "Format d'avatar invalide. Utilisez une image."
  }

  if (errorCode === 'size_mismatch' || errorCode === 'invalid_base64_data' || errorCode === 'empty_media_file') {
    return 'Le fichier média envoyé est invalide.'
  }

  if (errorCode === 'invalid_media_mime_type') {
    return 'Le format de fichier ne correspond pas au type de média choisi.'
  }

  if (errorCode === 'citation_text_required') {
    return 'Ajoutez le texte de la citation.'
  }

  if (errorCode === 'database_error' || (error?.status === 500 && error?.payload?.error === 'database_error')) {
    return "Erreur base de données. Lancez `npm run prisma:deploy` puis redémarrez l'API."
  }

  if (error?.status === 503 && error?.message === 'database_unavailable') {
    return 'Base de données indisponible. Lancez `npm run db:bootstrap` dans le backend.'
  }

  if (error?.status === 400) {
    if (error?.message === 'invalid_payload' || error?.payload?.error === 'invalid_payload') {
      const fieldErrors = error?.payload?.details?.fieldErrors || {}
      const formErrors = error?.payload?.details?.formErrors || []

      if (fieldErrors.slug?.length) {
        return 'Slug invalide : 3-64 caractères, uniquement lettres minuscules, chiffres et tirets.'
      }

      if (fieldErrors.name?.length) {
        return "Nom d'arbre invalide : entre 2 et 120 caractères."
      }

      if (fieldErrors.visitorPassword?.length || fieldErrors.contributorPassword?.length) {
        return 'Mots de passe invalides : entre 8 et 128 caractères.'
      }

      const firstField = Object.keys(fieldErrors)[0]
      if (firstField && Array.isArray(fieldErrors[firstField]) && fieldErrors[firstField].length > 0) {
        return `${firstField}: ${fieldErrors[firstField][0]}`
      }

      if (Array.isArray(formErrors) && formErrors.length > 0) {
        return `Erreur formulaire: ${formErrors[0]}`
      }
    }

    return 'Données invalides. Vérifiez les champs.'
  }

  if (error?.status === 401) {
    return 'Session invalide ou identifiants incorrects.'
  }

  if (error?.status === 403) {
    return 'Accès refusé pour cet arbre.'
  }

  if (error?.status === 404) {
    return 'Ressource introuvable.'
  }

  if (error?.status === 409) {
    return 'Conflit détecté (email ou slug déjà utilisé).'
  }

  if (error?.status === 429) {
    return 'Trop de tentatives. Réessayez dans une minute.'
  }

  return "Erreur backend. Vérifiez que l'API et la base sont lancées."
}

export function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()

    reader.onload = () => {
      if (typeof reader.result !== 'string') {
        reject(new Error('invalid_file_reader_result'))
        return
      }

      const commaIndex = reader.result.indexOf(',')
      if (commaIndex < 0) {
        reject(new Error('invalid_data_url'))
        return
      }

      resolve(reader.result.slice(commaIndex + 1))
    }

    reader.onerror = () => {
      reject(reader.error || new Error('file_read_failed'))
    }

    reader.readAsDataURL(file)
  })
}
