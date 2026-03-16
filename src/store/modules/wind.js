import { defineStore } from 'pinia'

export const useWindStore = defineStore('wind', {
  state: () => ({
    windData: null,
    // 风场图层实例（全局唯一）
    windLayer: null,
  }),
  actions: {
    setWindData(windData) {
      this.windData = windData;
    },
    setWindLayer(windLayer) {
      this.windLayer = windLayer
    }
  }
})
