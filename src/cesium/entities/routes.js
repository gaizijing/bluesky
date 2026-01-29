// src/cesium/entities/RouteManager.js
import * as Cesium from 'cesium'
import eventManager from '@/cesium/core/eventManager'
import { useWindStore } from '@/store/modules/wind'
class RouteManager {
  // 单例实例
  static instance = null;

  // 私有属性
  #routeEntities = new Map() // routeId -> { polylineEntity, planeEntity, positions, dangers, info }
  #viewer = null // Cesium viewer实例
  #planeAttitudes = new Map() // routeId -> { heading, pitch, roll } 存储飞机姿态调整参数
  #activeRouteId = null // 当前激活的航线ID
  #keyboardEventListener = null // 键盘事件监听器

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
    this.#bindRouteEvents()
  }

  /**
   * 根据危险指数获取颜色（红黄绿三色）
   * @param {Number} danger 危险指数(0-10)
   * @returns {Cesium.Color} 对应的颜色
   */
  #getColorByDangerLevel(danger) {
    const normalized = Cesium.Math.clamp(danger, 0, 10);
    let meterial = new Cesium.PolylineGlowMaterialProperty()
    // 危险等级分三段：安全(绿)、警告(黄)、危险(红)
    if (normalized < 3) {

      meterial.color = Cesium.Color.GREEN.withAlpha(1); // 安全
    } else if (normalized < 7) {
      meterial.color = Cesium.Color.YELLOW.withAlpha(1); // 警告
    } else {
      meterial.color = Cesium.Color.RED.withAlpha(1); // 危险
    }
    return meterial
  };

  /**
   * 创建单段航线
   */
  #createRouteSegment(routeId, segmentIndex, positions, danger) {
    if (!this.#viewer || positions.length < 2) return null    
    return this.#viewer.entities.add({
      id: `route_${routeId}_segment_${segmentIndex}`,
      polyline: {
        positions: positions,
        width: 5,
        material: this.#getColorByDangerLevel(danger),
        depthFailMaterial: this.#getColorByDangerLevel(danger),
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
   * 创建飞机模型
   */
  #createRoutePlane(routeId, positions, duration = 60, routeStartTime, routeEndTime) {
    if (!this.#viewer) return null

    // 模型路径
    const modelUrl = '/cesium/model/plane/plane.glb'

    // 配置航线动画属性 - 使用线性插值确保严格按路径飞行
    const positionProperty = new Cesium.SampledPositionProperty();
    positionProperty.setInterpolationOptions({
      interpolationDegree: 1,
      interpolationAlgorithm: Cesium.LinearApproximation
    });

    // 使用路由对象中的时间作为动画开始时间，确保与时间轴同步
    let startTime;
    let endTime;
    
    if (routeStartTime) {
      startTime = Cesium.JulianDate.fromDate(routeStartTime);
      console.log('Route Start Time:', routeStartTime);
      console.log('Converted Start Time (JulianDate):', startTime);
    } else {
      startTime = this.#viewer.clock.startTime;
      console.log('Using default start time:', startTime);
    }
    
    if (routeEndTime) {
      endTime = Cesium.JulianDate.fromDate(routeEndTime);
      console.log('Route End Time:', routeEndTime);
      console.log('Converted End Time (JulianDate):', endTime);
    } else {
      endTime = Cesium.JulianDate.addSeconds(startTime, duration || 180, new Cesium.JulianDate());
      console.log('Using calculated end time:', endTime);
    }
    
    // 计算实际的总飞行时间（秒）
    let totalDuration;
    if (routeStartTime && routeEndTime) {
      // 使用航线的实际开始和结束时间差
      const startDate = new Date(routeStartTime);
      const endDate = new Date(routeEndTime);
      totalDuration = Math.floor((endDate - startDate) / 1000); // 转换为秒
      console.log('Calculated total duration from route times:', totalDuration, 'seconds');
    } else {
      // 没有时间信息时使用默认值
      totalDuration = duration || 180;
      console.log('Using default total duration:', totalDuration, 'seconds');
    }
    
    // 严格按4个关键点设计动画：A -> A' -> B' -> B
    // 确保动画分三个阶段：垂直起飞 -> 水平飞行 -> 垂直降落
    const keyPoints = [
      positions[0], // A: 地面点
      positions[1], // A': A点正上方，高度300
      positions[positions.length - 2], // B': B点正上方，高度300
      positions[positions.length - 1] // B: 地面点
    ];
    
    // 计算各阶段的时间分配
    const takeoffDuration = totalDuration * 0.2; // 起飞阶段占20%
    const cruiseDuration = totalDuration * 0.6; // 水平飞行占60%
    const landingDuration = totalDuration * 0.2; // 降落阶段占20%
    
    // 分阶段添加采样点
    let currentTime = Cesium.JulianDate.clone(startTime);
    
    // 1. 垂直起飞阶段：A -> A'（真正的垂直起飞，保持水平朝向）
    const takeoffSteps = 20;
    const takeoffStepTime = takeoffDuration / takeoffSteps;
    for (let i = 0; i <= takeoffSteps; i++) {
      // 垂直起飞：只改变高度，经纬度保持不变
      const pos = new Cesium.Cartesian3(
        keyPoints[0].x, // 保持与地面点相同的经度
        keyPoints[0].y, // 保持与地面点相同的纬度
        keyPoints[0].z + (keyPoints[1].z - keyPoints[0].z) * (i / takeoffSteps) // 垂直高度插值
      );
      positionProperty.addSample(currentTime, pos);
      currentTime = Cesium.JulianDate.addSeconds(currentTime, takeoffStepTime, new Cesium.JulianDate());
    }
    
    // 2. 水平飞行阶段：A' -> B'（水平飞行，朝向指向巡航方向）
    const cruiseSteps = 30;
    const cruiseStepTime = cruiseDuration / cruiseSteps;
    for (let i = 0; i <= cruiseSteps; i++) {
      const ratio = i / cruiseSteps;
      const pos = Cesium.Cartesian3.lerp(keyPoints[1], keyPoints[2], ratio, new Cesium.Cartesian3());
      positionProperty.addSample(currentTime, pos);
      currentTime = Cesium.JulianDate.addSeconds(currentTime, cruiseStepTime, new Cesium.JulianDate());
    }
    
    // 3. 垂直降落阶段：B' -> B（真正的垂直降落，保持水平朝向）
    const landingSteps = 20;
    const landingStepTime = landingDuration / landingSteps;
    for (let i = 0; i <= landingSteps; i++) {
      // 垂直降落：只改变高度，经纬度保持不变
      const pos = new Cesium.Cartesian3(
        keyPoints[3].x, // 保持与地面点相同的经度
        keyPoints[3].y, // 保持与地面点相同的纬度
        keyPoints[2].z + (keyPoints[3].z - keyPoints[2].z) * (i / landingSteps) // 垂直高度插值
      );
      positionProperty.addSample(currentTime, pos);
      currentTime = Cesium.JulianDate.addSeconds(currentTime, landingStepTime, new Cesium.JulianDate());
    }
    
    // 初始化当前航线的飞机姿态
    this.#planeAttitudes.set(routeId, {
      heading: 0,
      pitch: 0,
      roll: 0
    });

    // 使用VelocityOrientationProperty根据速度自动计算朝向
    const velocityOrientation = new Cesium.VelocityOrientationProperty(positionProperty);

    // 使用动态方向属性，结合自动朝向和键盘调整的姿态
    const orientationProperty = new Cesium.CallbackProperty((time, result) => {
      // 获取基于速度的朝向
      const velocityQuaternion = velocityOrientation.getValue(time);
      
      // 获取当前航线的飞机姿态调整参数（键盘调整）
      const attitude = this.#planeAttitudes.get(routeId);
      
      // 只有当有姿态调整时才应用自定义姿态
      if (attitude && (attitude.heading !== 0 || attitude.pitch !== 0 || attitude.roll !== 0)) {
        // 创建自定义姿态的四元数
        const customAttitudeQuaternion = Cesium.Transforms.headingPitchRollQuaternion(
          Cesium.Cartesian3.ZERO,
          new Cesium.HeadingPitchRoll(
            Cesium.Math.toRadians(attitude.heading),
            Cesium.Math.toRadians(attitude.pitch),
            Cesium.Math.toRadians(attitude.roll)
          )
        );
        
        // 结合速度朝向和自定义姿态
        return Cesium.Quaternion.multiply(
          velocityQuaternion,
          customAttitudeQuaternion,
          result
        );
      }
      
      // 没有姿态调整时，直接使用速度朝向
      return velocityQuaternion;
    }, false);

    // 配置动画时钟 - 使用路由对象中的时间范围
    const existingClock = this.#viewer.clock;
    existingClock.startTime = startTime.clone();
    existingClock.stopTime = endTime.clone();
    existingClock.currentTime = startTime.clone();
    existingClock.clockRange = Cesium.ClockRange.LOOP_STOP;
    // existingClock.clockStep = Cesium.ClockStep.SYSTEM_CLOCK_MULTIPLIER;
    existingClock.multiplier = 1;
    existingClock.shouldAnimate = true;
    
    // 确保时间轴显示正确的时间范围
    if (this.#viewer.timeline) {
      this.#viewer.timeline.zoomTo(startTime, endTime);
    }

    // 创建飞机 Entity，直接使用动态属性
    const planeEntity = this.#viewer.entities.add({
      id: `route_${routeId}_plane`,
      position: positionProperty,
      orientation: orientationProperty,
      model: {
        uri: modelUrl,
        scale: 4.0,
        show: true,
        minimumPixelSize: 64,
        maximumScale: 20000
      },
      // 添加飞机飞行路径
      path: {
        resolution: 1,
        width: 15,
        material: new Cesium.PolylineGlowMaterialProperty({
          glowPower: 0.1,
          color: Cesium.Color.ORANGE
        })
      },
      // 添加常显标签，显示位置和高度信息
      label: {
        // 使用CallbackProperty动态更新标签内容
        text: new Cesium.CallbackProperty((time) => {
          const position = positionProperty.getValue(time);
          if (position) {
            const cartographic = Cesium.Cartographic.fromCartesian(position);
            const longitude = Cesium.Math.toDegrees(cartographic.longitude).toFixed(4);
            const latitude = Cesium.Math.toDegrees(cartographic.latitude).toFixed(4);
            const height = cartographic.height.toFixed(0);
            
            // 获取实时风速
            let windSpeed = 0;

            try {
              // 尝试获取风场数据，但确保在风场数据未准备好时不会影响飞机显示
              const windStore = useWindStore();
              const windLayers = windStore.windLayer;

              if (windLayers && Array.isArray(windLayers) && windLayers.length > 0) {
                // 获取当前位置的经纬度（转换为数字类型）
                const lonNum = parseFloat(longitude);
                const latNum = parseFloat(latitude);

                // 遍历所有风场图层，获取最接近当前高度的风场数据
                let closestWindData = null;
                let minHeightDiff = Infinity;

                for (const windLayer of windLayers) {
                  if (windLayer && typeof windLayer.getDataAtLonLat === 'function') {
                    try {
                      const windData = windLayer.getDataAtLonLat(lonNum, latNum);
                      if (windData && typeof windData.interpolated.speed === 'number') {
                        // 获取当前图层的高度
                        const layerIndex = windLayers.indexOf(windLayer);
                        const layerHeight = windStore.windData?.layers?.[layerIndex]?.height || 0;
                        const heightDiff = Math.abs(parseFloat(height) - layerHeight);

                        // 找到最接近当前高度的风场数据
                        if (heightDiff < minHeightDiff) {
                          minHeightDiff = heightDiff;
                          closestWindData = windData;
                        }
                      }
                    } catch (error) {
                      // 忽略风场数据获取错误，确保飞机正常显示
                    }
                  }
                }

                // 使用最接近的风场数据
                if (closestWindData) {
                  windSpeed = closestWindData.interpolated.speed.toFixed(1);
                }
              }
            } catch (error) {
              // 忽略所有错误，确保飞机正常显示
            }

            return `经：${longitude}° 纬：${latitude}° 
 高：${height}m 风速：${windSpeed}m/s`;
          }
          return '';
        }, false),
        // 标签样式
        font: '12px sans-serif',
        fillColor: Cesium.Color.WHITE,
        outlineColor: Cesium.Color.BLACK,
        outlineWidth: 2,
        showBackground:true,
        backgroundColor: Cesium.Color.fromCssColorString('rgba(0, 0, 0, 0.7)'),
        backgroundPadding: new Cesium.Cartesian2(10, 5),
        horizontalOrigin: Cesium.HorizontalOrigin.CENTER,
        verticalOrigin: Cesium.VerticalOrigin.TOP,
        pixelOffset: new Cesium.Cartesian2(0, -60), // 显示在飞机上方
        disableDepthTestDistance: Number.POSITIVE_INFINITY // 确保标签始终可见
      }
    });
    return planeEntity;
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


    // 转换航点为Cesium坐标
    const positions = enhancedWaypoints.map(waypoint =>
      Cesium.Cartesian3.fromDegrees(
        waypoint.longitude,
        waypoint.latitude,
        waypoint.height
      )
    )
    

    // 创建航线分段
    const segmentEntities = []

    for (let i = 0; i < positions.length - 1; i++) {
      const segment = this.#createRouteSegment(
        route.id,
        i,
        [positions[i], positions[i + 1]],
        route.dangers?.[i] || 0
      )
      segment && segmentEntities.push(segment)
    }
    console.log(route);
    
    // 创建飞机模型
    const planeEntity = this.#createRoutePlane(
      route.id,
      positions,
      route.duration,
      route.startTime,
      route.endTime
    )

    // 创建起点标签 - 文字标签添加背景颜色
    const startLabel = this.#viewer.entities.add({
      position: positions[0],
      // 文字标签
      label: {
        text: `起点：${route.startName || '出发地'}`,
        font: '16px sans-serif',
        fillColor: Cesium.Color.WHITE,
        outlineColor: Cesium.Color.TRANSPARENT,
        outlineWidth: 0,
        style: Cesium.LabelStyle.FILL,
        pixelOffset: new Cesium.Cartesian2(0, -40),
        heightReference: Cesium.HeightReference.CLAMP_TO_GROUND,
        verticalOrigin: Cesium.VerticalOrigin.BOTTOM,
        // 添加背景颜色
        showBackground:true,
        backgroundColor: Cesium.Color.fromCssColorString(' rgba(66, 153, 225, 0.3)'),
        backgroundPadding: new Cesium.Cartesian2(10, 5)
      }
    });

    // 创建终点标签 - 文字标签添加背景颜色
    const endLabel = this.#viewer.entities.add({
      position: positions[positions.length - 1],
      // 文字标签
      label: {
        text: `终点：${route.endName || '目的地'}`,
        font: '16px sans-serif',
        fillColor: Cesium.Color.WHITE,
        outlineColor: Cesium.Color.TRANSPARENT,
        outlineWidth: 0,
        style: Cesium.LabelStyle.FILL,
        pixelOffset: new Cesium.Cartesian2(0, -40),
        heightReference: Cesium.HeightReference.CLAMP_TO_GROUND,
        verticalOrigin: Cesium.VerticalOrigin.BOTTOM,
        // 添加背景颜色
        showBackground:true,
        backgroundColor: Cesium.Color.fromCssColorString(' rgba(66, 153, 225, 0.3)'),
        backgroundPadding: new Cesium.Cartesian2(10, 5)
      }
    });

    segmentEntities.push(startLabel, endLabel);

    // 存储航线信息
    this.#routeEntities.set(route.id, {
      segments: segmentEntities,
      plane: planeEntity,
      positions: positions,
      dangers: route.dangers || [],
      info: route.info || {},
      name: route.name || `航线${route.id}`
    })
    
    // 设置当前激活的航线ID
    this.#activeRouteId = route.id

    // 调整相机视角
    const boundingSphere = Cesium.BoundingSphere.fromPoints(
      route.waypoints.map(wp =>
        Cesium.Cartesian3.fromDegrees(wp.longitude, wp.latitude)
      ));
    this.#viewer.camera.flyToBoundingSphere(boundingSphere, {
      duration: 1,
      offset: new Cesium.HeadingPitchRange(
        0,
        Cesium.Math.toRadians(-10),
        boundingSphere.radius * 5 // 提高相机高度，从3倍半径增加到5倍
      )
    });

    // 初始化键盘事件监听
    this.#initKeyboardControls();

    return route.id
  }

  /**
   * 移除指定航线
   */
  #removeRoute(routeId) {
    if (!this.#viewer || !this.#routeEntities.has(routeId)) return

    const routeData = this.#routeEntities.get(routeId)

    // 移除航线分段和飞机
    routeData.segments.forEach(segment => this.#viewer.entities.remove(segment))
    if (routeData.plane) this.#viewer.entities.remove(routeData.plane)

    // 清理飞机姿态存储
    this.#planeAttitudes.delete(routeId)

    this.#routeEntities.delete(routeId)
  }

  /**
   * 全部卸载（对外暴露的方法）
   */
  clearAllRoutes() {
    if (!this.#viewer) return;
    this.#routeEntities.forEach((_, routeId) => this.#removeRoute(routeId))
    // 清理当前激活的航线ID
    this.#activeRouteId = null
  }

  /**
   * 绑定航线事件
   */
  #bindRouteEvents() {
    if (!this.#viewer) return;

    // 辅助函数：安全获取DOM元素
    const getSafeElement = (id) => {
      const el = document.getElementById(id);
      if (!el) return;
      return el;
    };

    // 创建弹窗元素
    const popup = getSafeElement('routePopup') || document.createElement('div');
    popup.id = 'routePopup';
    popup.style.position = 'absolute';
    popup.style.background = 'rgba(255, 255, 255, 0.95)';
    popup.style.padding = '5px';
    popup.style.borderRadius = '8px';
    popup.style.boxShadow = '0 4px 20px rgba(0, 0, 0, 0.15)';
    popup.style.zIndex = '1000';
    popup.style.display = 'none';
    popup.style.minWidth = '280px';
    popup.style.maxWidth = '400px';
    popup.style.border = '1px solid rgba(229, 231, 235, 1)';
    popup.style.animation = 'fadeIn 0.3s ease-out';
    popup.style.transition = 'all 0.2s ease';
    popup.style.fontFamily = '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
    document.body.appendChild(popup);

    // 添加动画样式
    if (!document.getElementById('popupAnimationStyle')) {
      const style = document.createElement('style');
      style.id = 'popupAnimationStyle';
      style.textContent = `
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .popup-risk-low { border-left: 4px solid #10b981; }
        .popup-risk-medium { border-left: 4px solid #f59e0b; }
        .popup-risk-high { border-left: 4px solid #ef4444; }
      `;
      document.head.appendChild(style);
    }

    const popupTitle = getSafeElement('popupTitle') || document.createElement('div');
    popupTitle.id = 'popupTitle';
    popupTitle.style.fontWeight = '600';
    popupTitle.style.fontSize = '16px';
    popupTitle.style.marginBottom = '12px';
    popupTitle.style.color = '#1f2937';
    popup.appendChild(popupTitle);

    const popupContent = getSafeElement('popupContent') || document.createElement('div');
    popupContent.id = 'popupContent';
    popupContent.style.color = '#4b5563';
    popupContent.style.lineHeight = '1.5';
    popupContent.style.fontSize = '14px';
    popup.appendChild(popupContent);


    // 航线点击处理器函数
    const routeClickHandler = (viewer, movement) => {
      const pickedObject = viewer.scene.pick(movement.position);

      if (Cesium.defined(pickedObject) && pickedObject.id?.properties?.isRouteSegment) {
        const routeId = pickedObject.id.properties.routeId;
        const segmentIndex = pickedObject.id.properties.segmentIndex;
        const routeData = this.#routeEntities.get(routeId.getValue());

        if (routeData && popup && popupTitle && popupContent) {
          // 设置弹窗内容
          popupTitle.textContent = `航线 ${routeData.name} - 第${segmentIndex + 1}段`;

          // 根据危险等级设置样式类
          const dangerValue = routeData.dangers[segmentIndex] || 0;
          popup.className = '';
          if (dangerValue < 30) {
            popup.classList.add('popup-risk-low');
          } else if (dangerValue < 70) {
            popup.classList.add('popup-risk-medium');
          } else {
            popup.classList.add('popup-risk-high');
          }

          popupContent.innerHTML = `
            <div style="margin-bottom: 8px;">
              <span style="display: inline-block; font-weight: 500; min-width: 80px;">危险等级：</span>
              <span style="color: ${dangerValue < 30 ? '#10b981' : dangerValue < 70 ? '#f59e0b' : '#ef4444'};">
                ${this.#getDangerText(dangerValue)}
              </span>
            </div>
            <div style="margin-bottom: 8px;">
              <span style="display: inline-block; font-weight: 500; min-width: 80px;">天气提醒：</span>
              <span>${this.#getWeatherTips(dangerValue)}</span>
            </div>
            <div style="margin-bottom: 8px;">
              <span style="display: inline-block; font-weight: 500; min-width: 80px;">建议速度：</span>
              <span>${this.#getSpeedSuggestion(dangerValue)}</span>
            </div>
            <div style="margin-top: 8px; padding-top: 8px; border-top: 1px solid #e5e7eb; font-size: 12px; color: #9ca3af;">
              点击其他区域可关闭弹窗
            </div>
          `;

          // 计算航线分段中点的屏幕坐标
          const midPoint = Cesium.Cartesian3.midpoint(
            routeData.positions[segmentIndex],
            routeData.positions[segmentIndex + 1],
            new Cesium.Cartesian3()
          );
          const screenPos = viewer.scene.cartesianToCanvasCoordinates(midPoint);

          if (screenPos) {
            // 计算弹窗位置
            const popupX = screenPos.x;
            const popupY = screenPos.y + 10;

            // 边界检查
            const popupWidth = popup.offsetWidth || 300;
            const popupHeight = popup.offsetHeight || 200;
            const canvas = viewer.canvas;

            const safeX = Math.max(10, Math.min(canvas.clientWidth - popupWidth - 10, popupX));
            const safeY = Math.max(10, Math.min(canvas.clientHeight - popupHeight - 10, popupY));

            // 设置弹窗位置
            popup.style.left = `${safeX}px`;
            popup.style.top = `${safeY}px`;
            popup.style.bottom = 'auto';
            popup.style.right = 'auto';
            popup.style.opacity = '0';
            popup.style.transform = 'translateY(10px)';
            popup.style.display = 'block';

            setTimeout(() => {
              popup.style.opacity = '1';
              popup.style.transform = 'translateY(0)';
            }, 10);
          }

          // // 调整相机视角
          // const boundingSphere = Cesium.BoundingSphere.fromPoints(routeData.positions);
          // viewer.camera.flyToBoundingSphere(boundingSphere, {
          //   offset: new Cesium.HeadingPitchRange(
          //     0,
          //     Cesium.Math.toRadians(-45),
          //     boundingSphere.radius * 2
          //   ),
          //   duration: 2
          // });

          return true;
        }
      } else if (popup) {
        popup.style.display = 'none';
      }

      return false;
    };

    // 注册航线点击处理器
    eventManager.registerClickHandler(routeClickHandler, 1);

  };

  /**
   * 危险等级文本描述
   */
  #getDangerText(danger) {
    if (danger < 3) return '安全（绿色）';
    if (danger < 7) return '警告（黄色）';
    return '危险（红色）';
  };

  /**
   * 天气提醒
   */
  #getWeatherTips(danger) {
    const tips = [
      '天气晴朗，能见度佳，适合飞行',
      '局部有薄雾，注意保持航线',
      '风力较大，建议降低飞行高度',
      '有雷暴预警，建议暂停飞行'
    ];
    return danger < 3 ? tips[0] : danger < 7 ? tips[1] : tips[danger > 8 ? 3 : 2];
  };

  /**
   * 速度建议
   */
  #getSpeedSuggestion(danger) {
    return danger < 3 ? '正常速度（800km/h）' : danger < 7 ? '减速至600km/h' : '紧急减速至400km/h';
  };

  /**
   * 俯视视角查看航线
   */
  viewTopDown() {
    if (!this.#viewer) return;

    this.#viewer.trackedEntity = undefined;

    const allPositions = [];
    this.#routeEntities.forEach(routeData => {
      allPositions.push(...routeData.positions);
    });

    if (allPositions.length > 0) {
      const boundingSphere = Cesium.BoundingSphere.fromPoints(allPositions);
      this.#viewer.camera.flyToBoundingSphere(boundingSphere, {
        offset: new Cesium.HeadingPitchRange(0, Cesium.Math.toRadians(-90), boundingSphere.radius * 6), // 提高俯视视角高度
        duration: 1.5
      });
    }
  };

  /**
   * 侧视视角查看航线
   */
  viewSide() {
    if (!this.#viewer) return;

    // this.#viewer.trackedEntity = undefined;

    const allPositions = [];
    this.#routeEntities.forEach(routeData => {
      allPositions.push(...routeData.positions);
    });

    if (allPositions.length > 0) {
      const boundingSphere = Cesium.BoundingSphere.fromPoints(allPositions);
      this.#viewer.camera.flyToBoundingSphere(boundingSphere, {
        offset: new Cesium.HeadingPitchRange(
          Cesium.Math.toRadians(-90),
          Cesium.Math.toRadians(-15),
          Math.max(boundingSphere.radius, 7000) // 提高相机高度，从1000增加到2000
        ),
        duration: 1.5
      });
    }
  };

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

    const routeData = this.#routeEntities.get(routeId);
    if (routeData && routeData.plane) {
      // 调整相机视角偏移
      // 设置默认参数以获得驾驶舱视角效果
      // heading: 0 表示相机位于飞机正后方，跟随飞机飞行方向
      // pitch: -15 表示略微俯视飞机，获得更好的驾驶视角
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
      // 当trackedEntity已设置时，flyTo会考虑trackedEntityOffset
      this.#viewer.camera.flyTo({
        entity: routeData.plane,
        duration: 0.5,
        offset: this.#viewer.trackedEntityOffset
      });
    }
  };

  /**
   * 跟踪当前激活航线的飞机
   * @param {String} routeId 航线ID
   * @param {Object} options 可选配置，同viewAircraft方法
   */
  trackCurrentAircraft(routeId, options = {}) {
    this.viewAircraft(routeId, options);
  };

  /**
   * 取消跟踪实体，恢复自由视角
   */
  releaseTracking() {
    if (this.#viewer) {
      this.#viewer.trackedEntity = undefined;
    }
  };
  
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
  };

  /**
   * 动态调整飞机姿态
   * @param {String} routeId 航线ID
   * @param {Object} attitude 姿态调整参数
   * @param {Number} attitude.heading 偏航角（度）
   * @param {Number} attitude.pitch 俯仰角（度）
   * @param {Number} attitude.roll 滚转角（度）
   */
  setPlaneAttitude(routeId, attitude) {
    if (!routeId || !attitude) return;
    
    // 获取当前姿态
    const currentAttitude = this.#planeAttitudes.get(routeId) ;
    
    // 更新姿态参数
    const newAttitude = {
      heading: attitude.heading !== undefined ? attitude.heading : currentAttitude.heading,
      pitch: attitude.pitch !== undefined ? attitude.pitch : currentAttitude.pitch,
      roll: attitude.roll !== undefined ? attitude.roll : currentAttitude.roll
    };
    
    // 存储更新后的姿态
    this.#planeAttitudes.set(routeId, newAttitude);
    
    console.log(`[${new Date().toLocaleTimeString()}] 调整飞机姿态 - 航线: ${routeId}, 姿态:`, newAttitude);
    
    // 触发场景重绘
    if (this.#viewer) {
      this.#viewer.scene.requestRender();
    }
  };


  /**
   * 初始化键盘事件监听
   */
  #initKeyboardControls() {
    // 如果已经存在事件监听器，先移除
    if (this.#keyboardEventListener) {
      document.removeEventListener('keydown', this.#keyboardEventListener);
    }
    
    // 键盘事件处理函数
    this.#keyboardEventListener = (event) => {
      if (!this.#activeRouteId) return;
      
      // 获取当前姿态
      const currentAttitude = this.#planeAttitudes.get(this.#activeRouteId);
      // 姿态调整步长
      const step = 2;
      
      // 根据按键调整姿态
      switch (event.key) {
        case 'ArrowUp':
          // 上箭头：抬头（增加俯仰角）
          this.setPlaneAttitude(this.#activeRouteId, {
            pitch: currentAttitude.pitch + step,
            roll: currentAttitude.roll,
            heading: currentAttitude.heading
          });
          break;
        case 'ArrowDown':
          // 下箭头：低头（减少俯仰角）
          this.setPlaneAttitude(this.#activeRouteId, {
            pitch: currentAttitude.pitch - step,
             roll: currentAttitude.roll,
            heading: currentAttitude.heading
          });
          break;
        case 'ArrowLeft':
          // 左箭头：向左滚转（减少滚转角）
          this.setPlaneAttitude(this.#activeRouteId, {
            roll: currentAttitude.roll - step,
            pitch: currentAttitude.pitch,
            heading: currentAttitude.heading
          });
          break;
        case 'ArrowRight':
          // 右箭头：向右滚转（增加滚转角）
          this.setPlaneAttitude(this.#activeRouteId, {
            roll: currentAttitude.roll + step,
            pitch: currentAttitude.pitch,
            heading: currentAttitude.heading
          });
          break;
        case 'c':
          // A键：向左偏航（减少偏航角）
          this.setPlaneAttitude(this.#activeRouteId, {
            heading: currentAttitude.heading - step,
            pitch: currentAttitude.pitch,
            roll: currentAttitude.roll
          });
          break;
        case 'v':
          // D键：向右偏航（增加偏航角）
          this.setPlaneAttitude(this.#activeRouteId, {
            heading: currentAttitude.heading + step,
            pitch: currentAttitude.pitch,
            roll: currentAttitude.roll
          });
          break;
      }
    };
    
    // 添加键盘事件监听器
    document.addEventListener('keydown', this.#keyboardEventListener);
    console.log('键盘控制已初始化，使用上下左右键调整飞机姿态，AD键调整偏航角');
  }
  
  /**
   * 完全销毁实例（清理资源）
   */
  destroy() {
    this.clearAllRoutes();
    
    // 移除键盘事件监听器
    if (this.#keyboardEventListener) {
      document.removeEventListener('keydown', this.#keyboardEventListener);
      this.#keyboardEventListener = null;
    }
    
    this.#planeAttitudes.clear();
    this.#activeRouteId = null;
    this.#viewer = null;
    RouteManager.instance = null;
  }
}

// 导出单例实例
export const routeManager = new RouteManager();
export default routeManager;