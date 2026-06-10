/** 从 GeoJSON 计算经纬度包络 { west, south, east, north } */

function extendBox(box, lng, lat) {
  box.west = Math.min(box.west, lng)
  box.south = Math.min(box.south, lat)
  box.east = Math.max(box.east, lng)
  box.north = Math.max(box.north, lat)
}

function walkCoordList(node, box) {
  if (!Array.isArray(node) || !node.length) return
  if (typeof node[0] === 'number') {
    extendBox(box, node[0], node[1])
    return
  }
  node.forEach((child) => walkCoordList(child, box))
}

function walkGeometry(geometry, box) {
  if (!geometry?.coordinates) return
  const { type, coordinates } = geometry
  switch (type) {
    case 'Point':
      extendBox(box, coordinates[0], coordinates[1])
      break
    case 'MultiPoint':
    case 'LineString':
      walkCoordList(coordinates, box)
      break
    case 'MultiLineString':
    case 'Polygon':
      coordinates.forEach((ring) => walkCoordList(ring, box))
      break
    case 'MultiPolygon':
      coordinates.forEach((poly) => poly.forEach((ring) => walkCoordList(ring, box)))
      break
    case 'GeometryCollection':
      geometry.geometries?.forEach((g) => walkGeometry(g, box))
      break
    default:
      break
  }
}

export function envelopeFromGeoJson(geoJson) {
  const box = {
    west: Infinity,
    south: Infinity,
    east: -Infinity,
    north: -Infinity,
  }

  if (!geoJson) {
    return null
  }

  const type = geoJson.type
  if (type === 'FeatureCollection') {
    geoJson.features?.forEach((f) => walkGeometry(f.geometry, box))
  } else if (type === 'Feature') {
    walkGeometry(geoJson.geometry, box)
  } else {
    walkGeometry(geoJson, box)
  }

  if (!Number.isFinite(box.west)) {
    return null
  }
  return box
}

export async function fetchGeoJsonEnvelope(boundaryUrl) {
  if (!boundaryUrl) return null
  const res = await fetch(boundaryUrl)
  if (!res.ok) {
    throw new Error(`GeoJSON 加载失败: ${boundaryUrl}`)
  }
  const geoJson = await res.json()
  return envelopeFromGeoJson(geoJson)
}

function visitPolygonRings(geometry, pickRing) {
  if (!geometry) return
  if (geometry.type === 'Polygon') {
    pickRing(geometry.coordinates?.[0])
    return
  }
  if (geometry.type === 'MultiPolygon') {
    geometry.coordinates?.forEach((poly) => pickRing(poly?.[0]))
  }
}

/** 取 GeoJSON 中顶点数最多的外环，供 Kriging 裁剪使用 */
export function extractLargestPolygonRing(geoJson) {
  let best = null
  let bestLen = 0
  const pickRing = (ring) => {
    if (!Array.isArray(ring) || ring.length <= bestLen) return
    best = ring
    bestLen = ring.length
  }

  if (!geoJson) return null
  if (geoJson.type === 'FeatureCollection') {
    geoJson.features?.forEach((f) => visitPolygonRings(f.geometry, pickRing))
  } else if (geoJson.type === 'Feature') {
    visitPolygonRings(geoJson.geometry, pickRing)
  } else {
    visitPolygonRings(geoJson, pickRing)
  }
  return best
}

export async function fetchBoundaryRing(boundaryUrl) {
  if (!boundaryUrl) return null
  const res = await fetch(boundaryUrl)
  if (!res.ok) {
    throw new Error(`GeoJSON 加载失败: ${boundaryUrl}`)
  }
  const geoJson = await res.json()
  const ring = extractLargestPolygonRing(geoJson)
  if (!ring?.length) {
    throw new Error('无法解析边界多边形')
  }
  return ring
}
