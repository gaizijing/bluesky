import * as Cesium from 'cesium'

let modelTileset = null

/** 统一走 V1：Cesium3DTileset（tileset.json），忽略历史 modelinfo 配置 */
function resolveTilesetUrl(url) {
  if (!url || typeof url !== 'string') return url
  if (/modelinfo\.json$/i.test(url)) {
    const tilesetUrl = url.replace(/modelinfo\.json$/i, 'tileset.json')
    console.warn('[model3d] modelinfo.json 已弃用，改用 tileset:', tilesetUrl)
    return tilesetUrl
  }
  return url
}

/**
 * 加载区域白膜 3D Tileset（与 V1 一致）
 */
export const addWhiteModel = async (viewerInstance, options = {}) => {
  const url = resolveTilesetUrl(options.url)
  if (!url) {
    console.warn('[model3d] 缺少 modelUrl')
    return null
  }

  try {
    modelTileset = await Cesium.Cesium3DTileset.fromUrl(url, {
      // Geobuilding 导出为 Z 轴向上；默认 Y-up 会导致建筑“竖起来”
      modelUpAxis: Cesium.Axis.Z,
      modelForwardAxis: Cesium.Axis.X,
      maximumScreenSpaceError: 32,
      skipLevelOfDetail: true,
      baseScreenSpaceError: 1024,
      skipScreenSpaceErrorFactor: 16,
      skipLevels: 1,
      immediatelyLoadDesiredLevelOfDetail: false,
      loadSiblings: false,
      cullWithChildrenBounds: true,
      cullRequestsWhileMoving: true,
      cullRequestsWhileMovingMultiplier: 10,
      progressiveResolutionHeightFraction: 0.5,
      preferLeaves: false,
      maximumMemoryUsage: 768,
      maximumNumberOfLoadedTiles: 48,
      purgeOptions: {
        retainCurrentLevelOfDetail: true,
        unusedTiles: 48,
      },
      distanceDisplayCondition: new Cesium.DistanceDisplayCondition(0, 200000),
    })

    viewerInstance.scene.primitives.add(modelTileset)
  } catch (error) {
    console.error('[model3d] 加载 3D Tileset 失败:', error)
    modelTileset = null
  }

  return modelTileset
}

/** 切换 Region 时移除旧白膜，避免仍显示上一区域模型 */
export const removeWhiteModel = (viewerInstance) => {
  if (!modelTileset) return
  try {
    if (viewerInstance?.scene?.primitives?.contains(modelTileset)) {
      viewerInstance.scene.primitives.remove(modelTileset)
    }
    if (typeof modelTileset.destroy === 'function') {
      modelTileset.destroy()
    }
  } catch (err) {
    console.warn('[model3d] 移除旧 Tileset 失败:', err)
  }
  modelTileset = null
}

export const getModelTileset = () => modelTileset
