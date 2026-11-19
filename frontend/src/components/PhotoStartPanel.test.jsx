import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import PhotoStartPanel from './PhotoStartPanel.jsx'

// Les visages à compléter, sans aperçu : chaque portrait vide montre la silhouette (#244)
describe('PhotoStartPanel, visages sans photo', () => {
  it('affiche la silhouette, sans initiales', () => {
    const html = renderToStaticMarkup(
      <PhotoStartPanel
        visible
        personsImported={2}
        faces={[
          { id: 'a', firstName: 'Jeanne', lastName: 'Duval', birthYear: 1950 },
          { id: 'b', firstName: '小明', lastName: '王', birthYear: 1978 },
        ]}
        onClose={() => {}}
      />,
    )
    // Deux personnes, deux silhouettes ; plus aucune initiale
    expect(html.match(/class="pz-nophoto"/g)).toHaveLength(2)
    expect(html).not.toContain('>JD</span>')
    expect(html).not.toContain('>王</span>')
  })
})
