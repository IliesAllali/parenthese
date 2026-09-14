// Resolver : imports relatifs sans extension (style Vite) → .js / .jsx / index.js
import { existsSync } from 'node:fs'
import { fileURLToPath } from 'node:url'

export async function resolve(specifier, context, nextResolve) {
  if ((specifier.startsWith('./') || specifier.startsWith('../')) && !/\.[a-z]+$/i.test(specifier) && context.parentURL) {
    const base = new URL(specifier, context.parentURL)
    for (const ext of ['.js', '.mjs', '.jsx', '/index.js']) {
      const candidate = base.href + ext
      if (existsSync(fileURLToPath(candidate))) return nextResolve(candidate, context)
    }
  }
  return nextResolve(specifier, context)
}
