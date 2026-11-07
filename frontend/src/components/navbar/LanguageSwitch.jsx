import { Fragment } from 'react'
import { LANGUAGES, LOCALES, locale, setLocale, t } from '../../i18n/index.js'

/**
 * Choix de la langue « FR · EN », une entrée par langue de LANGUAGES, la langue courante en appui.
 * Changer de langue recharge la page (voir i18n/index.js).
 */
function LanguageSwitch({ className = '' }) {
  return (
    // translate="no" : la traduction automatique du navigateur prenait les codes de langue (« EN ») pour des mots
    <div className={`pz-lang ${className}`.trim()} role="group" aria-label={t('Langue')} translate="no">
      {LOCALES.map((code, index) => {
        const isActive = code === locale
        return (
          <Fragment key={code}>
            {index > 0 && <span className="pz-lang-sep" aria-hidden="true">·</span>}
            <button
              type="button"
              className={`pz-lang-opt${isActive ? ' is-active' : ''}`}
              aria-pressed={isActive}
              lang={code}
              title={LANGUAGES[code].name}
              onClick={() => setLocale(code)}
            >
              {code.toUpperCase()}
            </button>
          </Fragment>
        )
      })}
    </div>
  )
}

export default LanguageSwitch
