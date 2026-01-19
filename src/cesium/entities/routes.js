// src/cesium/entities/RouteManager.js
import * as Cesium from 'cesium'
import eventManager from '@/cesium/core/eventManager'
import { useWindStore } from '@/store/modules/wind'
class RouteManager {
  // 单例实例
  static instance = null;
  
  // 私有属性
  #routeEntities = new Map() // routeId -> { polylineEntity, planeEntity, positions, dangers, info }
  #animationClocks = new Map() // routeId -> Clock
  #viewer = null // Cesium viewer实例
  #unbindEvents = null // 事件解绑函数

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
    let meterial=new Cesium.ColorMaterialProperty()
    // 危险等级分三段：安全(绿)、警告(黄)、危险(红)
    if (normalized < 3) {

      meterial.color= Cesium.Color.GREEN.withAlpha(1); // 安全
    } else if (normalized < 7) {
      meterial.color= Cesium.Color.YELLOW.withAlpha(1); // 警告
    } else {
      meterial.color= Cesium.Color.RED.withAlpha(1); // 危险
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
  #createRoutePlane(routeId, positions, duration = 60) {
    if (!this.#viewer) return null

    // 模型路径
    const modelUrl = '/cesium/model/plane/plane.glb'

    // 配置航线动画属性
    const positionProperty = new Cesium.SampledPositionProperty();
    positionProperty.setInterpolationOptions({
      interpolationDegree: 2,
      interpolationAlgorithm: Cesium.HermitePolynomialApproximation
    });

    // 使用当前时间作为动画开始时间
    const startTime = Cesium.JulianDate.now();
    const interval = duration / (positions.length - 1);

    // 为每个位置添加采样点
    positions.forEach((pos, idx) => {
      const time = Cesium.JulianDate.addSeconds(
        startTime,
        idx * interval,
        new Cesium.JulianDate()
      );
      positionProperty.addSample(time, pos);
    });

    // 创建基础方向属性
    const baseOrientation = new Cesium.VelocityOrientationProperty(positionProperty);
    
    // 自定义方向属性，添加90°偏航角
    const orientationProperty = new Cesium.CallbackProperty((time, result) => {
      const baseQuaternion = baseOrientation.getValue(time, result);
      
      if (!baseQuaternion) {
        return Cesium.Quaternion.IDENTITY;
      }
      
      const heading90 = Cesium.Transforms.headingPitchRollQuaternion(
        Cesium.Cartesian3.ZERO,
        new Cesium.HeadingPitchRoll(
          Cesium.Math.toRadians(340),
          0,
          0
        )
      );
      
      return Cesium.Quaternion.multiply(
        baseQuaternion,
        heading90,
        new Cesium.Quaternion()
      );
    }, false);

    // 配置动画时钟 - 确保立即开始
    const existingClock = this.#viewer.clock;
    existingClock.startTime = startTime;
    existingClock.currentTime = startTime;
    existingClock.stopTime = Cesium.JulianDate.addSeconds(startTime, duration, new Cesium.JulianDate());
    existingClock.clockRange = Cesium.ClockRange.LOOP_STOP;
    existingClock.clockStep = Cesium.ClockStep.SYSTEM_CLOCK_MULTIPLIER;
    existingClock.multiplier = 1;
    existingClock.shouldAnimate = true;

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
      // 添加常显标签，显示位置和高度信息
      label: {
        // 使用CallbackProperty动态更新标签内容
        text: new Cesium.CallbackProperty((time) => {
          const position = planeEntity.position.getValue(time);
          if (position) {
            const cartographic = Cesium.Cartographic.fromCartesian(position);
            const longitude = Cesium.Math.toDegrees(cartographic.longitude).toFixed(4);
            const latitude = Cesium.Math.toDegrees(cartographic.latitude).toFixed(4);
            const height = cartographic.height.toFixed(0);
            
            // 获取实时风速
            let windSpeed = 10;
            const windStore = useWindStore();
            const windLayers = windStore.windLayer;
            
            if (windLayers) {
              // 处理windLayers可能是数组的情况
              const windLayer = Array.isArray(windLayers) ? windLayers[0] : windLayers;
              // if (windLayer) {
              //   const windData = windLayer.getDataAtLonLat( longitude,latitude);
              //   console.log(windData);
                

              //   if (windData) {
              //     windSpeed = windData.speed.toFixed(1);
              //   }
              // }
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
        backgroundColor: Cesium.Color.fromCssColorString('rgba(0, 0, 0, 0.7)'),
        backgroundPadding: new Cesium.Cartesian2(10, 5),
        horizontalOrigin: Cesium.HorizontalOrigin.CENTER,
        verticalOrigin: Cesium.VerticalOrigin.TOP,
        pixelOffset: new Cesium.Cartesian2(0, -60), // 显示在飞机上方
        disableDepthTestDistance: Number.POSITIVE_INFINITY // 确保标签始终可见
      }
    });

    this.#animationClocks.set(routeId, existingClock);

    // 强制场景渲染，确保动画立即开始
    this.#viewer.scene.requestRender();

    // 模型加载状态监听
    let renderListener = null;
    let checkCount = 0;
    renderListener = () => {
      if (checkCount > 100) {
        this.#viewer.scene.postRender.removeEventListener(renderListener);
        console.warn('模型加载超时，可能模型路径错误或场景未准备好');
        return;
      }
      checkCount++;

      if (!this.#viewer?.scene || !this.#viewer.scene.models) {
        return;
      }

      const model = this.#viewer.scene.models.find(m => m.id === planeEntity.id);
      if (model && model.ready) {
        this.#viewer.scene.postRender.removeEventListener(renderListener);
      }
    };
    this.#viewer.scene.postRender.addEventListener(renderListener);

    return planeEntity;
  }

  /**
   * 清除航线实体
   */
  #clearRouteEntities(currentRouteEntities) {
    if (this.#viewer && currentRouteEntities.length > 0) {
      currentRouteEntities.forEach(entity => {
        try { this.#viewer.entities.remove(entity) } catch (e) { }
      })
      currentRouteEntities.length = 0
    }
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
          console.log(positions[i], positions[i + 1]);

      const segment = this.#createRouteSegment(
        route.id,
        i,
        [positions[i], positions[i + 1]],
        route.dangers?.[i] || 0
      )
      segment && segmentEntities.push(segment)
    }

    // 创建飞机模型
    const planeEntity = this.#createRoutePlane(
      route.id,
      positions,
      route.duration || 180 // 增加默认时长从60秒到180秒，减慢飞机速度
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
        backgroundColor: Cesium.Color.fromCssColorString('rgba(0, 0, 0, 0.7)'),
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
        backgroundColor: Cesium.Color.fromCssColorString('rgba(0, 0, 0, 0.7)'),
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

    // 调整相机视角
    const boundingSphere = Cesium.BoundingSphere.fromPoints(
      route.waypoints.map(wp =>
        Cesium.Cartesian3.fromDegrees(wp.longitude, wp.latitude)
      ));
    this.#viewer.camera.flyToBoundingSphere(boundingSphere, {
      duration: 1.5,
      offset: new Cesium.HeadingPitchRange(
        0,
        Cesium.Math.toRadians(-10),
        boundingSphere.radius * 5 // 提高相机高度，从3倍半径增加到5倍
      )
    });

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

    // 停止时钟
    if (this.#animationClocks.has(routeId)) {
      this.#animationClocks.get(routeId).shouldAnimate = false
      this.#animationClocks.delete(routeId)
    }

    this.#routeEntities.delete(routeId)
  }

  /**
   * 全部卸载（对外暴露的方法）
   */
  clearAllRoutes() {
    if (!this.#viewer) return;
    this.#routeEntities.forEach((_, routeId) => this.#removeRoute(routeId))
  }

  /**
   * 绑定航线事件
   */
  #bindRouteEvents() {
    if (!this.#viewer) return;

    // 辅助函数：安全获取DOM元素
    const getSafeElement = (id) => {
      const el = document.getElementById(id);
      if (!el) console.warn(`未找到元素: ${id}`);
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

    // 飞机鼠标悬停处理器函数
    const planeMouseMoveHandler = (viewer, movement) => {
      const pickedObject = viewer.scene.pick(movement.endPosition);
      
      // 检查是否悬停在飞机上
      if (Cesium.defined(pickedObject) && pickedObject.id?.id?.startsWith('route_') && pickedObject.id?.id?.endsWith('_plane')) {
        const planeEntity = pickedObject.id;
        const position = planeEntity.position.getValue(viewer.clock.currentTime);
        
        if (position) {
          // 转换为经纬度高度
          const cartographic = Cesium.Cartographic.fromCartesian(position);
          const longitude = Cesium.Math.toDegrees(cartographic.longitude);
          const latitude = Cesium.Math.toDegrees(cartographic.latitude);
          const height = cartographic.height;
          
          // 模拟风速数据（实际项目中应从数据源获取）
          const windSpeed = Math.random() * 20 + 5; // 5-25 m/s
          
          // 设置弹窗内容
          if (popup && popupTitle && popupContent) {
            popupTitle.textContent = '飞机实时信息';
            popup.className = '';
            popupContent.innerHTML = `
              <div >
                <span style="display: inline-block; font-weight: 500; min-width: 100px;">经度：</span>
                <span>${longitude.toFixed(6)}°</span>
              </div>
              <div >
                <span style="display: inline-block; font-weight: 500; min-width: 100px;">纬度：</span>
                <span>${latitude.toFixed(6)}°</span>
              </div>
              <div >
                <span style="display: inline-block; font-weight: 500; min-width: 100px;">高度：</span>
                <span>${height.toFixed(2)} m</span>
              </div>
              <div >
                <span style="display: inline-block; font-weight: 500; min-width: 100px;">风速：</span>
                <span>${windSpeed.toFixed(1)} m/s</span>
              </div>
            `;
            
            // 计算弹窗位置
            const canvas = viewer.canvas;
            const x = movement.endPosition.x + 10;
            const y = movement.endPosition.y - 10;
            
            // 边界检查
            const popupWidth = popup.offsetWidth || 300;
            const popupHeight = popup.offsetHeight || 200;
            const safeX = Math.min(x, canvas.clientWidth - popupWidth - 10);
            const safeY = Math.max(10, y - popupHeight);
            
            // 设置弹窗位置
            popup.style.left = `${safeX}px`;
            popup.style.top = `${safeY}px`;
            popup.style.display = 'block';
          }
          
          return true;
        }
      } else if (popup) {
        // 鼠标离开飞机，隐藏弹窗
        popup.style.display = 'none';
      }
      
      return false;
    };
    
    // 注册鼠标移动处理器
    this.#viewer.scene.postRender.addEventListener(() => {
      const mousePosition = this.#viewer.scene.canvas.getBoundingClientRect();
      const mockMovement = {
        endPosition: {
          x: mousePosition.width / 2, // 默认位置，实际应从鼠标事件获取
          y: mousePosition.height / 2
        }
      };
      // 这里需要实际的鼠标位置，暂时使用模拟值
      // 实际项目中应通过eventManager注册鼠标移动事件
    });
    
    // 保存解绑方法
    this.#unbindEvents = () => {
      eventManager.unregisterClickHandler(routeClickHandler);
    };
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

    this.#viewer.trackedEntity = undefined;

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
   */
  viewAircraft(routeId) {
    if (!this.#viewer || !routeId) return;

    const routeData = this.#routeEntities.get(routeId);
    if (routeData && routeData.plane) {
      this.#viewer.trackedEntity = routeData.plane;
    }
  };

  /**
   * 跟踪当前激活航线的飞机
   * @param {String} routeId 航线ID
   */
  trackCurrentAircraft(routeId) {
    this.viewAircraft(routeId);
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
   * 完全销毁实例（清理资源）
   */
  destroy() {
    this.clearAllRoutes();
    if (this.#unbindEvents) {
      this.#unbindEvents();
    }
    this.#viewer = null;
    RouteManager.instance = null;
  }
}

// 导出单例实例
export const routeManager = new RouteManager();
export default routeManager;