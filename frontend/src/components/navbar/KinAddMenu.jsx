import { useMemo, useState } from 'react'
import { ArrowDown, ArrowLeftRight, ArrowUp, ChevronLeft, Heart, Search, UserPlus, X } from 'lucide-react'
import { NavMenu, NavMenuGroup, NavMenuItem } from './NavMenu'
import PortraitThumb from '../PortraitThumb.jsx'
import { t } from '../../i18n/index.js'
import { withEmphasis } from '../../utils/richText.jsx'
import { ofName } from '../../utils/kinForm.js'
import { firstNameLabel, surnameLabel } from '../../utils/personName.js'
import { initialOf } from '../../utils/initial.js'
import './KinAddMenu.css'

const ICON = { size: 18, strokeWidth: 2, 'aria-hidden': true }
// Au-delà, la liste « Pour qui ? » prend un champ de recherche
const SEARCH_FROM = 8

const normalize = (text) => String(text || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()

/**
 * Le menu du « + » (#245) : « Un proche de Lucie », au nom de la dernière personne touchée (soi par défaut).
 * Quatre lignes, une par lien : chacune dit où la personne se place (au-dessus, à côté, cœur, en dessous).
 * Un lien déjà rempli disparaît. « Pour quelqu'un d'autre » change la personne. Puis « Autre chose ».
 */
export default function KinAddMenu({
  phone = false, triggerRef, onClose, target = null, choices = null, getPeople = null,
  onKin, onTarget, onAddPerson = null, otherGroups = [],
}) {
  const [view, setView] = useState('menu')
  const [query, setQuery] = useState('')
  const people = useMemo(() => (view === 'who' && getPeople ? getPeople() : []), [view, getPeople])
  const shown = useMemo(() => {
    const words = normalize(query).split(/\s+/).filter(Boolean)
    if (!words.length) return people
    return people.filter(({ person }) => {
      const full = normalize(`${person.firstName} ${person.lastName} ${person.birthName || ''}`)
      return words.every((w) => full.includes(w))
    })
  }, [people, query])

  const run = (action) => () => { onClose?.(); action?.() }

  const closeButton = phone && (
    <button type="button" className="pz-btn pz-btn--ghost pz-btn--icon kinm-close" onClick={onClose} aria-label={t('Fermer')}>
      <X size={18} strokeWidth={2} aria-hidden="true" />
    </button>
  )

  if (view === 'who') {
    return (
      <NavMenu phone={phone} label={t('Pour qui ?')} onClose={onClose} triggerRef={triggerRef}>
        <div className="kinm-head">
          <button type="button" className="pz-btn pz-btn--ghost pz-btn--icon kinm-back" onClick={() => { setView('menu'); setQuery('') }} aria-label={t('Retour')}>
            <ChevronLeft size={20} strokeWidth={2} aria-hidden="true" />
          </button>
          <p className="kinm-title">{withEmphasis(t('Pour <em>qui</em> ?'))}</p>
          {closeButton}
        </div>
        {people.length > SEARCH_FROM && (
          <label className="kinm-search">
            <Search size={16} strokeWidth={2} aria-hidden="true" />
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={t('Tapez un prénom')}
              aria-label={t('Prénom de la personne')}
              autoComplete="off"
              enterKeyHint="search"
            />
          </label>
        )}
        <div role="group" aria-label={t('Pour qui ?')}>
          {shown.map(({ person, label, self }) => (
            <NavMenuItem
              key={person.id}
              className="kinm-person"
              icon={(
                <span className="kinm-thumb">
                  {person.photo ? <PortraitThumb src={person.photo} crop={person.avatarCrop} /> : initialOf(person.firstName)}
                </span>
              )}
              label={<span className="kinm-name">{firstNameLabel(person)} {surnameLabel(person.lastName)}</span>}
              sub={self ? t('vous') : label || null}
              onSelect={() => { onTarget?.(person); setView('menu'); setQuery('') }}
            />
          ))}
        </div>
      </NavMenu>
    )
  }

  return (
    <NavMenu phone={phone} label={t('Ajouter')} onClose={onClose} triggerRef={triggerRef}>
      {target ? (
        <>
          <div className="kinm-head">
            <p className="kinm-title">{withEmphasis(t('Un proche <em>{ofName}</em>', { ofName: ofName(target) }))}</p>
            {closeButton}
          </div>
          {getPeople && (
            <button type="button" className="kinm-other" onClick={() => setView('who')}>{t("Pour quelqu'un d'autre")}</button>
          )}
          <div role="group" aria-label={t('Un proche')}>
            {choices?.parent !== false && <NavMenuItem icon={<ArrowUp {...ICON} />} label={t('Un parent')} onSelect={run(() => onKin('parent'))} />}
            <NavMenuItem
              icon={<ArrowLeftRight {...ICON} />}
              label={t('Un frère ou une sœur')}
              sub={choices?.sibling === false ? t('après un parent') : null}
              disabled={choices?.sibling === false}
              onSelect={run(() => onKin('sibling'))}
            />
            <NavMenuItem icon={<Heart {...ICON} />} label={t('Un conjoint')} onSelect={run(() => onKin('spouse'))} />
            <NavMenuItem icon={<ArrowDown {...ICON} />} label={t('Un enfant')} onSelect={run(() => onKin('child'))} />
          </div>
        </>
      ) : onAddPerson && (
        <NavMenuGroup label={t('Ajouter')}>
          <NavMenuItem icon={<UserPlus {...ICON} />} label={t('Une personne')} onSelect={run(onAddPerson)} />
        </NavMenuGroup>
      )}
      {otherGroups.map((group) => (
        <NavMenuGroup key={group.label} label={group.label}>
          {group.items.map((item) => (
            <NavMenuItem key={item.key} icon={item.icon} label={item.label} sub={item.sub} onSelect={run(item.onSelect)} />
          ))}
        </NavMenuGroup>
      ))}
    </NavMenu>
  )
}
