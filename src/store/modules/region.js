import { defineStore } from 'pinia';
import { fetchDefaultRegion, fetchRegions, setCurrentRegionId } from '@/api';
import { getStorage, setStorage } from '@/utils/storageUtils';

const REGION_ID_KEY = 'currentRegionId';

export const useRegionStore = defineStore('region', {
  state: () => {
    const legacy = typeof localStorage !== 'undefined' ? localStorage.getItem('v2_regionId') : null;
    const stored = getStorage(REGION_ID_KEY) || legacy;
    if (legacy && !getStorage(REGION_ID_KEY)) {
      setStorage(REGION_ID_KEY, legacy);
    }
    return {
    regionId: stored,
    regions: [],
    regionConfig: null,
    isLoading: false,
    error: null,
  };
  },

  getters: {
    getModelUrl: (state) => state.regionConfig?.modelUrl,
    getRegionName: (state) => state.regionConfig?.defaultName || state.regionConfig?.name || '',
    getRegionBounds: (state) => state.regionConfig?.bounds,
    getMapLift: (state) => state.regionConfig?.mapLift,
    getRegionCenter: (state) => {
      if (!state.regionConfig?.bounds) {
        return null;
      }
      const bounds = state.regionConfig.bounds;
      return [(bounds.west + bounds.east) / 2, (bounds.south + bounds.north) / 2];
    },
  },

  actions: {
    setRegionId(regionId) {
      this.regionId = regionId;
      setStorage(REGION_ID_KEY, regionId);
    },

    applyRegionVo(region) {
      if (!region) return null;
      const config = {
        regionId: region.regionId || region.id,
        defaultName: region.name,
        name: region.name,
        modelUrl: region.modelUrl,
        mapLift: region.mapLift,
        bounds: {
          west: region.west,
          east: region.east,
          south: region.south,
          north: region.north,
        },
      };
      this.regionConfig = config;
      if (config.regionId) {
        this.setRegionId(config.regionId);
      }
      console.log('[Dashboard/Camera] regionStore.applyRegionVo', {
        regionId: config.regionId,
        name: config.name,
        mapLift: config.mapLift,
        bounds: config.bounds,
      });
      return config;
    },

    async fetchRegions() {
      const data = await fetchRegions();
      this.regions = data;
      if (!this.regionId && data.length) {
        const def = data.find((item) => item.isDefault) || data[0];
        this.setRegionId(def.regionId || def.id);
      }
      return data;
    },

    async fetchRegionConfig() {
      this.isLoading = true;
      this.error = null;
      try {
        if (!this.regions.length) {
          await this.fetchRegions();
        }
        const data = await fetchDefaultRegion();
        return this.applyRegionVo(data);
      } catch (error) {
        this.error = error.message;
        console.error('获取 Region 配置失败:', error);
        throw error;
      } finally {
        this.isLoading = false;
      }
    },

    async switchRegion(regionId) {
      await setCurrentRegionId(regionId);
      this.setRegionId(regionId);
      const region = this.regions.find((item) => (item.regionId || item.id) === regionId)
        || await fetchDefaultRegion();
      this.applyRegionVo(region);
    },
  },
});
