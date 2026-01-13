// src/store/modules/dashboard.js
import { defineStore } from 'pinia'
import { DASHBOARD_MODULES } from '@/config/constants.js'
import { useDashboardWeatherStore } from './dashboardWeather'

export const useModuleStore = defineStore('module', {
  state: () => ({
    currentModule: "",
    // 模块状态管理
    moduleStates: {
      [DASHBOARD_MODULES.FLIGHT_ANALYSIS]: {
        loading: false,
        error: null,
        lastUpdated: null
      },
      [DASHBOARD_MODULES.DEVICE_MONITOR]: {
        loading: false,
        error: null,
        lastUpdated: null
      },
      [DASHBOARD_MODULES.LANDING_MONITOR]: {
        loading: false,
        error: null,
        lastUpdated: null
      }
    }
  }),
  
  getters: {
    // 获取当前模块状态
    currentModuleState: (state) => {
      return state.moduleStates[state.currentModule] || null
    },
    // 获取模块加载状态
    isModuleLoading: (state) => (moduleKey) => {
      return state.moduleStates[moduleKey]?.loading || false
    },
    // 获取模块错误信息
    getModuleError: (state) => (moduleKey) => {
      return state.moduleStates[moduleKey]?.error || null
    }
  },
  
  actions: {
    switchModule(moduleKey) {
      this.currentModule = moduleKey
    },
    
    
    // 设置模块加载状态
    setModuleLoading(moduleKey, loading) {
      if (this.moduleStates[moduleKey]) {
        this.moduleStates[moduleKey].loading = loading
        if (loading) {
          this.moduleStates[moduleKey].error = null
        }
      }
    },
    
    // 设置模块错误信息
    setModuleError(moduleKey, error) {
      if (this.moduleStates[moduleKey]) {
        this.moduleStates[moduleKey].error = error
        this.moduleStates[moduleKey].loading = false
      }
    },
    
    // 更新模块最后更新时间
    updateModuleTimestamp(moduleKey) {
      if (this.moduleStates[moduleKey]) {
        this.moduleStates[moduleKey].lastUpdated = new Date().toISOString()
      }
    },

    
  }
})