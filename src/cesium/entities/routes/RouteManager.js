// src/cesium/entities/routes/RouteManager.js
import * as Cesium from 'cesium'
import eventManager from '@/cesium/core/eventManager'
import { RouteRenderer } from './RouteRenderer'
import { PlaneModel } from './PlaneModel'
import { CameraController } from './CameraController'
import { RouteInteraction } from './RouteInteraction'
import { SessionRouteLayer } from './SessionRouteLayer'
import { RiskZoneManager } from '../riskZones/RiskZoneManager'

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
  #routeInteraction;
  #sessionLayer;
  #riskZoneManager;
  #dragUnsubs = [];
  #dragIdx = null;

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
    this.#routeInteraction = new RouteInteraction(viewerInstance, this)
    this.#sessionLayer = new SessionRouteLayer(viewerInstance)
    this.#riskZoneManager = new RiskZoneManager(viewerInstance)

    this.#bindRouteEvents()
    this.#bindSessionControlDrag()
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

    if (route.mode === 'session' && Array.isArray(route.pathSamples) && route.pathSamples.length >= 2) {
      this.#sessionLayer.show(route)
      const positions = route.pathSamples.map((p) =>
        Cesium.Cartesian3.fromDegrees(p.lon, p.lat, p.alt)
      )
      this.#routeEntities.set(route.id, {
        segments: [],
        positions,
        dangers: route.dangers || [],
        info: route.info || {},
        name: route.name || `${route.startName || '起点'} → ${route.endName || '终点'}`,
        pathSamples: route.pathSamples,
        windAlong: route.windAlong || [],
        mode: 'session'
      })
      this.#cameraController.flyToRoute({
        id: route.id,
        waypoints: route.pathSamples.map((p) => ({
          longitude: p.lon,
          latitude: p.lat,
          height: p.alt
        }))
      })
      return route.id
    }

    // 渲染航线（后端/旧版数据结构）
    const { segments, positions } = this.#routeRenderer.renderRoute(route)
    
    // 存储航线信息
    this.#routeEntities.set(route.id, {
      segments: segments,
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

    if (routeData?.mode === 'session') {
      this.#sessionLayer.clear()
    } else {
      this.#routeRenderer.removeRoute(routeId, routeData)
    }

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
   * 俯视视角查看航线
   */
  viewTopDown() {
    if (this.#cameraController && this.#activeRouteId && this.#routeEntities.has(this.#activeRouteId)) {
      const routeData = this.#routeEntities.get(this.#activeRouteId);
      this.#cameraController.viewTopDown(routeData.positions);
    }
  }

  /**
   * 侧视视角查看航线
   */
  viewSide() {
    if (this.#cameraController && this.#activeRouteId && this.#routeEntities.has(this.#activeRouteId)) {
      const routeData = this.#routeEntities.get(this.#activeRouteId);
      this.#cameraController.viewSide(routeData.positions);
    }
  }

  /**
   * 跟踪指定航线的飞机
   * @param {String} routeId 航线ID
   */
  viewAircraft(routeId) {
    if (this.#cameraController && this.#routeEntities.has(routeId)) {
      const routeData = this.#routeEntities.get(routeId);
      // 这里需要飞机实体，后续从iSim数据中获取
    }
  }

  /**
   * 取消跟踪实体，恢复自由视角
   */
  releaseTracking() {
    if (this.#cameraController) {
      this.#cameraController.releaseTracking();
    }
  }

  /**
   * 完全销毁实例（清理资源）
   */
  destroy() {
    this.#dragUnsubs.forEach((u) => u())
    this.#dragUnsubs = []

    this.clearAllRoutes();
    this.#riskZoneManager?.clear();

    // 清理所有模块引用
    this.#routeRenderer = null;
    this.#planeModel = null;
    this.#cameraController = null;
    this.#routeInteraction = null;
    this.#sessionLayer = null;
    this.#riskZoneManager = null;
    
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

  get routeInteraction() {
    return this.#routeInteraction;
  }

  get activeRouteId() {
    return this.#activeRouteId;
  }

  get routeEntities() {
    return this.#routeEntities;
  }

  get riskZoneManager() {
    return this.#riskZoneManager;
  }

  /** 仅清除风险区实体（航线清屏时可保留或一并清除） */
  clearRiskZones() {
    this.#riskZoneManager?.clear();
  }

  setRiskZones(zones) {
    this.#riskZoneManager?.setZones(zones || []);
  }

  #bindSessionControlDrag() {
    const onDown = (payload) => {
      const viewer = payload?.viewer || this.#viewer
      const movement = payload?.movement
      this.#dragIdx = null
      if (!viewer || !movement?.position) return
      const picked = viewer.scene.pick(movement.position)
      const id = picked?.id
      if (!id?.properties) return
      const now = Cesium.JulianDate.now()
      const isCtrl = id.properties.isRouteControl?.getValue
        ? id.properties.isRouteControl.getValue(now)
        : id.properties.isRouteControl
      if (!isCtrl) return
      const idx = id.properties.controlIndex?.getValue
        ? id.properties.controlIndex.getValue(now)
        : id.properties.controlIndex
      if (idx == null || idx === undefined) return
      this.#dragIdx = idx
    }
    const onMove = (payload) => {
      if (this.#dragIdx == null) return
      const viewer = payload?.viewer || this.#viewer
      const movement = payload?.movement
      if (!viewer || !movement?.endPosition) return
      const c = viewer.scene.pickPosition(movement.endPosition)
      if (!c) return
      const cg = Cesium.Cartographic.fromCartesian(c)
      window.dispatchEvent(
        new CustomEvent('session-route-control-moved', {
          detail: {
            index: this.#dragIdx,
            lon: Cesium.Math.toDegrees(cg.longitude),
            lat: Cesium.Math.toDegrees(cg.latitude)
          }
        })
      )
    }
    const onUp = () => {
      this.#dragIdx = null
    }
    this.#dragUnsubs.push(eventManager.on('left-down', onDown))
    this.#dragUnsubs.push(eventManager.on('mouse-move', onMove))
    this.#dragUnsubs.push(eventManager.on('left-up', onUp))
  }
}

// 导出单例实例
export const routeManager = new RouteManager();
export default routeManager;