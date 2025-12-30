import * as Cesium from "cesium";

export class AreaSelector {
  constructor(viewer, eventManager) {
    this.viewer = viewer;
    this.eventManager = eventManager;

    this.drawing = false;
    this.startPoint = null;
    this.currentPositions = null;
    this.polygonEntity = null;
  }

  // ===== 对外入口：开始框选 =====
  start(onComplete) {
    this.onComplete = onComplete;

    // 🔑 关键：注册到 EventManager，而不是自己监听
    this.eventManager.setLeftDownHandler(
      this._onLeftDown.bind(this)
    );
    this.eventManager.setMouseMoveHandler(
      this._onMouseMove.bind(this)
    );
    this.eventManager.setLeftUpHandler(
      this._onLeftUp.bind(this)
    );
  }

  // ===== 对外入口：结束框选 =====
  stop() {
    // 清空 EventManager 的钩子（非常重要）
    this.eventManager.setLeftDownHandler(null);
    this.eventManager.setMouseMoveHandler(null);
    this.eventManager.setLeftUpHandler(null);
  }

  /* ================= 内部逻辑 ================= */

  _onLeftDown(movement) {
    this.drawing = true;

    const cartesian = this._pickCartesian(movement.position);
    if (!cartesian) return;

    this.startPoint = Cesium.Cartographic.fromCartesian(cartesian);
    this.currentPositions = null;
  }

  _onMouseMove(movement) {
    if (!this.drawing || !this.startPoint) return;

    const cartesian = this._pickCartesian(movement.endPosition);
    if (!cartesian) return;

    const end = Cesium.Cartographic.fromCartesian(cartesian);

    // 构造矩形 4 个角（顺序很重要）
    this.currentPositions = Cesium.Cartesian3.fromDegreesArray([
      Cesium.Math.toDegrees(this.startPoint.longitude),
      Cesium.Math.toDegrees(this.startPoint.latitude),

      Cesium.Math.toDegrees(end.longitude),
      Cesium.Math.toDegrees(this.startPoint.latitude),

      Cesium.Math.toDegrees(end.longitude),
      Cesium.Math.toDegrees(end.latitude),

      Cesium.Math.toDegrees(this.startPoint.longitude),
      Cesium.Math.toDegrees(end.latitude)
    ]);

    if (!this.polygonEntity) {
      this.polygonEntity = this.viewer.entities.add({
        polygon: {
          hierarchy: new Cesium.CallbackProperty(() => {
            return this.currentPositions
              ? new Cesium.PolygonHierarchy(this.currentPositions)
              : null;
          }, false),
          material: Cesium.Color.CYAN.withAlpha(0.3),
          outline: true,
          outlineColor: Cesium.Color.CYAN,
          clampToGround: true
        }
      });
    }
  }

  _onLeftUp() {
    this.drawing = false;
    if (!this.currentPositions) return;

    const cartos = this.currentPositions.map(p =>
      Cesium.Cartographic.fromCartesian(p)
    );

    const lons = cartos.map(c => Cesium.Math.toDegrees(c.longitude));
    const lats = cartos.map(c => Cesium.Math.toDegrees(c.latitude));

    const bbox = {
      west: Math.min(...lons),
      south: Math.min(...lats),
      east: Math.max(...lons),
      north: Math.max(...lats)
    };

    this.onComplete && this.onComplete(bbox);

    // 结束框选，释放事件
    this.stop();
  }

  /* ================= 工具方法 ================= */

  _pickCartesian(screenPosition) {
    let cartesian = this.viewer.scene.pickPosition(screenPosition);
    if (!Cesium.defined(cartesian)) {
      cartesian = this.viewer.camera.pickEllipsoid(
        screenPosition,
        this.viewer.scene.globe.ellipsoid
      );
    }
    return cartesian;
  }
}
