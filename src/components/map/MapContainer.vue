<template>
  <div class="map-container" style="height: 100%;">
    <!-- 加载状态 -->
    <div v-if="loading" class="loading-overlay">
      <div class="loading-content">
        <div class="loading-spinner"></div>
        <div class="loading-text">加载中...</div>
      </div>
    </div>

    <!-- Cesium地图容器（初始化期间保持可见，避免 canvas 尺寸为 0） -->
    <div id="cesiumContainer" class="cesium-container"></div>

    <!-- 控制面板 -->
    <ControlPanel v-if="layerSettingsStore.isShow" :wind-layer="windStore.windLayer"
      @options-change="handleOptionsChange"
      @layer-visibility-change="applyLayerVisibilitySettings" />

  </div>
</template>

<script setup>
import { onMounted, onUnmounted, watch, ref, computed } from 'vue'
import { useRoute } from 'vue-router'
import * as Cesium from 'cesium'
import { useCesium } from '@/hooks/useCesium'
import { useWindStore } from '@/store/modules/wind'
import { useLayerSettingsStore } from '@/store/modules/layerSettings'
import { useAreaStore } from '@/store/modules/area'
import { useAppDashboardStore } from '@/store/modules/appDashboard'
import ControlPanel from "@/components/map/ControlPanel.vue"
import { useRouteStore } from '@/store/modules/routeStore'
import eventManager from '@/cesium/core/eventManager'
import { dashboardEventBus, DASHBOARD_EVENTS } from '@/utils/eventBus'
import { fetchWeatherPoint } from '@/api/v2/weather'
import { ElMessage } from 'element-plus'
import { attachMetViz } from '@/composables/useMetVizEngine'
import { useMetVizStore } from '@/store/modules/metViz'
import { MET_VIZ_WIND_OPTIONS } from '@/met-viz/constants'
import { shouldAttachMetViz } from '@/config/metVizRuntime'

// 地图容器ID
const CESIUM_CONTAINER_ID = 'cesiumContainer'
const layerSettingsStore = useLayerSettingsStore()
const windStore = useWindStore()
const routeStore = useRouteStore()
const areaStore = useAreaStore()
const appStore = useAppDashboardStore()
const metVizStore = useMetVizStore()
const route = useRoute()
const metVizActive = computed(() => shouldAttachMetViz(route))

// 模式切换状态
const currentMode = ref('overview') // 默认概览模式

// Cesium实例和控制方法
let cesiumHooks = null
let pickHandler = null
let metVizHandle = null
// 加载状态标志
// const isHookLoaded = ref(false)

function syncMetVizFromLayerSettings() {
  if (!metVizActive.value) return
  const windOn = layerSettingsStore.layers.wind?.visible !== false
  if (windOn) {
    metVizStore.setLayerEnabled('wind', true)
    layerSettingsStore.updateWindOptions(MET_VIZ_WIND_OPTIONS)
  }
  dashboardEventBus.emit(DASHBOARD_EVENTS.MET_VIZ_CONFIG_CHANGED, {
    product: metVizStore.product,
    heightM: metVizStore.heightM,
    enabled: { ...metVizStore.enabled },
  })
}

// 根据图层配置设置图层显示状态
const applyLayerVisibilitySettings = () => {
  if (cesiumHooks && layerSettingsStore.layers) {
    console.log(layerSettingsStore.layers)
    for (const [key, layer] of Object.entries(layerSettingsStore.layers)) {
      switch (key) {
        case "model":
          cesiumHooks.setModelVisibility?.(layer.visible)
          break
        case "wind":
          cesiumHooks.setWindVisibility?.(layer.visible)
          break
        case "areaPoints":
          cesiumHooks.setAreasVisibility?.(layer.visible)
          break
        case "cloud":
          cesiumHooks.setCloudVisibility?.(layer.visible)
          break
      }
    }
    if (metVizActive.value) {
      syncMetVizFromLayerSettings()
      metVizHandle?.sync?.().catch((err) => console.warn('[MetViz] layer sync', err))
    }
  }
}
const loading = ref(true)
// 初始化地图
const initializeMap = async () => {
  try {
    cesiumHooks = useCesium(CESIUM_CONTAINER_ID)
    await cesiumHooks.initCesium()

    layerSettingsStore.loadSettingsFromLocal()
    if (!metVizActive.value) {
      layerSettingsStore.setLayerVisibility('wind', false)
    }
    applyLayerVisibilitySettings()

    eventManager.initializeViewerEvents(cesiumHooks.viewer.value)
    setupPickHandler(cesiumHooks.viewer.value)
    if (metVizActive.value) {
      metVizHandle = attachMetViz(cesiumHooks.viewer.value)
      syncMetVizFromLayerSettings()
      if (metVizHandle && appStore.regionId) {
        metVizHandle.sync().catch((err) => console.warn('[MetViz] initial sync', err))
      }
    }

    // 容器从隐藏/零尺寸恢复后强制刷新 Cesium 画布
    cesiumHooks.viewer.value?.resize()
  } catch (error) {
    console.error('地图初始化失败:', error)
    ElMessage.error('地图初始化失败，请刷新页面重试')
  } finally {
    loading.value = false
  }
}

// 处理图层设置变化
const handleOptionsChange = (options) => {
  layerSettingsStore.updateWindOptions(options)
  layerSettingsStore.saveSettingsToLocal()
}

// 处理时间变化
const handleTimeChange = (time) => {
  console.log('时间变化:', time)
  // 更新Cesium的时间系统
  if (cesiumHooks && cesiumHooks.setCurrentTime) {
    cesiumHooks.setCurrentTime(time)
  }
  
  
  // 更新航线分析数据（根据时间偏移量）
  if (routeStore.currentRoute) {
    // 计算时间偏移量（秒）
    const timeOffset = Math.floor((time - new Date()) / 1000)
    // 触发航线分析面板更新
    eventManager.emit('timeChange', { time, timeOffset })
  }
}


// 清空地图航线
const clearRoute = () => {
  cesiumHooks.clearAllRoutes()
  routeStore.clearCurrentRoute()
}

// 切换相机模式
const switchMode = (mode) => {
  currentMode.value = mode
  if (cesiumHooks) {
    if (mode === 'overview') {
      // 概览模式：显示所有监测点
      cesiumHooks.switchToOverviewMode()
    } else if (mode === 'focus') {
      // 重点关注模式：切换到当前选中的关注区域
      const selectedArea = areaStore.selectedArea
      if (selectedArea) {
        // 如果有选中的重点关注区域，切换到该点
        cesiumHooks.switchToFocusMode(selectedArea)
      } else {
        // 如果没有选中的重点关注区域，显示提示信息
        console.warn('没有选中的重点关注区域，无法切换到重点关注模式')
        // 使用Element Plus的Message提示框
        ElMessage.warning('请先选择一个重点关注区域，然后再切换到重点关注模式')
        // 切换回概览模式
        currentMode.value = 'overview'
      }
    }
  }
}

// 切换模式函数
const toggleMode = () => {
  const newMode = currentMode.value === 'overview' ? 'focus' : 'overview'
  switchMode(newMode)
}

function setupPickHandler(viewer) {
  if (!viewer || pickHandler) return
  pickHandler = new Cesium.ScreenSpaceEventHandler(viewer.scene.canvas)
  pickHandler.setInputAction(async (click) => {
    if (!appStore.pickMode) return
    const cartesian = viewer.camera.pickEllipsoid(click.position, viewer.scene.globe.ellipsoid)
    if (!cartesian) return
    const carto = Cesium.Cartographic.fromCartesian(cartesian)
    const lng = Cesium.Math.toDegrees(carto.longitude)
    const lat = Cesium.Math.toDegrees(carto.latitude)
    const heightM = carto.height
    dashboardEventBus.emit(DASHBOARD_EVENTS.MAP_PICKED, { lng, lat, heightM })
    try {
      const weather = await fetchWeatherPoint(lng, lat, {
        time: appStore.timelineTime,
        includeRisk: true,
      })
      appStore.setPickPopup({ lng, lat, heightM, weather })
    } catch (err) {
      appStore.setPickPopup({ lng, lat, heightM, error: err.message || '查询失败' })
    }
  }, Cesium.ScreenSpaceEventType.LEFT_CLICK)
}

function destroyPickHandler() {
  pickHandler?.destroy()
  pickHandler = null
}

watch(
  () => appStore.initialized && appStore.regionId,
  (ready) => {
    if (!ready || !metVizHandle) return
    syncMetVizFromLayerSettings()
    metVizHandle.sync().catch((err) => console.warn('[MetViz] post-init sync', err))
  }
)

// 组件挂载时初始化地图和设置事件监听
onMounted(() => {
  initializeMap()

  // 监听模式切换事件
  eventManager.on('modeChange', (mode) => {
    switchMode(mode)
  })
})
onUnmounted(() => {
  destroyPickHandler()
  metVizHandle?.destroy()
  metVizHandle = null
  if (cesiumHooks) {
    cesiumHooks.cleanup()
  }
})

</script>

<style scoped>
.map-container {
  position: relative;
  width: 100%;
  height: 100%;
  overflow: hidden;
}

/* 加载状态样式 */
.loading-overlay {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: url("@/assets/images/bg_main_layout.png");
  background-size: cover;
  background-position: center;
  overflow: hidden;
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 1000;
}

.loading-content {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 20px;
}

.loading-spinner {
  width: 50px;
  height: 50px;
  border: 4px solid rgba(255, 255, 255, 0.3);
  border-top: 4px solid #1976d2;
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

.loading-text {
  color: white;
  font-size: 18px;
  font-weight: 500;
}

@keyframes spin {
  0% {
    transform: rotate(0deg);
  }

  100% {
    transform: rotate(360deg);
  }
}

.cesium-container {
  width: 100%;
  height: 100%;
}

/* 隐藏地图容器的类 */
.hidden {
  display: none;
}

/* 新增地图航线详情弹窗样式 */
.map-route-detail {
  position: absolute;
  background: rgba(0, 0, 0, 0.8);
  color: white;
  padding: 10px 15px;
  border-radius: 8px;
  z-index: 1000;
}

.map-route-detail button {
  margin-top: 8px;
  padding: 4px 8px;
  background: #3b82f6;
  border: none;
  color: white;
  border-radius: 4px;
  cursor: pointer;
}

/* 模式切换按钮样式已移至Header组件 */

</style>