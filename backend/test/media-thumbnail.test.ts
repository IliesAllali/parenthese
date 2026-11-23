import sharp from 'sharp'
import { describe, expect, it } from 'vitest'

import { decodeThumbnailBase64, isVideoFileMime, sanitizeVideoThumbnail } from '../src/lib/media-thumbnail.js'

// Miniature d'un fichier vidéo, prise par le navigateur : le serveur ne garde qu'une vraie image, réencodée
const image = (width: number, height: number, format: 'png' | 'jpeg' | 'webp' = 'png') =>
  sharp({ create: { width, height, channels: 3, background: '#7a5c3e' } })[format]().toBuffer()

describe('decodeThumbnailBase64', () => {
  it('lit le base64, avec ou sans en-tête data:', async () => {
    const png = await image(4, 4)
    expect(decodeThumbnailBase64(png.toString('base64'))).toEqual(png)
    expect(decodeThumbnailBase64(`data:image/png;base64,${png.toString('base64')}`)).toEqual(png)
  })

  it("laisse de côté ce qui n'est pas une chaîne, ou une chaîne trop longue pour une miniature", () => {
    expect(decodeThumbnailBase64(undefined)).toBeNull()
    expect(decodeThumbnailBase64(42)).toBeNull()
    expect(decodeThumbnailBase64('')).toBeNull()
    expect(decodeThumbnailBase64('A'.repeat(1_000_001))).toBeNull()
  })
})

describe('sanitizeVideoThumbnail', () => {
  it('réencode en JPEG, 640 px au plus, proportions gardées', async () => {
    const out = await sanitizeVideoThumbnail(await image(1280, 720))
    expect(out).not.toBeNull()
    const meta = await sharp(out as Buffer).metadata()
    expect(meta.format).toBe('jpeg')
    expect(meta.width).toBe(640)
    expect(meta.height).toBe(360)
    expect(meta.exif).toBeUndefined()
  })

  it("n'agrandit pas une petite image", async () => {
    const meta = await sharp((await sanitizeVideoThumbnail(await image(320, 180, 'webp'))) as Buffer).metadata()
    expect(meta.width).toBe(320)
  })

  it("refuse ce qui n'est pas une image : texte, SVG, image tronquée, GIF", async () => {
    expect(await sanitizeVideoThumbnail(null)).toBeNull()
    expect(await sanitizeVideoThumbnail(Buffer.from('<svg xmlns="http://www.w3.org/2000/svg"><script>1</script></svg>'))).toBeNull()
    expect(await sanitizeVideoThumbnail((await image(64, 64, 'jpeg')).subarray(0, 40))).toBeNull()
    expect(await sanitizeVideoThumbnail(Buffer.from('GIF89a\x01\x00\x01\x00', 'latin1'))).toBeNull()
  })
})

describe('isVideoFileMime', () => {
  it('reconnaît les fichiers vidéo acceptés, pas YouTube', () => {
    expect(isVideoFileMime('video/mp4')).toBe(true)
    expect(isVideoFileMime('video/quicktime')).toBe(true)
    expect(isVideoFileMime('video/webm')).toBe(true)
    expect(isVideoFileMime('video/youtube')).toBe(false)
    expect(isVideoFileMime(null)).toBe(false)
  })
})
