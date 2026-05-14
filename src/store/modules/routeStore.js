import { defineStore } from 'pinia'

export const useRouteStore = defineStore('route', {
  state: () => ({
    // 航线列表数据
    routeList: [],
    // 当前选中的航线（供地图渲染）
    currentRoute: null,
    // 地图上已渲染的航线ID（避免重复渲染）
    renderedRouteId: '',
    /** 会话规划航迹是否已在地图上展示（用于垂直剖面等 UI） */
    sessionPathOnMap: false,
    /** 用户已点击「生成预览」后才显示底部垂直剖面 */
    verticalProfileAfterPreview: false
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
        // 转换列表航线数据为Cesium需要的格式
        this.currentRoute  = route
        
        this.renderedRouteId = route?.id || '';
        this.sessionPathOnMap = !!(
          route &&
          route.mode === 'session' &&
          Array.isArray(route.pathSamples) &&
          route.pathSamples.length > 1
        );

        if (!this.sessionPathOnMap) {
          this.verticalProfileAfterPreview = false
        }

        console.log('成功设置当前航线:', route?.id, route?.name);
       
    },
    /** 航线预览表单点击「生成预览」成功后调用 */
    markVerticalProfileAfterPreview() {
      this.verticalProfileAfterPreview = true
    },
    // 把列表的segmentData转成Cesium的waypoints（关键转换）
    convertSegmentsToWaypoints(segmentData) {
      try {
        if (!Array.isArray(segmentData) || segmentData.length === 0) {
          return []
        }

        const parseCoordinatePair = (value) => {
          if (!Array.isArray(value) || value.length < 2) {
            return null
          }

          const longitude = Number(value[0])
          const latitude = Number(value[1])

          if (!Number.isFinite(longitude) || !Number.isFinite(latitude)) {
            return null
          }

          return {
            longitude,
            latitude,
            height: 300
          }
        }

        const waypoints = []
        const firstSegment = segmentData[0]
        const firstPoint = parseCoordinatePair(firstSegment?.startCoordinates)

        if (firstPoint) {
          waypoints.push(firstPoint)
        }

        segmentData.forEach((seg) => {
          const endPoint = parseCoordinatePair(seg?.endCoordinates)
          if (endPoint) {
            waypoints.push(endPoint)
          }
        })

        return waypoints.length >= 2 ? waypoints : []
      } catch (error) {
        console.error('转换waypoints失败:', error)
        return []
      }
    },
    // 清空当前航线
    clearCurrentRoute() {
      this.currentRoute = null
      this.renderedRouteId = ''
      this.sessionPathOnMap = false
      this.verticalProfileAfterPreview = false
    }
  }
})
