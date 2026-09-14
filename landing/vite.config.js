import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { resolve } from 'path'
import { fileURLToPath } from 'url'

const __dirname = fileURLToPath(new URL('.', import.meta.url))

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      // Shared Bradford LL fonts from the main frontend assets
      '@fonts': resolve(__dirname, '../frontend/src/assets/Bradford'),
    },
  },
  build: {
    outDir: 'dist',
    emptyOutDir: true,
  },
})
