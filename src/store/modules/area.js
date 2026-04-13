import { defineStore } from 'pinia';

// 状态值转换：英文 -> 中文
const convertStatusToChinese = (status) => {
  const map = {
    'available': '正常',
    'warning': '维护中',
    'unavailable': '故障'
  };
  return map[status] || status;
};

// 状态值转换：中文 -> 英文
const convertStatusToEnglish = (status) => {
  const map = {
    '正常': 'available',
    '维护中': 'warning',
    '故障': 'unavailable'
  };
  return map[status] || status;
};

export const useAreaStore = defineStore('areaList', {
  state: () => ({
    selectedArea: null,
    areaList: [], // 重点关注区域列表（用于地图显示）- 状态值为英文
    areaPointsList: [], // 重点关注区域列表（用于管理页面）- 状态值为中文
  }),

  actions: {
    setSelectedArea(area) {
      this.selectedArea = area;      
    },

    setAreaList(areas) {
      // 保持英文状态值（用于 AreaList 组件）
      this.areaList = areas;
      // 同步更新 areaPointsList（转换为中文状态值）
      this.areaPointsList = areas.map(area => ({
        ...area,
        status: convertStatusToChinese(area.status)
      }));
      // 如果还没有选中区域，且列表不为空，则默认选中第一个起降点
      if (!this.selectedArea && areas && areas.length > 0) {
          // 如果没有起降点，则选中第一个点
          this.setSelectedArea(areas[0]);
      }
    },

    setAreaPointsList(areas) {
      // 转换为中文状态值（用于管理页面）
      this.areaPointsList = areas.map(area => ({
        ...area,
        status: convertStatusToChinese(area.status)
      }));
      // 同步更新 areaList（保持英文）
      this.areaList = areas;
      // 如果还没有选中区域，且列表不为空，则默认选中第一个
      if (!this.selectedArea && areas && areas.length > 0) {
          this.setSelectedArea(areas[0]);
      }
    },

    clearSelectedArea() {
      this.selectedArea = null;
    },

    clearAreaList() {
      this.areaList = [];
      this.areaPointsList = [];
    }
  },

  getters: {
    hasAreaList: (state) => state.areaList.length!==0,
    hasSelectedArea: (state) => !!state.selectedArea,
    selectedAreaName: (state) => state.selectedArea?.name || '' ,
    takeoffAreas: (state) => state.areaList.filter(area => area.type === 'takeoff'),
    operationAreas: (state) => state.areaList.filter(area => area.type === 'operation')
  }
});