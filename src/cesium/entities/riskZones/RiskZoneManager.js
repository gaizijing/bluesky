import * as Cesium from 'cesium'

const NO_FLY_FILL = Cesium.Color.fromCssColorString('rgba(239, 68, 68, 0.38)')
const NO_FLY_OUTLINE = Cesium.Color.fromCssColorString('#ef4444')
const DEFAULT_EXTRUDE_M = 400

function ringCentroid(ring) {
  if (!Array.isArray(ring) || !ring.length) return null
  let sumLng = 0
  let sumLat = 0
  let n = 0
  ring.forEach((p) => {
    if (Array.isArray(p) && p.length >= 2) {
      sumLng += Number(p[0])
      sumLat += Number(p[1])
      n += 1
    }
  })
  return n ? [sumLng / n, sumLat / n] : null
}

/** @returns {number[][][]} 每个元素为一个 Polygon 的外环坐标 */
function extractPolygonRings(geometry) {
  if (!geometry?.coordinates) return []
  const { type, coordinates } = geometry
  if (type === 'Polygon' && Array.isArray(coordinates?.[0])) {
    return [coordinates[0]]
  }
  if (type === 'MultiPolygon' && Array.isArray(coordinates)) {
    return coordinates
      .map((poly) => (Array.isArray(poly?.[0]) ? poly[0] : null))
      .filter(Boolean)
  }
  return []
}

function ringToPositions(ring) {
  return ring
    .filter((p) => Array.isArray(p) && p.length >= 2)
    .map((p) => Cesium.Cartesian3.fromDegrees(Number(p[0]), Number(p[1])))
}

export class RiskZoneManager {
  #viewer
  #entities = []

  constructor(viewer) {
    this.#viewer = viewer
  }

  /**
   * @param {Array} zones API 原始禁飞区（含 geometry）或简化圆柱参数（centerLng/radiusM，航路避让用）
   */
  setZones(zones) {
    this.clear()
    if (!this.#viewer || !zones?.length) return

    zones.forEach((z, idx) => {
      if (z.enabled === false) return

      const baseId = z.zoneId || z.id || `risk-${idx}`
      const labelText = z.name || '禁飞区'
      const rings = extractPolygonRings(z.geometry)

      if (rings.length) {
        rings.forEach((ring, ringIdx) => {
          const positions = ringToPositions(ring)
          if (positions.length < 3) return

          const entity = this.#viewer.entities.add({
            id: `risk-zone-poly-${baseId}-${ringIdx}`,
            polygon: {
              hierarchy: new Cesium.PolygonHierarchy(positions),
              material: NO_FLY_FILL,
              outline: true,
              outlineColor: NO_FLY_OUTLINE,
              outlineWidth: 2,
              heightReference: Cesium.HeightReference.CLAMP_TO_GROUND,
              extrudedHeight: DEFAULT_EXTRUDE_M,
              extrudedHeightReference: Cesium.HeightReference.RELATIVE_TO_GROUND,
              classificationType: Cesium.ClassificationType.BOTH,
              closeTop: true,
              closeBottom: true,
            },
          })
          this.#entities.push(entity)
        })

        const centroid = ringCentroid(rings[0])
        if (centroid) {
          this.#addLabel(baseId, centroid[0], centroid[1], labelText, DEFAULT_EXTRUDE_M * 0.6)
        }
        return
      }

      // 兼容简化圆柱参数（航路规划等场景）
      const lng = Number(z.centerLng)
      const lat = Number(z.centerLat)
      const h = Math.max(1, Number(z.heightM) || DEFAULT_EXTRUDE_M)
      const r = Math.max(1, Number(z.radiusM) || 100)
      if (!Number.isFinite(lng) || !Number.isFinite(lat)) return

      const cyl = this.#viewer.entities.add({
        id: `risk-zone-cyl-${baseId}`,
        position: Cesium.Cartesian3.fromDegrees(lng, lat, h / 2),
        heightReference: Cesium.HeightReference.RELATIVE_TO_GROUND,
        cylinder: {
          length: h,
          topRadius: r,
          bottomRadius: r,
          material: NO_FLY_FILL,
        },
      })
      this.#entities.push(cyl)
      this.#addLabel(baseId, lng, lat, labelText, h * 0.65)
    })
  }

  #addLabel(baseId, lng, lat, text, alt) {
    const lbl = this.#viewer.entities.add({
      id: `risk-zone-lbl-${baseId}`,
      position: Cesium.Cartesian3.fromDegrees(lng, lat, alt),
      heightReference: Cesium.HeightReference.RELATIVE_TO_GROUND,
      label: {
        text,
        font: '14px "PingFang SC", sans-serif',
        fillColor: Cesium.Color.WHITE,
        outlineColor: Cesium.Color.BLACK,
        outlineWidth: 2,
        style: Cesium.LabelStyle.FILL_AND_OUTLINE,
        verticalOrigin: Cesium.VerticalOrigin.CENTER,
        horizontalOrigin: Cesium.HorizontalOrigin.CENTER,
        disableDepthTestDistance: Number.POSITIVE_INFINITY,
        scale: 0.95,
      },
    })
    this.#entities.push(lbl)
  }

  clear() {
    if (!this.#viewer) return
    this.#entities.forEach((e) => {
      try {
        this.#viewer.entities.remove(e)
      } catch (_) {
        /* noop */
      }
    })
    this.#entities = []
  }
}
