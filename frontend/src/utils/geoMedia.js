export const DEFAULT_MAP_VIEWBOX_WIDTH = 420
export const DEFAULT_MAP_VIEWBOX_HEIGHT = 280
export const MAX_MERCATOR_LAT = 85.05112878

export function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value))
}

function toMercatorY(lat) {
  const clampedLat = clamp(lat, -MAX_MERCATOR_LAT, MAX_MERCATOR_LAT)
  const radians = (clampedLat * Math.PI) / 180
  return Math.log(Math.tan(Math.PI / 4 + radians / 2))
}

function toLonLat(value) {
  if (!Array.isArray(value) || value.length < 2) return null
  const lon = Number(value[0])
  const lat = Number(value[1])
  if (!Number.isFinite(lon) || !Number.isFinite(lat)) return null
  return [lon, lat]
}

function extractGeoJsonGeometry(geometry, points, paths) {
  if (!geometry || typeof geometry !== 'object') return

  if (geometry.type === 'GeometryCollection') {
    const geometries = Array.isArray(geometry.geometries) ? geometry.geometries : []
    geometries.forEach((item) => extractGeoJsonGeometry(item, points, paths))
    return
  }

  if (geometry.type === 'Point') {
    const point = toLonLat(geometry.coordinates)
    if (point) points.push(point)
    return
  }

  if (geometry.type === 'MultiPoint') {
    const entries = Array.isArray(geometry.coordinates) ? geometry.coordinates : []
    entries.forEach((entry) => {
      const point = toLonLat(entry)
      if (point) points.push(point)
    })
    return
  }

  if (geometry.type === 'LineString') {
    const coords = Array.isArray(geometry.coordinates) ? geometry.coordinates : []
    const line = coords.map(toLonLat).filter(Boolean)
    if (line.length >= 2) paths.push(line)
    return
  }

  if (geometry.type === 'MultiLineString') {
    const lines = Array.isArray(geometry.coordinates) ? geometry.coordinates : []
    lines.forEach((lineCoords) => {
      const line = (Array.isArray(lineCoords) ? lineCoords : []).map(toLonLat).filter(Boolean)
      if (line.length >= 2) paths.push(line)
    })
    return
  }

  if (geometry.type === 'Polygon') {
    const rings = Array.isArray(geometry.coordinates) ? geometry.coordinates : []
    rings.forEach((ringCoords) => {
      const ring = (Array.isArray(ringCoords) ? ringCoords : []).map(toLonLat).filter(Boolean)
      if (ring.length >= 2) paths.push(ring)
    })
    return
  }

  if (geometry.type === 'MultiPolygon') {
    const polygons = Array.isArray(geometry.coordinates) ? geometry.coordinates : []
    polygons.forEach((poly) => {
      const rings = Array.isArray(poly) ? poly : []
      rings.forEach((ringCoords) => {
        const ring = (Array.isArray(ringCoords) ? ringCoords : []).map(toLonLat).filter(Boolean)
        if (ring.length >= 2) paths.push(ring)
      })
    })
  }
}

export function parseGeoJsonMapText(text) {
  let parsed
  try {
    parsed = JSON.parse(text)
  } catch {
    throw new Error('invalid_geojson')
  }

  const points = []
  const paths = []

  const visit = (item) => {
    if (!item || typeof item !== 'object') return

    if (item.type === 'FeatureCollection') {
      const features = Array.isArray(item.features) ? item.features : []
      features.forEach((feature) => visit(feature))
      return
    }

    if (item.type === 'Feature') {
      extractGeoJsonGeometry(item.geometry, points, paths)
      return
    }

    extractGeoJsonGeometry(item, points, paths)
  }

  visit(parsed)

  if (points.length === 0 && paths.length === 0) {
    throw new Error('empty_geojson')
  }

  return { points, paths }
}

export function parseGpxMapText(text) {
  const xml = new DOMParser().parseFromString(text, 'application/xml')
  if (xml.querySelector('parsererror')) {
    throw new Error('invalid_gpx')
  }

  const points = []
  const paths = []

  const parsePointNode = (node) => {
    const lat = Number(node.getAttribute('lat'))
    const lon = Number(node.getAttribute('lon'))
    if (!Number.isFinite(lat) || !Number.isFinite(lon)) return null
    return [lon, lat]
  }

  xml.querySelectorAll('wpt').forEach((node) => {
    const point = parsePointNode(node)
    if (point) points.push(point)
  })

  xml.querySelectorAll('trkseg').forEach((segmentNode) => {
    const line = []
    segmentNode.querySelectorAll('trkpt').forEach((pointNode) => {
      const point = parsePointNode(pointNode)
      if (point) line.push(point)
    })
    if (line.length >= 2) paths.push(line)
    if (line.length === 1) points.push(line[0])
  })

  xml.querySelectorAll('rte').forEach((routeNode) => {
    const line = []
    routeNode.querySelectorAll('rtept').forEach((pointNode) => {
      const point = parsePointNode(pointNode)
      if (point) line.push(point)
    })
    if (line.length >= 2) paths.push(line)
    if (line.length === 1) points.push(line[0])
  })

  if (points.length === 0 && paths.length === 0) {
    throw new Error('empty_gpx')
  }

  return { points, paths }
}

export function buildProjectedMapData(rawData, options = {}) {
  const width = Number(options.width) || DEFAULT_MAP_VIEWBOX_WIDTH
  const height = Number(options.height) || DEFAULT_MAP_VIEWBOX_HEIGHT
  const minPadding = Number.isFinite(options.minPadding) ? options.minPadding : 0.01
  const paddingFactor = Number.isFinite(options.paddingFactor) ? options.paddingFactor : 0.25

  const allCoordinates = [
    ...rawData.points,
    ...rawData.paths.flat(),
  ]

  if (allCoordinates.length === 0) {
    return {
      width,
      height,
      points: [],
      paths: [],
      bounds: null,
      focusCoordinate: null,
      stats: { pointCount: 0, pathCount: 0, vertexCount: 0 },
    }
  }

  const longitudes = allCoordinates.map((entry) => entry[0])
  const latitudes = allCoordinates.map((entry) => clamp(entry[1], -MAX_MERCATOR_LAT, MAX_MERCATOR_LAT))

  let minLon = Math.min(...longitudes)
  let maxLon = Math.max(...longitudes)
  let minLat = Math.min(...latitudes)
  let maxLat = Math.max(...latitudes)

  if (minLon === maxLon) {
    minLon -= 0.001
    maxLon += 0.001
  }

  if (minLat === maxLat) {
    minLat -= 0.001
    maxLat += 0.001
  }

  const boundsPaddingLon = Math.max(minPadding, (maxLon - minLon) * paddingFactor)
  const boundsPaddingLat = Math.max(minPadding, (maxLat - minLat) * paddingFactor)
  const bounds = {
    minLon: clamp(minLon - boundsPaddingLon, -180, 180),
    minLat: clamp(minLat - boundsPaddingLat, -MAX_MERCATOR_LAT, MAX_MERCATOR_LAT),
    maxLon: clamp(maxLon + boundsPaddingLon, -180, 180),
    maxLat: clamp(maxLat + boundsPaddingLat, -MAX_MERCATOR_LAT, MAX_MERCATOR_LAT),
  }

  const lonSpan = Math.max(0.0000001, bounds.maxLon - bounds.minLon)
  const mercatorMinY = toMercatorY(bounds.minLat)
  const mercatorMaxY = toMercatorY(bounds.maxLat)
  const mercatorSpan = Math.max(0.0000001, mercatorMaxY - mercatorMinY)

  const project = (coordinate) => {
    const lon = Number(coordinate[0])
    const lat = Number(coordinate[1])
    const safeLat = clamp(lat, -MAX_MERCATOR_LAT, MAX_MERCATOR_LAT)
    const mercatorY = toMercatorY(safeLat)
    const x = ((lon - bounds.minLon) / lonSpan) * width
    const y = height - ((mercatorY - mercatorMinY) / mercatorSpan) * height
    return { x, y }
  }

  const projectedPoints = rawData.points.map(project)
  const projectedPaths = rawData.paths
    .map((path) => path.map(project))
    .filter((path) => path.length >= 2)

  const focusCoordinate = rawData.points[0] || rawData.paths?.[0]?.[0] || allCoordinates[0] || null

  return {
    width,
    height,
    points: projectedPoints,
    paths: projectedPaths,
    bounds,
    focusCoordinate,
    stats: {
      pointCount: rawData.points.length,
      pathCount: projectedPaths.length,
      vertexCount: rawData.paths.reduce((acc, path) => acc + path.length, 0),
    },
  }
}

export function buildOpenStreetMapUrl(mapData) {
  if (!mapData?.bounds) {
    return ''
  }

  const { minLon, minLat, maxLon, maxLat } = mapData.bounds
  const focus = Array.isArray(mapData.focusCoordinate) ? mapData.focusCoordinate : null
  const params = new URLSearchParams({
    bbox: `${minLon},${minLat},${maxLon},${maxLat}`,
  })

  if (focus) {
    params.set('mlon', String(focus[0]))
    params.set('mlat', String(focus[1]))
  }

  const hash = focus
    ? `#map=14/${Number(focus[1]).toFixed(5)}/${Number(focus[0]).toFixed(5)}`
    : ''

  return `https://www.openstreetmap.org/?${params.toString()}${hash}`
}

export function buildOpenStreetMapEmbedUrl(mapData) {
  if (!mapData?.bounds) {
    return ''
  }

  const { minLon, minLat, maxLon, maxLat } = mapData.bounds
  const focus = Array.isArray(mapData.focusCoordinate) ? mapData.focusCoordinate : null
  const params = new URLSearchParams({
    bbox: `${minLon},${minLat},${maxLon},${maxLat}`,
    layer: 'mapnik',
  })

  if (focus) {
    params.set('marker', `${Number(focus[1])},${Number(focus[0])}`)
  }

  return `https://www.openstreetmap.org/export/embed.html?${params.toString()}`
}
