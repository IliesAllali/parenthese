import { useMemo } from 'react'
import { RotateCcw, Trash2 } from 'lucide-react'
import './DraftRestoreBanner.css'
import { t } from '../i18n/index.js'

/**
 * Formatage relatif du timestamp
 */
function formatRelativeTime(timestamp) {
  if (!timestamp) return ''

  const diff = Date.now() - timestamp
  const minutes = Math.floor(diff / 60000)
  const hours = Math.floor(diff / 3600000)
  const days = Math.floor(diff / 86400000)

  if (minutes < 1) return t('il y a quelques secondes')
  if (minutes < 60) return minutes > 1 ? t('il y a {n} minutes', { n: minutes }) : t('il y a {n} minute', { n: minutes })
  if (hours < 24) return hours > 1 ? t('il y a {n} heures', { n: hours }) : t('il y a {n} heure', { n: hours })
  return days > 1 ? t('il y a {n} jours', { n: days }) : t('il y a {n} jour', { n: days })
}

/**
 * Banner de restauration de brouillon
 * Apparaît au chargement si un draft < 7 jours existe dans localStorage
 *
 * @param {Object} props
 * @param {boolean} props.visible - Afficher le banner
 * @param {number} props.draftTimestamp - Timestamp du dernier save
 * @param {Function} props.onRestore - Handler restauration
 * @param {Function} props.onDiscard - Handler suppression
 */
function DraftRestoreBanner({ visible, draftTimestamp, onRestore, onDiscard }) {
  const timeAgo = useMemo(() => {
    return formatRelativeTime(draftTimestamp)
  }, [draftTimestamp])

  if (!visible) return null

  return (
    <div className="draft-restore-banner" role="alert" aria-live="polite">
      <div className="draft-restore-content">
        <span className="draft-restore-text">
          {t('Des modifications non enregistrées vous attendent')}
          {timeAgo && <span className="draft-restore-time">{timeAgo}</span>}
        </span>

        <div className="draft-restore-actions">
          <button
            type="button"
            className="draft-restore-btn draft-restore-btn--restore"
            onClick={onRestore}
          >
            <RotateCcw size={14} strokeWidth={2} />
            {t('Restaurer')}
          </button>

          <button
            type="button"
            className="draft-restore-btn draft-restore-btn--discard"
            onClick={onDiscard}
          >
            <Trash2 size={14} strokeWidth={2} />
            {t('Ignorer')}
          </button>
        </div>
      </div>
    </div>
  )
}

export default DraftRestoreBanner
