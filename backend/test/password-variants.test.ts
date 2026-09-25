import { describe, expect, it } from 'vitest'

import { sharePasswordVariants } from '../src/lib/password-variants'

describe('sharePasswordVariants', () => {
  it('ajoute la forme droite et la forme typographique de l\'apostrophe', () => {
    expect(sharePasswordVariants('Lavenuedel’Avenir')).toContain("Lavenuedel'Avenir")
    expect(sharePasswordVariants("Lavenuedel'Avenir")).toContain('Lavenuedel’Avenir')
  })

  it('retire les espaces autour sans toucher à la casse', () => {
    expect(sharePasswordVariants('  Soleil ')).toEqual(['  Soleil ', 'Soleil'])
  })

  it('ne change rien à un mot de passe simple', () => {
    expect(sharePasswordVariants('123soleil')).toEqual(['123soleil'])
  })
})
