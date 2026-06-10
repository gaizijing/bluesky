import * as Cesium from 'cesium';
import { getMapTilesConfig } from '@/config/mapTiles';

const FOLLOW_ORBIT_BEARING_SENS = 0.25;
const FOLLOW_ORBIT_PITCH_SENS = 0.2;
const FOLLOW_ORBIT_MIN_DIST_M = 20.0;
const FOLLOW_ORBIT_MIN_PITCH_DEG = -10.0;
const FOLLOW_ORBIT_MAX_PITCH_DEG = 85.0;
const THIRD_PERSON_DEFAULT_PITCH_DEG = 15.0;

function clamp(v, lo, hi) {
  return Math.max(lo, Math.min(hi, v));
}

function getThirdPersonParams() {
  const c = getMapTilesConfig().cesium || {};
  return {
    distanceM: Number(c.third_person_distance_m) || 300,
    leftFrontDeg: Number(c.third_person_left_front_deg) || 45,
    targetUpM: Number(c.third_person_target_up_m) || 4,
    poseSmoothAlpha: Number(c.pose_smooth_alpha) || 0.4,
    cameraSmoothAlpha: Number(c.camera_smooth_alpha) || 0.22,
  };
}

/** 第三 / 第一人称相机跟随 */
export class FollowCameraController {
  constructor(viewer) {
    this.viewer = viewer;
    this.orbit = {
      active: false,
      initialized: false,
      dragging: false,
      lastX: 0,
      lastY: 0,
      bearingDeg: 0,
      pitchDeg: THIRD_PERSON_DEFAULT_PITCH_DEG,
      distanceM: getThirdPersonParams().distanceM,
    };
    this.firstPerson = { active: false };
    this.poseSmooth = {};
    this.cameraSmooth = null;
    this.inputHandler = null;
  }

  getSmoothedPose(id, lat, lon, alt, heading, pitch, roll) {
    const params = getThirdPersonParams();
    const alpha = params.poseSmoothAlpha;
    let s = this.poseSmooth[id];
    if (!s) {
      s = { lat, lon, alt, heading, pitch, roll };
      this.poseSmooth[id] = s;
      return s;
    }
    s.lat += (lat - s.lat) * alpha;
    s.lon += (lon - s.lon) * alpha;
    s.alt += (alt - s.alt) * alpha;
    const dh = ((heading - s.heading + 540) % 360) - 180;
    s.heading = (s.heading + dh * alpha + 360) % 360;
    s.pitch += (pitch - s.pitch) * alpha;
    s.roll += (roll - s.roll) * alpha;
    return s;
  }

  setCameraControllerEnabled(enabled) {
    if (!this.viewer) return;
    const ctl = this.viewer.scene.screenSpaceCameraController;
    ctl.enableRotate = enabled;
    ctl.enableTranslate = enabled;
    ctl.enableZoom = enabled;
    ctl.enableTilt = enabled;
    ctl.enableLook = enabled;
  }

  ensureInputHandler() {
    if (!this.viewer || this.inputHandler) return;
    const orbit = this.orbit;
    const handler = new Cesium.ScreenSpaceEventHandler(this.viewer.scene.canvas);
    this.inputHandler = handler;

    handler.setInputAction((click) => {
      if (!orbit.active) return;
      orbit.dragging = true;
      orbit.lastX = click.position.x;
      orbit.lastY = click.position.y;
    }, Cesium.ScreenSpaceEventType.LEFT_DOWN);

    handler.setInputAction(() => {
      orbit.dragging = false;
    }, Cesium.ScreenSpaceEventType.LEFT_UP);

    handler.setInputAction((movement) => {
      if (!orbit.active || !orbit.dragging) return;
      const dx = movement.endPosition.x - orbit.lastX;
      const dy = movement.endPosition.y - orbit.lastY;
      orbit.lastX = movement.endPosition.x;
      orbit.lastY = movement.endPosition.y;
      orbit.bearingDeg = (orbit.bearingDeg + dx * FOLLOW_ORBIT_BEARING_SENS + 360) % 360;
      orbit.pitchDeg = clamp(
        orbit.pitchDeg + dy * FOLLOW_ORBIT_PITCH_SENS,
        FOLLOW_ORBIT_MIN_PITCH_DEG,
        FOLLOW_ORBIT_MAX_PITCH_DEG,
      );
      this.viewer.scene.requestRender();
    }, Cesium.ScreenSpaceEventType.MOUSE_MOVE);

    handler.setInputAction((delta) => {
      if (!orbit.active) return;
      const factor = delta > 0 ? 1.08 : 0.925;
      orbit.distanceM = Math.max(FOLLOW_ORBIT_MIN_DIST_M, orbit.distanceM * factor);
      this.viewer.scene.requestRender();
    }, Cesium.ScreenSpaceEventType.WHEEL);
  }

  setThirdPersonMode(active, aircraftHeading = 0) {
    if (!this.viewer) return;
    const orbit = this.orbit;
    if (orbit.active === active) return;

    orbit.active = active;
    orbit.dragging = false;
    this.ensureInputHandler();

    if (active) {
      this.setFirstPersonMode(false);
      if (!orbit.initialized) {
        const params = getThirdPersonParams();
        orbit.bearingDeg = Number(aircraftHeading || 0) - params.leftFrontDeg;
        orbit.pitchDeg = THIRD_PERSON_DEFAULT_PITCH_DEG;
        orbit.distanceM = params.distanceM;
        orbit.initialized = true;
        this.cameraSmooth = null;
      }
      this.viewer.trackedEntity = undefined;
      this.setCameraControllerEnabled(false);
    } else {
      orbit.initialized = false;
      this.cameraSmooth = null;
      this.viewer.camera.lookAtTransform(Cesium.Matrix4.IDENTITY);
      this.setCameraControllerEnabled(true);
    }
  }

  setFirstPersonMode(active) {
    if (!this.viewer) return;
    if (this.firstPerson.active === active) return;

    this.firstPerson.active = active;
    if (active) {
      this.setThirdPersonMode(false, 0);
      this.viewer.trackedEntity = undefined;
      this.viewer.camera.lookAtTransform(Cesium.Matrix4.IDENTITY);
      this.setCameraControllerEnabled(false);
    } else {
      this.cameraSmooth = null;
      this.orbit.initialized = false;
      this.viewer.camera.lookAtTransform(Cesium.Matrix4.IDENTITY);
      this.setCameraControllerEnabled(true);
    }
  }

  applyFirstPerson(lat, lon, alt, heading, pitch, roll) {
    if (!this.viewer || !this.firstPerson.active) return;
    const pos = Cesium.Cartesian3.fromDegrees(lon, lat, Math.max(0, Number(alt || 0)));
    this.viewer.camera.setView({
      destination: pos,
      orientation: {
        heading: Cesium.Math.toRadians(Number(heading || 0)),
        pitch: Cesium.Math.toRadians(Number(pitch || 0)),
        roll: Cesium.Math.toRadians(Number(roll || 0)),
      },
    });
  }

  applyThirdPerson(lat, lon, alt, heading) {
    if (!this.viewer || !this.orbit.active) return;
    const params = getThirdPersonParams();
    const targetAlt = Math.max(0, Number(alt || 0)) + params.targetUpM;
    const orbit = this.orbit;

    if (!this.cameraSmooth) {
      this.cameraSmooth = { lat, lon, alt: targetAlt };
    }
    const cs = this.cameraSmooth;
    const ca = params.cameraSmoothAlpha;
    cs.lat += (lat - cs.lat) * ca;
    cs.lon += (lon - cs.lon) * ca;
    cs.alt += (targetAlt - cs.alt) * ca;

    const target = Cesium.Cartesian3.fromDegrees(cs.lon, cs.lat, cs.alt);
    const transform = Cesium.Transforms.eastNorthUpToFixedFrame(target);
    const pitchRad = Cesium.Math.toRadians(orbit.pitchDeg);
    const horizDist = orbit.distanceM * Math.cos(pitchRad);
    const up = orbit.distanceM * Math.sin(pitchRad);
    const east = horizDist * Math.sin(Cesium.Math.toRadians(orbit.bearingDeg));
    const north = horizDist * Math.cos(Cesium.Math.toRadians(orbit.bearingDeg));
    this.viewer.camera.lookAtTransform(transform, new Cesium.Cartesian3(east, north, up));
  }

  release() {
    this.setFirstPersonMode(false);
    this.setThirdPersonMode(false, 0);
    if (this.viewer) {
      this.viewer.trackedEntity = undefined;
      this.viewer.camera.lookAtTransform(Cesium.Matrix4.IDENTITY);
    }
    this.poseSmooth = {};
    this.cameraSmooth = null;
  }

  destroy() {
    this.release();
    if (this.inputHandler) {
      this.inputHandler.destroy();
      this.inputHandler = null;
    }
  }
}
