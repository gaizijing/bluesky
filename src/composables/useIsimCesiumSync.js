import { watch, onMounted, onUnmounted, markRaw, ref } from 'vue';
import * as Cesium from 'cesium';
import { storeToRefs } from 'pinia';
import { useIsimStore } from '@/components/business/IsimAnimation/isimStore';
import { useAppDashboardStore } from '@/store/modules/appDashboard';
import { AircraftTrailController } from '@/cesium/visualization/aircraftTrail';
import {
  flyToPoseAndFollow,
  releaseAircraftCamera,
  loadIsimConnectionStartPose,
} from '@/cesium/core/aircraftTopCamera';
import { extractAircraftPose } from '@/utils/isimPose';
import { dashboardEventBus, DASHBOARD_EVENTS } from '@/utils/eventBus';

const PLANE_ID = 'isim_live_aircraft';
const TRACK_ID = 'isim_flight_track';
const MODEL_URI = '/cesium/model/plane/plane.glb';
const MODEL_HEADING_OFFSET_DEG = 90;

const planeLabelState = {
  lon: 0,
  lat: 0,
  alt: 0,
  windSpeed: '0.0',
  windDirection: '0.0',
  windDirectionText: '北',
};

function windDirectionLabel(deg) {
  const directions = ['北', '东北', '东', '东南', '南', '西南', '西', '西北'];
  return directions[Math.round(Number(deg) / 45) % 8] ?? '北';
}

function buildPlaneLabelText() {
  const s = planeLabelState;
  return `经：${Number(s.lon).toFixed(4)}° 纬：${Number(s.lat).toFixed(4)}°
高：${Math.round(Number(s.alt) || 0)}m 风速：${s.windSpeed}m/s
风向：${s.windDirectionText}(${s.windDirection}°)`;
}

function syncPlaneLabel(pose, weatherImpact) {
  planeLabelState.lon = pose.lon;
  planeLabelState.lat = pose.lat;
  planeLabelState.alt = pose.alt;
  if (weatherImpact) {
    planeLabelState.windSpeed = Number(weatherImpact.windSpeed ?? 0).toFixed(1);
    const dir = Number(weatherImpact.windDirection ?? 0);
    planeLabelState.windDirection = dir.toFixed(1);
    planeLabelState.windDirectionText = windDirectionLabel(dir);
  }
}

function getViewer() {
  const viewer = window.viewer || null;
  if (!viewer) return null;
  if (typeof viewer.isDestroyed === 'function' && viewer.isDestroyed()) return null;
  return viewer;
}

function planeOrientationFromHeading(position, headingDeg) {
  const hpr = new Cesium.HeadingPitchRoll(
    Cesium.Math.toRadians(Number(headingDeg || 0) + MODEL_HEADING_OFFSET_DEG),
    0,
    0,
  );
  return Cesium.Transforms.headingPitchRollQuaternion(position, hpr);
}

function resolvePose(data) {
  return extractAircraftPose(data) || loadIsimConnectionStartPose();
}

function ensurePlane(viewer) {
  let entity = viewer.entities.getById(PLANE_ID);
  if (entity) {
    entity.show = true;
    if (entity.model) entity.model.show = true;
    return entity;
  }

  entity = viewer.entities.add({
    id: PLANE_ID,
    name: 'ISIM实时飞机',
    show: true,
    position: Cesium.Cartesian3.fromDegrees(120.22, 36.04, 300),
    model: {
      uri: MODEL_URI,
      scale: 18,
      minimumPixelSize: 36,
      maximumScale: 2000,
      runAnimations: true,
      show: true,
      enableVerticalExaggeration: false,
    },
    label: {
      text: new Cesium.CallbackProperty(() => buildPlaneLabelText(), false),
      font: '12px sans-serif',
      fillColor: Cesium.Color.WHITE,
      outlineColor: Cesium.Color.BLACK,
      outlineWidth: 2,
      showBackground: true,
      backgroundColor: Cesium.Color.fromCssColorString('rgba(0, 0, 0, 0.7)'),
      backgroundPadding: new Cesium.Cartesian2(10, 5),
      horizontalOrigin: Cesium.HorizontalOrigin.CENTER,
      verticalOrigin: Cesium.VerticalOrigin.BOTTOM,
      pixelOffset: new Cesium.Cartesian2(0, -60),
      disableDepthTestDistance: Number.POSITIVE_INFINITY,
    },
  });
  return entity;
}

function updateFlightTrack(viewer, flightPath) {
  if (!viewer) return;
  const track = viewer.entities.getById(TRACK_ID);
  const positions = (flightPath || [])
    .map((p) => {
      const lon = Number(p.lon);
      const lat = Number(p.lat);
      const alt = Number(p.alt ?? 0);
      if (!Number.isFinite(lon) || !Number.isFinite(lat)) return null;
      return Cesium.Cartesian3.fromDegrees(lon, lat, alt);
    })
    .filter(Boolean);

  if (positions.length < 2) {
    if (track) track.show = false;
    return;
  }

  if (!track) {
    viewer.entities.add({
      id: TRACK_ID,
      polyline: {
        positions,
        width: 4,
        material: Cesium.Color.fromCssColorString('#10b981').withAlpha(0.9),
        arcType: Cesium.ArcType.NONE,
      },
    });
    return;
  }
  track.polyline.positions = positions;
  track.show = true;
}

function clearFlightTrack(viewer) {
  const track = viewer?.entities.getById(TRACK_ID);
  if (track) viewer.entities.remove(track);
}

function focusCameraOnPlane(viewer, plane, pose) {
  if (!viewer || !plane || !pose) return;
  try {
    flyToPoseAndFollow(viewer, plane, pose.lon, pose.lat, pose.alt);
  } catch (err) {
    console.warn('[useIsimCesiumSync] 相机聚焦失败', err);
  }
}

/** 主地图 ISIM 飞机同步 */
export function useIsimCesiumSync() {
  const isimStore = useIsimStore();
  const appStore = useAppDashboardStore();
  const { simData, isConnected, flightPath, recordFlightPath, weatherImpact } = storeToRefs(isimStore);
  const trailController = ref(null);
  let viewerWaitTimer = null;
  let offClearTrail = null;
  let offFlightPos = null;
  let offFocusAircraft = null;

  function isLive() {
    return appStore.view === 'simFlight' && (isConnected.value || appStore.simConnected);
  }

  function ensureTrail(viewer) {
    if (!viewer) return null;
    const stale = trailController.value && trailController.value.viewer !== viewer;
    if (stale) {
      trailController.value.destroy();
      trailController.value = null;
    }
    if (!trailController.value) {
      trailController.value = markRaw(new AircraftTrailController(viewer));
    }
    return trailController.value;
  }

  function applyPoseToPlane(viewer, plane, pose) {
    const position = Cesium.Cartesian3.fromDegrees(
      pose.lon,
      pose.lat,
      Math.max(0, pose.alt),
    );
    plane.position = position;
    plane.orientation = planeOrientationFromHeading(position, pose.heading);
    syncPlaneLabel(pose, weatherImpact.value);
    return position;
  }

  function updateAircraft(data) {
    if (!isLive()) return;
    const viewer = getViewer();
    if (!viewer) return;

    const pose = data ? resolvePose(data) : loadIsimConnectionStartPose();
    if (!pose) return;

    const plane = ensurePlane(viewer);
    const position = applyPoseToPlane(viewer, plane, pose);

    if (recordFlightPath.value) {
      updateFlightTrack(viewer, flightPath.value);
    }

    if (extractAircraftPose(data)) {
      const trail = ensureTrail(viewer);
      trail?.apply(
        { enabled: true, append: true, clear: false },
        position,
        pose.heading,
        pose.roll,
      );
    }

    viewer.scene.requestRender();
  }

  function refocusCamera() {
    if (!isLive()) return;
    const viewer = getViewer();
    if (!viewer) return;
    const pose = resolvePose(simData.value ?? isimStore.simData);
    if (!pose) return;
    const plane = ensurePlane(viewer);
    applyPoseToPlane(viewer, plane, pose);
    releaseAircraftCamera(viewer);
    focusCameraOnPlane(viewer, plane, pose);
    viewer.scene.requestRender();
  }

  function flushLatest() {
    updateAircraft(simData.value ?? isimStore.simData);
  }

  function onConnected() {
    if (!isLive()) return;
    updateAircraft(simData.value ?? isimStore.simData);
  }

  function clearAll() {
    releaseAircraftCamera(getViewer());
    trailController.value?.reset();

    const viewer = getViewer();
    if (!viewer) return;

    const plane = viewer.entities.getById(PLANE_ID);
    if (plane) {
      plane.show = false;
    }
    clearFlightTrack(viewer);
    viewer.scene.requestRender();
  }

  function waitForViewer() {
    const ready = () => {
      if (!getViewer()) return false;
      if (isLive()) flushLatest();
      return true;
    };
    if (ready()) return;
    viewerWaitTimer = setInterval(() => {
      if (ready()) {
        clearInterval(viewerWaitTimer);
        viewerWaitTimer = null;
      }
    }, 400);
  }

  watch(simData, (data) => {
    updateAircraft(data);
  });

  watch(weatherImpact, (impact) => {
    if (!isLive()) return;
    const pose = resolvePose(simData.value);
    if (!pose) return;
    syncPlaneLabel(pose, impact);
    getViewer()?.scene.requestRender();
  });

  watch(flightPath, (path) => {
    if (!isLive() || !recordFlightPath.value) return;
    updateFlightTrack(getViewer(), path);
    getViewer()?.scene.requestRender();
  }, { deep: true });

  watch(isConnected, (connected) => {
    if (connected) onConnected();
    else if (!appStore.simConnected) clearAll();
  });

  watch(() => appStore.simConnected, (connected) => {
    if (connected) onConnected();
    else if (!isConnected.value) clearAll();
  });

  watch(() => appStore.view, (view) => {
    if (view === 'simFlight' && (isConnected.value || appStore.simConnected)) {
      onConnected();
    } else if (view !== 'simFlight') {
      clearAll();
    }
  });

  onMounted(() => {
    waitForViewer();
    offClearTrail = dashboardEventBus.on(DASHBOARD_EVENTS.CLEAR_ISIM_TRAIL, () => {
      trailController.value?.markManuallyCleared();
      getViewer()?.scene.requestRender();
    });
    offFocusAircraft = dashboardEventBus.on(DASHBOARD_EVENTS.FOCUS_ISIM_AIRCRAFT, () => {
      refocusCamera();
    });
    offFlightPos = dashboardEventBus.on(DASHBOARD_EVENTS.FLIGHT_POSITION_UPDATED, (payload) => {
      if (isLive() && payload) updateAircraft(payload);
    });
  });

  onUnmounted(() => {
    offClearTrail?.();
    offFocusAircraft?.();
    offFlightPos?.();
    if (viewerWaitTimer) clearInterval(viewerWaitTimer);
    trailController.value?.destroy();
    trailController.value = null;
    clearAll();
  });

  return { clearAll };
}
