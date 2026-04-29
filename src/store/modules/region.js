import { defineStore } from 'pinia';
import { getRegionConfig } from '@/api';

export const useRegionStore = defineStore('region', {
  state: () => ({
    regionConfig: null,
    isLoading: false,
    error: null
  }),

  getters: {
     // 添加 modelUrl getter
    getModelUrl: (state) => {

      return state.regionConfig.modelUrl ;
    },
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
      this.isLoading = true;
      this.error = null;
      try {
        const data = await getRegionConfig();
        this.regionConfig = data;        
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
