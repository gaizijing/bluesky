import * as Cesium from 'cesium'
import { createProgressManager } from '@/utils/progressUtils'
import { useCesiumStore } from '@/store/modules/cesium'

let modelTileset = null

export const addWhiteModel = async (viewerInstance) => {
  try {
    const cesiumStore = useCesiumStore()
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
      }
    })

    const progressManager = createProgressManager((displayProgress) => {
      cesiumStore.setModelLoadProgress(displayProgress);
    }, {
      totalExpectedUpdates: 20,
      maxPossibleValue: 35
    });

    modelTileset.loadProgress.addEventListener(progress => {
      progressManager.updateProgress(progress);
    });

    viewerInstance.scene.primitives.add(modelTileset);

    modelTileset.allTilesLoaded.addEventListener(() => {
      progressManager.markAsCompleted();
      setTimeout(() => {
        cesiumStore.setModelLoadProgress(0);
        progressManager.reset();
      }, 3000);
    });

  } catch (error) {
    console.error('加载3D模型失败:', error)
  }
  return modelTileset
}

export const getModelTileset = () => modelTileset