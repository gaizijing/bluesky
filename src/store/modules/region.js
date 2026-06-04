import { defineStore } from 'pinia';
import { fetchDefaultRegion, fetchRegions, getRegionConfigById, setCurrentRegionId } from '@/api';
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
    /** V1 白膜：仅 3D Tileset（tileset.json）；优先 DB/API 的 modelUrl，否则按 regionId 映射静态资源 */
    getModelUrl: (state) => {
      const fromApi = state.regionConfig?.modelUrl;
      if (typeof fromApi === 'string' && fromApi.trim()) {
        return fromApi.trim();
      }
      const rid = state.regionId || state.regionConfig?.regionId;
      if (rid === 'R1') return '/cesium/model/tianjin/tileset.json';
      if (rid === 'R2') return '/cesium/model/qingdaoshi/tileset.json';
      return null;
    },
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
        this.error = error?.message || '获取 Region 配置失败';
        console.warn('获取 Region 配置失败:', error);
        throw error;
      } finally {
        this.isLoading = false;
      }
    },

    async switchRegion(regionId) {
      await setCurrentRegionId(regionId);
      this.setRegionId(regionId);
      let region = this.regions.find((item) => (item.regionId || item.id) === regionId);
      if (!region) {
        try {
          region = await getRegionConfigById(regionId);
        } catch (err) {
          console.warn('[region] 按 id 拉取区域失败，回退默认区域', regionId, err);
          region = await fetchDefaultRegion();
        }
      }
      this.applyRegionVo(region);
    },
  },
});
