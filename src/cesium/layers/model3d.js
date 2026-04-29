import * as Cesium from 'cesium'
let modelTileset = null

/**
 * 兼容两种 3D 模型格式：
 * 1. 标准 Cesium 3D Tileset（.json/tileset.json）
 * 2. Geobuilding 独立 glTF 格式（modelinfo.json + N.gltf + N.bin）
 *
 * 自动根据 URL 文件名判断走哪条路。
 */
export const addWhiteModel = async (viewerInstance, options = {}) => {
  const url =  options.url

  if (url.endsWith('modelinfo.json')) {
    return loadGeobuildingModels(viewerInstance, url)
  }

  return load3DTileset(viewerInstance, url, options)
}

/**
 * 标准 3D Tileset 加载（原逻辑不变）
 */
const load3DTileset = async (viewerInstance, url, options = {}) => {
  try {
    modelTileset = await Cesium.Cesium3DTileset.fromUrl(url, {
      maximumScreenSpaceError: 16,
      skipLevelOfDetail: true,
      baseScreenSpaceError: 1024,
      skipScreenSpaceErrorFactor: 16,
      skipLevels: 1,
      immediatelyLoadDesiredLevelOfDetail: false,
      loadSiblings: false,
      cullWithChildrenBounds: true,
      cullRequestsWhileMoving: true,
      cullRequestsWhileMovingMultiplier: 6,
      progressiveResolutionHeightFraction: 0.5,
      preferLeaves: true,
      maximumMemoryUsage: 2048,
      maximumNumberOfLoadedTiles: 100,
      purgeOptions: {
        retainCurrentLevelOfDetail: true,
        unusedTiles: 100
      },
      distanceDisplayCondition: new Cesium.DistanceDisplayCondition(0, 200000)
    })

    viewerInstance.scene.primitives.add(modelTileset)
  } catch (error) {
    console.error('加载 3D Tileset 失败:', error)
  }

  return modelTileset
}

/**
 * Geobuilding 独立 glTF 加载
 *
 * 每个 glTF 是 ENU 局部坐标系（X=东西, Y=南北, Z=高度），
 * center 是经纬度中心点 → 用 eastNorthUpToFixedFrame 即可。
 */
const loadGeobuildingModels = async (viewerInstance, url) => {
  try {
    const viewer = viewerInstance

    // 场景光照（建筑 glTF 默认缺光照）
    viewer.scene.fxaa = true
    viewer.scene.postProcessStages.fxaa.enabled = true
    viewer.scene.globe.enableLighting = false
    viewer.scene.light = new Cesium.DirectionalLight({
      direction: new Cesium.Cartesian3(0.8660254037844386, -0.5000000000000001, 0),
      intensity: 1.0
    })

    // 加载 modelinfo.json
    const baseUrl = url.substring(0, url.lastIndexOf('/') + 1)
    const resp = await fetch(url)
    const modelInfo = await resp.json()
    const entries = Object.entries(modelInfo)

    // 分批并行加载
    const BATCH_SIZE = 20
    const loadedModels = []

    for (let i = 0; i < entries.length; i += BATCH_SIZE) {
      const batch = entries.slice(i, i + BATCH_SIZE)

      const batchPromises = batch.map(async ([filename, info]) => {
        const [lng, lat] = info.center
        const position = Cesium.Cartesian3.fromDegrees(lng, lat, 0)

        // 完全照抄 demo3.html 的 modelMatrix 计算方式
        const hpr = new Cesium.HeadingPitchRoll(
          Cesium.Math.toRadians(90),
          Cesium.Math.toRadians(90),
          Cesium.Math.toRadians(0)
        )
        const modelMatrix = Cesium.Transforms.headingPitchRollToFixedFrame(
          position,
          hpr,
          Cesium.Ellipsoid.WGS84,
          Cesium.Transforms.eastNorthUpToFixedFrame,
          new Cesium.Matrix4()
        )

        return Cesium.Model.fromGltfAsync({
          url: baseUrl + filename,
          modelMatrix: modelMatrix,
          scale: 1
        })
      })

      const batchModels = await Promise.all(batchPromises)
      loadedModels.push(...batchModels)
      await new Promise(r => setTimeout(r, 50))
    }

    // 添加到场景
    loadedModels.forEach(m => viewer.scene.primitives.add(m))

  } catch (error) {
    console.error('加载 Geobuilding 模型失败:', error)
  }

  return null
}

export const getModelTileset = () => modelTileset
