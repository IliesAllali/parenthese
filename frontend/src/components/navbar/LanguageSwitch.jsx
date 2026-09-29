import { Fragment } from 'react'
import { LOCALES, locale, setLocale, t } from '../../i18n/index.js'

// Noms des langues écrits dans leur propre langue : ils ne se traduisent pas.
const NATIVE_NAMES = { fr: 'Français', en: 'English' }

/**
 * Choix de la langue « FR · EN », la langue courante en appui.
 * Changer de langue recharge la page (voir i18n/index.js).
 */
function LanguageSwitch({ className = '' }) {
  return (
    <div className={`pz-lang ${className}`.trim()} role="group" aria-label={t('Langue')}>
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
              title={NATIVE_NAMES[code]}
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
