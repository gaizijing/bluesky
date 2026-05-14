import * as Cesium from 'cesium'

/**
 * 会话规划航线：廊道 + 中心轴线。
 * 使用分段宽 polyline 代替 polylineVolume：体积网格在部分显卡/驱动上与风场等后处理叠加易整屏发黑。
 * pathTubeSlices 仍用于分段，避免垂转处单段折线视觉错乱。
 */
export class SessionRouteLayer {
  #viewer
  #entities = []

  constructor(viewer) {
    this.#viewer = viewer
  }

  clear() {
    this.#entities.forEach((e) => {
      try {
        this.#viewer.entities.remove(e)
      } catch (_) {
        /* noop */
      }
    })
    this.#entities = []
  }

  /**
   * @param {Object} route
   * @param {string} route.id
   * @param {Array<{lon:number,lat:number,alt:number}>} route.pathSamples
   * @param {Array<[number, number]>} [route.pathTubeSlices] [start,end) 下标，廊道 polyline 分段
   * @param {Array<{lon:number,lat:number}>} [route.horizontalControls] — for handles
   * @param {string} [route.startName]
   * @param {string} [route.endName]
   * @param {number} [route.corridorRadiusM=35] 廊道截面半径（米）
   */
  show(route) {
    this.clear()
    if (!route?.pathSamples?.length) return

    const allPositions = route.pathSamples.map((p) =>
      Cesium.Cartesian3.fromDegrees(p.lon, p.lat, p.alt)
    )
    const routeId = route.id || 'session-route'
    const radiusM = Number(route.corridorRadiusM) || 35
    const corridorMaterial = Cesium.Color.fromCssColorString('rgba(59, 130, 246, 0.42)')
    const corridorPx = Math.min(52, Math.max(20, 16 + radiusM * 0.55))

    const slices = Array.isArray(route.pathTubeSlices) ? route.pathTubeSlices : null

    const addCorridorPolyline = (positions, suffix) => {
      if (positions.length < 2) return
      const vol = this.#viewer.entities.add({
        id: `${routeId}_corridor${suffix}`,
        polyline: {
          positions,
          width: corridorPx,
          arcType: Cesium.ArcType.NONE,
          perPositionHeight: true,
          clampToGround: false,
          material: corridorMaterial
        },
        properties: { isSessionCorridor: true, routeId }
      })
      this.#entities.push(vol)
    }

    if (slices?.length) {
      let seg = 0
      for (const pair of slices) {
        const a = Math.max(0, Math.floor(pair[0]))
        const b = Math.min(allPositions.length, Math.floor(pair[1]))
        if (b - a < 2) continue
        const segPositions = allPositions.slice(a, b)
        addCorridorPolyline(segPositions, `_seg_${seg}`)
        seg += 1
      }
    } else {
      addCorridorPolyline(allPositions, '')
    }

    const centerline = this.#viewer.entities.add({
      id: `${routeId}_centerline`,
      polyline: {
        positions: allPositions,
        width: 4,
        arcType: Cesium.ArcType.NONE,
        perPositionHeight: true,
        clampToGround: false,
        material: Cesium.Color.fromCssColorString('rgba(190, 242, 100, 0.95)')
      },
      properties: {
        isSessionCenterline: true,
        routeId
      }
    })
    this.#entities.push(centerline)

    const s = route.pathSamples[0]
    const e = route.pathSamples[route.pathSamples.length - 1]
    if (s) {
      this.#entities.push(
        this.#viewer.entities.add({
          position: Cesium.Cartesian3.fromDegrees(s.lon, s.lat, s.alt),
          label: {
            text: `起点 ${route.startName || ''}`,
            font: '14px sans-serif',
            fillColor: Cesium.Color.WHITE,
            outlineColor: Cesium.Color.BLACK,
            outlineWidth: 2,
            pixelOffset: new Cesium.Cartesian2(0, -28),
            showBackground: true,
            backgroundColor: Cesium.Color.fromCssColorString('rgba(37, 99, 235, 0.55)')
          }
        })
      )
    }
    if (e) {
      this.#entities.push(
        this.#viewer.entities.add({
          position: Cesium.Cartesian3.fromDegrees(e.lon, e.lat, e.alt),
          label: {
            text: `终点 ${route.endName || ''}`,
            font: '14px sans-serif',
            fillColor: Cesium.Color.WHITE,
            outlineColor: Cesium.Color.BLACK,
            outlineWidth: 2,
            pixelOffset: new Cesium.Cartesian2(0, -28),
            showBackground: true,
            backgroundColor: Cesium.Color.fromCssColorString('rgba(220, 38, 38, 0.55)')
          }
        })
      )
    }

    const controls = route.horizontalControls
    if (Array.isArray(controls)) {
      controls.forEach((c, idx) => {
        const ent = this.#viewer.entities.add({
          position: Cesium.Cartesian3.fromDegrees(c.lon, c.lat, route.flightHeight || 300),
          point: {
            pixelSize: 12,
            color: Cesium.Color.WHITE,
            outlineColor: Cesium.Color.ORANGE,
            outlineWidth: 2
          },
          properties: {
            isRouteControl: true,
            controlIndex: idx,
            routeId
          }
        })
        this.#entities.push(ent)
      })
    }
  }
}
