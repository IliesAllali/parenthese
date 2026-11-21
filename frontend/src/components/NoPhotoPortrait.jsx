import { UserRound } from 'lucide-react'
import './NoPhotoPortrait.css'

// Portrait d'une personne sans photo (#244) : la silhouette Lucide « user-round », ton sur ton, comme dans l'arbre.
// Remplit son cadre, qui donne la taille et la forme. Décorative : le nom est toujours écrit à côté.
export default function NoPhotoPortrait() {
  return (
    <span className="pz-nophoto" aria-hidden="true">
      <UserRound className="pz-nophoto-icon" />
    </span>
  )
}
