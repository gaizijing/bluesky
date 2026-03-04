// src/cesium/entities/routes/CameraController.js
import * as Cesium from 'cesium'

export class CameraController {
  constructor(viewer) {
    this.viewer = viewer
  }

  /**
   * 飞行到航线位置
   * @param {Object} route 航线数据
   */
  flyToRoute(route) {
    if (!this.viewer || !route.waypoints || route.waypoints.length === 0) return

    // 调整相机视角
    const boundingSphere = Cesium.BoundingSphere.fromPoints(
      route.waypoints.map(wp =>
        Cesium.Cartesian3.fromDegrees(wp.longitude, wp.latitude)
      ));
    this.viewer.camera.flyToBoundingSphere(boundingSphere, {
      duration: 1,
      offset: new Cesium.HeadingPitchRange(
        0,
        Cesium.Math.toRadians(-10),
        boundingSphere.radius * 5 // 提高相机高度，从3倍半径增加到5倍
      )
    });
  }

  /**
   * 俯视视角查看航线
   * @param {Array} positions 航线位置数据
   */
  viewTopDown(positions) {
    if (!this.viewer || !positions || positions.length === 0) return;

    const boundingSphere = Cesium.BoundingSphere.fromPoints(positions);
    this.viewer.camera.flyToBoundingSphere(boundingSphere, {
      offset: new Cesium.HeadingPitchRange(0, Cesium.Math.toRadians(-90), boundingSphere.radius * 6), // 提高俯视视角高度
      duration: 1.5
    });
  }

  /**
   * 侧视视角查看航线
   * @param {Array} positions 航线位置数据
   */
  viewSide(positions) {
    if (!this.viewer || !positions || positions.length === 0) return;

    const boundingSphere = Cesium.BoundingSphere.fromPoints(positions);
    this.viewer.camera.flyToBoundingSphere(boundingSphere, {
      offset: new Cesium.HeadingPitchRange(
        Cesium.Math.toRadians(-90),
        Cesium.Math.toRadians(-15),
        Math.max(boundingSphere.radius, 7000) // 提高相机高度
      ),
      duration: 1.5
    });
  }

  /**
   * 跟踪指定航线的飞机
   * @param {String} routeId 航线ID
   * @param {Object} planeEntity 飞机实体
   * @param {Object} options 可选配置
   * @param {Number} options.heading 相机航向角，默认0度（跟随飞机方向）
   * @param {Number} options.pitch 相机俯仰角，默认-15度
   * @param {Number} options.range 相机距离飞机的距离，默认15000米
   */
  viewAircraft(routeId, planeEntity, options = {}) {
    if (!this.viewer || !planeEntity) return;

    // 调整相机视角偏移
    // 设置默认参数以获得驾驶舱视角效果
    // heading: 0 表示相机位于飞机正后方，跟随飞机飞行方向
    // pitch: -15 表示略微俯视飞机，获得更好的驾驶视角
    const { heading = 0, pitch = -15, range = 15000 } = options;
    
    // 设置相机控制器的跟踪偏移
    this.viewer.scene.screenSpaceCameraController.enableInputs = true;
    
    // 先设置跟踪偏移，确保视角正确
    const headingRadians = Cesium.Math.toRadians(heading);
    const pitchRadians = Cesium.Math.toRadians(pitch);
    
    // 设置跟踪实体
    this.viewer.trackedEntity = planeEntity;
    
    // 设置跟踪偏移，这将直接影响相机视角
    this.viewer.trackedEntityOffset = new Cesium.HeadingPitchRange(
      headingRadians,
      pitchRadians,
      range
    );
    
    // 使用flyTo方法调整到合适的视角，带有平滑过渡
    // 当trackedEntity已设置时，flyTo会考虑trackedEntityOffset
    this.viewer.camera.flyTo({
      entity: planeEntity,
      duration: 0.5,
      offset: this.viewer.trackedEntityOffset
    });
  }

  /**
   * 取消跟踪实体，恢复自由视角
   */
  releaseTracking() {
    if (this.viewer) {
      this.viewer.trackedEntity = undefined;
    }
  }
}