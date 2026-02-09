// src/cesium/entities/routes/PlaneModel.js
import * as Cesium from 'cesium'
import { useWindStore } from '@/store/modules/wind'

export class PlaneModel {
  #planeAttitudes; // 私有字段声明

  constructor(viewer) {
    this.viewer = viewer
    this.#planeAttitudes = new Map() // routeId -> { heading, pitch, roll } 存储飞机姿态调整参数
  }

  /**
   * 创建飞机模型
   */
  createRoutePlane(routeId, positions, duration = 60, routeStartTime, routeEndTime) {
    if (!this.viewer) return null

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
      startTime = this.viewer.clock.startTime;
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
    const existingClock = this.viewer.clock;
    existingClock.startTime = startTime.clone();
    existingClock.stopTime = endTime.clone();
    existingClock.currentTime = startTime.clone();
    existingClock.clockRange = Cesium.ClockRange.LOOP_STOP;
    existingClock.multiplier = 1;
    existingClock.shouldAnimate = true;
    
    // 确保时间轴显示正确的时间范围
    if (this.viewer.timeline) {
      this.viewer.timeline.zoomTo(startTime, endTime);
    }

    // 创建飞机 Entity，直接使用动态属性
    const planeEntity = this.viewer.entities.add({
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
    const currentAttitude = this.#planeAttitudes.get(routeId) || { heading: 0, pitch: 0, roll: 0 };
    
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
    if (this.viewer) {
      this.viewer.scene.requestRender();
    }
  };

  /**
   * 清理飞机姿态数据
   */
  clearAttitudes() {
    this.#planeAttitudes.clear();
  }
}