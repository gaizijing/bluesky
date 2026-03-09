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
    // 设置航线列表
    setRouteList(routes) {
      this.routeList = routes
    },
    // 添加航线到列表
    addRoute(route) {
      this.routeList.push(route)
    },
    // 清空航线列表
    clearRouteList() {
      this.routeList = []
    },
    // 设置选中航线（列表点击时调用）
    setCurrentRoute(route) {
          const [startName, endName] = route.name.split("-");

        // 转换列表航线数据为Cesium需要的格式
        this.currentRoute  = {
          id: route.id,
          name: route.name,
          // 航点：从segmentData提取首尾坐标（如果列表有经纬度，替换成真实值）
          waypoints: this.convertSegmentsToWaypoints(route.segmentData || []),
          // 每段危险指数 - 安全处理
          dangers: Array.isArray(route.segmentData) 
            ? route.segmentData.map(seg => {
                const risk = seg && typeof seg.risk === 'number' ? seg.risk : 0.5;
                return risk * 10;
              }) 
            : [],
          duration: 60, // 飞机飞完全程的时间（秒）
          info: {
            length: route.length || 0,
            segments: route.segments || 0,
            averageRisk: route.averageRisk || 0,
            highestRisk: route.highestRisk || 0,
            highestRiskSegment: route.highestRiskSegment || 0
          },
          // 保留原始segmentData，用于绘制曲线路径
          segmentData: route.segmentData || [],
          // 添加时间信息
          startTime: route.startTime,
          endTime: route.endTime,
          length:1,startName:startName,endName:endName
        }
        
        this.renderedRouteId = route.id;
        
        console.log('成功设置当前航线:', route.id, route.name);
       
    },
    // 把列表的segmentData转成Cesium的waypoints（关键转换）
    convertSegmentsToWaypoints(segmentData) {
      try {
        // 从segmentData中提取真实的经纬度信息
        if (!Array.isArray(segmentData) || segmentData.length === 0) {
          console.warn('segmentData为空或不是数组，返回默认航点');
          // 返回青岛附近的默认航点
          return [
            { longitude: 120.3844, latitude: 36.1052, height: 300 },
            { longitude: 120.4844, latitude: 36.2052, height: 300 }
          ];
        }
        
        // 使用segmentData中的真实坐标
        const waypoints = [];
        
        // 添加第一个航段的起点
        const firstSegment = segmentData[0];
        if (firstSegment && firstSegment.startCoordinates && 
            Array.isArray(firstSegment.startCoordinates) && 
            firstSegment.startCoordinates.length >= 2) {
          waypoints.push({
            longitude: Number(firstSegment.startCoordinates[0]) || 120.3844,
            latitude: Number(firstSegment.startCoordinates[1]) || 36.1052,
            height: 300 // 默认高度
          });
        } else {
          // 如果第一个航段数据不完整，使用默认值
          waypoints.push({ longitude: 120.3844, latitude: 36.1052, height: 300 });
        }
        
        // 添加所有航段的终点
        segmentData.forEach((seg, index) => {
          if (seg && seg.endCoordinates && 
              Array.isArray(seg.endCoordinates) && 
              seg.endCoordinates.length >= 2) {
            waypoints.push({
              longitude: Number(seg.endCoordinates[0]) || 120.3844 + (index + 1) * 0.1,
              latitude: Number(seg.endCoordinates[1]) || 36.1052 + (index + 1) * 0.1,
              height: 300 // 默认高度
            });
          } else if (seg && seg.startCoordinates && 
                     Array.isArray(seg.startCoordinates) && 
                     seg.startCoordinates.length >= 2) {
            // 如果没有终点坐标，使用起点坐标加上偏移
            waypoints.push({
              longitude: (Number(seg.startCoordinates[0]) || 120.3844) + (index + 1) * 0.1,
              latitude: (Number(seg.startCoordinates[1]) || 36.1052) + (index + 1) * 0.1,
              height: 300
            });
          } else {
            // 如果数据完全无效，使用默认值
            waypoints.push({ 
              longitude: 120.3844 + (index + 1) * 0.1, 
              latitude: 36.1052 + (index + 1) * 0.1, 
              height: 300 
            });
          }
        });
        
        console.log('转换后的waypoints:', waypoints);
        return waypoints;
      } catch (error) {
        console.error('转换waypoints失败:', error);
        // 返回默认航点
        return [
          { longitude: 120.3844, latitude: 36.1052, height: 300 },
          { longitude: 120.4844, latitude: 36.2052, height: 300 }
        ];
      }
    },
    // 清空当前航线
    clearCurrentRoute() {
      this.currentRoute = null
      this.renderedRouteId = ''
    }
  }
})