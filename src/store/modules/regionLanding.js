import { defineStore } from 'pinia';
import { fetchLandingPoints } from '@/api';
import { useRegionStore } from '@/store/modules/region';

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

    async loadLandingPoints(regionId) {
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
      const points = await fetchLandingPoints(rid);
      this.setLandingPoints(points);
      return points;
    },

    selectLandingPoint(point) {
      this.setSelectedLandingPoint(point);
    },

    clearLandingPoints() {
      this.landingPoints = [];
      this.selectedLandingPoint = null;
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
