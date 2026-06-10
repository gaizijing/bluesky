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
    /** 由 boundary GeoJSON 解析的包络，仅地图内部使用 */
    boundaryEnvelope: null,
    isLoading: false,
    error: null,
  };
  },

  getters: {
    getModelUrl: (state) => {
      const fromApi = state.regionConfig?.modelUrl;
      if (typeof fromApi === 'string' && fromApi.trim()) {
        return fromApi.trim();
      }
      return null;
    },
    getRegionName: (state) => state.regionConfig?.defaultName || state.regionConfig?.name || '',
    getMapLift: (state) => state.regionConfig?.mapLift,
    getRegionCenter: (state) => {
      const cfg = state.regionConfig;
      if (!cfg) return null;
      if (cfg.centerLng != null && cfg.centerLat != null) {
        return [cfg.centerLng, cfg.centerLat];
      }
      const lift = cfg.mapLift;
      if (lift?.longitude != null && lift?.latitude != null) {
        return [Number(lift.longitude), Number(lift.latitude)];
      }
      return null;
    },
    getBoundaryUrl: (state) => state.regionConfig?.boundaryUrl || null,
  },

  actions: {
    setRegionId(regionId) {
      this.regionId = regionId;
      setStorage(REGION_ID_KEY, regionId);
    },

    setBoundaryEnvelope(envelope) {
      this.boundaryEnvelope = envelope;
    },

    applyRegionVo(region) {
      if (!region) return null;
      const config = {
        regionId: region.regionId || region.id,
        defaultName: region.name,
        name: region.name,
        modelUrl: region.modelUrl,
        mapLift: region.mapLift,
        boundaryUrl: region.boundaryUrl,
        adcode: region.adcode,
        centerLng: region.centerLng,
        centerLat: region.centerLat,
      };
      this.regionConfig = config;
      this.boundaryEnvelope = null;
      if (config.regionId) {
        this.setRegionId(config.regionId);
      }
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
