import { defineStore } from 'pinia'
import { getActiveAircraftModels, getAllAircraftModels } from '@/api'

export const useAircraftStore = defineStore('aircraft', {
  state: () => ({
    // 所有飞行器模型
    allModels: [],
    // 启用的飞行器模型
    activeModels: [],
    // 加载状态
    loading: false,
    // 错误信息
    error: null
  }),
  actions: {
    // 获取所有飞行器模型（带缓存）
    async fetchAllAircraftModels() {
      if (this.allModels.length > 0) {
        return this.allModels
      }
      
      this.loading = true
      this.error = null
      
      try {
        const data = await getAllAircraftModels()
        this.allModels = data
        return data
      } catch (error) {
        this.error = error.message
        console.error('获取飞行器模型列表失败:', error)
        return []
      } finally {
        this.loading = false
      }
    },
    
    // 获取启用的飞行器模型（带缓存）
    async fetchActiveAircraftModels() {
      if (this.activeModels.length > 0) {
        return this.activeModels
      }
      
      this.loading = true
      this.error = null
      
      try {
        const data = await getActiveAircraftModels()
        this.activeModels = data
        return data
      } catch (error) {
        this.error = error.message
        console.error('获取启用的飞行器模型失败:', error)
        return []
      } finally {
        this.loading = false
      }
    },
    
    // 刷新所有飞行器模型
    async refreshAllAircraftModels() {
      this.loading = true
      this.error = null
      
      try {
        const data = await getAllAircraftModels()
        this.allModels = data
        return data
      } catch (error) {
        this.error = error.message
        console.error('刷新飞行器模型列表失败:', error)
        return []
      } finally {
        this.loading = false
      }
    },
    
    // 刷新启用的飞行器模型
    async refreshActiveAircraftModels() {
      this.loading = true
      this.error = null
      
      try {
        const data = await getActiveAircraftModels()
        this.activeModels = data
        return data
      } catch (error) {
        this.error = error.message
        console.error('刷新启用的飞行器模型失败:', error)
        return []
      } finally {
        this.loading = false
      }
    },
    
    // 清空缓存
    clearCache() {
      this.allModels = []
      this.activeModels = []
      this.error = null
    }
  }
})
