// src/cesium/entities/routes/RouteRenderer.js
import * as Cesium from 'cesium'
import { DangerLevel } from './DangerLevel'
import { smoothRoutePositions } from './routeSmoothing'

export class RouteRenderer {
  constructor(viewer) {
    this.viewer = viewer
    this.dangerLevel = new DangerLevel()
  }

  /**
   * 创建单段航线
   */
  #createRouteSegment(routeId, segmentIndex, positions, danger) {
    if (!this.viewer || positions.length < 2) return null    
    return this.viewer.entities.add({
      id: `route_${routeId}_segment_${segmentIndex}`,
      polyline: {
        positions: positions,
        width: 5,
        arcType: Cesium.ArcType.NONE,
        perPositionHeight: true,
        material: this.dangerLevel.getColorByDangerLevel(danger),
        depthFailMaterial: this.dangerLevel.getColorByDangerLevel(danger),
        clampToGround: false
      },
      properties: {
        routeId: routeId,
        segmentIndex: segmentIndex,
        dangerLevel: danger,
        isRouteSegment: true
      }
    })
  }

  /**
   * 创建起点标签
   */
  #createStartLabel(positions, route) {
    if (!this.viewer) return null
    
    return this.viewer.entities.add({
      position: positions[0],
      label: {
        text: `起点：${route.startName || '出发地'}`,
        font: '16px sans-serif',
        fillColor: Cesium.Color.TOMATO,
        outlineColor: Cesium.Color.TRANSPARENT,
        outlineWidth: 0,
        style: Cesium.LabelStyle.FILL,
        pixelOffset: new Cesium.Cartesian2(0, -40),
        heightReference: Cesium.HeightReference.CLAMP_TO_GROUND,
        verticalOrigin: Cesium.VerticalOrigin.BOTTOM,
        showBackground:true,
        backgroundColor: Cesium.Color.fromCssColorString(' rgba(66, 153, 225, 0.3)'),
        backgroundPadding: new Cesium.Cartesian2(10, 5)
      }
    })
  }

  /**
   * 创建终点标签
   */
  #createEndLabel(positions, route) {
    if (!this.viewer) return null
    
    return this.viewer.entities.add({
      position: positions[positions.length - 1],
      label: {
        text: `终点：${route.endName || '目的地'}`,
        font: '16px sans-serif',
        fillColor: Cesium.Color.TOMATO,
        outlineColor: Cesium.Color.TRANSPARENT,
        outlineWidth: 0,
        style: Cesium.LabelStyle.FILL,
        pixelOffset: new Cesium.Cartesian2(0, -40),
        heightReference: Cesium.HeightReference.CLAMP_TO_GROUND,
        verticalOrigin: Cesium.VerticalOrigin.BOTTOM,
        showBackground:true,
        backgroundColor: Cesium.Color.fromCssColorString(' rgba(66, 153, 225, 0.3)'),
        backgroundPadding: new Cesium.Cartesian2(10, 5)
      }
    })
  }

  /**
   * 渲染航线
   * @param {Object} route 航线数据
   * @returns {Object} 包含航线分段和位置的对象
   */
  renderRoute(route) {
    if (!this.viewer) return { segments: [], positions: [] }
    
    // 检查航线数据完整性
    if (!route || !route.waypoints || route.waypoints.length === 0) {
      console.warn('航线数据不完整，跳过渲染:', route);
      return { segments: [], positions: [] };
    }

    // 构建航点数组
    const enhancedWaypoints = [];
    const startPoint = route.waypoints[0];
    const endPoint = route.waypoints[route.waypoints.length - 1];

    // 起点上升航路：从地面飞升到指定高度
    const startHeight = startPoint.height || 300;
    enhancedWaypoints.push(
      { ...startPoint, height: 0 }, // 起点地面
      { ...startPoint, height: startHeight } // 起点指定高度
    );

    // 原始航点（中间段）：如果没有高度则默认300m
    enhancedWaypoints.push(...route.waypoints.map(waypoint => ({
      ...waypoint,
      height: waypoint.height || 300
    })));

    // 终点下降航路：从指定高度降落到地面
    const endHeight = endPoint.height || 300;
    enhancedWaypoints.push(
      { ...endPoint, height: endHeight }, // 终点指定高度
      { ...endPoint, height: 0 } // 终点地面
    );

    // 转换航点为 Cesium 坐标
    const cornerPositions = enhancedWaypoints.map((waypoint) =>
      Cesium.Cartesian3.fromDegrees(
        waypoint.longitude,
        waypoint.latitude,
        waypoint.height
      )
    )

    const { positions, legIndices } = smoothRoutePositions(cornerPositions)

    // 创建航线分段（样条插值后仍按原始航段保留风险着色）
    const segmentEntities = []

    for (let i = 0; i < positions.length - 1; i++) {
      const danger = route.dangers?.[legIndices[i]] ?? route.dangers?.[i] ?? 0
      const segment = this.#createRouteSegment(
        route.id,
        i,
        [positions[i], positions[i + 1]],
        danger
      )
      segment && segmentEntities.push(segment)
    }

    // 起终点标签仍锚在原始起降位置
    const startLabel = this.#createStartLabel(cornerPositions, route)
    const endLabel = this.#createEndLabel(cornerPositions, route)

    segmentEntities.push(startLabel, endLabel);

    return {
      segments: segmentEntities,
      positions,
      cornerPositions
    }
  }

  /**
   * 移除指定航线
   */
  removeRoute(routeId, routeData) {
    if (!this.viewer || !routeData) return

    // 移除航线分段
    routeData.segments.forEach(segment => this.viewer.entities.remove(segment))
  }
}