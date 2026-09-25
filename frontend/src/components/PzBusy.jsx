/**
 * Libellé de bouton qui attend le serveur : le texte s'efface, trois points
 * respirent à sa place. Le texte reste dans la mise en page, le bouton garde sa largeur.
 * busyLabel est lu par les lecteurs d'écran pendant l'attente.
 */
export default function PzBusy({ busy, busyLabel = 'En cours', children }) {
  return (
    <span className={`pz-busy${busy ? ' is-busy' : ''}`}>
      <span className="pz-busy-lbl" aria-hidden={busy || undefined}>{children}</span>
      <span className="pz-dots" aria-hidden="true"><i /><i /><i /></span>
      {busy && <span className="pz-sr">{busyLabel}</span>}
    </span>
  )
}
