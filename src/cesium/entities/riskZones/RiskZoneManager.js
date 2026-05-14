import * as Cesium from 'cesium'

export class RiskZoneManager {
  #viewer
  #entities = []

  constructor(viewer) {
    this.#viewer = viewer
  }

  /**
   * @param {Array<{id?:string,centerLng:number,centerLat:number,radiusM:number,heightM:number,zoneType:string,label?:string}>} zones
   */
  setZones(zones) {
    this.clear()
    if (!this.#viewer || !zones?.length) return

    zones.forEach((z, idx) => {
      const type = (z.zoneType || '').toUpperCase()
      const isNoFly = type === 'NO_FLY'
      const fill = isNoFly
        ? Cesium.Color.fromCssColorString('rgba(239, 68, 68, 0.42)')
        : Cesium.Color.fromCssColorString('rgba(234, 179, 8, 0.38)')
      const h = Math.max(1, Number(z.heightM) || 400)
      const r = Math.max(1, Number(z.radiusM) || 100)
      const lng = Number(z.centerLng)
      const lat = Number(z.centerLat)
      if (!Number.isFinite(lng) || !Number.isFinite(lat)) return

      const baseId = z.id || `risk-${idx}`

      const cyl = this.#viewer.entities.add({
        id: `risk-zone-cyl-${baseId}`,
        position: Cesium.Cartesian3.fromDegrees(lng, lat, h / 2),
        cylinder: {
          length: h,
          topRadius: r,
          bottomRadius: r,
          material: fill
        }
      })
      this.#entities.push(cyl)

      // 文字放在圆柱上半部内侧附近，避免原先贴顶像素偏移过远
      const labelAlt = Math.max(h * 0.55, Math.min(h * 0.88, h - 8))
      const lbl = this.#viewer.entities.add({
        id: `risk-zone-lbl-${baseId}`,
        position: Cesium.Cartesian3.fromDegrees(lng, lat, labelAlt),
        label: {
          text: isNoFly ? '禁飞区' : '',
          font: '14px sans-serif',
          fillColor: Cesium.Color.WHITE,
          outlineColor: Cesium.Color.BLACK,
          outlineWidth: 2,
          style: Cesium.LabelStyle.FILL_AND_OUTLINE,
          verticalOrigin: Cesium.VerticalOrigin.CENTER,
          horizontalOrigin: Cesium.HorizontalOrigin.CENTER,
          pixelOffset: new Cesium.Cartesian2(0, 0),
          scale: 0.95
        }
      })
      this.#entities.push(lbl)
    })
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
