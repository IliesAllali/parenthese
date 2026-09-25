import { useEffect, useMemo, useRef, useState } from 'react'
import { ImagePlus, Search, UserPlus, X } from 'lucide-react'
import './FamilyOnboarding.css'

export const HELP_URL = 'https://parenthese.io/aide/'

// Carte d'accueil de la famille qui arrive par le lien : ce qu'on peut faire, en deux phrases
export function FamilyWelcome({ visible, treeName, onAddSouvenir, onLook }) {
  useEffect(() => {
    if (!visible) return undefined
    const onKey = (e) => { if (e.key === 'Escape') onLook?.() }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [visible, onLook])

  if (!visible) return null

  return (
    <div className="pz-overlay fo-overlay">
      <div className="pz-modal fo-welcome" role="dialog" aria-modal="true" aria-labelledby="foWelcomeTitle">
        <p className="pz-eyebrow">Arbre partagé</p>
        <h1 id="foWelcomeTitle" className="pz-title fo-title">
          Bienvenue dans <em>{treeName || "l'arbre de la famille"}</em>
        </h1>
        <p className="fo-lead">Touchez un portrait pour voir ses photos et ses souvenirs.</p>
        <p className="fo-lead">Vous en avez à partager&nbsp;? Ajoutez-les ici, toute la famille pourra les voir.</p>
        <div className="fo-actions">
          <button type="button" className="pz-btn pz-btn--primary fo-big" onClick={onAddSouvenir}>
            <ImagePlus size={20} strokeWidth={2} aria-hidden="true" />
            Ajouter un souvenir
          </button>
          <button type="button" className="pz-btn pz-btn--ghost fo-big" onClick={onLook}>
            Regarder l'arbre
          </button>
        </div>
        <a className="fo-help" href={HELP_URL} target="_blank" rel="noopener">Besoin d'aide&nbsp;? Le mode d'emploi pas à pas</a>
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
    const t = window.setTimeout(() => inputRef.current?.focus(), 120)
    const onKey = (e) => { if (e.key === 'Escape') onClose?.() }
    document.addEventListener('keydown', onKey)
    return () => { window.clearTimeout(t); document.removeEventListener('keydown', onKey) }
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

  return (
    <div className="pz-overlay fo-overlay" onClick={() => onClose?.()}>
      <div className="pz-modal fo-picker" role="dialog" aria-modal="true" aria-labelledby="foPickerTitle" onClick={(e) => e.stopPropagation()}>
        <div className="pz-modal-head">
          <p className="pz-eyebrow">Ajouter un souvenir</p>
          <h1 id="foPickerTitle" className="pz-title fo-title">Pour <em>qui</em>&nbsp;?</h1>
        </div>
        <button type="button" className="pz-btn pz-btn--ghost pz-btn--icon pz-modal-close" onClick={onClose} aria-label="Fermer">
          <X size={18} aria-hidden="true" />
        </button>

        <label className="fo-search">
          <Search size={20} strokeWidth={2} aria-hidden="true" />
          <input
            ref={inputRef}
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Tapez un prénom"
            aria-label="Prénom de la personne"
            autoComplete="off"
            enterKeyHint="search"
          />
        </label>

        {!query.trim() && results.length > 0 && <p className="fo-hint">Ou choisissez ici</p>}

        <ul className="fo-list">
          {results.map((person) => (
            <li key={person.id}>
              <button type="button" className="fo-person" onClick={() => onPick?.(person)}>
                <span className="fo-thumb" aria-hidden="true">
                  {person.photo ? <img src={person.photo} alt="" /> : <span>{person.firstName?.[0] || '?'}</span>}
                </span>
                <span className="fo-name">
                  <strong>{person.firstName} {person.lastName}</strong>
                  {lifeYears(person) && <small>{lifeYears(person)}</small>}
                </span>
              </button>
            </li>
          ))}
        </ul>

        {query.trim() && results.length === 0 && (
          <p className="fo-empty">Personne ne s'appelle «&nbsp;{query.trim()}&nbsp;» dans l'arbre.</p>
        )}

        {onAddPerson && (
          <button type="button" className="fo-add-person" onClick={onAddPerson}>
            <UserPlus size={18} strokeWidth={2} aria-hidden="true" />
            La personne n'est pas dans l'arbre&nbsp;? Ajoutez-la
          </button>
        )}
      </div>
    </div>
  )
}
