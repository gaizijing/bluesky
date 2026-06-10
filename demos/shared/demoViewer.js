import * as Cesium from 'cesium'

function addSatelliteImagery(viewer) {
  viewer.imageryLayers.removeAll()

  const satellite = new Cesium.UrlTemplateImageryProvider({
    url: 'https://webst01.is.autonavi.com/appmaptile?style=6&x={x}&y={y}&z={z}',
    minimumLevel: 1,
    maximumLevel: 18,
    tileWidth: 256,
    tileHeight: 256,
    enablePickFeatures: false
  })

  const labels = new Cesium.UrlTemplateImageryProvider({
    url: 'https://webst01.is.autonavi.com/appmaptile?style=8&x={x}&y={y}&z={z}',
    minimumLevel: 1,
    maximumLevel: 18,
    tileWidth: 256,
    tileHeight: 256,
    enablePickFeatures: false
  })

  const base = viewer.imageryLayers.addImageryProvider(satellite)
  const overlay = viewer.imageryLayers.addImageryProvider(labels)
  base.brightness = 0.92
  base.contrast = 1.05
  base.saturation = 1.05
  overlay.alpha = 0.55
}

export function createDemoViewer(container) {
  Cesium.Ion.defaultAccessToken = import.meta.env.VITE_CESIUM_TOKEN || ''

  const viewer = new Cesium.Viewer(container, {
    baseLayerPicker: false,
    geocoder: false,
    homeButton: false,
    sceneModePicker: false,
    navigationHelpButton: false,
    infoBox: false,
    selectionIndicator: false,
    fullscreenButton: false,
    animation: false,
    timeline: false,
    terrainProvider: new Cesium.EllipsoidTerrainProvider(),
    contextOptions: {
      webgl: { powerPreference: 'high-performance' }
    }
  })

  addSatelliteImagery(viewer)

  viewer.cesiumWidget.creditContainer.style.display = 'none'
  viewer.scene.globe.depthTestAgainstTerrain = false
  viewer.scene.fog.enabled = false
  viewer.scene.skyAtmosphere.show = true
  viewer.scene.globe.enableLighting = false
  viewer.scene.backgroundColor = Cesium.Color.fromBytes(20, 28, 48, 255)

  return viewer
}
