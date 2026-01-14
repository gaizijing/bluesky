import { ref, watch, toRefs } from 'vue'
import * as Cesium from 'cesium'
import { useWindStore } from '@/store/modules/wind'
import { useLayerSettingsStore } from '@/store/modules/layerSettings'
import { useAreaStore } from '@/store/modules/area'
import { createViewer, destroyViewer } from '@/cesium/core/viewer'
import { handleCameraMove, getCurrentCameraParams, flyToRegion, flyToRectangle, limitCameraRange, switchToOverviewMode, switchToFocusMode, flyToQingdaoOverview, setupCameraPrintKeydown, watchCameraHeight } from '@/cesium/core/camera'
import { addTiandituLayer, addTiandituWithGaodeOverlay } from '@/cesium/layers/tianditu'
import { loadTerrain } from '@/cesium/layers/terrain'
import { addWhiteModel } from '@/cesium/layers/model3d'
import { AreaManager } from '@/cesium/entities/area.js'
import { initWind } from '@/cesium/visualization/wind'
import { initHeatVolume } from '@/cesium/visualization/heatmap'
import generateHeatmapData from '@/mock/heatmapData'
import { routeManager } from '@/cesium/entities/routes' // 引入航线管理器
import { useRouteStore } from '@/store/modules/routeStore'
import { addDistrictInfo, addBoundGeo } from '@/cesium/layers/district'
import eventManager from '@/cesium/core/eventManager' // 引入事件管理器
import { SkyBoxManager } from '@/cesium/volumeCloud/SkyBoxManager' // 引入天空盒管理器
import { CAMERA_HEIGHT_THRESHOLD } from '../config/windLayerDefaults'
import Cloud from '@/cesium/visualization/cloud'
import Atmosphere from '@/cesium/visualization/atmosphere'
import { useHeatmapStore } from '@/store/modules/heatmap'
export function useCesium(containerId) {
  // Store实例
  const windStore = useWindStore()
  const heatmapStore = useHeatmapStore()
  const areaStore = useAreaStore()
  const layerSettingsStore = useLayerSettingsStore()
  const routeStore = useRouteStore()

  // 响应式状态
  const viewer = ref(null)
  const isLoading = ref(false)
  const errorMsg = ref('')

  // Cesium资源管理（统一使用ref或对象管理）
  const resources = ref({
    windLayer: null,
    tiandituLayer: null,
    districtPrimitive: null,
    modelTileset: null,
    heatMapInstance: null,
    areaManager: null,
    cameraMoveHandler: null,
    cameraHeightWatcher: null,
    skyBoxManager: null,
    cameraPrintKeydownHandler: null,
    cloud: null
  })

  // 监测点相关响应式数据
  const { areaList } = toRefs(areaStore)

  // ==================== 初始化步骤 ====================

  /**
   * 初始化Cesium Viewer
   */
  const initViewer = () => {
    viewer.value = createViewer(containerId)
    viewer.value.cesiumWidget.creditContainer.style.display = 'none'
    resources.value.skyBoxManager = new SkyBoxManager(viewer.value, {
      cameraHeightThreshold: 240000
    })
    //  const atmosphere = new Atmosphere(viewer.value)
    // atmosphere.show()
    // resources.value.cloud = new Cloud(viewer.value)
    // resources.value.cloud.show()


  }

  /**
   * 配置按键盘移动相机控制
   */
  const configCamera = () => {
    resources.value.cameraMoveHandler = handleCameraMove(viewer.value)
  };

  /**
   * 设置相机高度监听，控制风场、云朵和监测点的显示/隐藏
   * 近地的时候显示风场和云朵，远地的时候显示area
   */
  const setupCameraHeightWatcher = () => {
    // Set up camera height watcher
    resources.value.cameraHeightWatcher = watchCameraHeight(
      viewer.value,
      CAMERA_HEIGHT_THRESHOLD,
      (height, isBelowThreshold) => {
        // 拉近看场时：风场显示，云朵显示，area隐藏
        // 拉远时：风场隐藏，云朵隐藏，area显示
        if (isBelowThreshold) {
          // 拉近场景

          const isWindEnabled = layerSettingsStore.layers.wind.visible;
          if (resources.value.windLayer && isWindEnabled) {
            // 风场隐藏
            if (Array.isArray(resources.value.windLayer)) {
              resources.value.windLayer.forEach(layer => {
                layer.show = true;
              });
            } else {
              resources.value.windLayer.show = true;
            }
          }
          if (resources.value.areaManager) {
            resources.value.areaManager.setAreasVisibility(false); // 监测点隐藏
          }

          if (resources.value.cloud) {
            resources.value.cloud.show(); // 云朵显示
          }



        } else {
          // 拉远场景
          if (resources.value.windLayer) {
            // 风场隐藏
            if (Array.isArray(resources.value.windLayer)) {
              resources.value.windLayer.forEach(layer => {
                layer.show = false;
              });
            } else {
              resources.value.windLayer.show = false;
            }
          }
          if (resources.value.cloud) {
            resources.value.cloud.destroy(); // 云朵隐藏
          }
          if (resources.value.areaManager) {
            resources.value.areaManager.setAreasVisibility(true); // 监测点显示
          }
        }
      }
    );
  };

  /**
   * 加载基础图层
   */
  const loadBaseLayers = () => {
    // 加载地形
    loadTerrain(viewer.value)
    // 添加行政区划边界 区名称的小牌子，和区的的整块面的颜色
    //addBoundGeo(viewer.value)
    // TODO: 如需添加天地图，取消以下注释
    // resources.value.tiandituLayer = addTiandituLayer(viewer.value)
    // TODO: 如需添加完整行政区划信息，取消以下注释
    // addDistrictInfo(viewer.value)

  }

  /**
   * 加载3D模型
   */
  const load3DModel = async () => {
    resources.value.modelTileset = await addWhiteModel(viewer.value)
  }

  /**
   * 初始化实体和可视化
   */
  const initEntitiesAndVisualizations = async () => {
    // 初始化监测点管理器

    resources.value.areaManager = AreaManager.getInstance(viewer.value, areaStore)
    resources.value.areaManager.render(areaList.value)



    // 初始化风场
    resources.value.windLayer = await initWind(viewer.value, layerSettingsStore)


    // 设置相机高度监听，控制风场、云朵和监测点的显示/隐藏
    // setupCameraHeightWatcher()

    // 初始化热力图
    resources.value.heatMapInstance = await initHeatVolume(viewer.value)
    heatmapStore.setHeatmapLayer(resources.value.heatMapInstance)

    // 初始化航线管理器
    routeManager.init(viewer.value)
  }


  /**
   * 设置响应式监听
   */
  const setupReactiveWatchers = () => {
    // 监听选中监测点变化
    watch(
      () => areaStore.selectedArea,
      (newArea) => {
        if (newArea && viewer.value) {
          resources.value.areaManager.setSelected(`area_${newArea.id}`)
          flyToRegion(viewer.value, { bbox: newArea.bbox, duration: 1.0 })
        }
      },
      { deep: true }
    )

    // 监听当前航线变化
    watch(
      () => routeStore.currentRoute,
      (newRoute) => {
        if (newRoute && viewer.value) {
          routeManager.render(newRoute)
        }
      }
    )

    // 监听监测点列表变化
    watch(
      () => areaStore.areaList,
      (newAreas) => {
        if (newAreas && viewer.value && resources.value.areaManager) {
          resources.value.areaManager.render(newAreas)
        }
      },
      { deep: true }
    )

    // 键盘事件监听 - 按P键打印相机参数
    resources.value.cameraPrintKeydownHandler = setupCameraPrintKeydown(viewer.value)
  }

  /**
   * 初始化Cesium主流程
   */
  const initCesium = async () => {
    try {
      isLoading.value = true

      // 执行初始化步骤
      initViewer()
      configCamera()
      loadBaseLayers()
      await load3DModel()
      await initEntitiesAndVisualizations()
      setupReactiveWatchers()



    } finally {
      isLoading.value = false
    }
  }

  /**
   * 清理Cesium资源
   */
  const cleanup = () => {
    console.log('开始清理Cesium资源...')

    // 移除键盘事件监听
    if (resources.value.cameraPrintKeydownHandler) {
      document.removeEventListener('keydown', resources.value.cameraPrintKeydownHandler)
      resources.value.cameraPrintKeydownHandler = null
    }

    // 移除相机移动事件监听
    if (resources.value.cameraMoveHandler) {
      document.removeEventListener('keydown', resources.value.cameraMoveHandler)
      resources.value.cameraMoveHandler = null
    }

    // 移除相机高度监听（用于风场可见性控制）
    if (resources.value.cameraHeightWatcher) {
      resources.value.cameraHeightWatcher()
      resources.value.cameraHeightWatcher = null
    }

    if (viewer.value) {
      // 清理天空盒管理器
      if (resources.value.skyBoxManager) {
        resources.value.skyBoxManager.destroy()
        resources.value.skyBoxManager = null
      }

      // 清理云层
      if (resources.value.cloud) {
        resources.value.cloud.destroy()
        resources.value.cloud = null
      }

      // 清理航线
      routeManager.destroy()

      // 清理监测点
      if (resources.value.areaManager) {
        resources.value.areaManager.destroy()
        resources.value.areaManager = null
      }

      // 清理热力图
      if (resources.value.heatMapInstance) {
        resources.value.heatMapInstance.destroy()
        resources.value.heatMapInstance = null
      }

      // 清理风场
      if (resources.value.windLayer) {
        // Support both single wind layer and array of wind layers
        if (Array.isArray(resources.value.windLayer)) {
          // Check if the array has a destroy method (custom implementation)
          if (typeof resources.value.windLayer.destroy === 'function') {
            resources.value.windLayer.destroy();
          } else {
            // Fallback to individual layer cleanup
            resources.value.windLayer.forEach(layer => {
              layer.destroy();
            });
          }
        } else {
          resources.value.windLayer.destroy();
        }
        resources.value.windLayer = null;
      }

      // 销毁Viewer
      destroyViewer(viewer.value)
      viewer.value = null
    }
  }


  // ==================== 图层控制 ====================
  /**
   * 设置模型图层可见性
   */
  const setModelVisibility = (visible) => {
    if (resources.value.modelTileset) {
      resources.value.modelTileset.show = visible
    }
  };

  /**
   * 设置风场图层可见性
   */
  const setWindVisibility = (visible) => {
    if (resources.value.windLayer) {
      // Store the wind layer visibility state in layerSettingsStore
      layerSettingsStore.setLayerVisibility('wind', visible);

      // Update wind layer visibility considering both camera height and visibility setting
      // updateWindVisibilityBasedOnConditions();
    }
  };



  /**
   * 设置监测点图层可见性
   */
  const setAreasVisibility = (visible) => {
    if (resources.value.areaManager) {
      resources.value.areaManager.setAreasVisibility(visible)
    }
  };

  /**
   * 设置温度图层可见性
   */
  const setTemperatureVisibility = (visible) => {
    if (resources.value.heatMapInstance && resources.value.heatMapInstance.heatmapState) {
      resources.value.heatMapInstance.heatmapState.heatmapPrimitive.show = visible
    }
  };

  /**
   * 更新热力图时间
   * @param {Date} time - JavaScript Date对象
   */
  const updateHeatmapTime = async (time) => {
    console.log('更新热力图时间:', time)

    if (!resources.value.heatMapInstance) {
      console.error('热力图实例未初始化')
      return
    }

    try {
      // 使用模拟数据替代真实API请求
      const timestamp = time.getTime()
      const dataPoints = generateHeatmapData(timestamp)

      // 更新热力图数据
      resources.value.heatMapInstance.updateData(dataPoints)
    } catch (error) {
      console.error('更新热力图时间失败:', error)
    }
  };

  /**
   * 设置当前时间
   * @param {Date} time - JavaScript Date对象
   */
  const setCurrentTime = (time) => {
    if (viewer.value) {
      const julianDate = Cesium.JulianDate.fromDate(time)
      viewer.value.clock.currentTime = julianDate
    }
  };

  // 矩形绘制功能
  const startRectangleDrawing = (callback) => {
    eventManager.startRectangleDrawing(callback);
  };

  const stopRectangleDrawing = () => {
    eventManager.stopRectangleDrawing();
  };

  const cancelRectangleDrawing = () => {
    eventManager.cancelRectangleDrawing();
  };

  // 暴露公共方法
  return {
    viewer,
    isLoading,
    errorMsg,
    initCesium,
    cleanup,
    // 相机控制
    flyToRegion: (region) => flyToRegion(viewer.value, region),
    flyToRectangle: (region) => flyToRectangle(viewer.value, region),
    getCurrentCameraParams: () => getCurrentCameraParams(viewer.value),
    // 模式切换
    switchToOverviewMode: () => switchToOverviewMode(viewer.value),
    switchToFocusMode: (region) => switchToFocusMode(viewer.value, region),
    // 图层控制
    setModelVisibility,
    setWindVisibility,
    setAreasVisibility,
    setTemperatureVisibility,
    // 可视化更新
    updateHeatmapTime,
    // 时间控制
    setCurrentTime,
    // 矩形绘制
    startRectangleDrawing,
    stopRectangleDrawing,
    cancelRectangleDrawing,
    // 天空盒控制
    getSkyBoxManager: () => resources.value.skyBoxManager
  }
}