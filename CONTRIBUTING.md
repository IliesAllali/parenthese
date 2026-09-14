# Contribuer à Parenthèse

Parenthèse est maintenu par une seule personne. Les retours sont les bienvenus, et quelques repères font gagner du temps à tout le monde.

## Avant d'écrire du code

- Un bug ou une idée : ouvrez une issue avec le modèle correspondant.
- Une faille de sécurité : pas d'issue publique, suivez [SECURITY.md](SECURITY.md).
- Pour tout changement plus large qu'une correction, parlez-en d'abord dans une issue. Une pull request non discutée peut être refusée, même soignée.
- Préférez de petites pull requests ciblées : un sujet par PR, un diff qui se relit en quelques minutes.

## Lancer le projet en local

Tout est dans la section « Développer » du [README](README.md).

## Tests

Avant d'ouvrir une pull request, faites passer ce que vérifie la CI :

```bash
npm --prefix frontend ci && npm --prefix frontend run lint && npm --prefix frontend test && npm --prefix frontend run build
npm --prefix landing ci && npm --prefix landing test && npm --prefix landing run build
npm --prefix backend ci && npm --prefix backend run prisma:generate && npm --prefix backend run build && npm --prefix backend test
```

La CI vérifie aussi que les migrations Prisma s'appliquent sur une base vide et reproduisent exactement `backend/prisma/schema.prisma`. Toute modification du schéma s'accompagne donc d'une migration (`npm --prefix backend run prisma:migrate`).

Si vous touchez à Docker ou à nginx, lancez `docker compose up -d --build` puis `bash tools/docker-smoke.sh http://localhost`.

## Conventions

- L'interface est en français : libellés, messages, textes d'aide.
- Pas de nouvelle dépendance lourde (framework, bibliothèque d'interface, service externe) sans en avoir discuté dans une issue.
- La promesse du README tient : pas de publicité, et aucune mesure d'audience activée par défaut sur une instance auto-hébergée.

## Licence

Parenthèse est publié sous [PolyForm Noncommercial 1.0.0](LICENSE). En proposant une contribution, vous acceptez qu'elle soit publiée sous cette même licence.
