import { describe, it, expect } from 'vitest'
import { drawMediaContent, drawPortrait, traceSibship } from './renderers'

// Contexte canvas minimal qui enregistre les appels de tracé
const recorder = () => {
  const calls = []
  const ctx = new Proxy({}, { get: (_, name) => (...args) => { calls.push([name, ...args]) } })
  return { ctx, calls, count: (n) => calls.filter(c => c[0] === n).length }
}
const src = { cx: 500, cy: 300 }

describe('traceSibship (accolade franche)', () => {
  it('trace toute la fratrie en un seul chemin et un seul stroke', () => {
    const { ctx, count } = recorder()
    traceSibship(ctx, 'u-1', src, [{ cx: 200, cy: 480 }, { cx: 420, cy: 480 }, { cx: 800, cy: 480 }])
    expect(count('beginPath')).toBe(1)
    expect(count('stroke')).toBe(1)
    expect(count('moveTo')).toBe(3)
  })

  it('un enfant seul rejoint la barre avec la même géométrie que dans la fratrie', () => {
    const child = { cx: 800, cy: 480 }
    const solo = recorder()
    traceSibship(solo.ctx, 'u-1', src, [child])
    const group = recorder()
    traceSibship(group.ctx, 'u-1', src, [child, { cx: 200, cy: 480 }])
    const soloArcs = solo.calls.filter(c => c[0] === 'arcTo')
    const groupArcs = group.calls.filter(c => c[0] === 'arcTo').slice(0, 2)
    expect(soloArcs.length).toBe(2)
    expect(groupArcs).toEqual(soloArcs)
  })

  it('un enfant à l\'aplomb de l\'union descend droit, sans virage', () => {
    const { ctx, count } = recorder()
    traceSibship(ctx, 'u-1', src, [{ cx: 505, cy: 480 }])
    expect(count('arcTo')).toBe(0)
  })

  it('un enfant à moins de deux rayons de l\'aplomb est relié par un seul S, sans marche', () => {
    const { ctx, calls } = recorder()
    traceSibship(ctx, 'u-1', src, [{ cx: 515, cy: 480 }])
    expect(calls.filter(c => c[0] === 'arcTo').length).toBe(0)
    // Tronc vertical jusqu'à la barre, puis le S
    expect(calls.filter(c => c[0] === 'lineTo').map(c => c[1])).toEqual([500])
    const [curve] = calls.filter(c => c[0] === 'bezierCurveTo')
    // Départ vertical sous l'union, arrivée verticale sur l'enfant
    expect(curve[1]).toBe(500)
    expect(curve[3]).toBe(515)
    expect(curve.slice(5)).toEqual([515, 480])
  })
})

describe('drawPortrait, marque « À vérifier »', () => {
  const person = { firstName: 'Marie', lastName: 'Martin', isAlive: true }
  for (const frame of ['round', 'square', 'polaroid', 'rect']) {
    it(`cadre ${frame} : la marque est dessinée hors de la découpe du cadre`, () => {
      const { ctx, calls } = recorder()
      drawPortrait(ctx, frame, person, null, true)
      const clip = calls.findIndex(c => c[0] === 'clip')
      const restore = calls.findIndex((c, i) => i > clip && c[0] === 'restore')
      const markText = calls.findIndex(c => c[0] === 'fillText' && c[1] === '?')
      expect(clip).toBeGreaterThan(-1)
      expect(restore).toBeGreaterThan(clip)
      expect(markText).toBeGreaterThan(restore)
    })
  }

  it('sans « À vérifier », pas de marque', () => {
    const { ctx, calls } = recorder()
    drawPortrait(ctx, 'round', person, null, false)
    expect(calls.some(c => c[0] === 'fillText' && c[1] === '?')).toBe(false)
  })
})

describe('drawMediaContent, vidéo YouTube', () => {
  const thumb = { naturalWidth: 480, naturalHeight: 360 }
  const video = { type: 'video', url: 'https://www.youtube.com/watch?v=aaaaaaaaaaa', thumbUrl: '/api/trees/t/media/m/thumbnail?token=x' }

  it('dessine la miniature chargée, puis le triangle de lecture par-dessus', () => {
    const { ctx, calls } = recorder()
    drawMediaContent(ctx, video, 14, new Map([[video.thumbUrl, thumb]]))
    const image = calls.findIndex(c => c[0] === 'drawImage')
    expect(image).toBeGreaterThan(-1)
    expect(calls[image][1]).toBe(thumb)
    const triangle = calls.findIndex((c, i) => i > image && c[0] === 'closePath')
    expect(triangle).toBeGreaterThan(image)
  })

  it("sans miniature chargée, la bande de film d'avant, sans aucune image", () => {
    const { ctx, calls } = recorder()
    drawMediaContent(ctx, video, 14, new Map())
    expect(calls.some(c => c[0] === 'drawImage')).toBe(false)
    expect(calls.filter(c => c[0] === 'fillRect').length).toBeGreaterThan(4)
  })

  it("ne cherche jamais l'adresse YouTube de la vidéo dans le cache d'images", () => {
    const { ctx } = recorder()
    const asked = []
    const cache = { get: (key) => { asked.push(key); return undefined } }
    drawMediaContent(ctx, video, 14, cache)
    expect(asked).not.toContain(video.url)
  })
})
