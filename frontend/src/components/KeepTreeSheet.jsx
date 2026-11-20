import { useEffect, useState } from 'react'
import './AccountScreens.css'
import PzBusy from './PzBusy.jsx'
import ProviderButton from './ProviderButton.jsx'
import { dateLocale, t } from '../i18n/index.js'
import { withEmphasis } from '../utils/richText.jsx'

// « Gardez votre arbre » (#251) : l'arbre fait avant le compte reçoit un compte. Ne demande que ce qui manque,
// l'email et le mot de passe, ou le fournisseur de connexion : le prénom et le nom sont déjà dans l'arbre.
// reason : 'fifth' (cinquième personne, une seule fois), 'share' (envoyer l'arbre demande un compte), 'menu'.
function formatDay(value) {
  const date = value ? new Date(value) : null
  if (!date || Number.isNaN(date.getTime())) return ''
  return new Intl.DateTimeFormat(dateLocale, { day: 'numeric', month: 'long' }).format(date)
}

function KeepTreeSheet({
  reason = 'menu',
  provisionalUntil = null,
  loading = false,
  errorMessage = '',
  passwordLogin = true,
  oidcName = '',
  onOidc,
  onSubmit,
  onLogin,
  onClose,
}) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')

  useEffect(() => {
    const onKey = (event) => { if (event.key === 'Escape' && !loading) onClose?.() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [loading, onClose])

  const forShare = reason === 'share'
  const until = formatDay(provisionalUntil)
  const canSubmit = !loading && email.trim().length > 0 && password.length >= 8

  const handleSubmit = (event) => {
    event.preventDefault()
    if (!canSubmit) return
    onSubmit?.(email.trim().toLowerCase(), password)
  }

  return (
    <div className="pz-overlay" role="dialog" aria-modal="true" aria-labelledby="keepTreeTitle" onClick={(event) => { if (event.target === event.currentTarget && !loading) onClose?.() }}>
      <form className="pz-modal keep-tree" onSubmit={handleSubmit}>
        <div className="pz-modal-head">
          <h2 id="keepTreeTitle" className="pz-title">
            {withEmphasis(forShare ? t("Pour l'envoyer, <em>gardez votre arbre</em>") : t('Gardez <em>votre arbre</em>'))}
          </h2>
          <p className="pz-sub">
            {forShare
              ? t('Il faut un compte pour relire ce que la famille ajoute.')
              : until
                ? t("Sans compte, il reste sur cet appareil jusqu'au {date}.", { date: until })
                : t('Sans compte, il reste sur cet appareil pendant 30 jours.')}
          </p>
        </div>

        {onOidc && <ProviderButton name={oidcName} onClick={onOidc} disabled={loading} alone={!passwordLogin} />}
        {onOidc && passwordLogin && <div className="pz-divider">{t('ou')}</div>}

        {passwordLogin && (
          <div className="pz-auth-form">
            <div className="pz-field">
              <label htmlFor="keepEmail">{t('Email')}</label>
              <input
                id="keepEmail"
                type="email"
                autoComplete="email"
                placeholder={t('camille@exemple.fr')}
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                required
              />
            </div>
            <div className="pz-field">
              <label htmlFor="keepPassword">{t('Mot de passe')}</label>
              <input
                id="keepPassword"
                type="password"
                autoComplete="new-password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                minLength={8}
                required
              />
              <p className="pz-hint">{t('8 caractères minimum.')}</p>
            </div>
          </div>
        )}

        {errorMessage && <div className="pz-error" role="alert">{errorMessage}</div>}

        <div className="pz-modal-actions keep-tree-actions">
          <button type="button" className="pz-btn pz-btn--ghost" onClick={onClose} disabled={loading}>
            {forShare ? t('Annuler') : t('Plus tard')}
          </button>
          {passwordLogin && (
            <button type="submit" className="pz-btn pz-btn--primary" disabled={!canSubmit}>
              <PzBusy busy={loading} busyLabel={t('Création du compte')}>
                {forShare ? t('Garder et envoyer') : t('Garder mon arbre')}
              </PzBusy>
            </button>
          )}
        </div>

        {onLogin && (
          <p className="pz-small keep-tree-login">
            {t('Déjà un compte ?')}{' '}
            <button type="button" className="pz-link" onClick={onLogin} disabled={loading}>{t('Se connecter')}</button>
          </p>
        )}
      </form>
    </div>
  )
}

export default KeepTreeSheet
