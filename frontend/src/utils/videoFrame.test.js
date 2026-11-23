import { describe, expect, it, vi } from 'vitest'
import { frameSize, frameTime, isVideoFileMime, jpegDataUrlToBase64, videoThumbnailField } from './videoFrame.js'

describe('miniature d’un fichier vidéo', () => {
  it("prend l'image à une seconde, ou à 10 % d'une vidéo courte", () => {
    expect(frameTime(120)).toBe(1)
    expect(frameTime(10)).toBe(1)
    expect(frameTime(4)).toBeCloseTo(0.4)
    expect(frameTime(0.5)).toBeCloseTo(0.05)
  })

  it('durée inconnue (webm enregistré par un navigateur) : un dixième de seconde', () => {
    expect(frameTime(Infinity)).toBe(0.1)
    expect(frameTime(NaN)).toBe(0.1)
    expect(frameTime(0)).toBe(0.1)
  })

  it('réduit à 640 px de côté, proportions gardées, sans agrandir', () => {
    expect(frameSize(1920, 1080)).toEqual({ width: 640, height: 360 })
    expect(frameSize(1080, 1920)).toEqual({ width: 360, height: 640 })
    expect(frameSize(320, 240)).toEqual({ width: 320, height: 240 })
    expect(frameSize(0, 0)).toBeNull()
    expect(frameSize(NaN, 100)).toBeNull()
  })

  it('ne garde que la partie base64 d’une image JPEG', () => {
    expect(jpegDataUrlToBase64('data:image/jpeg;base64,AAAA')).toBe('AAAA')
    // Canevas vide : le navigateur renvoie « data:, »
    expect(jpegDataUrlToBase64('data:,')).toBeNull()
    expect(jpegDataUrlToBase64('data:image/png;base64,AAAA')).toBeNull()
    expect(jpegDataUrlToBase64(null)).toBeNull()
  })

  it('reconnaît les fichiers vidéo, pas YouTube', () => {
    expect(isVideoFileMime('video/mp4')).toBe(true)
    expect(isVideoFileMime('video/QuickTime')).toBe(true)
    expect(isVideoFileMime('video/webm')).toBe(true)
    expect(isVideoFileMime('video/youtube')).toBe(false)
    expect(isVideoFileMime(null)).toBe(false)
  })

  it("joint la miniature à l'envoi d'une vidéo seulement, et rien si la prise échoue", async () => {
    const file = { name: 'film.mp4' }
    const capture = vi.fn(async () => 'AAAA')
    expect(await videoThumbnailField(file, 'video', capture)).toEqual({ thumbnailBase64: 'AAAA' })
    expect(await videoThumbnailField(file, 'photo', capture)).toEqual({})
    expect(capture).toHaveBeenCalledTimes(1)
    expect(await videoThumbnailField(file, 'video', async () => null)).toEqual({})
    expect(await videoThumbnailField(file, 'video', async () => { throw new Error('indécodable') })).toEqual({})
  })
})
