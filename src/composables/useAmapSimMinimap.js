import { watch, onUnmounted } from 'vue';
import AMapLoader from '@amap/amap-jsapi-loader';
import planeIcon from '@/assets/images/sim-plane.svg';
import { AMAP_KEY, applyAmapSecurityConfig } from '@/config/amap';

function toLngLatPath(points = []) {
  return points
    .map((p) => [Number(p.lon), Number(p.lat)])
    .filter(([lon, lat]) => Number.isFinite(lon) && Number.isFinite(lat));
}

function boundsCenter(bounds) {
  if (!bounds) return null;
  return [
    (bounds.minLon + bounds.maxLon) / 2,
    (bounds.minLat + bounds.maxLat) / 2,
  ];
}

/**
 * 初始化高德小地图：计划航路虚线 + 真实飞行轨迹 + 飞机 Marker
 */
export function useAmapSimMinimap(mapElRef, {
  routePath,
  trailPath,
  aircraft,
  bounds,
  loadingRoute,
  hasLiveData,
}) {

  let map = null;
  let AMapRef = null;
  let routeLine = null;
  let trailLine = null;
  let planeMarker = null;
  let resizeObserver = null;
  let fitDone = false;
  let initPromise = null;

  async function ensureMap() {
    const el = mapElRef.value;
    if (!el || map) return map;
    if (!AMAP_KEY) {
      console.warn('[SimMinimap] 未配置 VITE_AMAP_KEY');
      return null;
    }
    if (initPromise) return initPromise;

    initPromise = (async () => {
      applyAmapSecurityConfig();
      AMapRef = await AMapLoader.load({
        key: AMAP_KEY,
        version: '2.0',
        plugins: ['AMap.MoveAnimation'],
      });

      map = new AMapRef.Map(el, {
        viewMode: '2D',
        zoom: 12,
        center: boundsCenter(bounds.value) || [120.28, 36.08],
        resizeEnable: true,
        animateEnable: true,
        dragEnable: true,
        zoomEnable: true,
        doubleClickZoom: true,
        keyboardEnable: false,
        jogEnable: false,
        scrollWheel: true,
        touchZoom: true,
        showLabel: false,
        features: ['bg', 'road', 'point'],
      });

      map.add(new AMapRef.TileLayer.Satellite());

      routeLine = new AMapRef.Polyline({
        path: [],
        strokeColor: '#00e8ff',
        strokeOpacity: 0.75,
        strokeWeight: 2,
        strokeStyle: 'dashed',
        lineJoin: 'round',
        lineCap: 'round',
        zIndex: 50,
      });

      trailLine = new AMapRef.Polyline({
        path: [],
        strokeColor: '#10b981',
        strokeOpacity: 0.9,
        strokeWeight: 3,
        strokeStyle: 'solid',
        lineJoin: 'round',
        lineCap: 'round',
        zIndex: 60,
      });

      planeMarker = new AMapRef.Marker({
        position: boundsCenter(bounds.value) || [120.28, 36.08],
        icon: new AMapRef.Icon({
          image: planeIcon,
          size: new AMapRef.Size(36, 36),
          imageSize: new AMapRef.Size(36, 36),
        }),
        offset: new AMapRef.Pixel(-18, -18),
        angle: 0,
        zIndex: 100,
      });

      map.add([routeLine, trailLine, planeMarker]);
      bindResize(el);
      syncRoute(true);
      syncTrail();
      syncPlane(false);
      return map;
    })().catch((err) => {
      console.error('[SimMinimap] AMap init failed', err);
      initPromise = null;
      return null;
    });

    return initPromise;
  }

  function bindResize(el) {
    resizeObserver = new ResizeObserver(() => {
      map?.resize?.();
    });
    resizeObserver.observe(el);
  }

  function fitToContent() {
    if (!map || fitDone) return;
    const overlays = [routeLine, trailLine].filter(Boolean);
    if (!overlays.length) return;
    const route = toLngLatPath(routePath.value);
    const trail = toLngLatPath(trailPath.value);
    if (!route.length && !trail.length) return;
    map.setFitView(overlays, false, [24, 24, 24, 24]);
    fitDone = true;
  }

  function syncRoute(allowFit = false) {
    if (!routeLine) return;
    const path = toLngLatPath(routePath.value);
    if (path.length < 2) {
      routeLine.setPath([]);
      routeLine.setOptions({ strokeOpacity: 0 });
    } else {
      routeLine.setPath(path);
      routeLine.setOptions({ strokeOpacity: 0.75 });
    }
    if (allowFit && path.length >= 2) fitToContent();
  }

  function syncTrail() {
    if (!trailLine) return;
    const path = toLngLatPath(trailPath.value);
    if (path.length < 2) {
      trailLine.setPath([]);
      trailLine.setOptions({ strokeOpacity: 0 });
      return;
    }
    trailLine.setPath(path);
    trailLine.setOptions({ strokeOpacity: 0.9 });
  }

  function syncPlane(animate) {
    if (!planeMarker) return;
    const ac = aircraft.value;
    if (!ac) {
      planeMarker.hide?.();
      return;
    }
    planeMarker.show?.();
    const pos = [ac.lon, ac.lat];
    const heading = Number(ac.heading) || 0;

    if (animate && typeof planeMarker.moveTo === 'function') {
      planeMarker.moveTo(pos, {
        duration: 800,
        autoRotation: true,
      });
      planeMarker.setAngle(heading);
    } else {
      planeMarker.setPosition(pos);
      planeMarker.setAngle(heading);
    }
  }

  watch(mapElRef, (el) => {
    if (el) ensureMap();
  }, { immediate: true });

  watch(routePath, () => {
    syncRoute(!fitDone);
  }, { deep: true });

  watch(trailPath, () => {
    syncTrail();
  }, { deep: true });

  watch(aircraft, (val, oldVal) => {
    if (!val) return;
    const moved = !oldVal || val.lon !== oldVal.lon || val.lat !== oldVal.lat;
    syncPlane(moved && hasLiveData.value);
  }, { deep: true });

  watch(loadingRoute, async (loading) => {
    if (!loading) {
      fitDone = false;
      await ensureMap();
      syncRoute(true);
    }
  });

  watch(bounds, async (box) => {
    if (!map || !box || fitDone) return;
    await ensureMap();
    syncRoute(true);
  });

  onUnmounted(() => {
    resizeObserver?.disconnect();
    resizeObserver = null;
    if (map) {
      map.destroy();
      map = null;
    }
    routeLine = null;
    trailLine = null;
    planeMarker = null;
    AMapRef = null;
    initPromise = null;
  });

  return { ensureMap };
}
