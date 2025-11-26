<template>
  <div class="map-container">
    <!-- Cesium地图容器 -->
    <div id="cesiumContainer" class="cesium-container"></div>
    <!-- 只在cesiumHooks加载完毕后才渲染ControlPanel -->
    <ControlPanel v-if="isHookLoaded && layerSettingsStore.isShow" :wind-layer="cesiumHooks?.windLayer"
      :initial-options="layerSettingsStore.windOptions" @options-change="handleOptionsChange" :layer-controls="{
      ...cesiumHooks
    }"/>
  </div>
</template>

<script setup>
import { onMounted, onUnmounted, defineAsyncComponent, ref } from 'vue'
import { useCesium } from '@/hooks/useCesium'
import { useLayerSettingsStore } from '@/store/modules/layerSettings'
const ControlPanel = defineAsyncComponent(() =>
  import("@/components/map/ControlPanel.vue")
);
// 地图容器ID
const CESIUM_CONTAINER_ID = 'cesiumContainer'
const layerSettingsStore = useLayerSettingsStore()

// Cesium实例和控制方法
let cesiumHooks = null
// 加载状态标志
const isHookLoaded = ref(false)

// 初始化地图
const initializeMap = async () => {
  try {
    cesiumHooks = useCesium(CESIUM_CONTAINER_ID)
    console.log("cesiumHooks", cesiumHooks);

    layerSettingsStore.loadSettingsFromLocal()

    // 设置hook加载完成标志
    isHookLoaded.value = true
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
onMounted(async () => {

  await initializeMap()

  // 监听窗口大小变化
  window.addEventListener('resize', handleResize)
})

// 组件卸载时清理资源
onUnmounted(() => {
  // 移除事件监听
  window.removeEventListener('resize', handleResize)

  // 从useCesium hook中，我们知道没有destroyViewer方法，而是在onUnmounted中自动处理的
  // 但为了兼容性，我们仍然保留这个检查
  if (cesiumHooks?.destroyViewer) {
    cesiumHooks.destroyViewer()
  }
})

// 响应窗口大小变化
const handleResize = () => {
  if (cesiumHooks?.resizeViewer) {
    cesiumHooks.resizeViewer()
  }
}

</script>

<style scoped>
.map-container {
  position: relative;
  width: 100%;
  height: 100%;
  overflow: hidden;
}

/* .cesium-container {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  z-index: 1;
} */
</style>