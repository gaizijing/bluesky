import { watch, onMounted, onUnmounted, markRaw, ref } from 'vue';
import * as Cesium from 'cesium';
import { storeToRefs } from 'pinia';
import { useIsimStore } from '@/components/business/IsimAnimation/isimStore';
import { useAppDashboardStore } from '@/store/modules/appDashboard';
import { PlaneModel } from '@/cesium/entities/routes/PlaneModel';
import { FollowCameraController } from '@/cesium/core/followCamera';
import { AircraftTrailController } from '@/cesium/visualization/aircraftTrail';
import { AircraftHeadingLineController } from '@/cesium/visualization/aircraftHeadingLine';

const ISIM_PLANE_ID = 'isim_live_aircraft';

function setAircraftVisible(entity, visible) {
  if (!entity) return;
  entity.show = visible;
  if (entity.model) entity.model.show = visible;
  if (entity.billboard) entity.billboard.show = visible;
  if (entity.point) entity.point.show = visible;
}

function isTrailEnabled(data) {
  return !Number(data?.trailHide);
}

/** 主地图 ISIM 飞机实体、尾迹、航向线与第三/第一人称跟机 */
export function useIsimCesiumSync() {
  const isimStore = useIsimStore();
  const appStore = useAppDashboardStore();
  const { simData, isConnected } = storeToRefs(isimStore);
  const planeModel = ref(null);
  const followCamera = ref(null);
  const trailController = ref(null);
  const headingLineController = ref(null);
  let viewerWaitTimer = null;

  function getViewer() {
    return window.viewer || null;
  }

  function ensureFollowCamera() {
    const viewer = getViewer();
    if (!viewer || followCamera.value) return Boolean(followCamera.value);
    followCamera.value = markRaw(new FollowCameraController(viewer));
    return true;
  }

  function ensureTrailController() {
    const viewer = getViewer();
    if (!viewer || trailController.value) return Boolean(trailController.value);
    trailController.value = markRaw(new AircraftTrailController(viewer));
    return true;
  }

  function ensureHeadingLineController() {
    const viewer = getViewer();
    if (!viewer || headingLineController.value) return Boolean(headingLineController.value);
    headingLineController.value = markRaw(new AircraftHeadingLineController(viewer));
    return true;
  }

  function ensurePlaneModel() {
    const viewer = getViewer();
    if (!viewer || planeModel.value) return Boolean(planeModel.value);
    planeModel.value = markRaw(new PlaneModel(viewer));
    return true;
  }

  function ensureVisualControllers() {
    return ensureFollowCamera() && ensureTrailController() && ensureHeadingLineController();
  }

  function waitForViewer() {
    if (ensurePlaneModel() && ensureVisualControllers()) return;
    viewerWaitTimer = setInterval(() => {
      if (ensurePlaneModel() && ensureVisualControllers()) {
        clearInterval(viewerWaitTimer);
        viewerWaitTimer = null;
      }
    }, 400);
  }

  function applyCameraMode(mode, pose) {
    const fc = followCamera.value;
    const viewer = getViewer();
    if (!fc || !viewer) return;

    const entity = viewer.entities.getById(ISIM_PLANE_ID);

    if (mode === 'firstPerson' && pose) {
      fc.setFirstPersonMode(true);
      setAircraftVisible(entity, false);
      fc.applyFirstPerson(pose.lat, pose.lon, pose.alt, pose.heading, pose.pitch, pose.roll);
    } else if (mode === 'thirdPerson' && pose) {
      fc.setFirstPersonMode(false);
      fc.setThirdPersonMode(true, pose.heading);
      setAircraftVisible(entity, true);
      fc.applyThirdPerson(pose.lat, pose.lon, pose.alt, pose.heading);
    } else {
      fc.release();
      setAircraftVisible(entity, true);
    }
  }

  function applyFlightVisuals(data, sm, mode) {
    const trail = trailController.value;
    const headingLine = headingLineController.value;
    if (!trail || !headingLine || !sm) return;

    const trailOn = isTrailEnabled(data);
    const firstPerson = mode === 'firstPerson';
    const entPos = Cesium.Cartesian3.fromDegrees(sm.lon, sm.lat, sm.alt);

    if (firstPerson) {
      headingLine.setVisible(ISIM_PLANE_ID, false);
      if (trailOn) {
        trail.apply({ enabled: true, append: true }, entPos, sm.heading, sm.roll);
      } else {
        trail.apply({ enabled: false }, entPos, sm.heading, sm.roll);
      }
    } else {
      trail.apply(
        { enabled: trailOn, append: trailOn },
        entPos,
        sm.heading,
        sm.roll,
      );
      if (trailOn) {
        headingLine.upsert(ISIM_PLANE_ID, sm.lat, sm.lon, sm.alt, sm.heading, sm.pitch);
        headingLine.setVisible(ISIM_PLANE_ID, true);
      } else {
        headingLine.setVisible(ISIM_PLANE_ID, false);
      }
    }
  }

  function updateCesiumAircraft(data) {
    if (!data || !ensurePlaneModel()) return;
    const viewer = getViewer();
    if (!viewer) return;

    const lon = data.aircraftLon;
    const lat = data.aircraftLat;
    const alt = data.aircraftAlt;
    if (lon == null || lat == null) return;

    const heading = Number(data.aircraftHeading ?? 0);
    const pitch = Number(data.aircraftPitch ?? 0);
    const roll = Number(data.aircraftRoll ?? 0);
    const position = Cesium.Cartesian3.fromDegrees(lon, lat, alt ?? 0);
    const existingEntity = viewer.entities.getById(ISIM_PLANE_ID);

    if (!existingEntity) {
      planeModel.value.createRoutePlane(ISIM_PLANE_ID, position, {
        getAttitude: () => ({
          heading,
          pitch,
          roll,
        }),
        getAltitude: () => alt ?? 0,
        getFlightPath: () => [],
        getRecordFlightPath: () => false,
      });
    } else {
      planeModel.value.updatePlanePosition(ISIM_PLANE_ID, position);
    }

    if (ensureVisualControllers()) {
      const sm = followCamera.value.getSmoothedPose(
        ISIM_PLANE_ID,
        lat,
        lon,
        alt ?? 0,
        heading,
        pitch,
        roll,
      );
      const mode = appStore.cameraMode;

      applyFlightVisuals(data, sm, mode);

      if (mode === 'thirdPerson' || mode === 'firstPerson') {
        applyCameraMode(mode, sm);
      }
    }

    viewer.scene.requestRender();
  }

  function clearCesiumAircraft() {
    followCamera.value?.release();
    trailController.value?.reset();
    headingLineController.value?.remove(ISIM_PLANE_ID);
    if (planeModel.value) {
      planeModel.value.removePlane(ISIM_PLANE_ID);
    }
    const viewer = getViewer();
    if (viewer) viewer.trackedEntity = undefined;
  }

  function focusOnAircraft() {
    if (!isConnected.value) return;
    appStore.setCameraMode('thirdPerson');
    const data = simData.value;
    if (data) updateCesiumAircraft(data);
  }

  watch(
    simData,
    (data) => {
      if (isConnected.value && data) updateCesiumAircraft(data);
    },
    { deep: true },
  );

  watch(isConnected, (connected) => {
    if (!connected) {
      clearCesiumAircraft();
      appStore.setCameraMode('free');
    }
  });

  watch(
    () => appStore.cameraMode,
    (mode) => {
      const data = simData.value;
      if (!isConnected.value || !data) {
        applyCameraMode('free');
        return;
      }
      if (mode === 'free') {
        applyCameraMode('free');
      }
      updateCesiumAircraft(data);
    },
  );

  onMounted(() => {
    waitForViewer();
  });

  onUnmounted(() => {
    if (viewerWaitTimer) clearInterval(viewerWaitTimer);
    followCamera.value?.destroy();
    followCamera.value = null;
    trailController.value?.destroy();
    trailController.value = null;
    headingLineController.value?.destroy();
    headingLineController.value = null;
    clearCesiumAircraft();
  });

  return { focusOnAircraft, clearCesiumAircraft };
}
