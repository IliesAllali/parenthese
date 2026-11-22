import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import VideoThumb from './VideoThumb.jsx'
import LifeTimeline from './LifeTimeline.jsx'

// Miniature d'une vidéo YouTube (live du 22/11) : servie par Parenthèse, le triangle de lecture par-dessus
const clean = (html) => html.replaceAll('&amp;', '&')
const thumbUrl = '/api/trees/t1/media/m1/thumbnail?token=abc'

describe('la vignette d’une vidéo', () => {
  it('montre la miniature servie par l’API, avec le triangle de lecture', () => {
    const html = clean(renderToStaticMarkup(<VideoThumb src={thumbUrl} />))
    expect(html).toContain(`src="${thumbUrl}"`)
    expect(html).toContain('video-thumb--image')
    expect(html).toContain('video-thumb-play')
    expect(html).not.toContain('youtube.com')
  })

  it('sans miniature, le fond sombre et le triangle comme avant', () => {
    const html = renderToStaticMarkup(<VideoThumb src={null} />)
    expect(html).not.toContain('<img')
    expect(html).not.toContain('video-thumb--image')
    expect(html).toContain('video-thumb-play')
  })
})

describe('une vidéo rattachée à un moment de la Vie', () => {
  const person = { id: 'p1', firstName: 'Odette', lastName: 'Duval', birthDate: '1920-01-01' }
  // Naissance qui porte la vidéo
  const render = (media) => clean(renderToStaticMarkup(
    <LifeTimeline person={person} family={{}} life={{ events: [{ id: 'e1', type: 'birth', mediaIds: [media.id] }] }} medias={[media]} />,
  ))

  it('avec sa miniature, rangée avec les photos', () => {
    const html = render({ id: 'm1', type: 'video', url: 'https://www.youtube.com/watch?v=aaaaaaaaaaa', thumbUrl, label: 'Le mariage' })
    expect(html).toContain('lt-attach')
    expect(html).toContain(`src="${thumbUrl}"`)
    expect(html).not.toContain('lt-file')
  })

  it('sans miniature, la pastille Vidéo d’avant', () => {
    const html = render({ id: 'm1', type: 'video', url: 'https://www.youtube.com/watch?v=aaaaaaaaaaa', thumbUrl: null, label: 'Le mariage' })
    expect(html).toContain('lt-attach')
    expect(html).toContain('lt-file')
    expect(html).not.toContain('<img')
  })
})
