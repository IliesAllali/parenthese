import { config as loadDotenv } from 'dotenv'
import { z } from 'zod'

loadDotenv()

const DEV_DATABASE_URL = 'postgresql://postgres:postgres@localhost:5432/genealogy'
const DEV_JWT_SECRET = 'dev-secret-change-me-please'

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().positive().default(4000),
  DATABASE_URL: z.string().min(1).default(DEV_DATABASE_URL),
  JWT_SECRET: z.string().min(16).default(DEV_JWT_SECRET),
  JWT_EXPIRES_IN: z.string().default('7d'),
  JWT_TREE_ACCESS_EXPIRES_IN: z.string().default('24h'),
  CORS_ORIGIN: z
    .string()
    .default('http://localhost:5173,http://localhost:5174,http://localhost:5175,http://localhost:5176')
    .transform((value) => value.split(',').map((origin) => origin.trim()).filter(Boolean)),
  MEDIA_STORAGE_PATH: z.string().default('./storage/media'),
})

export const env = envSchema.parse(process.env)

if (env.NODE_ENV === 'production') {
  if (env.JWT_SECRET === DEV_JWT_SECRET) {
    throw new Error('JWT_SECRET must be overridden in production')
  }

  if (env.DATABASE_URL === DEV_DATABASE_URL) {
    throw new Error('DATABASE_URL must be overridden in production')
  }
}
