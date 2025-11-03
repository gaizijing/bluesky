// src/store/modules/region.js
import { defineStore } from 'pinia';

export const useRegionStore = defineStore('region', {
  state: () => ({
    selectedRegion: null, // 当前选中的区域
    selectedRegionIndex: -1, // 当前选中的区域索引
  }),
  
  actions: {
    setSelectedRegion(region, index) {
      this.selectedRegion = region;
      this.selectedRegionIndex = index;
    },
    
    clearSelectedRegion() {
      this.selectedRegion = null;
      this.selectedRegionIndex = -1;
    }
  }
});