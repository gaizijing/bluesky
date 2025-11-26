// src/store/modules/dashboard.js
import { defineStore } from 'pinia'
import { DASHBOARD_MODULES } from '@/config/constants.js'

export const useDashboardStore = defineStore('dashboard', {
  state: () => ({
    //先隐藏所有模块只关注地图
    // currentModule: DASHBOARD_MODULES.LANDING_MONITOR
    currentModule:""
  }),
  
  actions: {
    switchModule(moduleKey) {
      this.currentModule = moduleKey
    },
    
    setCurrentModule(moduleKey) {
      this.currentModule = moduleKey
    }
  }
})