/** 飞行尾迹（对齐 feng-demo map.js / aircraftTrail.js） */

function clamp(v, lo, hi) {
  return Math.max(lo, Math.min(hi, v));
}

function offsetLatLonMeters(lat, lon, bearingDeg, distanceM) {
  const r = 6378137.0;
  const br = (bearingDeg * Math.PI) / 180.0;
  const dByR = distanceM / r;
  const lat1 = (lat * Math.PI) / 180.0;
  const lon1 = (lon * Math.PI) / 180.0;
  const lat2 = Math.asin(
    Math.sin(lat1) * Math.cos(dByR) + Math.cos(lat1) * Math.sin(dByR) * Math.cos(br),
  );
  const lon2 = lon1 + Math.atan2(
    Math.sin(br) * Math.sin(dByR) * Math.cos(lat1),
    Math.cos(dByR) - Math.sin(lat1) * Math.sin(lat2),
  );
  return { lat: (lat2 * 180.0) / Math.PI, lon: (lon2 * 180.0) / Math.PI };
}

const VISUAL_LIME = 'lime';
const TRAIL_BASE_HALF_WIDTH_M = 5.4;
const TRAIL_DROP_LINE_STEP_M = 10.0;
const TRAIL_DROP_LINE_WIDTH = 0.5;
export class SimTrailController {
  constructor(viewer) {
    this.viewer = viewer;
    this.trailEntity = null;
    this.trailPositions = [];
    this.trailLeftPositions = [];
    this.trailRightPositions = [];
    this.trailDropLines = [];
    this.trailSinceDropM = 0;
    this.lastTrailCenterPos = null;
    this.trailManualClearUntil = 0;
  }

  setVisualVisible(visible) {
    if (this.trailEntity) {
      this.trailEntity.show = !!visible && this.trailLeftPositions.length >= 2;
    }
    this.trailDropLines.forEach((it) => {
      if (it?.entity) it.entity.show = !!visible;
    });
  }

  clearDropLines() {
    if (!this.viewer || !this.trailDropLines.length) return;
    this.trailDropLines.forEach((it) => {
      const ent = it?.entity ?? it;
      if (ent) this.viewer.entities.remove(ent);
    });
    this.trailDropLines = [];
  }

  reset() {
    this.trailPositions = [];
    this.trailLeftPositions = [];
    this.trailRightPositions = [];
    this.trailSinceDropM = 0;
    this.lastTrailCenterPos = null;
    this.clearDropLines();
    if (this.trailEntity && this.viewer) {
      this.viewer.entities.remove(this.trailEntity);
      this.trailEntity = null;
    }
  }

  markManuallyCleared() {
    this.trailManualClearUntil = performance.now() + 250;
    this.reset();
  }

  isAppendBlocked() {
    return this.trailManualClearUntil > 0 && performance.now() < this.trailManualClearUntil;
  }

  ensureEntity() {
    if (!this.viewer || this.trailEntity) return;
    const leftPositions = this.trailLeftPositions;
    const rightPositions = this.trailRightPositions;
    this.trailEntity = this.viewer.entities.add({
      polygon: {
        hierarchy: new Cesium.CallbackProperty(() => {
          if (leftPositions.length < 2 || rightPositions.length < 2) {
            return new Cesium.PolygonHierarchy([]);
          }
          const ring = leftPositions.concat(rightPositions.slice().reverse());
          return new Cesium.PolygonHierarchy(ring);
        }, false),
        perPositionHeight: true,
        material: Cesium.Color.fromCssColorString(VISUAL_LIME).withAlpha(0.38),
        outline: true,
        outlineColor: Cesium.Color.fromCssColorString(VISUAL_LIME).withAlpha(0.8),
      },
    });
  }

  addDropLine(positionCartesian, sampleIndex) {
    if (!this.viewer || !positionCartesian) return;
    const cart = Cesium.Cartographic.fromCartesian(positionCartesian);
    let gh = this.viewer.scene.globe.getHeight(cart);
    if (!Number.isFinite(gh)) gh = 0.0;
    gh = Math.min(gh, cart.height - 2.0);
    gh = Math.max(0.0, gh);
    const groundPos = Cesium.Cartesian3.fromRadians(cart.longitude, cart.latitude, gh);
    const lineEnt = this.viewer.entities.add({
      polyline: {
        positions: [groundPos, Cesium.Cartesian3.clone(positionCartesian)],
        width: TRAIL_DROP_LINE_WIDTH,
        material: Cesium.Color.fromCssColorString('#3FA7FF').withAlpha(0.95),
        depthFailMaterial: Cesium.Color.fromCssColorString('#3FA7FF').withAlpha(1.0),
        arcType: Cesium.ArcType.NONE,
      },
    });
    this.trailDropLines.push({ entity: lineEnt, sampleIndex: Number(sampleIndex || 0) });
  }

  apply(trail, positionCartesian, headingDeg, rollDeg) {
    if (trail?.clear) {
      this.markManuallyCleared();
      return;
    }
    if (this.isAppendBlocked()) return;

    if (!this.viewer || !trail || trail.enabled === false) {
      this.setVisualVisible(false);
      return;
    }

    this.setVisualVisible(true);
    if (!trail.append || !positionCartesian) return;

    this.ensureEntity();

    if (this.lastTrailCenterPos) {
      this.trailSinceDropM += Cesium.Cartesian3.distance(this.lastTrailCenterPos, positionCartesian);
    }

    this.trailPositions.push(Cesium.Cartesian3.clone(positionCartesian));

    const cart = Cesium.Cartographic.fromCartesian(positionCartesian);
    const lat = Cesium.Math.toDegrees(cart.latitude);
    const lon = Cesium.Math.toDegrees(cart.longitude);
    const alt = Math.max(0.0, cart.height);
    const hdg = Number(headingDeg || 0);
    const rol = clamp(Number(rollDeg || 0), -80.0, 80.0);
    const halfWidth = TRAIL_BASE_HALF_WIDTH_M;
    const bankDeltaH = Math.tan(Cesium.Math.toRadians(rol)) * halfWidth;

    const left = offsetLatLonMeters(lat, lon, hdg - 90.0, halfWidth);
    const right = offsetLatLonMeters(lat, lon, hdg + 90.0, halfWidth);
    const leftPos = Cesium.Cartesian3.fromDegrees(left.lon, left.lat, alt + bankDeltaH);
    const rightPos = Cesium.Cartesian3.fromDegrees(right.lon, right.lat, alt - bankDeltaH);

    this.trailLeftPositions.push(leftPos);
    this.trailRightPositions.push(rightPos);
    this.lastTrailCenterPos = Cesium.Cartesian3.clone(positionCartesian);

    if (this.trailPositions.length === 1 || this.trailSinceDropM >= TRAIL_DROP_LINE_STEP_M) {
      this.addDropLine(positionCartesian, this.trailPositions.length - 1);
      this.trailSinceDropM = 0.0;
    }

    if (this.trailEntity) {
      this.trailEntity.show = this.trailLeftPositions.length >= 2;
    }
  }

  destroy() {
    this.reset();
    this.viewer = null;
  }
}
