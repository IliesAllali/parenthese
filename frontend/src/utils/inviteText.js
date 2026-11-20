import { t } from '../i18n/index.js'

// Du 1er décembre au 6 janvier, la famille se retrouve : le message d'invitation parle de Noël
export function isChristmasSeason(now = new Date()) {
  return now.getMonth() === 11 || (now.getMonth() === 0 && now.getDate() <= 6)
}

// Message d'invitation donné par « Envoyer le lien » (mail, SMS, WhatsApp). Le lien porte la clé de l'arbre
// (#247) : ni mot de passe ni mode d'emploi à recopier. seasonal : l'instance l'autorise (SIGNUP_PROMPTS)
export function buildInviteText(url, { seasonal = false, now = new Date() } = {}) {
  return [
    t('Bonjour à tous,'),
    '',
    seasonal && isChristmasSeason(now)
      ? t("Pour Noël, j'ai mis l'arbre de notre famille en ligne. Regardez-le avant le réveillon et apportez vos vieilles photos, on le complétera ensemble à table. Et si quelqu'un raconte une histoire de famille, enregistrez-la sur votre téléphone, sa voix aura sa place dans l'arbre.")
      : t("Je rassemble l'histoire de notre famille dans un arbre en ligne, et j'aimerais que vous m'aidiez à le compléter."),
    '',
    t("L'arbre est ici {url}", { url }),
  ].join('\n')
}
