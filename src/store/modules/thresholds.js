import { defineStore } from 'pinia'
import { getStorage, setStorage } from '@/utils/storageUtils'

// 阈值管理Store
export const useThresholdsStore = defineStore('thresholds', {
  state: () => ({
    // 阈值设置
    thresholds: {
      // 适飞分析阈值
      windSpeed: 10.0, // 风速阈值(m/s)
      windShear: 5.0, // 风切变阈值(m/s/100m)
      turbulenceIndex: 50, // 颠簸指数阈值
      visibility: 1.0, // 能见度阈值(km)
      humidity: 90, // 湿度阈值(%)
      // 风险预警阈值
      warningThreshold: 30, // 预警触发阈值(%)
      severeWarningThreshold: 70 // 严重预警阈值(%)
    }
  }),

  getters: {
    // 获取适飞分析阈值
    aircraftSuitabilityThresholds: (state) => ({
      windSpeed: state.thresholds.windSpeed,
      windShear: state.thresholds.windShear,
      turbulenceIndex: state.thresholds.turbulenceIndex,
      visibility: state.thresholds.visibility,
      humidity: state.thresholds.humidity
    }),

    // 获取风险预警阈值
    riskWarningThresholds: (state) => ({
      warningThreshold: state.thresholds.warningThreshold,
      severeWarningThreshold: state.thresholds.severeWarningThreshold
    })
  },

  actions: {
    // 更新阈值设置
    updateThresholdSettings(newThresholds) {
      this.thresholds = { ...this.thresholds, ...newThresholds }
      this.saveThresholdsToStorage()
    },

    // 重置阈值到默认值
    resetThresholds() {
      this.thresholds = {
        windSpeed: 10.0,
        windShear: 5.0,
        turbulenceIndex: 50,
        visibility: 1.0,
        humidity: 90,
        warningThreshold: 30,
        severeWarningThreshold: 70
      }
      this.saveThresholdsToStorage()
    },

    // 保存阈值到本地存储
    saveThresholdsToStorage() {
      setStorage('thresholds', this.thresholds)
    },

    // 从本地存储加载阈值
    loadThresholdsFromStorage() {
      const savedThresholds = getStorage('thresholds')
      if (savedThresholds) {
        this.thresholds = { ...this.thresholds, ...savedThresholds }
      }
    },

    // 初始化阈值数据
    initializeThresholds() {
      this.loadThresholdsFromStorage()
    }
  }
})