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
  // // 渲染精度设置
  maximumScreenSpaceError: 1, // 较低的值提高精度但可能降低性能，可根据需求调整为2-4

  // // 性能优化关键设置
  maximumRenderTimeChange: 0.1, // 控制请求渲染模式下的帧率，较小的值提高响应速度
  scene3DOnly: true, // 如果只需要3D场景，禁用2D和Columbus View可提高性能

  // // 降低视觉效果换取性能
  orderIndependentTranslucency: false, // 禁用顺序无关透明度，大幅提高性能
  shadows: false, // 禁用阴影计算

  showRenderLoopErrors: false, // 生产环境禁用错误弹窗
  contextOptions: {
    requestWebgl1: true,
  },
  // WebGL上下文配置
  contextOptions: {
    requestWebgl1: false,
    allowTextureFilterAnisotropic: true,

    webgl: {
      alpha: false,
      depth: true,
      stencil: false,
      antialias: true, // 可设置为false进一步提高性能，但会降低画质
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