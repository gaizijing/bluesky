<template>
  <div class="map-container">
    <!-- Cesium地图容器 -->
    <div id="cesiumContainer" class="cesium-container"></div>
    <!-- 只在cesiumHooks加载完毕后才渲染ControlPanel -->
    <ControlPanel v-if="layerSettingsStore.isShow" :wind-layer="cesiumStore.windLayer"
      :initial-options="layerSettingsStore.windOptions" @options-change="handleOptionsChange" :layer-controls="{
        ...cesiumHooks
      }" />
  </div>
</template>

<script setup>
import { onMounted, onUnmounted, defineAsyncComponent, ref } from 'vue'
import { useCesium } from '@/hooks/useCesium'
import { useCesiumStore } from '@/store/modules/cesium'
import { useLayerSettingsStore } from '@/store/modules/layerSettings'
import ControlPanel from "@/components/map/ControlPanel.vue"
// 地图容器ID
const CESIUM_CONTAINER_ID = 'cesiumContainer'
const layerSettingsStore = useLayerSettingsStore()
const cesiumStore = useCesiumStore()

// Cesium实例和控制方法
let cesiumHooks = null
// 加载状态标志
// const isHookLoaded = ref(false)

// 初始化地图
const initializeMap = async () => {
  try {
    cesiumHooks = useCesium(CESIUM_CONTAINER_ID)
    cesiumHooks.initCesium()
    layerSettingsStore.loadSettingsFromLocal()
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
</style>