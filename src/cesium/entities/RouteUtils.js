import * as Cesium from 'cesium'

class RouteUtils {
  /**
   * 危险等级文本描述
   * @param {number} danger - 危险等级(0-10)
   * @returns {string} 危险等级文本描述
   */
  static getDangerText(danger) {
    if (danger < 3) return '安全（绿色）'
    if (danger < 7) return '警告（黄色）'
    return '危险（红色）'
  }

  /**
   * 天气提醒
   * @param {number} danger - 危险等级(0-10)
   * @returns {string} 天气提醒文本
   */
  static getWeatherTips(danger) {
    const tips = [
      '天气晴朗，能见度佳，适合飞行',
      '局部有薄雾，注意保持航线',
      '风力较大，建议降低飞行高度',
      '有雷暴预警，建议暂停飞行'
    ]
    return danger < 3 ? tips[0] : danger < 7 ? tips[1] : tips[danger > 8 ? 3 : 2]
  }

  /**
   * 速度建议
   * @param {number} danger - 危险等级(0-10)
   * @returns {string} 速度建议文本
   */
  static getSpeedSuggestion(danger) {
    return danger < 3 ? '正常速度（800km/h）' : danger < 7 ? '减速至600km/h' : '紧急减速至400km/h'
  }

  /**
   * 计算两点之间的距离
   * @param {Cesium.Cartesian3} point1 - 第一个点
   * @param {Cesium.Cartesian3} point2 - 第二个点
   * @returns {number} 距离（米）
   */
  static calculateDistance(point1, point2) {
    return Cesium.Cartesian3.distance(point1, point2)
  }

  /**
   * 计算航线总长度
   * @param {Array} positions - 位置数组
   * @returns {number} 总长度（米）
   */
  static calculateRouteLength(positions) {
    if (!positions || positions.length < 2) return 0

    let totalLength = 0
    for (let i = 0; i < positions.length - 1; i++) {
      totalLength += this.calculateDistance(positions[i], positions[i + 1])
    }
    return totalLength
  }

  /**
   * 将经纬度坐标转换为Cesium笛卡尔坐标
   * @param {Object} waypoint - 航点对象
   * @param {number} waypoint.longitude - 经度
   * @param {number} waypoint.latitude - 纬度
   * @param {number} [waypoint.height=0] - 高度
   * @returns {Cesium.Cartesian3} 笛卡尔坐标
   */
  static waypointToCartesian(waypoint) {
    return Cesium.Cartesian3.fromDegrees(
      waypoint.longitude,
      waypoint.latitude,
      waypoint.height || 0
    )
  }

  /**
   * 将Cesium笛卡尔坐标转换为经纬度坐标
   * @param {Cesium.Cartesian3} cartesian - 笛卡尔坐标
   * @returns {Object} 经纬度坐标对象
   */
  static cartesianToWaypoint(cartesian) {
    const cartographic = Cesium.Cartographic.fromCartesian(cartesian)
    return {
      longitude: Cesium.Math.toDegrees(cartographic.longitude),
      latitude: Cesium.Math.toDegrees(cartographic.latitude),
      height: cartographic.height
    }
  }

  /**
   * 计算飞行时间
   * @param {number} distance - 距离（米）
   * @param {number} speed - 速度（米/秒）
   * @returns {number} 飞行时间（秒）
   */
  static calculateFlightTime(distance, speed = 222) { // 默认速度800km/h = 222m/s
    return distance / speed
  }

  /**
   * 格式化时间
   * @param {number} seconds - 秒数
   * @returns {string} 格式化的时间字符串
   */
  static formatTime(seconds) {
    const minutes = Math.floor(seconds / 60)
    const remainingSeconds = Math.floor(seconds % 60)
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`
  }

  /**
   * 验证航线数据
   * @param {Object} route - 航线数据
   * @returns {boolean} 是否有效
   */
  static validateRoute(route) {
    if (!route) {
      console.error('航线数据不能为空')
      return false
    }

    if (!route.waypoints || !Array.isArray(route.waypoints) || route.waypoints.length < 2) {
      console.error('航线必须包含至少两个航点')
      return false
    }

    for (let i = 0; i < route.waypoints.length; i++) {
      const waypoint = route.waypoints[i]
      if (!waypoint.longitude || !waypoint.latitude) {
        console.error(`第${i + 1}个航点缺少经纬度信息`)
        return false
      }
    }

    return true
  }

  /**
   * 获取默认飞行高度
   * @returns {number} 默认飞行高度（米）
   */
  static getDefaultFlightHeight() {
    return 300
  }

  /**
   * 获取默认飞行速度
   * @returns {number} 默认飞行速度（米/秒）
   */
  static getDefaultFlightSpeed() {
    return 222 // 800km/h = 222m/s
  }

  /**
   * 生成唯一的航线ID
   * @returns {string} 唯一的航线ID
   */
  static generateRouteId() {
    return `route_${Date.now()}_${Math.floor(Math.random() * 1000)}`
  }

  /**
   * 计算航线的边界球
   * @param {Array} waypoints - 航点数组
   * @returns {Cesium.BoundingSphere} 边界球
   */
  static calculateBoundingSphere(waypoints) {
    if (!waypoints || waypoints.length === 0) {
      return new Cesium.BoundingSphere(Cesium.Cartesian3.ZERO, 0)
    }

    const positions = waypoints.map(waypoint => 
      this.waypointToCartesian(waypoint)
    )

    return Cesium.BoundingSphere.fromPoints(positions)
  }

  /**
   * 检查点是否在边界球内
   * @param {Cesium.Cartesian3} point - 点
   * @param {Cesium.BoundingSphere} boundingSphere - 边界球
   * @returns {boolean} 是否在边界球内
   */
  static isPointInBoundingSphere(point, boundingSphere) {
    return Cesium.BoundingSphere.contains(boundingSphere, point)
  }

  /**
   * 线性插值计算两个点之间的点
   * @param {Cesium.Cartesian3} start - 起点
   * @param {Cesium.Cartesian3} end - 终点
   * @param {number} ratio - 插值比例（0-1）
   * @returns {Cesium.Cartesian3} 插值点
   */
  static lerp(start, end, ratio) {
    return Cesium.Cartesian3.lerp(start, end, ratio, new Cesium.Cartesian3())
  }
}

// 导出工具类
export const routeUtils = RouteUtils
export default RouteUtils
