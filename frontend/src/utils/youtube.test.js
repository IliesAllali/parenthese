import { describe, expect, it } from 'vitest'

import { youtubeEmbedUrl, youtubeVideoId, youtubeWatchUrl } from './youtube.js'

const ID = 'dQw4w9WgXcQ'

describe('vidéos YouTube', () => {
  it.each([
    [`https://www.youtube.com/watch?v=${ID}`],
    [`https://youtube.com/watch?v=${ID}&t=42s`],
    [`https://m.youtube.com/watch?feature=share&v=${ID}`],
    [`https://youtu.be/${ID}`],
    [`https://youtu.be/${ID}?si=abc123`],
    [`https://www.youtube.com/embed/${ID}`],
    [`https://www.youtube.com/embed/${ID}?start=10`],
    [`https://www.youtube-nocookie.com/embed/${ID}`],
    [`https://www.youtube.com/shorts/${ID}`],
    [`https://www.youtube.com/live/${ID}?feature=shared`],
    [`  https://www.youtube.com/watch?v=${ID}  `],
    [`<iframe width="560" height="315" src="https://www.youtube.com/embed/${ID}?si=xYz" title="YouTube video player" frameborder="0" allowfullscreen></iframe>`],
  ])('retrouve la vidéo dans %s', (value) => {
    expect(youtubeVideoId(value)).toBe(ID)
  })

  it.each([
    [''],
    [null],
    ['pas un lien'],
    [`https://vimeo.com/${ID}`],
    [`https://www.youtube.com.example.org/watch?v=${ID}`],
    ['https://www.youtube.com/watch?v=trop-court'],
    ['https://www.youtube.com/@chaine'],
    [`javascript:alert(1)//youtube.com/watch?v=${ID}`],
    [`<iframe src="https://evil.example/embed/${ID}"></iframe>`],
  ])('refuse %s', (value) => {
    expect(youtubeVideoId(value)).toBeNull()
  })

  it('enregistre le lien de la barre d adresse et intègre sans cookie', () => {
    const iframe = `<iframe src="https://www.youtube.com/embed/${ID}?si=xYz"></iframe>`
    expect(youtubeWatchUrl(iframe)).toBe(`https://www.youtube.com/watch?v=${ID}`)
    expect(youtubeEmbedUrl(`https://www.youtube.com/shorts/${ID}`)).toBe(`https://www.youtube-nocookie.com/embed/${ID}`)
  })
})
