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
   * 创建实时数据驱动的飞机模型
   * 用于WebSocket接收的模拟机数据驱动飞机运动
   */
  createRoutePlane(routeId, initialPosition, modelOptions = {}) {
    if (!this.viewer) {
      throw new Error('PlaneModel: Viewer is required');
    }

    if (!initialPosition) {
      throw new Error('PlaneModel: initialPosition is required');
    }

    // 模型路径 - 优先使用自定义模型，否则使用Cesium内置模型
    // 使用本地飞机模型路径
    const modelUrl = '/cesium/model/plane/plane.glb';

    // 初始化当前航线的飞机姿态
    this.#planeAttitudes.set(routeId, {
      heading: 0,
      pitch: 0,
      roll: 0
    });

    // 直接使用位置对象，不使用CallbackProperty
    // 这样可以直接更新position属性

    // 创建飞机 Entity
    const planeEntity = this.viewer.entities.add({
      id: routeId,
      position: initialPosition,
      // 飞机姿态（动态更新）
      // orientation: new Cesium.CallbackProperty(
      //   // 创建闭包函数，避免私有字段访问
      //   (function (attitude, initialPosition) {
      //     return function (time, result) {
      //       if (!attitude) {
      //         return result || Cesium.Quaternion.IDENTITY;
      //       }

      //       // 转换角度为弧度
      //       const heading = Cesium.Math.toRadians(attitude.heading);
      //       const pitch = Cesium.Math.toRadians(attitude.pitch);
      //       const roll = Cesium.Math.toRadians(attitude.roll);

      //       // 使用传入的初始位置，不要在回调中获取实体
      //       const position = initialPosition;

      //       // 计算姿态四元数
      //       return Cesium.Transforms.headingPitchRollQuaternion(
      //         position,
      //         new Cesium.HeadingPitchRoll(heading, pitch, roll),
      //         result
      //       );
      //     };
      //   })(
      //     // 传入当前姿态和初始位置（在创建时确定）
      //     this.#planeAttitudes.get(routeId),
      //     initialPosition
      //   ),
      //   false
      // ),
      model: {
        uri: modelUrl,
        scale: 4.0,
        show: true,
        minimumPixelSize: 64,
        maximumScale: 20000,
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
          try {
            const entity = planeEntity;
            if (!entity) return '';

            const position = entity.position.getValue(time);
            if (position) {
              const cartographic = Cesium.Cartographic.fromCartesian(position);
              const longitude = Cesium.Math.toDegrees(cartographic.longitude).toFixed(4);
              const latitude = Cesium.Math.toDegrees(cartographic.latitude).toFixed(4);
              const height = cartographic.height.toFixed(0);

              // 获取当前姿态
              const attitude = this.#planeAttitudes.get(routeId);
              if (!attitude) return '';

              return `ISIM实时飞机\n经度: ${longitude}°\n纬度: ${latitude}°\n高度: ${height}m\n姿态: 滚转${attitude.roll.toFixed(1)}° 俯仰${attitude.pitch.toFixed(1)}° 航向${attitude.heading.toFixed(1)}°`;
            }
            return '';
          } catch (error) {
            console.error('更新标签失败:', error);
            return '';
          }
        }, false),
        // 标签样式
        font: '12px sans-serif',
        fillColor: Cesium.Color.WHITE,
        outlineColor: Cesium.Color.BLACK,
        outlineWidth: 2,
        showBackground: true,
        backgroundColor: Cesium.Color.fromCssColorString('rgba(0, 0, 0, 0.7)'),
        backgroundPadding: new Cesium.Cartesian2(10, 5),
        horizontalOrigin: Cesium.HorizontalOrigin.CENTER,
        verticalOrigin: Cesium.VerticalOrigin.TOP,
        pixelOffset: new Cesium.Cartesian2(0, -60), // 显示在飞机上方
        disableDepthTestDistance: Number.POSITIVE_INFINITY // 确保标签始终可见
      }
    });

    // 存储实体引用
    this.#entities.set(routeId, planeEntity);

    // 触发场景重绘
    this.viewer.scene.requestRender();

    return planeEntity;
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