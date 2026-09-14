import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  // Dev seulement : VITE_DEV_PROXY_TARGET fait passer l'API et les médias par le serveur Vite, avec
  // VITE_API_BASE_URL vide (même origine). Deux usages, voir .env.development.local :
  //   - https://app.parenthese.io : tester le front local sur un arbre réel (nginx retire /api côté prod)
  //   - http://127.0.0.1:4000 + VITE_DEV_PROXY_STRIP_API=1 : backend local, Vite retire /api comme nginx
  //     (sans ça, les liens partagés /api/arbre/:slug et les médias /api/... répondent 404 en local)
  const proxyTarget = env.VITE_DEV_PROXY_TARGET
  const stripApi = env.VITE_DEV_PROXY_STRIP_API === '1'
  const proxy = proxyTarget
    ? Object.fromEntries(['/api', '/trees', '/auth', '/health'].map((p) => [p, {
      target: proxyTarget,
      changeOrigin: true,
      ...(p === '/api' && stripApi ? { rewrite: (requestPath) => requestPath.replace(/^\/api/, '') } : {}),
    }]))
    : undefined

  return {
    plugins: [react()],
    server: { proxy },
    test: {
      environment: 'node',
      include: ['src/**/*.test.{js,jsx}'],
    },
  }
})
