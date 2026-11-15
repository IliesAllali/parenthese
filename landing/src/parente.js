// Calculateur de lien de parenté de la page /liens-de-parente/. Il nomme le lien avec le même code que
// l'application (frontend/src/utils/kinship/fr.js), pour que la page et l'arbre disent la même chose.
// Injecté par scripts/inject-pages.mjs dans les pages qui contiennent #calculateur-parente.
import nameFr from '../../frontend/src/utils/kinship/fr.js'

const root = document.getElementById('calculateur-parente')

// Les pas qu'on peut ajouter, et ceux qui n'ont pas de sens juste après un autre : l'arbre passe toujours
// par le chemin le plus court, donc « parent de mon enfant » ou « frère de mon frère » ne s'y présentent pas.
const STEPS = {
  up: { label: 'Parent', after: (prev) => prev !== 'down' && prev !== 'sibling' },
  sibling: { label: 'Frère ou sœur', after: (prev) => prev !== 'sibling' },
  down: { label: 'Enfant', after: () => true },
  spouse: { label: 'Conjoint', after: (prev) => prev !== 'spouse' },
}
const MAX_STEPS = 8

if (root) {
  const chain = root.querySelector('[data-chaine]')
  const result = root.querySelector('[data-resultat]')
  const buttons = root.querySelectorAll('[data-pas]')
  const sexButtons = root.querySelectorAll('[data-sexe]')
  const undo = root.querySelector('[data-retirer]')
  const reset = root.querySelector('[data-recommencer]')

  // Exemple affiché sans JavaScript, repris tel quel au chargement
  let moves = (root.dataset.depart || '').split(',').filter(Boolean)
  let sex = null

  const render = () => {
    chain.replaceChildren(...['Vous', ...moves.map((m) => STEPS[m].label)].map((text, i) => {
      const span = document.createElement('span')
      span.textContent = text
      if (i === 0) span.className = 'moi'
      return span
    }))
    const prev = moves[moves.length - 1]
    for (const b of buttons) b.disabled = moves.length >= MAX_STEPS || !STEPS[b.dataset.pas].after(prev)
    for (const b of sexButtons) b.setAttribute('aria-pressed', String((b.dataset.sexe || null) === sex))
    undo.disabled = moves.length === 0
    reset.disabled = moves.length === 0
    const path = { from: { sex: null }, steps: moves.map((move, i) => ({ move, person: { sex: i === moves.length - 1 ? sex : null } })) }
    result.textContent = moves.length ? nameFr(path) : 'Choisissez un premier pas'
  }

  for (const b of buttons) b.addEventListener('click', () => { moves = [...moves, b.dataset.pas]; render() })
  for (const b of sexButtons) b.addEventListener('click', () => { sex = b.dataset.sexe || null; render() })
  undo.addEventListener('click', () => { moves = moves.slice(0, -1); render() })
  reset.addEventListener('click', () => { moves = []; render() })

  root.classList.add('actif')
  render()
}
