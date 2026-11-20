import { surnameLabel } from '../utils/personName.js'
import { useEffect, useMemo, useRef, useState } from 'react'
import { Search, UserPlus, X } from 'lucide-react'
import './FamilyOnboarding.css'
import { t } from '../i18n/index.js'
import { readContributorName } from '../utils/contributorName.js'
import PortraitThumb from './PortraitThumb.jsx'

// Accueil de la famille arrivée par le lien qui porte la clé (flow invité, validé le 20/11) : le nom de l'arbre,
// le prénom, facultatif, et « Voir l'arbre ». Le prénom signe les visites et les envois, et sert à « C'est vous ? ».
export function FamilyWelcome({ visible, treeName, askName = true, onLook }) {
  const [name, setName] = useState(() => readContributorName())

  useEffect(() => {
    if (!visible) return undefined
    const onKey = (e) => { if (e.key === 'Escape') onLook?.('') }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [visible, onLook])

  if (!visible) return null

  const [welcomeBefore, welcomeAfter] = t('Bienvenue dans {name}').split('{name}')

  return (
    <div className="pz-overlay fo-overlay">
      <form
        className="pz-modal fo-welcome"
        role="dialog"
        aria-modal="true"
        aria-labelledby="foWelcomeTitle"
        onSubmit={(e) => { e.preventDefault(); onLook?.(askName ? name.trim() : '') }}
      >
        <h1 id="foWelcomeTitle" className="pz-title fo-title">
          {welcomeBefore}<em>{treeName || t("l'arbre de la famille")}</em>{welcomeAfter}
        </h1>
        {askName && (
          <div className="pz-field">
            <label htmlFor="foVisitorName">{t('Votre prénom')} <span className="fo-optional">{t('facultatif')}</span></label>
            <input
              id="foVisitorName"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              autoComplete="given-name"
              maxLength={60}
            />
          </div>
        )}
        <div className="fo-foot">
          <button type="submit" className="pz-btn pz-btn--primary pz-btn--block fo-big">{t("Voir l'arbre")}</button>
        </div>
      </form>
    </div>
  )
}

// « C'est vous, Claire ? » : posée sur l'arbre, la personne trouvée au centre et sélectionnée. Plusieurs personnes portent ce
// prénom : chacune a son bouton, avec son année.
// anchor : sur ordinateur, le bas du prénom de la personne trouvée ; la question se pose juste dessous
export function SelfAsk({ candidates = [], anchor = null, onConfirm, onDecline }) {
  if (!candidates.length) return null
  const single = candidates.length === 1 ? candidates[0] : null
  const anchored = single && anchor
  return (
    <div
      className={`fo-self${anchored ? ' fo-self--anchored' : ''}`}
      style={anchored ? { left: `${anchor.x}px`, top: `${anchor.y}px` } : undefined}
      role="dialog"
      aria-labelledby="foSelfTitle"
    >
      <h2 id="foSelfTitle" className="fo-self-title">
        {single ? t("C'est vous, {name} ?", { name: single.firstName }) : t("C'est vous ?")}
      </h2>
      <div className="fo-self-actions">
        {single ? (
          <button type="button" className="pz-btn pz-btn--primary" onClick={() => onConfirm?.(single)}>{t("C'est moi")}</button>
        ) : candidates.map((person) => (
          <button key={person.id} type="button" className="pz-btn pz-btn--secondary" onClick={() => onConfirm?.(person)}>
            {person.firstName}{person.birthYear ? ` · ${person.birthYear}` : ''}
          </button>
        ))}
        <button type="button" className="pz-btn pz-btn--secondary" onClick={onDecline}>{t('Non')}</button>
      </div>
    </div>
  )
}

function normalize(value) {
  return String(value || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim()
}

function lifeYears(person) {
  if (!person.birthYear) return ''
  return person.deathYear ? `${person.birthYear} – ${person.deathYear}` : String(person.birthYear)
}

// « Pour qui ? » : on choisit la personne avant d'ajouter le souvenir
export function SouvenirPicker({ visible, persons = [], rootPersonId = null, onPick, onAddPerson, onClose }) {
  const [query, setQuery] = useState('')
  const inputRef = useRef(null)

  useEffect(() => {
    if (!visible) return undefined
    setQuery('')
    const timer = window.setTimeout(() => inputRef.current?.focus(), 120)
    const onKey = (e) => { if (e.key === 'Escape') onClose?.() }
    document.addEventListener('keydown', onKey)
    return () => { window.clearTimeout(timer); document.removeEventListener('keydown', onKey) }
  }, [visible, onClose])

  const results = useMemo(() => {
    const q = normalize(query)
    if (!q) {
      // Sans recherche : la personne de départ puis celles qui ont un portrait
      const root = persons.find((p) => String(p.id) === String(rootPersonId))
      const withPhoto = persons.filter((p) => p !== root && p.photo)
      return [root, ...withPhoto].filter(Boolean).slice(0, 6)
    }
    const words = q.split(/\s+/)
    return persons
      .filter((p) => {
        const full = normalize(`${p.firstName} ${p.lastName} ${p.birthName || ''}`)
        return words.every((w) => full.includes(w))
      })
      .slice(0, 20)
  }, [persons, query, rootPersonId])

  if (!visible) return null

  const [whoBefore, whoAfter] = t('Pour {who} ?').split('{who}')

  return (
    <div className="pz-overlay fo-overlay" onClick={() => onClose?.()}>
      <div className="pz-modal fo-picker" role="dialog" aria-modal="true" aria-labelledby="foPickerTitle" onClick={(e) => e.stopPropagation()}>
        <div className="pz-modal-head">
          <p className="pz-eyebrow">{t('Ajouter un souvenir')}</p>
          <h1 id="foPickerTitle" className="pz-title fo-title">{whoBefore}<em>{t('qui')}</em>{whoAfter}</h1>
        </div>
        <button type="button" className="pz-btn pz-btn--ghost pz-btn--icon pz-modal-close" onClick={onClose} aria-label={t('Fermer')}>
          <X size={18} aria-hidden="true" />
        </button>

        <label className="fo-search">
          <Search size={20} strokeWidth={2} aria-hidden="true" />
          <input
            ref={inputRef}
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t('Tapez un prénom')}
            aria-label={t('Prénom de la personne')}
            autoComplete="off"
            enterKeyHint="search"
          />
        </label>

        {!query.trim() && results.length > 0 && <p className="fo-hint">{t('Ou choisissez ici')}</p>}

        <ul className="fo-list">
          {results.map((person) => (
            <li key={person.id}>
              <button type="button" className="fo-person" onClick={() => onPick?.(person)}>
                <span className="fo-thumb" aria-hidden="true">
                  {person.photo ? <PortraitThumb src={person.photo} crop={person.avatarCrop} /> : <span>{person.firstName?.[0] || '?'}</span>}
                </span>
                <span className="fo-name">
                  <strong>{person.firstName} {surnameLabel(person.lastName)}</strong>
                  {lifeYears(person) && <small>{lifeYears(person)}</small>}
                </span>
              </button>
            </li>
          ))}
        </ul>

        {query.trim() && results.length === 0 && (
          <p className="fo-empty">{t("Personne ne s'appelle « {name} » dans l'arbre.", { name: query.trim() })}</p>
        )}

        {onAddPerson && (
          <button type="button" className="fo-add-person" onClick={onAddPerson}>
            <UserPlus size={18} strokeWidth={2} aria-hidden="true" />
            {t("La personne n'est pas dans l'arbre ? Ajoutez-la")}
          </button>
        )}
      </div>
    </div>
  )
}
