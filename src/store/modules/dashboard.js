// src/store/modules/dashboard.js
import { defineStore } from 'pinia'
import { DASHBOARD_MODULES } from '@/config/constants.js'

export const useDashboardStore = defineStore('dashboard', {
  state: () => ({
    currentModule: DASHBOARD_MODULES.LANDING_MONITOR
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