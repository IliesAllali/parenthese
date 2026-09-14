import { createApp } from './app.js'
import { env } from './config/env.js'

const app = createApp()

async function bootstrap() {
  try {
    await app.listen({
      port: env.PORT,
      host: '0.0.0.0',
    })
  } catch (error) {
    app.log.error(error)
    process.exit(1)
  }
}

bootstrap()