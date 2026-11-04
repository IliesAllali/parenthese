import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  build: {
    // Mêmes navigateurs qu'avec Vite 7, comme le front (Vite 8 relève sa cible par défaut)
    target: ['chrome107', 'edge107', 'firefox104', 'safari16'],
    outDir: 'dist',
    emptyOutDir: true,
    // Le manifeste donne le nom à empreinte de src/pages.js, que scripts/inject-pages.mjs pose
    // dans les pages statiques de public/ (guides, aide, vidéo), copiées sans passer par Vite
    manifest: true,
    rollupOptions: {
      input: { main: 'index.html', pages: 'src/pages.js' },
    },
  },
})
