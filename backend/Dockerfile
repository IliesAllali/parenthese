# syntax=docker/dockerfile:1
# API Parenthèse (Fastify + Prisma). Contexte de build : le dossier backend/.
# Étape 1 : dépendances complètes, client Prisma, compilation TypeScript.
# Étape 2 : image finale avec les seules dépendances de production + la CLI Prisma
#           (nécessaire à `prisma migrate deploy` au démarrage).

FROM node:24-bookworm-slim AS build

# openssl : requis par les moteurs Prisma (cible debian-openssl-3.0.x).
RUN apt-get update \
  && apt-get install -y --no-install-recommends openssl ca-certificates \
  && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY package.json package-lock.json ./
COPY prisma ./prisma
RUN npm ci
RUN npx prisma generate

COPY tsconfig.json ./
COPY src ./src
RUN npm run build


FROM node:24-bookworm-slim AS runtime

RUN apt-get update \
  && apt-get install -y --no-install-recommends openssl ca-certificates \
  && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Dépendances de production seules, puis la CLI Prisma épinglée sur la version
# du client déjà installé (prisma est une devDependency dans package.json).
COPY package.json package-lock.json ./
RUN npm ci --omit=dev \
  && npm install --no-save --omit=dev "prisma@$(node -p "require('@prisma/client/package.json').version")" \
  && npm cache clean --force

# Client Prisma généré à l'étape 1 (même image de base, même cible de moteur).
COPY --from=build /app/node_modules/.prisma ./node_modules/.prisma
# Schéma + migrations : indispensables à `prisma migrate deploy`.
COPY prisma ./prisma
COPY --from=build /app/dist ./dist

RUN mkdir -p /app/storage/media && chown -R node:node /app/storage

ENV NODE_ENV=production \
    PORT=4000 \
    MEDIA_STORAGE_PATH=/app/storage/media

USER node
EXPOSE 4000

# Applique les migrations en attente puis démarre l'API (docker-compose.yml
# reprend la même commande explicitement).
CMD ["sh", "-c", "./node_modules/.bin/prisma migrate deploy && exec node dist/server.js"]
