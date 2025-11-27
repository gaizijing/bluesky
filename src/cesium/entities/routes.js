// src/cesium/entities/routes.js
import * as Cesium from 'cesium'
import { useCesiumStore } from '@/store/modules/cesium'

// 存储航线实体和飞机模型
let routeEntities = new Map() // routeId -> { polylineEntity, planeEntity, positions, dangers, info }
let animationClocks = new Map() // routeId -> Clock
let viewer = null // 外部传入的viewer实例
const cesiumStore = useCesiumStore()

/**
 * 初始化航线管理器（需传入viewer实例）
 */
export const initRouteManager = (viewerInstance) => {
  viewer = viewerInstance
  bindRouteEvents()
}

/**
 * 初始化航线动画时钟
 */
const createRouteClock = (duration) => {
  const clock = new Cesium.Clock({
    startTime: Cesium.JulianDate.fromDate(new Date()),
    currentTime: Cesium.JulianDate.fromDate(new Date()),
    stopTime: Cesium.JulianDate.addSeconds(
      Cesium.JulianDate.fromDate(new Date()),
      duration,
      new Cesium.JulianDate()
    ),
    clockRange: Cesium.ClockRange.LOOP_STOP,
    clockStep: Cesium.ClockStep.SYSTEM_CLOCK_MULTIPLIER,
    multiplier: 1,
    shouldAnimate: true
  })
  return clock
}

/**
 * 根据危险指数获取颜色（修改为红黄绿三色）
 * @param {Number} danger 危险指数(0-10)
 * @returns {Cesium.Color} 对应的颜色
 */
export const getColorByDangerLevel = (danger) => {
  const normalized = Cesium.Math.clamp(danger, 0, 10);

  // 危险等级分三段：安全(绿)、警告(黄)、危险(红)
  if (normalized < 3) {
    return Cesium.Color.GREEN.withAlpha(1); // 安全
  } else if (normalized < 7) {
    return Cesium.Color.YELLOW.withAlpha(1); // 警告
  } else {
    return Cesium.Color.RED.withAlpha(1); // 危险
  }
};

/**
 * 创建单段航线
 */
const createRouteSegment = (routeId, segmentIndex, positions, danger) => {
  if (!viewer || positions.length < 2) return null

  return viewer.entities.add({
    id: `route_${routeId}_segment_${segmentIndex}`,
    polyline: {
      positions: positions,
      width: 6, // 稍微加宽以便更清晰可见
      material: getColorByDangerLevel(danger), // 直接使用纯色
      depthFailMaterial: getColorByDangerLevel(danger), // 被遮挡时也使用纯色
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
export const createRoutePlane = async (routeId, positions, duration = 60) => {
  // 1. 加强参数校验，确保positions是有效数组
  if (!viewer) {
    console.warn('创建飞机失败：viewer 未初始化')
    return null
  }
  if (!Array.isArray(positions)) {
    console.warn('创建飞机失败：positions必须是数组')
    return null
  }
  if (positions.length < 2) {
    console.warn('创建飞机失败：航点数量不足（需≥2个）')
    return null
  }

  // 2. 模型路径校验
  const modelUrl = '/cesium/model/plane/plane.glb'

  // 3. 创建飞机 Entity（简化模型属性，避免过度包装ConstantProperty）
  const planeEntity = viewer.entities.add({
    id: `route_${routeId}_plane`,
    position: positions[0], // 直接使用初始位置，不包装ConstantProperty
    model: {
      uri: modelUrl, // 直接使用URL，符合官网示例
      scale: 2.0,
      show: true,
      minimumPixelSize: 64,
      maximumScale: 20000
    },
  })

  // 4. 监听模型加载状态（修复模型集合未初始化的问题）
  let renderListener = null;
  let checkCount = 0; // 限制检查次数，防止无限循环
  renderListener = () => {
    // 限制最大检查次数（约5秒，每帧检查一次）
    if (checkCount > 100) {
      viewer.scene.postRender.removeEventListener(renderListener);
      console.warn('模型加载超时，可能模型路径错误或场景未准备好');
      return;
    }
    checkCount++;

    // 核心修复：先校验scene和models是否存在
    if (!viewer?.scene || !viewer.scene.models) {
      return; // 场景未准备好，跳过本次检查
    }

    // 查找模型实例（确保id匹配）
    const model = viewer.scene.models.find(m => m.id === planeEntity.id);
    if (model && model.ready) {
      viewer.scene.postRender.removeEventListener(renderListener);
    }
  };
  viewer.scene.postRender.addEventListener(renderListener);

  // 在createRoutePlane函数的"配置航线动画"部分修改
  const positionProperty = new Cesium.SampledPositionProperty();
  positionProperty.setInterpolationOptions({
    interpolationDegree: 2,
    interpolationAlgorithm: Cesium.LagrangePolynomialApproximation
  });

  const startTime = Cesium.JulianDate.now();
  // 每段航点间隔时间平均分配（确保匀速移动）
  const interval = duration / (positions.length - 1); // 每段航点的时间间隔

  positions.forEach((pos, idx) => {
    const time = Cesium.JulianDate.addSeconds(
      startTime,
      idx * interval, // 按间隔累加时间，而非比例分配
      new Cesium.JulianDate()
    );
    positionProperty.addSample(time, pos);
  });

  // 强制绑定位置和朝向（移除冗余判断）
  planeEntity.position = positionProperty;
  planeEntity.orientation = new Cesium.VelocityOrientationProperty(positionProperty);

  // 7. 配置动画时钟（修改现有clock属性，而非替换整个对象）
  const existingClock = viewer.clock; // 获取现有clock
  // 更新现有clock的属性（保持对象引用不变）
  existingClock.startTime = startTime;
  existingClock.currentTime = startTime;
  existingClock.stopTime = Cesium.JulianDate.addSeconds(startTime, duration, new Cesium.JulianDate());
  existingClock.clockRange = Cesium.ClockRange.LOOP_STOP;
  existingClock.clockStep = Cesium.ClockStep.SYSTEM_CLOCK_MULTIPLIER;
  existingClock.multiplier = 1;
  existingClock.shouldAnimate = true;

  // 存储时钟（供后续控制）
  animationClocks.set(routeId, existingClock);
  // 无需替换viewer.clock，因为已更新其属性
  // viewer.clock = clock; // 删除此行

  return planeEntity;
}
// 航线实体管理（原代码中currentRouteEntities相关逻辑）
export const clearRouteEntities = (viewer, currentRouteEntities) => {
  if (viewer && currentRouteEntities.length > 0) {
    currentRouteEntities.forEach(entity => {
      try { viewer.entities.remove(entity) } catch (e) { }
    })
    currentRouteEntities.length = 0
  }
}
/**
 * 添加完整航线
 * @param {Object} route 航线数据（结构同上）
 */
export const addRoute = async (route) => {
  if (!viewer || !route?.waypoints || route.waypoints.length < 2) return
  
  // 先检查并移除已存在的相同ID的航线，避免实体ID重复
  if (routeEntities.has(route.id)) {
    removeRoute(route.id)
  }

  // 在addRoute函数的"构建航点数组"部分修改
  const enhancedWaypoints = [];
  const startPoint = route.waypoints[0];
  const endPoint = route.waypoints[route.waypoints.length - 1];

  // 1. 起点上升航路（3个过渡点：地面→低空→半高→起点高度）
  const startHeight = startPoint.height || 1000;
  enhancedWaypoints.push(
    { ...startPoint, height: 0 }, // 地面
    { ...startPoint, height: startHeight * 0.3 }, // 低空
    { ...startPoint, height: startHeight * 0.7 }, // 半高
    { ...startPoint, height: startHeight } // 起点高度
  );

  // 2. 原始航点（中间段）
  enhancedWaypoints.push(...route.waypoints);

  // 3. 终点下降航路（3个过渡点：终点高度→半高→低空→地面）
  const endHeight = endPoint.height || 1000;
  enhancedWaypoints.push(
    { ...endPoint, height: endHeight }, // 终点高度
    { ...endPoint, height: endHeight * 0.7 }, // 半高
    { ...endPoint, height: endHeight * 0.3 }, // 低空
    { ...endPoint, height: 0 } // 地面
  );

  // 转换航点为Cesium坐标
  const positions = enhancedWaypoints.map(waypoint =>
    Cesium.Cartesian3.fromDegrees(
      waypoint.longitude,
      waypoint.latitude,
      waypoint.height || 1000
    )
  )



  // 创建航线分段
  const segmentEntities = []
  for (let i = 0; i < positions.length - 1; i++) {
    const segment = createRouteSegment(
      route.id,
      i,
      [positions[i], positions[i + 1]],
      route.dangers?.[i] || 0
    )
    segment && segmentEntities.push(segment)
  }

  // 创建飞机模型
  const planeEntity = await createRoutePlane(
    route.id,
    positions,
    route.duration || 60
  )
  // 在addRoute函数的"存储航线信息"前添加
  // 创建起点标签
  const startLabel = viewer.entities.add({
    position: positions[3], // 对应起点高度的航点（参考第三步的enhancedWaypoints）
    label: {
      text: `起点：${route.startName || '出发地'}`,
      font: '14px sans-serif',
      fillColor: Cesium.Color.GREEN,
      outlineColor: Cesium.Color.BLACK,
      outlineWidth: 1,
      style: Cesium.LabelStyle.FILL_AND_OUTLINE,
      pixelOffset: new Cesium.Cartesian2(0, -20), // 向上偏移20像素
      heightReference: Cesium.HeightReference.CLAMP_TO_GROUND
    }
  });

  // 创建终点标签
  const endLabel = viewer.entities.add({
    position: positions[positions.length - 4], // 对应终点高度的航点
    label: {
      text: `终点：${route.endName || '目的地'}`,
      font: '14px sans-serif',
      fillColor: Cesium.Color.RED,
      outlineColor: Cesium.Color.BLACK,
      outlineWidth: 1,
      style: Cesium.LabelStyle.FILL_AND_OUTLINE,
      pixelOffset: new Cesium.Cartesian2(0, -20),
      heightReference: Cesium.HeightReference.CLAMP_TO_GROUND
    }
  });

  // 将标签存入航线数据（便于后续删除）
  segmentEntities.push(startLabel, endLabel);
  // 存储航线信息
  routeEntities.set(route.id, {
    segments: segmentEntities,
    plane: planeEntity,
    positions: positions,
    dangers: route.dangers || [],
    info: route.info || {},
    name: route.name || `航线${route.id}`
  })

  return route.id
}

/**
 * 移除航线
 */
export const removeRoute = (routeId) => {
  // 检查 viewer 是否已初始化及其属性
  if (!viewer || !viewer.entities || !routeEntities.has(routeId)) return

  const routeData = routeEntities.get(routeId)

  // 移除航线分段和飞机
  routeData.segments.forEach(segment => viewer.entities.remove(segment))
  if (routeData.plane) viewer.entities.remove(routeData.plane)

  // 停止时钟
  if (animationClocks.has(routeId)) {
    animationClocks.get(routeId).shouldAnimate = false
    animationClocks.delete(routeId)
  }

  routeEntities.delete(routeId)
}

/**
 * 移除所有航线
 */
export const clearAllRoutes = () => {
  // 检查 viewer 是否已初始化
  if (!viewer) return
  
  routeEntities.forEach((_, routeId) => removeRoute(routeId))
}

const bindRouteEvents = () => {
  if (!viewer) return;

  // 辅助函数：安全获取DOM元素
  const getSafeElement = (id) => {
    const el = document.getElementById(id);
    if (!el) console.warn(`未找到元素: ${id}`);
    return el;
  };

  // 获取弹窗元素
  const popup = getSafeElement('routePopup') || document.createElement('div');
  popup.id = 'routePopup';
  popup.style.position = 'absolute';
  popup.style.background = 'rgba(255, 255, 255, 0.95)';
  popup.style.padding = '16px';
  popup.style.borderRadius = '12px';
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

  const closePopup = getSafeElement('closePopup') || document.createElement('button');
  closePopup.id = 'closePopup';
  closePopup.textContent = '关闭';
  closePopup.style.marginTop = '12px';
  closePopup.style.padding = '6px 16px';
  closePopup.style.background = '#6366f1';
  closePopup.style.color = 'white';
  closePopup.style.border = 'none';
  closePopup.style.borderRadius = '6px';
  closePopup.style.cursor = 'pointer';
  closePopup.style.fontSize = '14px';
  closePopup.style.transition = 'background-color 0.2s ease';
  closePopup.style.fontWeight = '500';
  closePopup.addEventListener('mouseenter', () => {
    closePopup.style.background = '#4f46e5';
  });
  closePopup.addEventListener('mouseleave', () => {
    closePopup.style.background = '#6366f1';
  });
  popup.appendChild(closePopup);

  // 关闭弹窗事件
  if (closePopup && popup) {
    closePopup.addEventListener('click', () => {
      popup.style.display = 'none';
    });
  }

  // 航线点击事件
  viewer.screenSpaceEventHandler.setInputAction((movement) => {
    const pickedObject = viewer.scene.pick(movement.position);

    if (Cesium.defined(pickedObject) && pickedObject.id?.properties?.isRouteSegment?.getValue()) {
      const routeId = pickedObject.id.properties.routeId.getValue();
      const segmentIndex = pickedObject.id.properties.segmentIndex.getValue();
      const routeData = routeEntities.get(routeId);

      if (routeData && popup && popupTitle && popupContent) {
        // 1. 设置弹窗内容
        popupTitle.textContent = `航线 ${routeData.name} - 第${segmentIndex + 1}段`;

        // 根据危险等级设置样式类
        const dangerValue = routeData.dangers[segmentIndex] || 0;
        popup.className = ''; // 清除之前的类
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
              ${getDangerText(dangerValue)}
            </span>
          </div>
          <div style="margin-bottom: 8px;">
            <span style="display: inline-block; font-weight: 500; min-width: 80px;">天气提醒：</span>
            <span>${getWeatherTips(dangerValue)}</span>
          </div>
          <div style="margin-bottom: 8px;">
            <span style="display: inline-block; font-weight: 500; min-width: 80px;">建议速度：</span>
            <span>${getSpeedSuggestion(dangerValue)}</span>
          </div>
          <div style="margin-top: 8px; padding-top: 8px; border-top: 1px solid #e5e7eb; font-size: 12px; color: #9ca3af;">
            点击其他区域可关闭弹窗
          </div>
        `;

        // 2. 计算航线分段中点的屏幕坐标
        const midPoint = Cesium.Cartesian3.midpoint(
          routeData.positions[segmentIndex],
          routeData.positions[segmentIndex + 1],
          new Cesium.Cartesian3()
        );
        // 将三维坐标转换为屏幕坐标（{ x: 屏幕X, y: 屏幕Y }）
        const screenPos = viewer.scene.cartesianToCanvasCoordinates(midPoint);

        if (screenPos) {
          // 3. 计算弹窗位置（在航线中点下方10px）
          const popupX = screenPos.x;
          const popupY = screenPos.y + 10; // 下方偏移10px

          // 4. 边界检查（避免弹窗超出屏幕）
          const popupWidth = popup.offsetWidth || 300; // 弹窗宽度（默认300px）
          const popupHeight = popup.offsetHeight || 200; // 弹窗高度（默认200px）
          const canvas = viewer.canvas;

          // 限制X坐标在屏幕内
          const safeX = Math.max(10, Math.min(canvas.clientWidth - popupWidth - 10, popupX));
          // 限制Y坐标在屏幕内
          const safeY = Math.max(10, Math.min(canvas.clientHeight - popupHeight - 10, popupY));

          // 5. 设置弹窗位置
          popup.style.left = `${safeX}px`;
          popup.style.top = `${safeY}px`;
          popup.style.bottom = 'auto'; // 清除之前的bottom定位
          popup.style.right = 'auto'; // 清除之前的right定位
          // 添加显示动画
          popup.style.opacity = '0';
          popup.style.transform = 'translateY(10px)';
          popup.style.display = 'block';
          // 使用setTimeout确保样式更新后再执行动画
          setTimeout(() => {
            popup.style.opacity = '1';
            popup.style.transform = 'translateY(0)';
          }, 10);
        }

        // 6. 调整相机视角以显示整条航线
        const boundingSphere = Cesium.BoundingSphere.fromPoints(routeData.positions);
        viewer.camera.flyToBoundingSphere(boundingSphere, {
          offset: new Cesium.HeadingPitchRange(
            0,
            Cesium.Math.toRadians(-45),
            boundingSphere.radius * 2
          ),
          duration: 2
        });
      }
    } else if (popup) {
      // 点击空白处关闭弹窗
      popup.style.display = 'none';
    }
  }, Cesium.ScreenSpaceEventType.LEFT_CLICK);
};
// 新增辅助函数：危险等级文本描述
const getDangerText = (danger) => {
  if (danger < 3) return '安全（绿色）';
  if (danger < 7) return '警告（黄色）';
  return '危险（红色）';
};

// 新增辅助函数：天气提醒
const getWeatherTips = (danger) => {
  const tips = [
    '天气晴朗，能见度佳，适合飞行',
    '局部有薄雾，注意保持航线',
    '风力较大，建议降低飞行高度',
    '有雷暴预警，建议暂停飞行'
  ];
  return danger < 3 ? tips[0] : danger < 7 ? tips[1] : tips[danger > 8 ? 3 : 2];
};

// 新增辅助函数：速度建议
const getSpeedSuggestion = (danger) => {
  return danger < 3 ? '正常速度（800km/h）' : danger < 7 ? '减速至600km/h' : '紧急减速至400km/h';
};

// 导出所有方法
export default {
  initRouteManager,
  addRoute,
  removeRoute,
  clearAllRoutes,
  getColorByDangerLevel
}