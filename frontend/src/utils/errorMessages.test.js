import { describe, it, expect } from 'vitest'
import { getShareErrorMessage, getAccountErrorMessage, getAccountDeletionErrorMessage } from './errorMessages'

describe('getAccountDeletionErrorMessage', () => {
  it('returns wrong password message for 403', () => {
    expect(getAccountDeletionErrorMessage({ status: 403 })).toBe('Mot de passe incorrect.')
  })

  it('returns session message for 401', () => {
    expect(getAccountDeletionErrorMessage({ status: 401 })).toBe('Session expirée. Reconnectez-vous puis réessayez.')
  })

  it('returns rate limit message for 429', () => {
    expect(getAccountDeletionErrorMessage({ status: 429 })).toBe('Trop de tentatives. Réessayez dans une minute.')
  })

  it('returns default message for unknown errors', () => {
    expect(getAccountDeletionErrorMessage(null))
      .toBe('Impossible de supprimer le compte pour le moment. Réessayez plus tard.')
  })
})

describe('getShareErrorMessage', () => {
  it('returns password message for 401', () => {
    expect(getShareErrorMessage({ status: 401 })).toBe('Mot de passe invalide ou accès expiré.')
  })

  it('returns not found message for 404', () => {
    expect(getShareErrorMessage({ status: 404 })).toBe('Arbre introuvable.')
  })

  it('returns rate limit message for 429', () => {
    expect(getShareErrorMessage({ status: 429 })).toBe('Trop de tentatives. Réessayez dans une minute.')
  })

  it('returns default message for unknown errors', () => {
    expect(getShareErrorMessage({ status: 500 })).toBe("Ça n'a pas marché. Réessayez dans un moment.")
  })

  it('handles null/undefined error', () => {
    expect(getShareErrorMessage(null)).toBe("Ça n'a pas marché. Réessayez dans un moment.")
    expect(getShareErrorMessage(undefined)).toBe("Ça n'a pas marché. Réessayez dans un moment.")
  })
})

describe('getAccountErrorMessage', () => {
  it('returns db unavailable message for 503 database_unavailable', () => {
    expect(getAccountErrorMessage({ status: 503, message: 'database_unavailable' }))
      .toBe("Ça n'a pas marché. Réessayez dans un moment.")
  })

  it('returns migration hint for 500 database_error', () => {
    expect(getAccountErrorMessage({ status: 500, message: 'database_error', payload: { error: 'database_error' } }))
      .toBe("Ça n'a pas marché. Réessayez dans un moment.")
  })

  it('returns media size message for image_too_large', () => {
    expect(getAccountErrorMessage({ status: 400, message: 'image_too_large' }))
      .toBe('Image trop volumineuse (maximum 5\u00A0Mo).')
  })

  it('returns invalid avatar format message', () => {
    expect(getAccountErrorMessage({ status: 400, message: 'invalid_avatar_mime_type' }))
      .toBe("Format d'avatar invalide. Utilisez une image.")
  })

  it('returns invalid media payload message for size mismatch', () => {
    expect(getAccountErrorMessage({ status: 400, message: 'size_mismatch' }))
      .toBe('Le fichier média envoyé est invalide.')
  })

  it('returns invalid media mime type message', () => {
    expect(getAccountErrorMessage({ status: 400, message: 'invalid_media_mime_type' }))
      .toBe('Le format de fichier ne correspond pas au type de média choisi.')
  })

  it('returns citation text required message', () => {
    expect(getAccountErrorMessage({ status: 400, message: 'citation_text_required' }))
      .toBe('Ajoutez le texte de la citation.')
  })

  it('returns generic 503 fallback when message is different', () => {
    expect(getAccountErrorMessage({ status: 503, message: 'other' }))
      .toBe("Ça n'a pas marché. Réessayez dans un moment.")
  })

  it('returns slug validation message for invalid_payload with slug error', () => {
    expect(getAccountErrorMessage({
      status: 400,
      message: 'invalid_payload',
      payload: { error: 'invalid_payload', details: { fieldErrors: { slug: ['too short'] }, formErrors: [] } },
    })).toBe("Adresse de l'arbre invalide : 3 à 64 caractères, lettres minuscules, chiffres et tirets.")
  })

  it('returns name validation message for invalid_payload with name error', () => {
    expect(getAccountErrorMessage({
      status: 400,
      message: 'invalid_payload',
      payload: { error: 'invalid_payload', details: { fieldErrors: { name: ['too short'] }, formErrors: [] } },
    })).toBe("Nom d'arbre invalide\u00A0: entre 2 et 120 caractères.")
  })

  it('returns password validation message for invalid_payload with password error', () => {
    expect(getAccountErrorMessage({
      status: 400,
      message: 'invalid_payload',
      payload: { error: 'invalid_payload', details: { fieldErrors: { visitorPassword: ['too short'] }, formErrors: [] } },
    })).toBe('Mots de passe invalides\u00A0: entre 8 et 128 caractères.')
  })

  it('returns generic field error for unknown field', () => {
    expect(getAccountErrorMessage({
      status: 400,
      message: 'invalid_payload',
      payload: { error: 'invalid_payload', details: { fieldErrors: { email: ['invalid format'] }, formErrors: [] } },
    })).toBe('email: invalid format')
  })

  it('returns form error when only formErrors present', () => {
    expect(getAccountErrorMessage({
      status: 400,
      message: 'invalid_payload',
      payload: { error: 'invalid_payload', details: { fieldErrors: {}, formErrors: ['Something went wrong'] } },
    })).toBe('Erreur formulaire\u00A0: Something went wrong')
  })

  it('returns generic 400 message for non-validation errors', () => {
    expect(getAccountErrorMessage({ status: 400 }))
      .toBe('Données invalides. Vérifiez les champs.')
  })

  it('returns auth message for 401', () => {
    expect(getAccountErrorMessage({ status: 401 }))
      .toBe('Session invalide ou identifiants incorrects.')
  })

  it('returns forbidden message for 403', () => {
    expect(getAccountErrorMessage({ status: 403 }))
      .toBe('Accès refusé pour cet arbre.')
  })

  it('returns not found message for 404', () => {
    expect(getAccountErrorMessage({ status: 404 }))
      .toBe('Ressource introuvable.')
  })

  it('returns conflict message for 409', () => {
    expect(getAccountErrorMessage({ status: 409 })).toBe("C'est déjà enregistré.")
    expect(getAccountErrorMessage({ status: 409, payload: { error: 'slug_already_exists' } }))
      .toBe("Cette adresse d'arbre est déjà prise. Choisissez-en une autre.")
  })

  it('dit la vraie durée d’attente d’une limite', () => {
    expect(getAccountErrorMessage({ status: 429, retryAfterSeconds: 60 })).toBe('Trop de tentatives. Réessayez dans une minute.')
    expect(getAccountErrorMessage({ status: 429, retryAfterSeconds: 600 })).toBe('Trop de tentatives. Réessayez dans 10 minutes.')
    expect(getAccountErrorMessage({ status: 429, retryAfterSeconds: 3600 })).toBe('Trop de tentatives. Réessayez dans une heure.')
  })

  it('un réseau coupé garde le message du client', () => {
    const error = { status: 0, message: 'La connexion a été coupée. Vérifiez le réseau, puis réessayez.', payload: { error: 'network_error' } }
    expect(getAccountErrorMessage(error)).toBe(error.message)
    expect(getShareErrorMessage(error)).toBe(error.message)
  })

  it('aucune consigne technique pour la famille', () => {
    expect(getAccountErrorMessage({ status: 500 })).toBe("Ça n'a pas marché. Réessayez dans un moment.")
    expect(getAccountErrorMessage({ status: 500, payload: { error: 'database_error' } })).toBe("Ça n'a pas marché. Réessayez dans un moment.")
    expect(getShareErrorMessage({ status: 502 })).toBe("Ça n'a pas marché. Réessayez dans un moment.")
  })

  it('returns rate limit message for 429', () => {
    expect(getAccountErrorMessage({ status: 429 }))
      .toBe('Trop de tentatives. Réessayez dans une minute.')
  })

  it('returns default message for unknown errors', () => {
    expect(getAccountErrorMessage({ status: 500 }))
      .toBe("Ça n'a pas marché. Réessayez dans un moment.")
  })

  it('handles null/undefined error', () => {
    expect(getAccountErrorMessage(null))
      .toBe("Ça n'a pas marché. Réessayez dans un moment.")
  })
})

describe('messages lus par la famille', () => {
  it('un envoi coupé dit que la connexion a été coupée, sans parler de backend', () => {
    expect(getAccountErrorMessage(new TypeError('Failed to fetch'))).toBe('La connexion a été coupée. Vérifiez le réseau, puis réessayez.')
    expect(getShareErrorMessage({ status: 0, payload: { error: 'request_timeout' } })).toBe('La connexion a été coupée. Vérifiez le réseau, puis réessayez.')
  })

  it('un fichier changé depuis son choix demande de le choisir de nouveau, pas de réessayer', () => {
    const attendu = "Ce fichier n'a pas pu être lu. Il a peut-être changé depuis que vous l'avez choisi. Choisissez-le de nouveau."
    expect(getAccountErrorMessage(new DOMException('The requested file could not be read', 'NotReadableError'))).toBe(attendu)
    expect(getAccountErrorMessage(new Error('file_read_failed'))).toBe(attendu)
  })

  it('une photo HEIC refusée dit quoi faire', () => {
    expect(getAccountErrorMessage({ status: 400, message: 'photo_heic_unsupported' })).toContain('HEIC')
  })
})

describe('messages de l’import GEDCOM (cas limites du 20/11)', () => {
  it('dit pourquoi un fichier est refusé, et quand un autre import occupe le serveur', () => {
    expect(getAccountErrorMessage({ status: 413, payload: { error: 'gedcom_too_large' } })).toMatch(/trop gros/)
    expect(getAccountErrorMessage({ status: 429, payload: { error: 'gedcom_import_busy' } })).toMatch(/Un autre import/)
  })
})
