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
    expect(getShareErrorMessage({ status: 500 })).toBe('Connexion backend impossible. Vérifiez API/DB puis réessayez.')
  })

  it('handles null/undefined error', () => {
    expect(getShareErrorMessage(null)).toBe('Connexion backend impossible. Vérifiez API/DB puis réessayez.')
    expect(getShareErrorMessage(undefined)).toBe('Connexion backend impossible. Vérifiez API/DB puis réessayez.')
  })
})

describe('getAccountErrorMessage', () => {
  it('returns db unavailable message for 503 database_unavailable', () => {
    expect(getAccountErrorMessage({ status: 503, message: 'database_unavailable' }))
      .toBe('Base de données indisponible. Lancez `npm run db:bootstrap` dans le backend.')
  })

  it('returns migration hint for 500 database_error', () => {
    expect(getAccountErrorMessage({ status: 500, message: 'database_error', payload: { error: 'database_error' } }))
      .toBe("Erreur base de données. Lancez `npm run prisma:deploy` puis redémarrez l'API.")
  })

  it('returns media size message for image_too_large', () => {
    expect(getAccountErrorMessage({ status: 400, message: 'image_too_large' }))
      .toBe('Image trop volumineuse (maximum 5 Mo).')
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
      .toBe("Erreur backend. Vérifiez que l'API et la base sont lancées.")
  })

  it('returns slug validation message for invalid_payload with slug error', () => {
    expect(getAccountErrorMessage({
      status: 400,
      message: 'invalid_payload',
      payload: { error: 'invalid_payload', details: { fieldErrors: { slug: ['too short'] }, formErrors: [] } },
    })).toBe('Slug invalide : 3-64 caractères, uniquement lettres minuscules, chiffres et tirets.')
  })

  it('returns name validation message for invalid_payload with name error', () => {
    expect(getAccountErrorMessage({
      status: 400,
      message: 'invalid_payload',
      payload: { error: 'invalid_payload', details: { fieldErrors: { name: ['too short'] }, formErrors: [] } },
    })).toBe("Nom d'arbre invalide : entre 2 et 120 caractères.")
  })

  it('returns password validation message for invalid_payload with password error', () => {
    expect(getAccountErrorMessage({
      status: 400,
      message: 'invalid_payload',
      payload: { error: 'invalid_payload', details: { fieldErrors: { visitorPassword: ['too short'] }, formErrors: [] } },
    })).toBe('Mots de passe invalides : entre 8 et 128 caractères.')
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
    })).toBe('Erreur formulaire: Something went wrong')
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
    expect(getAccountErrorMessage({ status: 409 }))
      .toBe('Conflit détecté (email ou slug déjà utilisé).')
  })

  it('returns rate limit message for 429', () => {
    expect(getAccountErrorMessage({ status: 429 }))
      .toBe('Trop de tentatives. Réessayez dans une minute.')
  })

  it('returns default message for unknown errors', () => {
    expect(getAccountErrorMessage({ status: 500 }))
      .toBe("Erreur backend. Vérifiez que l'API et la base sont lancées.")
  })

  it('handles null/undefined error', () => {
    expect(getAccountErrorMessage(null))
      .toBe("Erreur backend. Vérifiez que l'API et la base sont lancées.")
  })
})
