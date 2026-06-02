import * as Cesium from 'cesium'

/**
 * Split volume bbox into horizontal chunks (H3-like grid; fixed lon/lat grid for DEMO).
 */
export function createChunkGrid(volume, divisions = 4) {
  const { west, south, east, north, minHeight, maxHeight, nz } = volume
  const dLon = (east - west) / divisions
  const dLat = (north - south) / divisions
  const chunks = []

  for (let cy = 0; cy < divisions; cy++) {
    for (let cx = 0; cx < divisions; cx++) {
      const cw = west + cx * dLon
      const ce = cw + dLon
      const cs = south + cy * dLat
      const cn = cs + dLat
      chunks.push({
        id: `${cx}_${cy}`,
        cx,
        cy,
        bounds: {
          west: cw,
          south: cs,
          east: ce,
          north: cn,
          minHeight,
          maxHeight
        },
        gridDims: [17, 17, nz]
      })
    }
  }
  return chunks
}

export function chunkCenterCartesian(chunk) {
  const { west, south, east, north, minHeight, maxHeight } = chunk.bounds
  return Cesium.Cartesian3.fromDegrees(
    (west + east) / 2,
    (south + north) / 2,
    (minHeight + maxHeight) / 2
  )
}

/**
 * @param {boolean} enableCulling
 */
export function getVisibleChunks(viewer, chunks, enableCulling = true) {
  if (!enableCulling || !viewer) return chunks

  const rect = viewer.camera.computeViewRectangle(viewer.scene.globe.ellipsoid)
  if (!rect) return chunks

  return chunks.filter((chunk) => {
    const { west, south, east, north } = chunk.bounds
    const chunkRect = Cesium.Rectangle.fromDegrees(west, south, east, north)
    return Cesium.Rectangle.simpleIntersection(rect, chunkRect) != null
  })
}
