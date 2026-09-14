import pkg from '@prisma/client'
import { env } from '../config/env.js'

const { PrismaClient } = pkg

export const prisma = new PrismaClient({
  datasources: {
    db: {
      url: env.DATABASE_URL,
    },
  },
})
