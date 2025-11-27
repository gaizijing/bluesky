import * as Cesium from 'cesium'

let tiandituLayer = null

export const addTiandituLayer = (viewerInstance) => {
  const tianditu = new Cesium.WebMapTileServiceImageryProvider({
    url: "http://{s}.tianditu.gov.cn/img_w/wmts?service=wmts&request=GetTile&version=1.0.0&LAYER=img&tileMatrixSet=w&TileMatrix={TileMatrix}&TileRow={TileRow}&TileCol={TileCol}&style=default&format=tiles&tk=6b1c07f3a655588c6b86fa35ebb1c177",
    layer: "img_w",
    style: "default",
    format: "tiles",
    tileMatrixSetID: "w",
    subdomains: ["t0", "t1", "t2", "t3", "t4", "t5", "t6", "t7"],
    maximumLevel: 18,
    credit: new Cesium.Credit("天地图"),
    enablePickFeatures: false,
    pixelRatio: window.devicePixelRatio || 2
  })

  tiandituLayer = viewerInstance.imageryLayers.addImageryProvider(tianditu)

  if (tiandituLayer) {
    tiandituLayer.brightness = 1.0
    tiandituLayer.contrast = 1.1
    tiandituLayer.saturation = 1.1
    tiandituLayer.hue = 0
    tiandituLayer.alpha = 1.0
    tiandituLayer.minificationFilter = Cesium.TextureMinificationFilter.LINEAR
    tiandituLayer.magnificationFilter = Cesium.TextureMagnificationFilter.LINEAR
  }
  return tiandituLayer
}

export const getTiandituLayer = () => tiandituLayer