import { useMemo, useState } from 'react'
import { ArrowDown, ArrowLeftRight, ArrowUp, ChevronLeft, ChevronRight, Heart, Search, UserPlus } from 'lucide-react'
import { NavMenu, NavMenuGroup, NavMenuItem } from './NavMenu'
import PortraitThumb from '../PortraitThumb.jsx'
import { t } from '../../i18n/index.js'
import { withEmphasis } from '../../utils/richText.jsx'
import { ofName } from '../../utils/kinForm.js'
import { firstNameLabel, surnameLabel } from '../../utils/personName.js'
import NoPhotoPortrait from '../NoPhotoPortrait.jsx'

const ICON = { size: 18, strokeWidth: 2, 'aria-hidden': true }
// Au-delà, la liste « Pour qui ? » prend un champ de recherche
const SEARCH_FROM = 8

const normalize = (text) => String(text || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()

/**
 * Le menu du « + » (#245) : « Un proche de Lucie », au nom de la dernière personne touchée (soi par défaut).
 * L'en-tête reprend celui du menu du compte ; le toucher ouvre « Pour qui ? » pour changer de personne.
 * Quatre lignes, une par lien : chacune dit où la personne se place (au-dessus, à côté, cœur, en dessous).
 * Un lien déjà rempli disparaît. Puis « Autre chose ».
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
  const back = () => { setView('menu'); setQuery('') }

  if (view === 'who') {
    return (
      <NavMenu phone={phone} label={t('Pour qui ?')} onClose={onClose} triggerRef={triggerRef}>
        <NavMenuItem icon={<ChevronLeft {...ICON} />} label={t('Retour')} onSelect={back} />
        {people.length > SEARCH_FROM && (
          <label className="fo-search">
            <Search size={20} strokeWidth={2} aria-hidden="true" />
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
        <NavMenuGroup label={t('Pour qui ?')}>
          {shown.map(({ person, label, self }) => (
            <NavMenuItem
              key={person.id}
              icon={(
                <span className="apn-avatar">
                  {person.photo ? <PortraitThumb src={person.photo} crop={person.avatarCrop} /> : <NoPhotoPortrait />}
                </span>
              )}
              label={`${firstNameLabel(person)} ${surnameLabel(person.lastName)}`.trim()}
              sub={self ? t('vous') : label || null}
              onSelect={() => { onTarget?.(person); back() }}
            />
          ))}
        </NavMenuGroup>
      </NavMenu>
    )
  }

  return (
    <NavMenu phone={phone} label={t('Ajouter')} onClose={onClose} triggerRef={triggerRef}>
      {target ? (
        <>
          {getPeople ? (
            <button type="button" role="menuitem" className="navm-item navm-head" onClick={() => setView('who')}>
              <span className="navm-head-mono navm-head-mono--portrait" aria-hidden="true">
                {target.photo ? <PortraitThumb src={target.photo} crop={target.avatarCrop} /> : <NoPhotoPortrait />}
              </span>
              <span className="navm-text">
                <strong>{withEmphasis(t('Un proche <em>{ofName}</em>', { ofName: ofName(target) }))}</strong>
                <small>{t("Pour quelqu'un d'autre")}</small>
              </span>
              <ChevronRight size={16} aria-hidden="true" className="navm-chevron" />
            </button>
          ) : (
            <p className="navm-group">{withEmphasis(t('Un proche <em>{ofName}</em>', { ofName: ofName(target) }))}</p>
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
