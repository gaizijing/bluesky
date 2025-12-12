<template>
  <div class="map-container">
    <!-- 加载状态 -->
    <div v-if="loading" class="loading-overlay">
      <div class="loading-content">
        <div class="loading-spinner"></div>
        <div class="loading-text">加载中...</div>
      </div>
    </div>

    <!-- Cesium地图容器 -->
    <div id="cesiumContainer" class="cesium-container" :class="{ 'hidden': loading }"></div>

    <!-- 控制面板 -->
    <ControlPanel v-if="layerSettingsStore.isShow" :wind-layer="cesiumStore.windLayer"
      :initial-options="layerSettingsStore.windOptions" @options-change="handleOptionsChange"
      :layer-controls="cesiumHooks" />

    <!-- 时间进度条：只在存在当前航线时显示 -->
    <TimeProgressBar 
      v-if="routeStore.currentRoute"
      @time-change="handleTimeChange" 
    />

  </div>
</template>

<script setup>
import { onMounted, onUnmounted, watch, ref } from 'vue'
import { useCesium } from '@/hooks/useCesium'
import { useCesiumStore } from '@/store/modules/cesium'
import { useLayerSettingsStore } from '@/store/modules/layerSettings'
import ControlPanel from "@/components/map/ControlPanel.vue"
import TimeProgressBar from "@/components/map/TimeProgressBar.vue"
import { useRouteStore } from '@/store/modules/routeStore'
import eventManager from '@/cesium/core/eventManager' // 导入独立的事件管理器

// 地图容器ID
const CESIUM_CONTAINER_ID = 'cesiumContainer'
const layerSettingsStore = useLayerSettingsStore()
const cesiumStore = useCesiumStore()
const routeStore = useRouteStore()

// Cesium实例和控制方法
let cesiumHooks = null
// 加载状态标志
// const isHookLoaded = ref(false)

// 根据图层配置设置图层显示状态
const applyLayerVisibilitySettings = () => {
  if (cesiumHooks && layerSettingsStore.layers) {
    for (const [key, layer] of Object.entries(layerSettingsStore.layers)) {
      switch (key) {
        case "model":
          cesiumHooks.setModelVisibility?.(layer.visible)
          break
        case "wind":
          cesiumHooks.setWindVisibility?.(layer.visible)
          break
        case "monitoringPoints":
          cesiumHooks.setMonitoringPointsVisibility?.(layer.visible)
          break
        case "temperature":
          cesiumHooks.setTemperatureVisibility?.(layer.visible)
          break
      }
    }
  }
}
const loading = ref(true)
// 初始化地图
const initializeMap = async () => {
  try {
    cesiumHooks = useCesium(CESIUM_CONTAINER_ID)
    // 等待Cesium初始化完成
    await cesiumHooks.initCesium()


    // 从本地存储加载设置
    layerSettingsStore.loadSettingsFromLocal()

    // 应用图层显示状态设置
     applyLayerVisibilitySettings()
   
    // 使用独立的事件管理器初始化viewer事件
    eventManager.initializeViewerEvents(cesiumHooks.viewer.value);
     loading.value = false
   
  } catch (error) {
    console.error('地图初始化失败:', error)
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
  
  // 更新热力图数据
  if (cesiumHooks && cesiumHooks.updateHeatmapTime) {
    cesiumHooks.updateHeatmapTime(time)
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
// 组件挂载时初始化地图和设置事件监听
onMounted(() => {
  initializeMap()
})
onUnmounted(() => {
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
</style>