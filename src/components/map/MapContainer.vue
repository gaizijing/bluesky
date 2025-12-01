<template>
  <div class="map-container">
    <!-- Cesium地图容器 -->
    <div id="cesiumContainer" class="cesium-container"></div>
    
    <!-- 控制面板 -->
    <ControlPanel 
      v-if="layerSettingsStore.isShow" 
      :wind-layer="cesiumStore.windLayer"
      :initial-options="layerSettingsStore.windOptions" 
      @options-change="handleOptionsChange" 
      :layer-controls="cesiumHooks"
    />
    
  </div>
</template>

<script setup>
import { onMounted, onUnmounted, watch, ref } from 'vue'
import { useCesium } from '@/hooks/useCesium'
import { useCesiumStore } from '@/store/modules/cesium'
import { useLayerSettingsStore } from '@/store/modules/layerSettings'
import ControlPanel from "@/components/map/ControlPanel.vue"
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
  eventManager.initializeViewerEvents(cesiumHooks.viewer.value
  );
    // 设置hook加载完成标志
    // isHookLoaded.value = true
  } catch (error) {
    console.error('地图初始化失败:', error)
  }
}

// 处理图层设置变化
const handleOptionsChange = (options) => {
  layerSettingsStore.updateWindOptions(options)
  layerSettingsStore.saveSettingsToLocal()
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
/* 新增地图航线详情弹窗样式 */
.map-route-detail {
  position: absolute;
  background: rgba(0,0,0,0.8);
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