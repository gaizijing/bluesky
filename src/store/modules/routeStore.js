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
        segmentData: route.segmentData
      }
      this.currentRoute = {...route}
      this.renderedRouteId = route.id
    },
    // 把列表的segmentData转成Cesium的waypoints（关键转换）
    convertSegmentsToWaypoints(segmentData) {
      // 示例：生成模拟经纬度（替换成你的真实经纬度！）
      // 真实场景中，segmentData应该包含每段的起点/终点经纬度
      const baseLng = 120.0 + Math.random() * 1.0 // 基础经度
      const baseLat = 36.0 + Math.random() * 1.0  // 基础纬度
      return segmentData.map((seg, index) => ({
        longitude: baseLng + index * 0.1,
        latitude: baseLat + index * 0.05,
        height: 1000 + index * 50 // 高度
      }))
    },
    // 清空当前航线
    clearCurrentRoute() {
      this.currentRoute = null
      this.renderedRouteId = ''
    }
  }
})