import { defineStore } from 'pinia'

export const useWindStore = defineStore('wind', {
  state: () => ({
    indicator: 'speed', // 当前选中指标
    windData: [],       // 当前风场数据（后续接接口）
  }),
  actions: {
    setIndicator(name) {
      this.indicator = name
    },
    async fetchData() {
      // 模拟数据（真实情况调用接口）
      const points = Array.from({ length: 200 }).map(() => ({
        lng: 116.3 + Math.random() * 0.6,
        lat: 39.8 + Math.random() * 0.4,
        speed: Math.random() * 15,
        dir: Math.random() * 360,
        vorticity: Math.random() * 2 - 1,
        temp: 20 + Math.random() * 10,
        turb: Math.random(),
      }))
      this.windData = points
    }
  }
})
