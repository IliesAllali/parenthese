import { describe, expect, it } from 'vitest'
import { buildOpenStreetMapEmbedUrl, buildOpenStreetMapUrl, buildProjectedMapData, parseGeoJsonMapText } from './geoMedia'

describe('geoMedia utils', () => {
  it('parse un point GeoJSON en [lon, lat]', () => {
    const raw = parseGeoJsonMapText(JSON.stringify({
      type: 'FeatureCollection',
      features: [
        {
          type: 'Feature',
          geometry: {
            type: 'Point',
            coordinates: [5.384, 49.159],
          },
        },
      ],
    }))

    expect(raw.points).toEqual([[5.384, 49.159]])
    expect(raw.paths).toEqual([])
  })

  it('projete des coordonnees en chemin exploitable', () => {
    const projected = buildProjectedMapData({
      points: [],
      paths: [
        [[5.384, 49.159], [5.385, 49.16]],
      ],
    }, { width: 300, height: 200 })

    expect(projected.paths.length).toBe(1)
    expect(projected.paths[0].length).toBe(2)
  })

  it('genere une URL OSM avec bbox et focus', () => {
    const projected = {
      bounds: { minLon: 5, minLat: 49, maxLon: 6, maxLat: 50 },
      focusCoordinate: [5.384, 49.159],
    }

    const url = buildOpenStreetMapUrl(projected)
    expect(url).toContain('openstreetmap.org')
    expect(url).toContain('bbox=5%2C49%2C6%2C50')
    expect(url).toContain('mlon=5.384')
    expect(url).toContain('mlat=49.159')
  })

  it('genere une URL OSM embed pour l iframe', () => {
    const projected = {
      bounds: { minLon: 5, minLat: 49, maxLon: 6, maxLat: 50 },
      focusCoordinate: [5.384, 49.159],
    }

    const url = buildOpenStreetMapEmbedUrl(projected)
    expect(url).toContain('/export/embed.html')
    expect(url).toContain('layer=mapnik')
    expect(url).toContain('marker=49.159%2C5.384')
  })
})
