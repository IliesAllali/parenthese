// Modèle 0 : layout actuel du repo (Sugiyama custom), tel quel
import { layoutModule } from '../load.mjs'

export const name = 'M0 actuel (Sugiyama custom)'

export async function layout(graphData) {
  const result = layoutModule.computeLayout(graphData)
  return { result, coupleBarMeta: layoutModule.coupleBarMeta }
}
