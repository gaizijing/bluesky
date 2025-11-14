import { has } from 'lodash';
import { defineStore } from 'pinia';

export const useMonitoringPointStore = defineStore('monitoringPoint', {
  state: () => ({
    selectedPoint: null,
    pointsList: [], // 新增监测点列表
  }),
  
  actions: {
    setSelectedPoint(point) {
      this.selectedPoint = point;
    },
    
    setPointsList(points) {
      this.pointsList = points;
      // 如果还没有选中点，且列表不为空，则默认选中第一个起降点
      if (!this.selectedPoint && points && points.length > 0) {
        const firstTakeoffPoint = points.find(point => point.type === 'takeoff');
        if (firstTakeoffPoint) {
          this.setSelectedPoint(firstTakeoffPoint);
        } else {
          // 如果没有起降点，则选中第一个点
          this.setSelectedPoint(points[0]);
        }
      }
    },
    
    clearSelectedPoint() {
      this.selectedPoint = null;
    },
    
    clearPointsList() {
      this.pointsList = [];
    }
  },
  
  getters: {
    hasPointsList: (state) => state.pointsList.length!==0,
    hasSelectedPoint: (state) => !!state.selectedPoint,
    selectedPointName: (state) => state.selectedPoint?.name || '',
    takeoffPoints: (state) => state.pointsList.filter(point => point.type === 'takeoff'),
    operationPoints: (state) => state.pointsList.filter(point => point.type === 'operation')
  }
});