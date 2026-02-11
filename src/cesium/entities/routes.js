// src/cesium/entities/RouteManager.js
import * as Cesium from 'cesium'
import { aircraftController } from './AircraftController'
import { routeRenderer } from './RouteRenderer'
import { routeUtils } from './RouteUtils'

class RouteManager {
  // 单例实例
  static instance = null;

  // 私有属性
  #viewer = null // Cesium viewer实例
  #activeRouteId = null // 当前激活的航线ID

  // 私有构造函数，防止外部实例化
  constructor() {
    if (RouteManager.instance) {
      return RouteManager.instance
    }
    RouteManager.instance = this
  }

  /**
   * 初始化航线管理器（需传入viewer实例）
   */
  init(viewerInstance) {
    if (this.#viewer) return
    this.#viewer = viewerInstance
    // 初始化子模块
    aircraftController.init(viewerInstance)
    routeRenderer.init(viewerInstance)
  }

  /**
   * 渲染航线（对外暴露的方法）
   * @param {Object} route 航线数据
   */
  render(route) {
    if (!this.#viewer) {
      console.error('RouteManager 尚未初始化，请先调用 init 方法');
      return null;
    }

    // 验证航线数据
    if (!routeUtils.validateRoute(route)) {
      return null;
    }

    // 先清空地图上已有的航线
    this.clearAllRoutes();

    // 构建航点数组
    const enhancedWaypoints = routeRenderer.buildEnhancedWaypoints(route.waypoints);

    // 转换航点为Cesium坐标
    const positions = routeRenderer.convertWaypointsToPositions(enhancedWaypoints);

    // 创建航线分段
    const segmentEntities = routeRenderer.createRouteSegments(
      route.id,
      positions,
      route.dangers
    );

    // 创建飞机模型
    const planeEntity = aircraftController.createRoutePlane(
      route.id,
      positions,
      route.duration,
      route.startTime,
      route.endTime
    );

    // 创建起点标签
    const startLabel = routeRenderer.createStartLabel(
      route.id,
      positions[0],
      route.startName
    );

    // 创建终点标签
    const endLabel = routeRenderer.createEndLabel(
      route.id,
      positions[positions.length - 1],
      route.endName
    );

    segmentEntities.push(startLabel, endLabel);

    // 存储航线信息
    routeRenderer.storeRouteData(route.id, {
      segments: segmentEntities,
      plane: planeEntity,
      positions: positions,
      dangers: route.dangers || [],
      info: route.info || {},
      name: route.name || `航线${route.id}`
    });

    // 设置当前激活的航线ID
    this.#activeRouteId = route.id;
    aircraftController.setActiveRouteId(route.id);

    // 调整相机视角
    const boundingSphere = routeUtils.calculateBoundingSphere(route.waypoints);
    this.#viewer.camera.flyToBoundingSphere(boundingSphere, {
      duration: 1,
      offset: new Cesium.HeadingPitchRange(
        0,
        Cesium.Math.toRadians(-10),
        boundingSphere.radius * 5 // 提高相机高度，从3倍半径增加到5倍
      )
    });

    // 初始化websocket连接
    aircraftController.initWebSocket();

    return route.id;
  }

  /**
   * 移除指定航线
   */
  #removeRoute(routeId) {
    if (!this.#viewer) return;
    routeRenderer.removeRoute(routeId);
    aircraftController.clearPlaneAttitude(routeId);
  }

  /**
   * 全部卸载（对外暴露的方法）
   */
  clearAllRoutes() {
    if (!this.#viewer) return;
    routeRenderer.clearAllRoutes();
    // 清理当前激活的航线ID
    this.#activeRouteId = null;
    aircraftController.setActiveRouteId(null);
  }

  /**
   * 俯视视角查看航线
   */
  viewTopDown() {
    if (!this.#viewer) return;

    this.#viewer.trackedEntity = undefined;

    const allPositions = routeRenderer.getAllRoutePositions();

    if (allPositions.length > 0) {
      const boundingSphere = Cesium.BoundingSphere.fromPoints(allPositions);
      this.#viewer.camera.flyToBoundingSphere(boundingSphere, {
        offset: new Cesium.HeadingPitchRange(0, Cesium.Math.toRadians(-90), boundingSphere.radius * 6), // 提高俯视视角高度
        duration: 1.5
      });
    }
  }

  /**
   * 侧视视角查看航线
   */
  viewSide() {
    if (!this.#viewer) return;

    const allPositions = routeRenderer.getAllRoutePositions();

    if (allPositions.length > 0) {
      const boundingSphere = Cesium.BoundingSphere.fromPoints(allPositions);
      this.#viewer.camera.flyToBoundingSphere(boundingSphere, {
        offset: new Cesium.HeadingPitchRange(
          Cesium.Math.toRadians(-90),
          Cesium.Math.toRadians(-15),
          Math.max(boundingSphere.radius, 7000) // 提高相机高度
        ),
        duration: 1.5
      });
    }
  }

  /**
   * 跟踪指定航线的飞机
   * @param {String} routeId 航线ID
   * @param {Object} options 可选配置
   * @param {Number} options.heading 相机航向角，默认0度（跟随飞机方向）
   * @param {Number} options.pitch 相机俯仰角，默认-15度
   * @param {Number} options.range 相机距离飞机的距离，默认15000米
   */
  viewAircraft(routeId, options = {}) {
    if (!this.#viewer || !routeId) return;

    const routeData = routeRenderer.getRouteData(routeId);
    if (routeData && routeData.plane) {
      // 调整相机视角偏移
      const { heading = 0, pitch = -15, range = 15000 } = options;
      
      // 设置相机控制器的跟踪偏移
      this.#viewer.scene.screenSpaceCameraController.enableInputs = true;
      
      // 先设置跟踪偏移，确保视角正确
      const headingRadians = Cesium.Math.toRadians(heading);
      const pitchRadians = Cesium.Math.toRadians(pitch);
      
      // 设置跟踪实体
      this.#viewer.trackedEntity = routeData.plane;
      
      // 设置跟踪偏移，这将直接影响相机视角
      this.#viewer.trackedEntityOffset = new Cesium.HeadingPitchRange(
        headingRadians,
        pitchRadians,
        range
      );
      
      // 使用flyTo方法调整到合适的视角，带有平滑过渡
      this.#viewer.camera.flyTo({
        entity: routeData.plane,
        duration: 0.5,
        offset: this.#viewer.trackedEntityOffset
      });
    }
  }

  /**
   * 跟踪当前激活航线的飞机
   * @param {String} routeId 航线ID
   * @param {Object} options 可选配置，同viewAircraft方法
   */
  trackCurrentAircraft(routeId, options = {}) {
    this.viewAircraft(routeId, options);
  }

  /**
   * 取消跟踪实体，恢复自由视角
   */
  releaseTracking() {
    if (this.#viewer) {
      this.#viewer.trackedEntity = undefined;
    }
  }
  
  /**
   * 暂停飞机飞行
   */
  pauseFlight() {
    aircraftController.pauseFlight();
  }
  
  /**
   * 继续飞机飞行
   */
  resumeFlight() {
    aircraftController.resumeFlight();
  }
  
  /**
   * 切换飞机飞行状态（暂停/继续）
   * @returns {boolean} 当前飞行状态，true表示正在飞行，false表示已暂停
   */
  toggleFlight() {
    return aircraftController.toggleFlight();
  }

  /**
   * 动态调整飞机姿态
   * @param {String} routeId 航线ID
   * @param {Object} attitude 姿态调整参数
   * @param {Number} attitude.heading 偏航角（度）
   * @param {Number} attitude.pitch 俯仰角（度）
   * @param {Number} attitude.roll 滚转角（度）
   */
  setPlaneAttitude(routeId, attitude) {
    aircraftController.setPlaneAttitude(routeId, attitude);
  }

  /**
   * 完全销毁实例（清理资源）
   */
  destroy() {
    this.clearAllRoutes();
    
    // 销毁子模块
    aircraftController.destroy();
    routeRenderer.destroy();
    
    this.#activeRouteId = null;
    this.#viewer = null;
    RouteManager.instance = null;
  }
}

// 导出单例实例
export const routeManager = new RouteManager();
export default routeManager;