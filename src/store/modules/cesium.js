import { defineStore } from 'pinia'

// Cesium地图状态管理
export const useCesiumStore = defineStore('cesium', {
  state: () => ({
    // Cesium Viewer实例（全局唯一）
    viewer: null,
    // 当前相机位置（用于保存/恢复视角）
    cameraPosition: null,
    modelLoadProgress: 0,// 新增模型加载进度状态
    // 图层可见性配置
    layerVisibility: {
      baseLayer: true,    // 基础地图
      temperature: false, // 温度图层
      precipitation: false,// 降水图层
      wind: false,        // 风力图层
      pressure: false     // 气压图层
    },
    // 可视化参数（粒子密度、动画速度等）
    visualizationParams: {
      particleDensity: 1.0,  // 粒子密度（0.1-2.0）
      animationSpeed: 1.0,   // 动画速度（0.5-3.0）
      opacity: 0.8,          // 图层透明度（0.1-1.0）
      particleSize: 2        // 粒子大小（1-5）
    },
    // 基础图层类型（默认OpenStreetMap）
    baseLayer: 'osm' // osm/satellite/terrain
  }),
  actions: {
    // 设置Viewer实例
    setViewer(viewer) {
      this.viewer = viewer
    },
    setModelLoadProgress(progress) {
      this.modelLoadProgress = progress;
    },
    // 更新相机位置
    updateCameraPosition(position) {
      if (position) {

        this.cameraPosition = position
      }
    },
    // 设置图层可见性（同步更新Cesium图层）
    setLayerVisibility(layer, visible) {
      if (Object.keys(this.layerVisibility).includes(layer)) {
        this.layerVisibility[layer] = visible
        // 如果Viewer已初始化，同步修改图层显示状态
        if (this.viewer?.imageryLayers) {
          const targetLayer = this.viewer.imageryLayers._layers.find(
            item => item.name === layer
          )
          if (targetLayer) targetLayer.show = visible
        }
      }
    },
    // 更新可视化参数
    updateVisualizationParams(params) {
      this.visualizationParams = { ...this.visualizationParams, ...params }
      // 这里可扩展：参数变化时实时更新Cesium可视化效果
    },
    // 设置基础图层类型
    setBaseLayer(layerType) {
      const validTypes = ['osm', 'satellite', 'terrain']
      if (validTypes.includes(layerType)) {
        this.baseLayer = layerType
        // 这里可扩展：切换基础地图图层逻辑
      }
    },
    // 销毁Viewer实例（页面卸载时调用）
    destroyViewer() {
      if (this.viewer) {
        this.viewer.destroy()
        this.viewer = null
        this.cameraPosition = null
      }
    }
  }
})