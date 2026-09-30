import sharp from 'sharp'
import { describe, expect, it, vi } from 'vitest'

import { sanitizeAnnotationContentForRead, sanitizeAnnotationContentForWrite } from '../src/lib/annotation-content.js'
import { isMimeAllowedForType, sanitizeImage, scrubMp4Location, sniffMimeType } from '../src/lib/media-files.js'
import { matchSharePassword } from '../src/lib/password-variants.js'
import { isTreeUnlockLocked, recordTreeUnlockFailure, resetTreeUnlockGuard } from '../src/lib/unlock-guard.js'

const PNG_1PX = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR4nGP4z8DwHwAFAAH/iZk9HQAAAABJRU5ErkJggg==', 'base64')

function accepted(buf: Buffer, type: Parameters<typeof sniffMimeType>[1], fileName = ''): string | null {
  const mime = sniffMimeType(buf, type, fileName)
  return mime && isMimeAllowedForType(type, mime) ? mime : null
}

describe('fichiers envoyés : type lu dans les octets', () => {
  it('refuse un SVG envoyé comme photo', () => {
    const svg = Buffer.from('<svg xmlns="http://www.w3.org/2000/svg"><script>alert(1)</script></svg>')
    expect(accepted(svg, 'photo', 'chat.svg')).toBeNull()
  })

  it('refuse du HTML déguisé en PNG', () => {
    expect(accepted(Buffer.from('<html><script>alert(1)</script></html>'), 'photo', 'photo.png')).toBeNull()
  })

  it('reconnaît une vraie photo PNG quel que soit le nom', () => {
    expect(accepted(PNG_1PX, 'photo', 'photo.jpg')).toBe('image/png')
  })

  it('accepte un tracé GPX et refuse un document XHTML envoyé comme GPX', () => {
    expect(accepted(Buffer.from('<?xml version="1.0"?>\n<gpx version="1.1"></gpx>'), 'gpx')).toBe('application/gpx+xml')
    expect(accepted(Buffer.from('<html xmlns="http://www.w3.org/1999/xhtml"><script>1</script></html>'), 'gpx')).toBeNull()
  })

  it('refuse un document texte qui commence par une balise', () => {
    expect(accepted(Buffer.from('<!doctype html><script>1</script>'), 'document', 'note.txt')).toBeNull()
    expect(accepted(Buffer.from('Souvenir de la ferme'), 'document', 'note.txt')).toBe('text/plain')
  })

  it('refuse une image envoyée comme GeoJSON', () => {
    expect(accepted(PNG_1PX, 'geojson')).toBeNull()
    expect(accepted(Buffer.from('{"type":"FeatureCollection","features":[]}'), 'geojson')).toBe('application/geo+json')
  })
})

describe('photos : métadonnées retirées, rotation appliquée', () => {
  it('retire le GPS et tourne les pixels selon l orientation du téléphone', async () => {
    const withGps = await sharp({ create: { width: 64, height: 48, channels: 3, background: { r: 200, g: 120, b: 60 } } })
      .jpeg()
      .withMetadata({ orientation: 6 })
      .withExifMerge({ IFD3: { GPSLatitudeRef: 'N', GPSLatitude: '50/1 37/1 5/1' } })
      .toBuffer()
    expect((await sharp(withGps).metadata()).exif).toBeDefined()

    const cleaned = await sanitizeImage(withGps, 'image/jpeg')
    const meta = await sharp(cleaned).metadata()
    expect(meta.exif).toBeUndefined()
    expect(meta.width).toBe(48)
    expect(meta.height).toBe(64)
  })

  it('refuse une image illisible', async () => {
    await expect(sanitizeImage(Buffer.from([0xff, 0xd8, 0xff, 0x00, 0x01]), 'image/jpeg')).rejects.toThrow('invalid_image')
  })
})

describe('vidéos : position ISO 6709 remise à zéro dans moov seulement', () => {
  function box(type: string, payload: Buffer): Buffer {
    const header = Buffer.alloc(8)
    header.writeUInt32BE(8 + payload.length, 0)
    header.write(type, 4, 'latin1')
    return Buffer.concat([header, payload])
  }

  it('efface les coordonnées de moov sans toucher à mdat', () => {
    const ftyp = box('ftyp', Buffer.from('isom0000'))
    const mdat = box('mdat', Buffer.from('+50.6300+003.0600/ donnees'))
    const moov = box('moov', Buffer.from('udta xyz +50.6300+003.0600+025.000/ fin'))
    const scrubbed = scrubMp4Location(Buffer.concat([ftyp, mdat, moov])).toString('latin1')
    expect(scrubbed).toContain('+00.0000+000.0000+000.000/ fin')
    expect(scrubbed).toContain('+50.6300+003.0600/ donnees')
  })
})

describe('annotations photo : jamais d adresse enregistrée', () => {
  const treeId = 'tree-1'

  it('retire l adresse (et la session qu elle portait) à l écriture', () => {
    const content = JSON.stringify({ photoPath: `/trees/${treeId}/annotation-photos/abc-123`, url: '/api/x?token=SESSION', w: 1, h: 1 })
    const stored = sanitizeAnnotationContentForWrite(content, treeId)
    expect(stored).not.toContain('token')
    expect(JSON.parse(stored)).toEqual({ photoPath: `/trees/${treeId}/annotation-photos/abc-123`, w: 1, h: 1 })
  })

  it('refuse un chemin de photo d un autre arbre ou une adresse externe', () => {
    expect(() => sanitizeAnnotationContentForWrite(JSON.stringify({ photoPath: '/trees/autre/annotation-photos/abc' }), treeId)).toThrow()
    expect(() => sanitizeAnnotationContentForWrite(JSON.stringify({ url: 'https://pisteur.example/pixel.gif' }), treeId)).toThrow()
  })

  it('nettoie les anciennes valeurs à la lecture et laisse le reste intact', () => {
    expect(sanitizeAnnotationContentForRead(JSON.stringify({ photoPath: '/p', url: '/x?token=S' }))).toBe(JSON.stringify({ photoPath: '/p' }))
    expect(sanitizeAnnotationContentForRead('Mamie à 20 ans')).toBe('Mamie à 20 ans')
    expect(sanitizeAnnotationContentForRead(JSON.stringify({ paths: [] }))).toBe(JSON.stringify({ paths: [] }))
  })
})

describe('mot de passe de partage', () => {
  it('ne compare qu une fois quand les deux colonnes portent le même hash', async () => {
    const verify = vi.fn(async () => false)
    await matchSharePassword('abcdefgh', ['h1', 'h1'], verify)
    expect(verify).toHaveBeenCalledTimes(1)
  })

  it('verrouille un arbre après 30 échecs dans la fenêtre, puis le libère', () => {
    resetTreeUnlockGuard()
    const now = Date.now()
    for (let i = 0; i < 29; i += 1) recordTreeUnlockFailure('tree-x', now)
    expect(isTreeUnlockLocked('tree-x', now)).toBe(false)
    recordTreeUnlockFailure('tree-x', now)
    expect(isTreeUnlockLocked('tree-x', now)).toBe(true)
    expect(isTreeUnlockLocked('tree-autre', now)).toBe(false)
    expect(isTreeUnlockLocked('tree-x', now + 16 * 60 * 1000)).toBe(false)
  })
})
