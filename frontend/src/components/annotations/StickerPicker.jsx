import { t } from '../../i18n/index.js'
import './StickerPicker.css'

const STICKERS = [
  '❤️', '⭐', '🌟', '✨', '🎉',
  '🎂', '💍', '👶', '👨‍👩‍👧‍👦', '🏠',
  '📷', '✈️', '🎓', '💐', '🕊️',
  '🌳', '📌', '🎵', '☀️', '🌙',
]

export default function StickerPicker({ selected, onSelect }) {
  return (
    <div className="sticker-picker">
      <span className="sticker-picker__label">{t('Stickers')}</span>
      {selected && (
        <div className="sticker-picker__preview">
          <span className="sticker-picker__preview-emoji">{selected}</span>
          <span className="sticker-picker__preview-hint">{t('Cliquez sur le canvas')}</span>
        </div>
      )}
      <div className="sticker-picker__grid">
        {STICKERS.map((emoji) => (
          <button
            key={emoji}
            className={`sticker-picker__btn${selected === emoji ? ' sticker-picker__btn--active' : ''}`}
            onClick={() => onSelect(emoji)}
          >
            {emoji}
          </button>
        ))}
      </div>
    </div>
  )
}
