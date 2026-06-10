import * as Cesium from 'cesium'
import kriging from './kriging.js'
import { buildTemperatureRamp } from './colorRamp.js'

const DEFAULT_OPTS = {
  propname: 'temperature',
  krigingModel: 'exponential',
  krigingSigma2: 0,
  krigingAlpha: 100,
  alpha: 0.65,
  colors: buildTemperatureRamp(),
}

function calcExtent(polygons) {
  const extent = {
    xMin: Infinity,
    yMin: Infinity,
    xMax: -Infinity,
    yMax: -Infinity,
  }
  for (const ring of polygons) {
    for (const [lng, lat] of ring) {
      extent.xMin = Math.min(extent.xMin, lng)
      extent.xMax = Math.max(extent.xMax, lng)
      extent.yMin = Math.min(extent.yMin, lat)
      extent.yMax = Math.max(extent.yMax, lat)
    }
  }
  return extent
}

/**
 * Kriging 插值并贴到 Cesium 地面
 * @returns {{ primitive, extent, grid, variogram, canvas, stats }}
 */
export function drawKrigingLayer(viewer, geojson, polygons, options = {}) {
  const opts = { ...DEFAULT_OPTS, ...options }
  if (!viewer) throw new Error('缺少 Cesium viewer')
  if (!geojson?.features?.length) throw new Error('缺少采样点 GeoJSON')

  const values = []
  const lngs = []
  const lats = []
  geojson.features.forEach((feature) => {
    values.push(feature.properties[opts.propname])
    lngs.push(feature.geometry.coordinates[0])
    lats.push(feature.geometry.coordinates[1])
  })

  if (values.length < 4) {
    throw new Error('Kriging 至少需要 4 个采样点')
  }

  const extent = calcExtent(polygons)
  if (!opts.width) {
    opts.width =
      Math.round(
        Math.min(extent.xMax - extent.xMin, extent.yMax - extent.yMin) * 10000
      ) / 10000 / 400
  }

  const canvas = document.createElement('canvas')
  canvas.width = 4096
  canvas.height = Math.max(
    512,
    Math.round((4096 / (extent.xMax - extent.xMin)) * (extent.yMax - extent.yMin))
  )

  const variogram = kriging.train(
    values,
    lngs,
    lats,
    opts.krigingModel,
    opts.krigingSigma2,
    opts.krigingAlpha
  )
  const grid = kriging.grid(polygons, variogram, opts.width)
  if (!grid) throw new Error('Kriging 网格生成失败')

  kriging.plot(
    canvas,
    grid,
    [extent.xMin, extent.xMax],
    [extent.yMin, extent.yMax],
    opts.colors
  )

  const primitive = viewer.scene.primitives.add(
    new Cesium.GroundPrimitive({
      geometryInstances: new Cesium.GeometryInstance({
        geometry: new Cesium.RectangleGeometry({
          rectangle: Cesium.Rectangle.fromDegrees(
            extent.xMin,
            extent.yMin,
            extent.xMax,
            extent.yMax
          ),
          vertexFormat: Cesium.EllipsoidSurfaceAppearance.VERTEX_FORMAT,
        }),
      }),
      appearance: new Cesium.EllipsoidSurfaceAppearance({ aboveGround: false }),
      show: true,
    })
  )

  primitive.appearance.material = new Cesium.Material({
    fabric: {
      type: 'Image',
      uniforms: {
        color: { alpha: opts.alpha },
        image: canvas.toDataURL('image/png'),
      },
    },
  })

  return {
    primitive,
    extent,
    grid,
    variogram,
    canvas,
    stats: {
      sampleCount: values.length,
      tempMin: Math.min(...values),
      tempMax: Math.max(...values),
      gridWidth: opts.width,
    },
  }
}

export function addTemperatureMarkers(viewer, geojson) {
  const entities = []
  geojson.features.forEach((feature) => {
    const [lng, lat] = feature.geometry.coordinates
    const temp = feature.properties.temperature
    const entity = viewer.entities.add({
      position: Cesium.Cartesian3.fromDegrees(lng, lat),
      point: {
        pixelSize: 7,
        color: Cesium.Color.fromCssColorString('#ffffff').withAlpha(0.95),
        outlineColor: Cesium.Color.fromCssColorString('#1a3a52'),
        outlineWidth: 2,
        disableDepthTestDistance: Number.POSITIVE_INFINITY,
      },
      label: {
        text: `${temp}°C`,
        font: '12px sans-serif',
        fillColor: Cesium.Color.WHITE,
        outlineColor: Cesium.Color.BLACK,
        outlineWidth: 2,
        style: Cesium.LabelStyle.FILL_AND_OUTLINE,
        verticalOrigin: Cesium.VerticalOrigin.BOTTOM,
        pixelOffset: new Cesium.Cartesian2(0, -10),
        disableDepthTestDistance: Number.POSITIVE_INFINITY,
      },
    })
    entities.push(entity)
  })
  return entities
}

export function removeKrigingLayer(viewer, primitive) {
  if (viewer && primitive) {
    viewer.scene.primitives.remove(primitive)
  }
}

export function removeTemperatureMarkers(viewer, entities = []) {
  entities.forEach((entity) => viewer?.entities.remove(entity))
}
