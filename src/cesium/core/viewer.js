import * as Cesium from 'cesium'

export const getViewerOptions = () => ({
  baseLayerPicker: false,
  geocoder: false,
  homeButton: false,
  sceneModePicker: false,
  navigationHelpButton: false,
  infoBox: true,
  infoBoxSandbox: 'allow-same-origin allow-scripts allow-popups allow-forms',
  fullscreenButton: false,
  animation: false,
  timeline: false,
  selectionIndicator: true,
  contextOptions: {
    requestWebgl1: false,
    allowTextureFilterAnisotropic: true,
    webgl: {
      alpha: false,
      depth: true,
      stencil: false,
      antialias: true,
      powerPreference: 'high-performance',
      premultipliedAlpha: true,
      preserveDrawingBuffer: false,
      failIfMajorPerformanceCaveat: false
    },
  },
})

export const createViewer = (containerId) => {
  Cesium.Ion.defaultAccessToken = import.meta.env.VITE_CESIUM_TOKEN || ''
  
  return new Cesium.Viewer(containerId, getViewerOptions())
}

export const destroyViewer = (viewer) => {
  if (viewer) {
    viewer.destroy()
  }
}