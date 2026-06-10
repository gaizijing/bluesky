import { defineStore } from 'pinia'
import { WIND_LAYER_DEFAULTS } from '@/config/windLayerDefaults'

/** 图层控制面板支持的图层（仅合并白名单内键，忽略历史 localStorage 中的废弃项如 isosurface） */
export const DEFAULT_LAYERS = {
  model: { visible: true, name: '3D模型' },
  wind: { visible: true, name: '风场图层' },
  cloud: { visible: false, name: '云雾图层' },
  areaPoints: { visible: true, name: '重点关注区域' }
}

const mergeLayerSettings = (savedLayers = {}) => {
  const merged = { ...DEFAULT_LAYERS }
  for (const key of Object.keys(DEFAULT_LAYERS)) {
    if (savedLayers[key]) {
      merged[key] = { ...merged[key], ...savedLayers[key] }
    }
  }
  return merged
}

/**
 * 图层设置Store
 * 管理地图图层的显示状态和配置参数
 */
export const useLayerSettingsStore = defineStore('layerSettings', {
  state: () => ({
    // 图层显示状态
    layers: { ...DEFAULT_LAYERS },
    show: false,

    // 风场配置参数 - 与WindLayerOptions接口完全匹配
    windOptions: {
      ...WIND_LAYER_DEFAULTS
    },

    // 本地存储键名
    STORAGE_KEY: 'layer_settings'
  }),

  getters: {
    // 获取所有图层配置
    allLayers: (state) => state.layers,

    // 获取风场配置
    currentWindOptions: (state) => state.windOptions,

    isShow: (state) => state.show,

  },

  actions: {
    setShow(value) {
      this.show = value
    },

    // 设置图层显示状态
    setLayerVisibility(layerKey, visible) {
      if (this.layers[layerKey] !== undefined) {
        this.layers[layerKey].visible = visible
      }
    },

    // 更新风场配置参数 - 支持部分更新
    updateWindOptions(options) {
      // 对于对象类型的属性进行合并而非替换
      const mergedOptions = { ...this.windOptions, ...options }

      // 特别处理lineWidth和lineLength等对象属性
      if (options.lineWidth) {
        mergedOptions.lineWidth = { ...this.windOptions.lineWidth, ...options.lineWidth }
      }

      if (options.lineLength) {
        mergedOptions.lineLength = { ...this.windOptions.lineLength, ...options.lineLength }
      }

      if (options.domain) {
        mergedOptions.domain = { ...this.windOptions.domain, ...options.domain }
      }

      if (options.displayRange) {
        mergedOptions.displayRange = { ...this.windOptions.displayRange, ...options.displayRange }
      }

      // 使用验证函数确保参数有效性
      this.windOptions =mergedOptions
    },

    // 重置风场配置到默认值
    resetWindOptions() {
      this.windOptions = {
        ...WIND_LAYER_DEFAULTS
      }
    },


    // 保存当前配置到本地存储
    saveSettingsToLocal() {
      try {
        localStorage.setItem(this.STORAGE_KEY, JSON.stringify({
          layers: this.layers,
          windOptions: this.windOptions
        }))
      } catch (error) {
        console.error('保存图层设置到本地存储失败:', error)
      }
    },

    // 从本地存储加载配置
    loadSettingsFromLocal() {
      try {
        const savedSettings = localStorage.getItem(this.STORAGE_KEY)
        if (savedSettings) {
          const { layers, windOptions } = JSON.parse(savedSettings)
          this.layers = mergeLayerSettings(layers)

          // 处理对象类型的配置合并
          const mergedWindOptions = { ...this.windOptions, ...windOptions }
          if (windOptions.lineWidth) {
            mergedWindOptions.lineWidth = { ...this.windOptions.lineWidth, ...windOptions.lineWidth }
          }
          if (windOptions.lineLength) {
            mergedWindOptions.lineLength = { ...this.windOptions.lineLength, ...windOptions.lineLength }
          }
          if (windOptions.displayRange) {
            mergedWindOptions.displayRange = { ...this.windOptions.displayRange, ...windOptions.displayRange }
          }
          if (windOptions.domain) {
            mergedWindOptions.domain = { ...this.windOptions.domain, ...windOptions.domain }
          }
          this.windOptions = mergedWindOptions
        }
      } catch (error) {
        console.error('从本地存储加载图层设置失败:', error)
      }
    },

  }
})