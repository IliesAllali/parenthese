import { sealedSecret } from './sealed-secret.js'

// Clé d'API Immich d'un arbre : secrète au repos, jamais renvoyée au front ni écrite dans les
// journaux. Changer JWT_SECRET rend les clés illisibles ; chaque arbre repasse alors en
// « à configurer », sans rien casser d'autre.
export const { encrypt: encryptImmichApiKey, decrypt: decryptImmichApiKey } = sealedSecret('immich-api-key-v1')
