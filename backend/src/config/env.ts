import { config as loadDotenv } from 'dotenv'
import { z } from 'zod'

loadDotenv()

const DEV_DATABASE_URL = 'postgresql://postgres:postgres@localhost:5432/genealogy'
const DEV_JWT_SECRET = 'dev-secret-change-me-please'

// Valeurs d'exemple publiées dans le dépôt : une instance qui les garde a un secret connu de tous
const PUBLISHED_PLACEHOLDER_SECRETS = [
  DEV_JWT_SECRET,
  'change-me-in-production',
  'changeme',
]

// Adresses des proxys de confiance devant l'API (liste séparée par des virgules, mots-clés de proxy-addr :
// loopback, uniquelocal, linklocal, ou IP/CIDR). Par défaut : nginx sur la même machine (pm2) ou dans le
// réseau Docker (compose). L'adresse du client est la dernière entrée de X-Forwarded-For ajoutée par un
// proxy de confiance. `true` lirait l'adresse dans un en-tête que le client écrit lui-même, et Fastify
// ignore un nombre de sauts : ni l'un ni l'autre n'est accepté.
function parseTrustProxy(value: string): boolean | string {
  if (value === 'false') return false
  if (value === 'true' || /^\d+$/.test(value)) {
    throw new Error('TRUST_PROXY must list the proxy addresses (e.g. "loopback,uniquelocal"), not true or a hop count')
  }
  return value
}

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().positive().default(4000),
  HOST: z.string().min(1).default('0.0.0.0'),
  TRUST_PROXY: z.string().default('loopback,uniquelocal').transform(parseTrustProxy),
  DATABASE_URL: z.string().min(1).default(DEV_DATABASE_URL),
  JWT_SECRET: z.string().min(16).default(DEV_JWT_SECRET),
  JWT_EXPIRES_IN: z.string().default('7d'),
  JWT_TREE_ACCESS_EXPIRES_IN: z.string().default('24h'),
  CORS_ORIGIN: z
    .string()
    .default('http://localhost:5173,http://localhost:5174,http://localhost:5175,http://localhost:5176')
    .transform((value) => value.split(',').map((origin) => origin.trim()).filter(Boolean)),
  MEDIA_STORAGE_PATH: z.string().default('./storage/media'),
  // Place disque par arbre, et part réservée aux envois de la famille en attente de relecture
  MEDIA_QUOTA_PER_TREE_MB: z.coerce.number().int().positive().default(5120),
  MEDIA_PENDING_QUOTA_PER_TREE_MB: z.coerce.number().int().positive().default(500),
})

export const env = envSchema.parse(process.env)

if (env.NODE_ENV === 'production') {
  if (PUBLISHED_PLACEHOLDER_SECRETS.includes(env.JWT_SECRET)) {
    throw new Error('JWT_SECRET is a published example value: generate one with `openssl rand -base64 48`')
  }

  if (env.JWT_SECRET.length < 32) {
    console.warn('JWT_SECRET is shorter than 32 characters: generate a longer one with `openssl rand -base64 48`')
  }

  if (env.DATABASE_URL === DEV_DATABASE_URL) {
    throw new Error('DATABASE_URL must be overridden in production')
  }
}
