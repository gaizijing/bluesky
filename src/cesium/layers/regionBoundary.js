import * as Cesium from 'cesium'
import { envelopeFromGeoJson } from '@/utils/geoJsonEnvelope'
import { useRegionStore } from '@/store/modules/region'

let boundaryDataSource = null

const FILL_COLOR = 'rgba(0, 210, 255, 0.08)'
const STROKE_COLOR = '#00d2ff'

function styleBoundaryEntities(dataSource) {
  dataSource.entities.values.forEach((entity) => {
    if (entity.polygon) {
      entity.polygon.material = Cesium.Color.fromCssColorString(FILL_COLOR)
      entity.polygon.outline = true
      entity.polygon.outlineColor = Cesium.Color.fromCssColorString(STROKE_COLOR)
      entity.polygon.outlineWidth = 2
      entity.polygon.extrudedHeight = 800
      entity.polygon.height = 0
    }
    if (entity.polyline) {
      entity.polyline.width = 3
      entity.polyline.material = Cesium.Color.fromCssColorString(STROKE_COLOR)
      entity.polyline.clampToGround = true
    }
  })
}

export async function loadRegionBoundary(viewer, boundaryUrl) {
  clearRegionBoundary(viewer)
  if (!viewer || !boundaryUrl) return null

  const res = await fetch(boundaryUrl)
  if (!res.ok) {
    throw new Error(`GeoJSON 加载失败: ${boundaryUrl}`)
  }
  const geoJson = await res.json()

  boundaryDataSource = await Cesium.GeoJsonDataSource.load(geoJson, {
    clampToGround: true,
    stroke: Cesium.Color.fromCssColorString(STROKE_COLOR),
    strokeWidth: 3,
    fill: Cesium.Color.fromCssColorString(FILL_COLOR),
  })
  viewer.dataSources.add(boundaryDataSource)
  styleBoundaryEntities(boundaryDataSource)

  const envelope = envelopeFromGeoJson(geoJson)
  if (envelope) {
    useRegionStore().setBoundaryEnvelope(envelope)
  }

  return boundaryDataSource
}

export function clearRegionBoundary(viewer) {
  if (boundaryDataSource && viewer && !viewer.isDestroyed()) {
    viewer.dataSources.remove(boundaryDataSource, true)
  }
  boundaryDataSource = null
  useRegionStore().setBoundaryEnvelope(null)
}

export function getRegionBoundaryDataSource() {
  return boundaryDataSource
}
