import { useEffect, useState } from 'react'
import { listTreeVisits } from '../api/treeApi'

// Onglet Visites des paramètres de l'arbre : qui est venu, combien de fois.
// Le journal est tenu par le serveur à chaque ouverture de l'arbre (backend/src/lib/tree-visits.ts).

const DEVICE_LABEL = { phone: 'téléphone', tablet: 'tablette', desktop: 'ordinateur' }
const ACCESS_LABEL = { share: 'avec le lien', member: 'membre', shared_account: 'avec son compte' }

function visitorLabel(visit) {
  if (visit.isYou) return 'Vous'
  if (visit.name) return visit.name
  if (visit.email) return visit.email.split('@')[0]
  return 'Un visiteur'
}

function whenLabel(value) {
  const date = new Date(value)
  const time = date.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })
  const startOfDay = (d) => new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime()
  const days = Math.round((startOfDay(new Date()) - startOfDay(date)) / 86400000)
  if (days === 0) return `aujourd'hui à ${time}`
  if (days === 1) return `hier à ${time}`
  return `${date.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })} à ${time}`
}

function plural(n, one, many) {
  return `${n} ${n > 1 ? many : one}`
}

const TreeVisitsSection = ({ treeId, authToken }) => {
  const [state, setState] = useState({ loading: true, error: '', data: null })

  useEffect(() => {
    let active = true
    setState({ loading: true, error: '', data: null })
    listTreeVisits(treeId, authToken)
      .then((data) => { if (active) setState({ loading: false, error: '', data }) })
      .catch(() => { if (active) setState({ loading: false, error: 'Impossible de charger les visites.', data: null }) })
    return () => { active = false }
  }, [treeId, authToken])

  if (state.loading) return <p className="pz-small ts-loading">Chargement…</p>
  if (state.error) return <div className="pz-error" role="alert">{state.error}</div>

  const { summary, recent } = state.data
  return (
    <div className="ts-panel tv">
      <div className="tv-stats">
        {[['7 derniers jours', summary.last7], ['30 derniers jours', summary.last30]].map(([label, s]) => (
          <div key={label} className="tv-stat">
            <p className="pz-eyebrow">{label}</p>
            <p className="tv-stat-value">{plural(s.visits, 'visite', 'visites')}</p>
            <p className="pz-small">{plural(s.visitors, 'personne', 'personnes')}</p>
          </div>
        ))}
      </div>
      <p className="pz-hint">Vos propres visites ne sont pas comptées. Le prénom apparaît quand le visiteur l'a donné en ouvrant l'arbre.</p>

      <div className="tv-list">
        <p className="pz-eyebrow">Dernières visites</p>
        {recent.length === 0 ? (
          <p className="pz-small">Aucune visite pour l'instant. Le journal a commencé le 25 septembre 2026.</p>
        ) : (
          <ul>
            {recent.map((visit) => (
              <li key={visit.id} className={`tv-row ${visit.isYou ? 'is-you' : ''}`}>
                <span className="tv-name">{visitorLabel(visit)}</span>
                <span className="tv-meta pz-small">
                  {whenLabel(visit.createdAt)} · {DEVICE_LABEL[visit.device] || visit.device} · {ACCESS_LABEL[visit.accessKind] || visit.accessKind}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}

export default TreeVisitsSection
