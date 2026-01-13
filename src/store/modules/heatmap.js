import { defineStore } from 'pinia'

export const useHeatmapStore = defineStore('heatmap', {
  state: () => ({
    heatmapData: null,
     // 热力图图层实例（全局唯一）
    heatmapLayer: null,
  }), 
  actions: {
    setHeatmapData(heatmapData) {
      this.heatmapData = heatmapData;
    },
       setHeatmapLayer(heatmapLayer) {
      this.heatmapLayer = heatmapLayer
    }
  }
})
