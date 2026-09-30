import { describe, expect, it } from 'vitest'

import { buildMediaUrl } from './mediaToken.js'

describe('adresse des médias', () => {
  it('ajoute le jeton médias aux fichiers servis par l API', () => {
    expect(buildMediaUrl('/trees/t/media/m', '/api', 'jeton')).toBe('/api/trees/t/media/m?token=jeton')
  })

  it('ne met jamais de jeton sur une adresse externe', () => {
    expect(buildMediaUrl('https://www.youtube.com/watch?v=abc', '/api', 'jeton')).toBe('https://www.youtube.com/watch?v=abc')
  })

  it('renvoie null sans chemin', () => {
    expect(buildMediaUrl('', '/api', 'jeton')).toBeNull()
  })
})
