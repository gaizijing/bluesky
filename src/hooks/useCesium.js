import {  ref, watch, toRefs } from 'vue'
import * as Cesium from 'cesium'
import { useCesiumStore } from '@/store/modules/cesium'
import { useLayerSettingsStore } from '@/store/modules/layerSettings'
import { useAreaStore } from '@/store/modules/area'
import { createViewer, destroyViewer } from '@/cesium/core/viewer'
import { handleCameraMove, getCurrentCameraParams, flyToRegion, flyToRectangle, limitCameraRange, switchToOverviewMode, switchToFocusMode, flyToQingdaoOverview } from '@/cesium/core/camera'
import { addTiandituLayer, addTiandituWithGaodeOverlay } from '@/cesium/layers/tianditu'
import { loadTerrain } from '@/cesium/layers/terrain'
import { addWhiteModel } from '@/cesium/layers/model3d'
import { AreaManager } from '@/cesium/entities/area.js'
import { initWind } from '@/cesium/visualization/wind'
import { addHeatVolume } from '@/cesium/visualization/heatmap'
import generateHeatmapData from '@/mock/heatmapData'
import { routeManager } from '@/cesium/entities/routes' // 引入航线管理器
import { useRouteStore } from '@/store/modules/routeStore'
import { addDistrictInfo, addBoundGeo } from '@/cesium/layers/district'
import eventManager from '@/cesium/core/eventManager' // 引入事件管理器
import SkyBoxOnGround from '@/cesium/volumeCloud/skybox_nearground.js'; // 修改导入方式

export function useCesium(containerId) {
  // Store实例
  const cesiumStore = useCesiumStore()
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
    cameraRangeCleanup: null
  })
  
  // 监测点相关响应式数据
  const { areaList } = toRefs(areaStore)

  // ==================== 初始化步骤 ====================
  
  /**
   * 初始化Cesium Viewer
   */
  const initViewer = () => {
    
    let currSkyBox; // 当前生效的Skybox
    let defaultSkybox; // cesium自带的Skybox
    viewer.value = createViewer(containerId)
    // 隐藏Cesium logo
    viewer.value.cesiumWidget.creditContainer.style.display = 'none'
    // console.log(Cesium.FeatureDetection.supportsWebgl2(viewer.value.scene));
const lantianSkybox = new SkyBoxOnGround({
  sources: {
    positiveX: "/texture/qingtian/rightav9.jpg",
    negativeX: "/texture/qingtian/leftav9.jpg",
    positiveY: "/texture/qingtian/frontav9.jpg",
    negativeY: "/texture/qingtian/backav9.jpg",
    positiveZ: "/texture/qingtian/topav9.jpg",
    negativeZ: "/texture/qingtian/bottomav9.jpg",
  },
});

 defaultSkybox = viewer.value .scene.skyBox; //先把系统默认的天空盒保存下来
  currSkyBox = lantianSkybox; //默认近地时使用个晴天天空盒
  viewer.value .scene.preUpdate.addEventListener(() => {
    //获取相机高度
    let position = viewer.value .scene.camera.position;
    let cameraHeight = Cesium.Cartographic.fromCartesian(position).height;
    if (cameraHeight < 240000) {      
      viewer.value .scene.skyBox = currSkyBox;
      viewer.value .scene.skyAtmosphere.show = false; //关闭地球大气层
    } else {
      viewer.value .scene.skyBox = defaultSkybox; //使用系统默认星空天空盒
      viewer.value .scene.skyAtmosphere.show = true; //显示大气层
    }
  });
  }
  
  /**
   * 配置相机控制
   */
  const configCamera = () => {
    resources.value.cameraMoveHandler = handleCameraMove(viewer.value)
  }
  
  /**
   * 加载基础图层
   */
  const loadBaseLayers = () => {
    // 加载地形
    loadTerrain(viewer.value)
    // 添加行政区划边界
    addBoundGeo(viewer.value)
    // TODO: 如需添加天地图，取消以下注释
    // resources.value.tiandituLayer = addTiandituLayer(viewer.value)
    // TODO: 如需添加完整行政区划信息，取消以下注释
    // await addDistrictInfo(viewer.value)
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
    console.log('风场初始化完成',resources.value.windLayer)
    cesiumStore.setWindLayer(resources.value.windLayer)
    
    // 初始化热力图
    resources.value.heatMapInstance = await addHeatVolume(viewer.value)
    
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
          flyToRegion(viewer.value, { coordinates: newArea.coordinates, duration: 1.0 })
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
      loadBaseLayers() // 同步函数，不需要await
      await load3DModel() // 异步函数，需要await
      await initEntitiesAndVisualizations() // 异步函数，需要await
      setupReactiveWatchers() // 同步函数，不需要await
      
      // 在所有资源加载完成后，初始化相机范围限制
      // resources.value.cameraRangeCleanup = limitCameraRange(viewer.value)
    } finally {
      isLoading.value = false
    }
  }

  /**
   * 清理Cesium资源
   */
  const cleanup = () => {
    console.log('开始清理Cesium资源...')
    
    // 移除相机移动事件监听
    if (resources.value.cameraMoveHandler) {
      document.removeEventListener('keydown', resources.value.cameraMoveHandler)
      resources.value.cameraMoveHandler = null
    }
    
    // // 清理相机范围限制
    // if (resources.value.cameraRangeCleanup) {
    //   resources.value.cameraRangeCleanup()
    //   resources.value.cameraRangeCleanup = null
    // }
    
    if (viewer.value) {
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
        resources.value.windLayer.destroy()
        resources.value.windLayer = null
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
      resources.value.windLayer.show = visible
    }
  };

  /**
   * 设置监测点图层可见性
   */
  const setAreaPointsVisibility = (visible) => {
    if (resources.value.areaManager) {
      resources.value.areaManager.setAreaPointsVisibility(visible)
    }
  };

  /**
   * 设置温度图层可见性
   */
  const setTemperatureVisibility = (visible) => {
    if (resources.value.heatMapInstance && resources.value.heatMapInstance.heatmapState.heatmapPrimitive) {
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
   * 更新风场配置选项
   */
  const updateWindOptions = (options) => {
    if (resources.value.windLayer && options) {
      resources.value.windLayer.updateOptions({
        particleHeight: options.height,
        particleSize: options.particleSize,
        lineWidth: { min: options.lineWidth, max: options.lineWidth + 1 },
        speedFactor: options.speedFactor,
        colors: options.colorScale === 'rainbow' ? ['#FF0000', '#FFFF00', '#00FF00', '#00FFFF', '#0000FF'] :
          options.colorScale === 'jet' ? ['#000080', '#0000FF', '#00FFFF', '#FFFF00', '#FF0000', '#800000'] :
            ['#440154', '#3B528B', '#21908C', '#5DC863', '#FDE725'], // viridis
        opacity: options.opacity,
        maxParticles: options.maxParticles
      })
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
    setAreaPointsVisibility,
    setTemperatureVisibility,
    // 可视化更新
    updateHeatmapTime,
    updateWindOptions,
    // 时间控制
    setCurrentTime,
    // 矩形绘制
    startRectangleDrawing,
    stopRectangleDrawing,
    cancelRectangleDrawing
  }
}