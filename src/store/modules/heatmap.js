import { defineStore } from 'pinia'

export const useHeatmapStore = defineStore('heatmap', {
  state: () => ({
    heatmapData: null,
    // 存储上一次的区域热力图数据，用于模式切换时快速恢复
    lastAreaHeatmapData: null,
    // 存储上一次区域数据对应的pointId
    lastAreaPointId: null,
    // 热力图图层实例（全局唯一）
    heatmapLayer: null,
    // 热力图显示模式：'area' - 区域热力图，'citywide' - 全市热力图
    heatmapMode: 'area',
    // 当前选中的区域ID（用于区域模式）
    currentPointId: null,
  }), 
  actions: {
    setHeatmapData(heatmapData) {
      this.heatmapData = heatmapData;
      // 如果当前是区域模式，存储数据到lastAreaHeatmapData
      if (this.heatmapMode === 'area') {
        this.lastAreaHeatmapData = heatmapData;
        this.lastAreaPointId = this.currentPointId;
        console.log('[热力图Store] 存储区域热力图数据，pointId:', this.currentPointId);
      }
    },
    setHeatmapLayer(heatmapLayer) {
      this.heatmapLayer = heatmapLayer
    },
    setHeatmapMode(mode) {
      // 在切换模式前，如果当前是区域模式，存储数据
      if (this.heatmapMode === 'area' && this.heatmapData) {
        this.lastAreaHeatmapData = this.heatmapData;
        console.log('[热力图Store] 存储区域热力图数据到lastAreaHeatmapData');
      }
      this.heatmapMode = mode;
    },
    setCurrentPointId(pointId) {
      this.currentPointId = pointId;
    },
    // 切换到全市热力图模式
    switchToCitywideMode() {
      // 切换前存储区域数据（通过setHeatmapMode实现）
      this.setHeatmapMode('citywide');
    },
    // 切换到区域热力图模式
    switchToAreaMode(pointId = null) {
      if (pointId) {
        this.currentPointId = pointId;
      }
      // 注意：不再直接设置heatmapData，数据加载由watch监听器处理
      this.setHeatmapMode('area');
    },
    // 清屏重置
    resetToDefault() {
      this.heatmapMode = 'area';
      // 不清除currentPointId，保持当前选中的区域
    }
  }
})
