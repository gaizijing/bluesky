import { defineStore } from 'pinia';

export const useAreaStore = defineStore('areaList', {
  state: () => ({
    selectedArea: null,
    areaList: [], // 新增重点关注区域列表
  }),
  
  actions: {
    setSelectedArea(area) {
      this.selectedArea = area;
    },
    
    setAreaList(areas) {
      this.areaList = areas;
      // 如果还没有选中区域，且列表不为空，则默认选中第一个起降点
      if (!this.selectedArea && areas && areas.length > 0) { 
        const firstTakeoffArea = areas.find(point => point.type === 'takeoff');
        if (firstTakeoffArea) {
          this.setSelectedArea(firstTakeoffArea); 
        } else {
          // 如果没有起降点，则选中第一个点
          this.setSelectedArea(areas[0]);
        }
      }
    },
    
    clearSelectedArea() {
      this.selectedArea = null;
    },
    
    clearAreaList() {
      this.areaList = [];
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