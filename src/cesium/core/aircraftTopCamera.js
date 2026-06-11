import * as Cesium from 'cesium';

const CHASE_RANGE_M = 320;
const CHASE_PITCH_DEG = -25;
const CHASE_HEADING_DEG = 0;
const CHASE_FLY_DURATION_S = 1.0;

function chaseOffset(options = {}) {
  return new Cesium.HeadingPitchRange(
    Cesium.Math.toRadians(options.headingDeg ?? CHASE_HEADING_DEG),
    Cesium.Math.toRadians(options.pitchDeg ?? CHASE_PITCH_DEG),
    options.range ?? CHASE_RANGE_M,
  );
}

function ensureCameraInputs(viewer) {
  const ctl = viewer.scene.screenSpaceCameraController;
  ctl.enableInputs = true;
  ctl.enableRotate = true;
  ctl.enableTranslate = true;
  ctl.enableZoom = true;
  ctl.enableTilt = true;
  ctl.enableLook = true;
}

export function isValidAircraftPose(lon, lat, alt) {
  const lo = Number(lon);
  const la = Number(lat);
  if (!Number.isFinite(lo) || !Number.isFinite(la)) return false;
  if (Math.abs(lo) < 1e-6 && Math.abs(la) < 1e-6) return false;
  if (lo < -180 || lo > 180 || la < -90 || la > 90) return false;
  const h = Number(alt);
  if (!Number.isFinite(h) || h < 0 || h > 50000) return false;
  return true;
}

export function setEntityPosition(entity, cartesian) {
  if (!entity || !cartesian) return;
  if (entity.position instanceof Cesium.ConstantPositionProperty) {
    entity.position.setValue(cartesian);
  } else {
    entity.position = new Cesium.ConstantPositionProperty(cartesian);
  }
}

function syncPlanePosition(planeEntity, lon, lat, alt) {
  if (!planeEntity || !isValidAircraftPose(lon, lat, alt)) return null;
  const h = Math.max(0, Number(alt) || 0);
  const pos = Cesium.Cartesian3.fromDegrees(Number(lon), Number(lat), h);
  setEntityPosition(planeEntity, pos);
  return pos;
}

/** 一次性飞到目标位姿；不使用 trackedEntity，避免与高频位姿更新冲突导致卡顿 */
export function flyCameraToPose(viewer, lon, lat, alt, options = {}) {
  if (!viewer || !isValidAircraftPose(lon, lat, alt)) {
    console.warn('[aircraftTopCamera] 无效位姿，跳过相机飞行', { lon, lat, alt });
    return false;
  }

  const h = Math.max(0, Number(alt) || 0);
  const offset = chaseOffset(options);
  const duration = options.duration ?? CHASE_FLY_DURATION_S;
  const center = Cesium.Cartesian3.fromDegrees(Number(lon), Number(lat), h);
  const sphere = new Cesium.BoundingSphere(center, Math.max(30, (options.range ?? CHASE_RANGE_M) * 0.12));

  viewer.camera.cancelFlight();
  viewer.camera.lookAtTransform(Cesium.Matrix4.IDENTITY);
  viewer.trackedEntity = undefined;
  viewer.trackedEntityOffset = undefined;
  ensureCameraInputs(viewer);

  viewer.camera.flyToBoundingSphere(sphere, {
    duration,
    offset,
    complete: () => {
      ensureCameraInputs(viewer);
      viewer.scene.requestRender();
    },
  });
  viewer.scene.requestRender();
  return true;
}

/** 断开联飞或退出视图时释放跟踪 */
export function releaseAircraftCamera(viewer) {
  if (!viewer) return;
  viewer.camera.cancelFlight();
  viewer.camera.lookAtTransform(Cesium.Matrix4.IDENTITY);
  viewer.trackedEntity = undefined;
  viewer.trackedEntityOffset = undefined;
  ensureCameraInputs(viewer);
  viewer.scene.requestRender();
}

/** 飞到飞机第三视角（仅一次，不锁定跟随） */
export function flyToAircraftView(viewer, planeEntity, lon, lat, alt, options = {}) {
  if (!viewer) return;
  syncPlanePosition(planeEntity, lon, lat, alt);
  flyCameraToPose(viewer, lon, lat, alt, options);
}

/** @deprecated track 参数已忽略，统一为一次性聚焦 */
export function flyToPoseAndFollow(viewer, planeEntity, lon, lat, alt, _options = {}) {
  if (!viewer || !planeEntity || !isValidAircraftPose(lon, lat, alt)) return;
  flyToAircraftView(viewer, planeEntity, lon, lat, alt, _options);
}

export function loadIsimConnectionStartPose() {
  try {
    const raw = localStorage.getItem('isim_connection_config');
    if (!raw) return null;
    const cfg = JSON.parse(raw);
    const lon = Number(cfg.longitude);
    const lat = Number(cfg.latitude);
    const alt = Number(cfg.altitude ?? 300);
    if (!isValidAircraftPose(lon, lat, alt)) return null;
    return { lon, lat, alt, heading: 0, roll: 0 };
  } catch {
    return null;
  }
}
