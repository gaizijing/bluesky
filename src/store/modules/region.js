import { defineStore } from 'pinia';
import { getRegionConfig } from '@/api';

export const useRegionStore = defineStore('region', {
  state: () => ({
    regionConfig: null,
    isLoading: false,
    error: null
  }),

  getters: {
    getRegionName: (state) => {
      if (!state.regionConfig) {
        throw new Error('地区配置未获取');
      }
      return state.regionConfig.defaultName;
    },
    getRegionBounds: (state) => {
    
      return state.regionConfig.bounds;
    },
    getRegionCenter: (state) => {
      if (!state.regionConfig || !state.regionConfig.bounds) {
        throw new Error('地区配置未获取或边界信息缺失');
      }
      const bounds = state.regionConfig.bounds;
      return [
        (bounds.west + bounds.east) / 2,
        (bounds.south + bounds.north) / 2
      ];
    }
  },

  actions: {
    async fetchRegionConfig() {
      // 如果已经有配置且不是正在加载中，直接返回缓存的配置
      if (this.regionConfig && !this.isLoading) {
        return this.regionConfig;
      }
      
      this.isLoading = true;
      this.error = null;
      try {
        const data = await getRegionConfig();
        this.regionConfig = data;
        console.log(11111111111111, data);
        
        return data;
      } catch (error) {
        this.error = error.message;
        console.error('获取地区配置失败:', error);
        // 移除降级方案，直接抛出错误
        throw error;
      } finally {
        this.isLoading = false;
      }
    }
  }
});
