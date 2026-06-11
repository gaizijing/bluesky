import { watch, onMounted, onUnmounted, ref } from 'vue';
import * as Cesium from 'cesium';
import { storeToRefs } from 'pinia';
import { useAppDashboardStore } from '@/store/modules/appDashboard';
import { getRouteDetail, fetchRoutes } from '@/api/v2/route';
import { buildCatmullPath3D } from '@/utils/routePathBuilder';

const ROUTE_ENTITY_ID = 'sim_flight_route_line';
const ROUTE_COLOR = '#39FF14';

async function resolveSimRouteId(appStore) {
  if (appStore.routeIdForSim) return appStore.routeIdForSim;
  if (appStore.focus.type === 'route' && appStore.focus.id) {
    appStore.routeIdForSim = appStore.focus.id;
    return appStore.focus.id;
  }
  if (!appStore.regionId) return null;

  try {
    const page = await fetchRoutes(appStore.regionId, 1, 1);
    const records = page?.records || page?.items || [];
    const first = records[0];
    const id = first?.routeId || first?.id;
    if (id) {
      appStore.routeIdForSim = id;
      return id;
    }
  } catch (err) {
    console.warn('[SimRouteCesium] resolve route failed', err);
  }
  return null;
}

function waypointsToControl(waypoints, flightHeight) {
  return (waypoints || []).map((wp) => ({
    lon: Number(wp.longitude ?? wp.lon),
    lat: Number(wp.latitude ?? wp.lat),
    alt: Number(wp.height ?? wp.altitude ?? flightHeight ?? 300),
  }));
}

function getViewer() {
  return window.viewer || null;
}

function clearSimRoute(viewer) {
  if (!viewer) return;
  const ent = viewer.entities.getById(ROUTE_ENTITY_ID);
  if (ent) viewer.entities.remove(ent);
}

function flyToRoute(viewer, positions) {
  if (!viewer || !positions?.length) return;
  try {
    const bs = Cesium.BoundingSphere.fromPoints(positions);
    viewer.camera.flyToBoundingSphere(bs, {
      duration: 1.0,
      offset: new Cesium.HeadingPitchRange(0, Cesium.Math.toRadians(-42), Math.max(bs.radius * 2.4, 1800)),
    });
  } catch (e) {
    console.warn('[SimRouteCesium] flyTo failed', e);
  }
}

function renderSimRoute(viewer, path3d, { flyTo = true } = {}) {
  clearSimRoute(viewer);
  if (!viewer || path3d.length < 2) return;

  const positions = path3d.map((p) => Cesium.Cartesian3.fromDegrees(p.lon, p.lat, p.alt));
  viewer.entities.add({
    id: ROUTE_ENTITY_ID,
    polyline: {
      positions,
      width: 2.5,
      material: Cesium.Color.fromCssColorString(ROUTE_COLOR),
      arcType: Cesium.ArcType.GEODESIC,
    },
  });
  if (flyTo) flyToRoute(viewer, positions);
  viewer.scene.requestRender();
}

/** 联飞视图：在主 Cesium 地图渲染选中航路 */
export function useSimRouteCesiumSync() {
  const appStore = useAppDashboardStore();
  const loading = ref(false);
  let routeIdLoaded = null;
  let resolving = false;

  async function loadRoute(routeId) {
    const viewer = getViewer();
    if (!viewer || !routeId) {
      clearSimRoute(viewer);
      routeIdLoaded = null;
      return;
    }
    if (routeId === routeIdLoaded) return;

    loading.value = true;
    try {
      const detail = await getRouteDetail(routeId);
      const waypoints = detail?.waypoints || [];
      const flightHeight = detail?.flightHeight ?? 300;
      const control = waypointsToControl(waypoints, flightHeight);
      const path3d = buildCatmullPath3D(control, 120);
      renderSimRoute(viewer, path3d, { flyTo: !appStore.simConnected });
      routeIdLoaded = routeId;
    } catch (err) {
      console.warn('[SimRouteCesium] load route failed', err);
      clearSimRoute(viewer);
      routeIdLoaded = null;
    } finally {
      loading.value = false;
    }
  }

  async function ensureRoute() {
    if (appStore.view !== 'simFlight' || resolving) return;
    resolving = true;
    try {
      const id = await resolveSimRouteId(appStore);
      if (id) await loadRoute(id);
      else {
        clearSimRoute(getViewer());
        routeIdLoaded = null;
      }
    } finally {
      resolving = false;
    }
  }

  function onLeaveSimFlight() {
    clearSimRoute(getViewer());
    routeIdLoaded = null;
  }

  watch(
    () => [appStore.view, appStore.routeIdForSim, appStore.regionId],
    ([view, routeId]) => {
      if (view === 'simFlight') {
        if (routeId && routeId !== routeIdLoaded) loadRoute(routeId);
        else ensureRoute();
      } else {
        onLeaveSimFlight();
      }
    },
    { immediate: true },
  );

  onMounted(() => {
    if (appStore.view === 'simFlight') ensureRoute();
  });

  onUnmounted(() => {
    onLeaveSimFlight();
  });

  return { loading, reloadRoute: ensureRoute };
}
