// src/cesium/entities/routes/RouteManager.js
import * as Cesium from 'cesium'
import eventManager from '@/cesium/core/eventManager'
import { RouteRenderer } from './RouteRenderer'
import { PlaneModel } from './PlaneModel'
import { CameraController } from './CameraController'
import { WebSocketController } from './WebSocketController'
import { RouteInteraction } from './RouteInteraction'

class RouteManager {
  // 单例实例
  static instance = null;

  // 私有属性声明
  #routeEntities;
  #viewer;
  #activeRouteId;
  
  // 模块实例声明
  #routeRenderer;
  #planeModel;
  #cameraController;
  #webSocketController;
  #routeInteraction;

  // 私有构造函数，防止外部实例化
  constructor() {
    if (RouteManager.instance) {
      return RouteManager.instance
    }
    RouteManager.instance = this
    
    // 初始化私有属性
    this.#routeEntities = new Map() // routeId -> { polylineEntity, planeEntity, positions, dangers, info }
    this.#viewer = null // Cesium viewer实例
    this.#activeRouteId = null // 当前激活的航线ID
    
    // 初始化模块实例
    this.#routeRenderer = null
    this.#planeModel = null
    this.#cameraController = null
    this.#webSocketController = null
    this.#routeInteraction = null
  }

  /**
   * 初始化航线管理器（需传入viewer实例）
   */
  init(viewerInstance) {
    if (this.#viewer) return
    this.#viewer = viewerInstance
    
    // 初始化各个模块
    this.#routeRenderer = new RouteRenderer(viewerInstance)
    this.#planeModel = new PlaneModel(viewerInstance)
    this.#cameraController = new CameraController(viewerInstance)
    this.#webSocketController = new WebSocketController(this)
    this.#routeInteraction = new RouteInteraction(viewerInstance, this)
    
    this.#bindRouteEvents()
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

    // 先清空地图上已有的航线
    this.clearAllRoutes();

    // 设置当前激活的航线ID
    this.#activeRouteId = route.id

    // 初始化WebSocket连接并发送航线ID
    this.#webSocketController.initWebSocket()

    // 渲染航线和飞机
    const { segments, plane, positions } = this.#routeRenderer.renderRoute(route)
    
    // 存储航线信息
    this.#routeEntities.set(route.id, {
      segments: segments,
      plane: plane,
      positions: positions,
      dangers: route.dangers || [],
      info: route.info || {},
      name: route.name || `航线${route.id}`
    })

    // 调整相机视角
    this.#cameraController.flyToRoute(route)

    return route.id
  }

  /**
   * 移除指定航线
   */
  #removeRoute(routeId) {
    if (!this.#viewer || !this.#routeEntities.has(routeId)) return

    const routeData = this.#routeEntities.get(routeId)

    // 移除航线分段和飞机
    this.#routeRenderer.removeRoute(routeId, routeData)

    this.#routeEntities.delete(routeId)
  }

  /**
   * 全部卸载（对外暴露的方法）
   */
  clearAllRoutes() {
    if (!this.#viewer) return;
    this.#routeEntities.forEach((routeData, routeId) => this.#removeRoute(routeId))
    // 清理当前激活的航线ID
    this.#activeRouteId = null
    // 断开WebSocket连接
    if (this.#webSocketController) {
      this.#webSocketController.destroy();
    }
  }

  /**
   * 绑定航线事件
   */
  #bindRouteEvents() {
    if (!this.#viewer) return;
    this.#routeInteraction.bindEvents()
  }

  /**
   * 暂停飞机飞行
   */
  pauseFlight() {
    if (this.#viewer) {
      this.#viewer.clock.shouldAnimate = false;
      console.log('飞机飞行已暂停');
    }
  }
  
  /**
   * 继续飞机飞行
   */
  resumeFlight() {
    if (this.#viewer) {
      this.#viewer.clock.shouldAnimate = true;
      console.log('飞机飞行已继续');
    }
  }
  
  /**
   * 切换飞机飞行状态（暂停/继续）
   * @returns {boolean} 当前飞行状态，true表示正在飞行，false表示已暂停
   */
  toggleFlight() {
    if (!this.#viewer) return false;
    
    this.#viewer.clock.shouldAnimate = !this.#viewer.clock.shouldAnimate;
    const isFlying = this.#viewer.clock.shouldAnimate;
    
    console.log(isFlying ? '飞机飞行已继续' : '飞机飞行已暂停');
    return isFlying;
  }

  /**
   * 完全销毁实例（清理资源）
   */
  destroy() {
    this.clearAllRoutes();
    
    // 清理所有模块引用
    this.#routeRenderer = null;
    this.#planeModel = null;
    this.#cameraController = null;
    this.#webSocketController = null;
    this.#routeInteraction = null;
    
    this.#activeRouteId = null;
    this.#viewer = null;
    RouteManager.instance = null;
  }

  // Getters for modules
  get routeRenderer() {
    return this.#routeRenderer;
  }

  get planeModel() {
    return this.#planeModel;
  }

  get cameraController() {
    return this.#cameraController;
  }

  get webSocketController() {
    return this.#webSocketController;
  }

  get routeInteraction() {
    return this.#routeInteraction;
  }

  get activeRouteId() {
    return this.#activeRouteId;
  }

  get routeEntities() {
    return this.#routeEntities;
  }
}

// 导出单例实例
export const routeManager = new RouteManager();
export default routeManager;