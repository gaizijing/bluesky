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
  timeline: true,
  selectionIndicator: true,
  scene3DOnly: true,
  shadows: false,

  showRenderLoopErrors: false, // 生产环境禁用错误弹窗
  // WebGL上下文配置
  contextOptions: {
    requestWebgl1: false,
    allowTextureFilterAnisotropic: true,

    webgl: {
      alpha: false,
      depth: true,
      stencil: false,
      antialias: false,
      powerPreference: 'high-performance',
      premultipliedAlpha: true,
      preserveDrawingBuffer: false,
      failIfMajorPerformanceCaveat: false
    },
  },
  skyBox: new Cesium.SkyBox({
    sources: {
      positiveX: "/texture/lantian/Right.jpg",
      negativeX: "/texture/lantian/Left.jpg",
      positiveY: "/texture/lantian/Front.jpg",
      negativeY: "/texture/lantian/Back.jpg",
      positiveZ: "/texture/lantian/Up.jpg",
      negativeZ: "/texture/lantian/Down.jpg",
    },
  }),

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