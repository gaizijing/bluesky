import { ref, computed, watch, onMounted } from 'vue';
import { storeToRefs } from 'pinia';
import { useIsimStore } from '@/components/business/IsimAnimation/isimStore';
import { useAppDashboardStore } from '@/store/modules/appDashboard';
import { extractAircraftPose } from '@/utils/isimPose';
import { getRouteDetail, fetchRoutes } from '@/api/v2/route';
import {
  buildRouteLonLatPath,
  collectBounds,
  expandBounds,
} from '@/utils/simMinimap';

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
    console.warn('[SimMinimap] resolve route failed', err);
  }
  return null;
}

export function useSimMinimapData() {
  const isimStore = useIsimStore();
  const appStore = useAppDashboardStore();
  const { simData, flightPath } = storeToRefs(isimStore);

  const routePath = ref([]);
  const loadingRoute = ref(false);
  const routeId = ref(null);
  let resolvingRoute = false;

  const hasSimSession = computed(() => {
    if (appStore.view !== 'simFlight') return false;
    return isimStore.isConnected || appStore.simConnected;
  });

  const hasLiveFlight = computed(() => {
    if (!hasSimSession.value || !simData.value) return false;
    return !!extractAircraftPose(simData.value);
  });

  const aircraft = computed(() => {
    if (!hasLiveFlight.value || !simData.value) return null;
    const d = simData.value;
    const lon = Number(d.aircraftLon);
    const lat = Number(d.aircraftLat);
    if (!Number.isFinite(lon) || !Number.isFinite(lat)) return null;
    return {
      lon,
      lat,
      heading: Number(d.aircraftHeading) || 0,
    };
  });

  const trailPath = computed(() => {
    if (appStore.view !== 'simFlight' || !hasSimSession.value) return [];
    const pts = (flightPath.value || [])
      .map((p) => ({ lon: Number(p.lon), lat: Number(p.lat) }))
      .filter((p) => Number.isFinite(p.lon) && Number.isFinite(p.lat));
    const ac = aircraft.value;
    if (ac) {
      const last = pts[pts.length - 1];
      if (!last || last.lon !== ac.lon || last.lat !== ac.lat) {
        pts.push({ lon: ac.lon, lat: ac.lat });
      }
    }
    return pts;
  });

  const bounds = computed(() => {
    const pts = [...routePath.value, ...trailPath.value];
    if (aircraft.value) pts.push(aircraft.value);
    const raw = collectBounds(pts);
    if (!raw) return null;
    return expandBounds(raw);
  });

  async function loadRoute(id) {
    routePath.value = [];
    routeId.value = id;
    if (!id) return;

    loadingRoute.value = true;
    try {
      const detail = await getRouteDetail(id);
      const waypoints = detail?.waypoints || [];
      const flightHeight = detail?.flightHeight ?? 300;
      routePath.value = buildRouteLonLatPath(waypoints, flightHeight);
    } catch (err) {
      console.warn('[SimMinimap] load route failed', err);
      routePath.value = [];
    } finally {
      loadingRoute.value = false;
    }
  }

  async function ensureRouteLoaded() {
    if (appStore.view !== 'simFlight' || resolvingRoute) return;
    resolvingRoute = true;
    try {
      const id = await resolveSimRouteId(appStore);
      if (id && id !== routeId.value) await loadRoute(id);
      else if (!id) {
        routeId.value = null;
        routePath.value = [];
      }
    } finally {
      resolvingRoute = false;
    }
  }

  watch(
    () => [appStore.view, appStore.routeIdForSim, appStore.regionId],
    () => {
      if (appStore.view === 'simFlight') ensureRouteLoaded();
    },
    { immediate: true },
  );

  onMounted(() => {
    if (appStore.view === 'simFlight') ensureRouteLoaded();
  });

  return {
    routePath,
    trailPath,
    aircraft,
    bounds,
    hasLiveData: hasLiveFlight,
    loadingRoute,
    routeId,
  };
}
