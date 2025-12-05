import { onMounted, ref, onUnmounted, watch, toRefs } from 'vue'
import * as Cesium from 'cesium'
import { useCesiumStore } from '@/store/modules/cesium'
import { useLayerSettingsStore } from '@/store/modules/layerSettings'
import { useMonitoringPointStore } from '@/store/modules/monitoringPoints'
import { createViewer, destroyViewer } from '@/cesium/core/viewer'
import { handleCameraMove } from '@/cesium/core/camera'
import { configureCamera, getCurrentCameraParams, flyToRegion, flyToRectangle } from '@/cesium/core/camera'
import { addTiandituLayer, addTiandituWithGaodeOverlay } from '@/cesium/layers/tianditu'
import { loadTerrain } from '@/cesium/layers/terrain'
import { addWhiteModel } from '@/cesium/layers/model3d'
import { MonitorPointManager } from '@/cesium/entities/monitoringPoints.js'
import { initWind } from '@/cesium/visualization/wind'
import { addHeatVolume } from '@/cesium/visualization/heatmap'
import { routeManager } from '@/cesium/entities/routes' // 引入航线管理器
import { useRouteStore } from '@/store/modules/routeStore'
import { addDistrictInfo, addBoundGeo } from '@/cesium/layers/district'

export function useCesium(containerId) {
  // Store实例
  const cesiumStore = useCesiumStore()
  const monitorStore = useMonitoringPointStore()
  const layerSettingsStore = useLayerSettingsStore()
  const routeStore = useRouteStore()

  // 响应式状态
  const viewer = ref(null)
  const isLoading = ref(false)
  const errorMsg = ref('')
  const windLayer = ref(null)
  // Cesium图层和实体引用
  let tiandituLayer = null
  let districtPrimitive = null
  let modelTileset = null
  let heatMapInstance = null
  let currentRouteEntities = [] // 存储当前显示的航线实体
  let monitorManager;
  // 事件处理函数引用（用于卸载）
  let cameraMoveHandler = null;
  // 监测点相关
  const { pointsList: monitorPoints } = toRefs(monitorStore)
  let monitorEntities = new Map() // 存储监测点实体（id -> entity）
  let originalBillboardStyle = new Map() // 存储实体原始样式


  // 初始化流程
  const initCesium = async () => {
    try {
      isLoading.value = true
      // 创建Viewer
      viewer.value = createViewer(containerId)
      viewer.value.cesiumWidget.creditContainer.style.display = 'none'
      // 配置键盘控制相机
      cameraMoveHandler = handleCameraMove(viewer.value)
      // configureCamera(viewer.value)
      // 添加天地图
      tiandituLayer = addTiandituLayer(viewer.value)
      // 加载地形
      loadTerrain(viewer.value)
      // // 添加行政区划
      // await addDistrictInfo(viewer.value)
      addBoundGeo(viewer.value)
      // 加载3D模型
      modelTileset = await addWhiteModel(viewer.value)
      // 渲染监测点
      monitorManager = MonitorPointManager.getInstance(viewer.value, monitorStore)
      monitorManager.render(monitorPoints.value)
      // 初始化风场
      await initWind(viewer.value, layerSettingsStore, windLayer)
      // 将风场图层实例设置到store中，使控制面板能够访问
      cesiumStore.setWindLayer(windLayer.value)
      heatMapInstance = await addHeatVolume(viewer.value)
      // 初始化航线管理器
      routeManager.init(viewer.value)
      watch(
        () => monitorStore.selectedPoint,
        (newPoint) => {
          if (newPoint && viewer.value) {
            // 修正：添加所有必需的参数
            monitorManager.setSelected(`monitor_${newPoint.id}`)
            flyToRegion(viewer.value, { coordinates: newPoint.coordinates, duration: 1.0 })
          }
        },
        { deep: true }
      )
      watch(
        () => routeStore.currentRoute,
        (newRoute) => {
          if (newRoute && viewer.value) {
            routeManager.render(newRoute)
          }
        }
      )



    } catch (error) {
      errorMsg.value = `初始化失败: ${error.message}`
      console.error(error)
    } finally {
      isLoading.value = false
    }
  }

  // 卸载清理
  const cleanup = () => {
    console.log('开始清理Cesium资源...');

    // 移除相机移动事件监听器
    if (cameraMoveHandler) {
      document.removeEventListener('keydown', cameraMoveHandler);
      cameraMoveHandler = null;
    }

    if (viewer.value) {
      // 清理航线
      routeManager.destroy()
      // 清理监测点
      monitorManager.destroy()
      // 清理热力图
      if (heatMapInstance) {
        heatMapInstance.destroy();
        heatMapInstance = null;
      }
      windLayer.value.destroy()
      // 销毁Viewer
      destroyViewer(viewer.value)
    }
  }


  // ==================== 图层控制 ====================
  /**
   * 设置模型图层可见性
   */
  const setModelVisibility = (visible) => {
    if (modelTileset) {
      modelTileset.show = visible;
    }
  };

  /**
   * 设置风场图层可见性
   */
  const setWindVisibility = (visible) => {
    if (windLayer.value) {
      windLayer.value.show = visible
    }
  };

  /**
   * 设置监测点图层可见性
   */
  const setMonitoringPointsVisibility = (visible) => {
   monitorManager.setMonitoringPointsVisibility(visible)
  };

  /**
   * 设置温度图层可见性
   */
  const setTemperatureVisibility = (visible) => {
    if (heatMapInstance && heatMapInstance.heatmapState.heatmapPrimitive) {
      heatMapInstance.heatmapState.heatmapPrimitive.show = visible;
    }
  };
  /**
   * 更新风场配置选项
   */
  const updateWindOptions = (options) => {
    if (windLayer.value && options) {
      windLayer.value.updateOptions({
        particleHeight: options.height,
        particleSize: options.particleSize,
        lineWidth: { min: options.lineWidth, max: options.lineWidth + 1 },
        speedFactor: options.speedFactor,
        colors: options.colorScale === 'rainbow' ? ['#FF0000', '#FFFF00', '#00FF00', '#00FFFF', '#0000FF'] :
          options.colorScale === 'jet' ? ['#000080', '#0000FF', '#00FFFF', '#FFFF00', '#FF0000', '#800000'] :
            ['#440154', '#3B528B', '#21908C', '#5DC863', '#FDE725'], // viridis
        opacity: options.opacity,
        maxParticles: options.maxParticles
      });
    }
  };

  // 暴露公共方法
  return {
    viewer,
    isLoading,
    errorMsg,
    initCesium,
    flyToRegion: (region) => flyToRegion(viewer.value, region),
    cleanup,
    getCurrentCameraParams: () => getCurrentCameraParams(viewer.value),
    flyToRectangle: (region) => flyToRectangle(viewer.value, region),
    setModelVisibility,
    setWindVisibility,
    setMonitoringPointsVisibility,
    setTemperatureVisibility,
    updateWindOptions,
  }
}