import * as Cesium from 'cesium'

let modelTileset = null

export const addWhiteModel = async (viewerInstance) => {
  try {
    modelTileset = await Cesium.Cesium3DTileset.fromUrl("/cesium/model/qingdaoshi/tileset.json", {
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


    viewerInstance.scene.primitives.add(modelTileset);
    //模型调试
    // viewerInstance.extend(Cesium.viewerCesium3DTilesInspectorMixin)

    ///////////cesium自带的模型////////////
     const tileset = await Cesium.createOsmBuildingsAsync();
      viewerInstance.scene.primitives.add(tileset);

  } catch (error) {
    console.error('加载3D模型失败:', error)
  }
  return modelTileset
}

export const getModelTileset = () => modelTileset