import { defineStore } from 'pinia'
import { thresholdService } from '@/services/thresholdService'
import { extractList, extractRecord } from '@/utils/admin'

// 阈值管理Store
export const useThresholdsStore = defineStore('thresholds', {
  state: () => ({
    // 阈值列表
    thresholdList: [],
    // 当前选中的阈值配置
    currentThreshold: null,
    // 默认阈值配置
    defaultThreshold: null,
    // 加载状态
    loading: false,
    // 错误信息
    error: null
  }),

  getters: {
    // 获取适飞分析阈值
    aircraftSuitabilityThresholds: (state) => {
      if (state.currentThreshold) {
        return {
          windSpeed: state.currentThreshold.maxWindSpeed,
          windShear: state.currentThreshold.maxWindShear,
          visibility: state.currentThreshold.minVisibility,
          humidity: state.currentThreshold.maxHumidity,
          temperatureMin: state.currentThreshold.tempMin,
          temperatureMax: state.currentThreshold.tempMax,
          precipitation: state.currentThreshold.maxPrecipitation,
          cloudBase: state.currentThreshold.minCloudBase,
          turbulenceLevel: state.currentThreshold.maxTurbulenceLevel
        }
      }
      // 如果没有选中的阈值，返回默认值
      return {
        windSpeed: 8.0,
        windShear: 5.0,
        visibility: 4.0,
        humidity: 90,
        temperatureMin: -15,
        temperatureMax: 50,
        precipitation: 5,
        cloudBase: 100,
        turbulenceLevel: '中度'
      }
    },

    // 获取默认阈值
    getDefaultThreshold: (state) => state.defaultThreshold
  },

  actions: {
    // 获取所有阈值配置
    async fetchAllThresholds() {
      this.loading = true
      this.error = null
      try {
        const response = await thresholdService.getAllThresholds()
        const list = extractList(response)
        const record = extractRecord(response)

        this.thresholdList = list.length ? list : (record ? [record] : [])
        // 如果当前没有选中的阈值，选择第一个
        if (!this.currentThreshold && this.thresholdList.length > 0) {
          this.currentThreshold = this.thresholdList[0]
        }
      } catch (error) {
        this.error = '获取阈值配置失败'
        console.error('获取阈值配置失败:', error)
      } finally {
        this.loading = false
      }
    },

    // 根据飞行器ID获取阈值配置
    async fetchThresholdByAircraftId(aircraftId) {
      this.loading = true
      this.error = null
      try {
        const response = await thresholdService.getThresholdByAircraftId(aircraftId)
        const record = extractRecord(response)

        if (record) {
          this.currentThreshold = record

          const existingIndex = this.thresholdList.findIndex((item) => item.id === record.id)
          if (existingIndex === -1) {
            this.thresholdList = [record, ...this.thresholdList]
          } else {
            this.thresholdList.splice(existingIndex, 1, record)
          }
        }
      } catch (error) {
        this.error = '获取飞行器阈值配置失败'
        console.error('获取飞行器阈值配置失败:', error)
      } finally {
        this.loading = false
      }
    },

    // 获取默认阈值配置
    async fetchDefaultThreshold() {
      this.loading = true
      this.error = null
      try {
        const response = await thresholdService.getDefaultThreshold()
        const record = extractRecord(response)

        if (record) {
          this.defaultThreshold = record
          // 如果当前没有选中的阈值，使用默认阈值
          if (!this.currentThreshold) {
            this.currentThreshold = record
          }
        }
      } catch (error) {
        this.error = '获取默认阈值配置失败'
        console.error('获取默认阈值配置失败:', error)
      } finally {
        this.loading = false
      }
    },

    // 添加阈值配置
    async addThreshold(thresholdData) {
      this.loading = true
      this.error = null
      try {
        const response = await thresholdService.addThreshold(thresholdData)
        const createdRecord = extractRecord(response) || thresholdData
        // 重新获取阈值列表
        await this.fetchAllThresholds()
        return createdRecord
      } catch (error) {
        this.error = '添加阈值配置失败'
        console.error('添加阈值配置失败:', error)
        throw error
      } finally {
        this.loading = false
      }
    },

    // 更新阈值配置
    async updateThreshold(thresholdData) {
      this.loading = true
      this.error = null
      try {
        const response = await thresholdService.updateThreshold(thresholdData)
        const updatedRecord = extractRecord(response) || thresholdData
        // 重新获取阈值列表
        await this.fetchAllThresholds()
        // 更新当前选中的阈值
        if (this.currentThreshold && this.currentThreshold.id === thresholdData.id) {
          this.currentThreshold = updatedRecord
        }
        return updatedRecord
      } catch (error) {
        this.error = '更新阈值配置失败'
        console.error('更新阈值配置失败:', error)
        throw error
      } finally {
        this.loading = false
      }
    },

    // 删除阈值配置
    async deleteThreshold(id) {
      this.loading = true
      this.error = null
      try {
        await thresholdService.deleteThreshold(id)
        // 重新获取阈值列表
        await this.fetchAllThresholds()
        // 如果删除的是当前选中的阈值，重置为第一个或默认阈值
        if (this.currentThreshold && this.currentThreshold.id === id) {
          this.currentThreshold = this.thresholdList.length > 0 ? this.thresholdList[0] : this.defaultThreshold
        }
      } catch (error) {
        this.error = '删除阈值配置失败'
        console.error('删除阈值配置失败:', error)
        throw error
      } finally {
        this.loading = false
      }
    },

    // 选择阈值配置
    selectThreshold(threshold) {
      this.currentThreshold = threshold
    },

    // 初始化阈值数据
    async initializeThresholds() {
      // 先获取默认阈值
      await this.fetchDefaultThreshold()
      // 再获取所有阈值
      await this.fetchAllThresholds()
    }
  }
})
