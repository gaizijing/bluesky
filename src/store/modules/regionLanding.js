import { defineStore } from 'pinia';
import { fetchLandingPoints } from '@/api';
import { useRegionStore } from '@/store/modules/region';

let landingLoadPromise = null;
let landingLoadRegionId = null;

const convertStatusToChinese = (status) => {
  const map = {
    available: '正常',
    warning: '维护中',
    unavailable: '故障',
  };
  return map[status] || status;
};

export const useRegionLandingStore = defineStore('regionLanding', {
  state: () => ({
    selectedLandingPoint: null,
    landingPoints: [],
    loadedRegionId: null,
  }),

  getters: {
    hasLandingPoints: (state) => state.landingPoints.length > 0,
    hasSelectedLandingPoint: (state) => !!state.selectedLandingPoint,
    selectedLandingPointName: (state) => state.selectedLandingPoint?.name || '',
    takeoffAreas: (state) => state.landingPoints.filter((item) => item.type === 'takeoff'),
    operationAreas: (state) => state.landingPoints.filter((item) => item.type === 'operation'),
    // 兼容旧 area store 命名
    selectedArea: (state) => state.selectedLandingPoint,
    areaList: (state) => state.landingPoints,
    areaPointsList: (state) => state.landingPoints.map((item) => ({
      ...item,
      status: convertStatusToChinese(item.status),
    })),
    hasAreaList: (state) => state.landingPoints.length > 0,
    hasSelectedArea: (state) => !!state.selectedLandingPoint,
    selectedAreaName: (state) => state.selectedLandingPoint?.name || '',
  },

  actions: {
    setSelectedLandingPoint(point) {
      this.selectedLandingPoint = point;
    },

    setLandingPoints(points) {
      this.landingPoints = points || [];
      if (!this.selectedLandingPoint && this.landingPoints.length > 0) {
        this.setSelectedLandingPoint(this.landingPoints[0]);
      }
    },

    async ensureLandingPoints(regionId, { force = false } = {}) {
      const regionStore = useRegionStore();
      let rid = typeof regionId === 'string' ? regionId.trim() : regionId;
      if (!rid) {
        rid = regionStore.regionId;
      }
      if (!rid) {
        await regionStore.fetchRegionConfig();
        rid = regionStore.regionId;
      }
      if (!rid) {
        throw new Error('尚未选择区域，无法加载起降点');
      }

      if (!force && this.loadedRegionId === rid && this.landingPoints.length) {
        return this.landingPoints;
      }

      if (!force && landingLoadPromise && landingLoadRegionId === rid) {
        return landingLoadPromise;
      }

      landingLoadRegionId = rid;
      landingLoadPromise = (async () => {
        const points = await fetchLandingPoints(rid);
        this.setLandingPoints(points);
        this.loadedRegionId = rid;
        return points;
      })();

      try {
        return await landingLoadPromise;
      } finally {
        landingLoadPromise = null;
      }
    },

    async loadLandingPoints(regionId) {
      return this.ensureLandingPoints(regionId, { force: false });
    },

    selectLandingPoint(point) {
      this.setSelectedLandingPoint(point);
    },

    clearLandingPoints() {
      this.landingPoints = [];
      this.selectedLandingPoint = null;
      this.loadedRegionId = null;
      landingLoadPromise = null;
      landingLoadRegionId = null;
    },

    // 兼容旧 area store API
    setSelectedArea(area) {
      this.setSelectedLandingPoint(area);
    },
    setAreaList(areas) {
      this.setLandingPoints(areas);
    },
    setAreaPointsList(areas) {
      this.setLandingPoints(areas);
    },
    clearSelectedArea() {
      this.selectedLandingPoint = null;
    },
    clearAreaList() {
      this.clearLandingPoints();
    },
  },
});

export const useAreaStore = useRegionLandingStore;
