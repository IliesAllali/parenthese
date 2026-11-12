import { sealedSecret } from './sealed-secret.js'

// Le mot de passe de partage est fait pour être donné à la famille : le propriétaire doit pouvoir le relire.
// Changer JWT_SECRET rend les valeurs illisibles : le panneau repasse alors en « à saisir », sans rien
// casser pour la famille.
export const { encrypt: encryptSharePassword, decrypt: decryptSharePassword } = sealedSecret('share-password-v1')
