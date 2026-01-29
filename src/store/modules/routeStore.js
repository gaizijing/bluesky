import { defineStore } from 'pinia'

export const useRouteStore = defineStore('route', {
  state: () => ({
    // 航线列表数据
    routeList: [],
    // 当前选中的航线（供地图渲染）
    currentRoute: null,
    // 地图上已渲染的航线ID（避免重复渲染）
    renderedRouteId: ''
  }),
  actions: {
    // 设置选中航线（列表点击时调用）
    setCurrentRoute(route) {
      // 转换列表航线数据为Cesium需要的格式
      const cesiumRoute = {
        id: route.id,
        name: route.name,
        // 航点：从segmentData提取首尾坐标（如果列表有经纬度，替换成真实值）
        waypoints: this.convertSegmentsToWaypoints(route.segmentData),
        // 每段危险指数
        dangers: route.segmentData.map(seg => seg.risk * 10), // 转成0-10的范围
        duration: 60, // 飞机飞完全程的时间（秒）
        info: {
          length: route.length,
          segments: route.segments,
          averageRisk: route.averageRisk,
          highestRisk: route.highestRisk,
          highestRiskSegment: route.highestRiskSegment
        },
        // 保留原始segmentData，用于绘制曲线路径
        segmentData: route.segmentData,
        // 添加时间信息
        startTime: route.startTime,
        endTime: route.endTime
      }
      this.currentRoute = {...route}
      // 确保currentRoute包含正确的waypoints（带有数字类型的经纬度）
      this.currentRoute.waypoints = cesiumRoute.waypoints
      // 确保currentRoute包含时间信息
      this.currentRoute.startTime = route.startTime
      this.currentRoute.endTime = route.endTime
      this.renderedRouteId = route.id
    },
    // 把列表的segmentData转成Cesium的waypoints（关键转换）
    convertSegmentsToWaypoints(segmentData) {
      // 从segmentData中提取真实的经纬度信息
      if (!segmentData || segmentData.length === 0) {
        return [];
      }
      
      // 使用segmentData中的真实坐标
      const waypoints = [];
      
      // 添加第一个航段的起点
      const firstSegment = segmentData[0];
      waypoints.push({
        longitude: firstSegment.startCoordinates[0],
        latitude: firstSegment.startCoordinates[1],
        height: 300 // 默认高度
      });
      
      // 添加所有航段的终点
      segmentData.forEach((seg, index) => {
        waypoints.push({
          longitude: seg.endCoordinates[0],
          latitude: seg.endCoordinates[1],
          height: 300 // 默认高度
        });
      });
      
      return waypoints;
    },
    // 清空当前航线
    clearCurrentRoute() {
      this.currentRoute = null
      this.renderedRouteId = ''
    }
  }
})