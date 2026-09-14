# Sécurité

## Signaler une faille

Ne décrivez jamais une faille dans une issue, une discussion ou une pull request : tout y est public.

Deux canaux privés :

- l'onglet **Security** de ce dépôt GitHub, bouton « Report a vulnerability » ;
- un email à pro.allali.ilies@gmail.com.

Indiquez si possible ce qui est touché (adresse, route de l'API, fichier), les étapes pour reproduire et l'impact que vous constatez. Un rapport court et précis suffit.

## Périmètre

- L'instance publique [parenthese.io](https://parenthese.io) : le site, l'application et son API.
- Le code de ce dépôt, y compris la configuration d'auto-hébergement (`docker-compose.yml`, images Docker, configuration nginx).

Une instance auto-hébergée par quelqu'un d'autre relève de son administrateur. Si la faille vient du code, elle est dans le périmètre.

Sur parenthese.io, testez uniquement avec votre propre compte et vos propres galaxies. N'accédez pas aux données d'autres familles, et pas de déni de service ni de tests automatisés massifs.

## Délai de réponse

Parenthèse est maintenu par une seule personne. Vous recevrez un accusé de réception dès que possible, en général sous une semaine. Les failles graves passent avant tout le reste. Une fois le correctif publié, la faille peut être décrite publiquement, en laissant aux auto-hébergeurs le temps de mettre à jour.

Seule la dernière version de la branche `main` reçoit des correctifs.
