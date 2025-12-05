import * as Cesium from 'cesium'

let tiandituLayer = null

export const addTiandituLayer = (viewerInstance) => {
  const tianditu = new Cesium.WebMapTileServiceImageryProvider({
    url: "http://{s}.tianditu.gov.cn/img_w/wmts?service=wmts&request=GetTile&version=1.0.0&LAYER=img&tileMatrixSet=w&TileMatrix={TileMatrix}&TileRow={TileRow}&TileCol={TileCol}&style=default&format=tiles&tk=6b1c07f3a655588c6b86fa35ebb1c177",
    layer: "tianditu",
    style: "default",
    format: "image/jpeg",
    tileMatrixSetID: "w",
    subdomains: ["t0", "t1", "t2", "t3", "t4", "t5", "t6", "t7"],
    maximumLevel: 18,
    enablePickFeatures: false,
    pixelRatio: window.devicePixelRatio || 2,
    maximumRetries: 3, // 失败重试次数
    retryDelay: 1000, // 重试延迟1秒
    requestHeaders: {}, // 不要加Accept-Encoding
    // 可选：降低瓦片请求优先级（减少并发）
    priority:1
  });

  tiandituLayer = viewerInstance.imageryLayers.addImageryProvider(tianditu)
  if (tiandituLayer) {
    tiandituLayer.brightness = 1.5
    tiandituLayer.contrast = 1.1
    tiandituLayer.saturation = 1.1
    tiandituLayer.hue = 0
    tiandituLayer.alpha = 1.0
    tiandituLayer.minificationFilter = Cesium.TextureMinificationFilter.LINEAR
    tiandituLayer.magnificationFilter = Cesium.TextureMagnificationFilter.LINEAR
  }
  return tiandituLayer
}
// 组合图层函数
export const addTiandituWithGaodeOverlay = (viewerInstance) => {
  // 添加天地图影像图（底图）
  const tianditu = new Cesium.WebMapTileServiceImageryProvider({
    url: "http://{s}.tianditu.gov.cn/img_w/wmts?service=wmts&request=GetTile&version=1.0.0&LAYER=img&tileMatrixSet=w&TileMatrix={TileMatrix}&TileRow={TileRow}&TileCol={TileCol}&style=default&format=tiles&tk=6b1c07f3a655588c6b86fa35ebb1c177",
    layer: "tianditu_image",
    style: "default",
    format: "tiles",
    tileMatrixSetID: "w",
    subdomains: ["t0", "t1", "t2", "t3", "t4", "t5", "t6", "t7"],
    maximumLevel: 18,
    credit: new Cesium.Credit("天地图影像"),
    enablePickFeatures: false,
    pixelRatio: window.devicePixelRatio || 2
  })

  const tiandituLayer = viewerInstance.imageryLayers.addImageryProvider(tianditu)

  // 添加高德矢量图（叠加层）
  const gaodeVector = new Cesium.UrlTemplateImageryProvider({
    url: "http://webrd02.is.autonavi.com/appmaptile?lang=zh_cn&size=1&scale=1&style=8&x={x}&y={y}&z={z}",
    layer: "gaode_vector",
    style: "default",
    format: "image/png",
    tileMatrixSetID: "GoogleMapsCompatible",
    maximumLevel: 18,
    credit: new Cesium.Credit("高德矢量"),
    enablePickFeatures: false,
    pixelRatio: window.devicePixelRatio || 2
  })

  const gaodeLayer = viewerInstance.imageryLayers.addImageryProvider(gaodeVector)

  // 设置图层属性
  if (tiandituLayer) {
    tiandituLayer.brightness = 1.0
    tiandituLayer.contrast = 1.1
    tiandituLayer.saturation = 1.1
    tiandituLayer.alpha = 1.0
  }

  if (gaodeLayer) {
    // 设置适当的透明度以显示底图
    gaodeLayer.alpha = 0.7
    gaodeLayer.brightness = 1.0
    gaodeLayer.contrast = 1.1
    gaodeLayer.saturation = 1.1
  }

  return {
    tiandituLayer,
    gaodeLayer
  }
}
export const getTiandituLayer = () => tiandituLayer