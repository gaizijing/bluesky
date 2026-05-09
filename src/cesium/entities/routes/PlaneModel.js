// src/cesium/entities/routes/PlaneModel.js
import * as Cesium from 'cesium'
import { useWindStore } from '@/store/modules/wind'

export class PlaneModel {
  #planeAttitudes; // 私有字段声明
  #entities; // 存储创建的实体

  constructor(viewer) {
    this.viewer = viewer
    this.#planeAttitudes = new Map() // routeId -> { heading, pitch, roll } 存储飞机姿态调整参数
    this.#entities = new Map() // routeId -> entity 存储创建的实体
  }


/**
   * 创建增强的飞机实体
   * @param {String} routeId 飞机ID
   * @param {Cesium.Cartesian3} position 初始位置
   * @param {Object} options 配置选项
   * @param {Function} options.getAttitude 获取姿态数据的函数 () => { heading, pitch, roll }
   * @param {Function} options.getAltitude 获取高度数据的函数 () => number
   * @param {Function} options.getFlightPath 获取飞行路径的函数 () => Array
   * @param {Function} options.getRecordFlightPath 获取是否记录飞行路径的函数 () => boolean
   */
  createRoutePlane(routeId, position, options = {}) {
    try {
      console.log('[DEBUG] 创建增强飞机实体')
      
      // 使用本地小型飞机模型
      const modelUri = '/cesium/model/plane/plane.glb'
      
      const entity = this.viewer.entities.add({
        id: routeId,
        name: 'ISIM实时飞机',
        position: position,
        // 使用优化的姿态更新
        orientation: new Cesium.CallbackProperty((time) => {
          try {
            // 从选项中获取姿态数据
            const attitude = options.getAttitude ? options.getAttitude() : { heading: 0, pitch: 0, roll: 0 }
            // 将角度转换为弧度
            const heading = Cesium.Math.toRadians(attitude.heading || 0)
            const pitch = Cesium.Math.toRadians(attitude.pitch || 0)
            const roll = Cesium.Math.toRadians(attitude.roll || 0)
            
            // 获取当前位置
            const currentPosition = entity.position.getValue(time)
            if (!currentPosition) {
              return Cesium.Quaternion.IDENTITY
            }
            
            // 创建基础姿态四元数
            const baseQuaternion = Cesium.Transforms.headingPitchRollQuaternion(
              currentPosition,
              new Cesium.HeadingPitchRoll(heading, pitch, roll)
            )
            
            // 模型需要额外旋转90度（模型自身朝向与Cesium坐标系不一致）
            const modelRotation = Cesium.Quaternion.fromAxisAngle(
              Cesium.Cartesian3.UNIT_Z, // 绕Y轴旋转
              Cesium.Math.toRadians(-90) // 旋转90度
            )
            
            // 组合旋转：先应用模型修正旋转，再应用姿态旋转
            return Cesium.Quaternion.multiply(baseQuaternion, modelRotation, new Cesium.Quaternion())
          } catch (error) {
            console.warn('[DEBUG] 计算姿态时出错:', error)
            return Cesium.Quaternion.IDENTITY
          }
        }, false),
        // 使用本地小型飞机模型
        model: {
          uri: modelUri,
          scale: 20.0, // 适当放大
          show: true,
          minimumPixelSize: 40, // 增大最小像素大小
          maximumScale: 80000,
          runAnimations: true,
          
        },
        // 添加增强的标签
        label: {
          // 使用CallbackProperty动态更新标签内容
          text: new Cesium.CallbackProperty((time) => {
            const entity = this.#entities.get(routeId);
            if (!entity) return '';
            
            const position = entity.position.getValue(time);
            if (position) {
              const cartographic = Cesium.Cartographic.fromCartesian(position);
              const longitude = Cesium.Math.toDegrees(cartographic.longitude).toFixed(4);
              const latitude = Cesium.Math.toDegrees(cartographic.latitude).toFixed(4);
              const height = cartographic.height.toFixed(0);
              
              // 获取实时风速和风向
              let windSpeed = 0;
              let windDirection = 0;
              let windDirectionText = '';

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
                    windDirection = closestWindData.interpolated.direction || 0;
                    
                    // 将风向角度转换为方向文本
                    const directions = ['北', '东北', '东', '东南', '南', '西南', '西', '西北'];
                    const index = Math.round(windDirection / 45) % 8;
                    windDirectionText = directions[index];
                  }
                }
              } catch (error) {
                // 忽略所有错误，确保飞机正常显示
              }

              return `经：${longitude}° 纬：${latitude}°
  高：${height}m 风速：${windSpeed}m/s
  风向：${windDirectionText}(${windDirection.toFixed(1)}°)`;
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
        },
        // 添加增强的路径线
        path: {
          resolution: 1,
          width: 8,
          material: new Cesium.PolylineGlowMaterialProperty({
            glowPower: 0.2,
            color: Cesium.Color.fromBytes(59, 130, 246, 180) // 半透明蓝色
          }),
          show: new Cesium.CallbackProperty(() => {
            return options.getRecordFlightPath ? options.getRecordFlightPath() : false
          }, false),
          leadTime: 0,
          trailTime: 60, // 轨迹保留60秒
          zIndex: 1
        },
        // 添加飞机灯光效果
        point: {
          pixelSize: 10,
          color: Cesium.Color.fromBytes(255, 255, 0, 200),
          outlineColor: Cesium.Color.YELLOW,
          outlineWidth: 2,
          show: true
        },
        // 添加尾迹效果
        polyline: {
          positions: new Cesium.CallbackProperty(() => {
            const flightPath = options.getFlightPath ? options.getFlightPath() : []
            if (flightPath.length < 2) return []
            const recentPath = flightPath.slice(-20) // 最近20个点
            return recentPath.map(point => Cesium.Cartesian3.fromDegrees(
              point.lon,
              point.lat,
              point.alt
            ))
          }, false),
          width: 6,
          material: new Cesium.PolylineGlowMaterialProperty({
            glowPower: 0.3,
            color: Cesium.Color.fromBytes(16, 185, 129, 150)
          }),
          show: new Cesium.CallbackProperty(() => {
            return options.getRecordFlightPath ? options.getRecordFlightPath() : false
          }, false)
        }
      })
      
      // 存储实体引用
      this.#entities.set(routeId, entity)
      
      console.log('[DEBUG] 增强飞机实体创建成功')
      return entity
      
    } catch (error) {
      console.error('[DEBUG] 创建增强飞机实体失败:', error)
      return null
    }
  }
  /**
   * 更新飞机位置
   * @param {String} routeId 飞机ID
   * @param {Cesium.Cartesian3} position 新位置
   */
  updatePlanePosition(routeId, position) {

    const entity = this.#entities.get(routeId);

    // 直接更新实体的position属性
    entity.position = position;

    // 触发场景重绘
    this.viewer.scene.requestRender();
  }

  /**
   * 直接更新飞机姿态
   * @param {String} routeId 飞机ID
   * @param {Object} attitude 姿态调整参数
   * @param {Number} attitude.heading 偏航角（度）
   * @param {Number} attitude.pitch 俯仰角（度）
   * @param {Number} attitude.roll 滚转角（度）
   */
  setPlaneAttitude(routeId, attitude) {
    if (!this.viewer) {
      throw new Error('PlaneModel: Viewer is not initialized');
    }

    if (!routeId || !attitude) {
      throw new Error('PlaneModel: routeId and attitude are required');
    }

    if (!this.#entities.has(routeId)) {
      throw new Error(`PlaneModel: Entity not found for routeId: ${routeId}`);
    }

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

    // 调试日志
    console.log(`[PlaneModel] 姿态更新: ${routeId}`, newAttitude);

    // 触发场景重绘
    this.viewer.scene.requestRender();
  }

  /**
   * 清理飞机姿态数据
   */
  clearAttitudes() {
    this.#planeAttitudes.clear();
  }

  /**
   * 移除飞机模型
   * @param {String} routeId 飞机ID
   */
  removePlane(routeId) {


    const entity = this.#entities.get(routeId);
    if (entity) {
      this.viewer.entities.remove(entity);
      this.#entities.delete(routeId);
      this.#planeAttitudes.delete(routeId);
      console.log('已移除飞机模型:', routeId);
    }
  }

  /**
   * 移除所有飞机模型
   */
  removeAllPlanes() {
    if (!this.viewer) {
      throw new Error('PlaneModel: Viewer is not initialized');
    }

    this.#entities.forEach((entity, routeId) => {
      this.viewer.entities.remove(entity);
    });

    this.#entities.clear();
    this.#planeAttitudes.clear();
    console.log('已移除所有飞机模型');
  }
}