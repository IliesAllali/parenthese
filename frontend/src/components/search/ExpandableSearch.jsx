import { useState, useRef, useEffect, useCallback } from 'react'
import { Search, X } from 'lucide-react'
import SearchResultsDropdown from './SearchResultsDropdown'
import './ExpandableSearch.css'

/**
 * Recherche expandable haut-droite
 * Double affichage (dropdown + highlight galaxie)
 *
 * @param {Object} props
 * @param {Array} props.results - Résultats de recherche [{person, score, reason}]
 * @param {boolean} props.hasResults - Y a-t-il des résultats
 * @param {Function} props.onSearch - Handler recherche (query)
 * @param {Function} props.onClear - Handler clear recherche
 * @param {Function} props.onResultClick - Handler clic résultat (person)
 * @param {Function} props.onResultHover - Handler hover résultat (person)
 * @param {Function} props.onResultHoverEnd - Handler fin hover
 */
function ExpandableSearch({
  results = [],
  hasResults = false,
  onSearch,
  onClear,
  onResultClick,
  onResultHover,
  onResultHoverEnd,
}) {
  const [expanded, setExpanded] = useState(false)
  const [query, setQuery] = useState('')
  // Après un choix, la liste se replie pour laisser voir la personne dans l'arbre ; toucher le champ la rouvre
  const [resultsHidden, setResultsHidden] = useState(false)
  const inputRef = useRef(null)
  const containerRef = useRef(null)

  const handleCollapse = useCallback(() => {
    setExpanded(false)
    setQuery('')
    setResultsHidden(false)
    onClear?.()
  }, [onClear])

  // Focus input au expand
  useEffect(() => {
    if (expanded && inputRef.current) {
      inputRef.current.focus()
    }
  }, [expanded])

  // Gérer clic outside pour collapse
  useEffect(() => {
    if (!expanded) return

    function handleClickOutside(event) {
      if (containerRef.current && !containerRef.current.contains(event.target)) {
        // Ne collapse que si pas de résultats affichés
        if (!hasResults) {
          handleCollapse()
        }
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [expanded, hasResults, handleCollapse])

  // Gérer ESC pour collapse
  useEffect(() => {
    function handleEscape(event) {
      if (event.key === 'Escape' && expanded) {
        handleCollapse()
      }
    }

    document.addEventListener('keydown', handleEscape)
    return () => document.removeEventListener('keydown', handleEscape)
  }, [expanded, handleCollapse])

  const handleExpand = () => {
    setExpanded(true)
  }

  const handleInputChange = (e) => {
    const value = e.target.value
    setQuery(value)
    setResultsHidden(false)
    onSearch?.(value)
  }

  const handleResultClick = (person) => {
    onResultClick?.(person)
    // La recherche reste ouverte (le champ garde la saisie), seule la liste se replie
    setResultsHidden(true)
    inputRef.current?.blur()
  }

  return (
    <div
      ref={containerRef}
      className={`expandable-search ${expanded ? 'expanded' : ''}`}
    >
      {!expanded ? (
        // État collapsed - Icône loupe
        <button
          type="button"
          className="search-icon-button"
          onClick={handleExpand}
          aria-label="Rechercher une personne"
        >
          <span className="search-icon"><Search size={22} strokeWidth={2} /></span>
        </button>
      ) : (
        // État expanded - Input + dropdown
        <div className="search-expanded-content">
          <div className="search-input-wrapper">
            <span className="search-input-icon"><Search size={20} strokeWidth={2} /></span>
            <input
              ref={inputRef}
              type="text"
              className="search-input"
              placeholder="Un prénom, un nom, une ville"
              value={query}
              onChange={handleInputChange}
              onFocus={() => setResultsHidden(false)}
              aria-label="Rechercher une personne"
            />
            <button
              type="button"
              className="search-close-button"
              onClick={handleCollapse}
              aria-label="Fermer la recherche"
            >
              <X size={16} strokeWidth={2} />
            </button>
          </div>

          {/* Dropdown résultats */}
          {query.trim().length >= 2 && !resultsHidden && (
            <SearchResultsDropdown
              results={results}
              query={query}
              onResultClick={handleResultClick}
              onResultHover={onResultHover}
              onResultHoverEnd={onResultHoverEnd}
            />
          )}
        </div>
      )}
    </div>
  )
}

export default ExpandableSearch
