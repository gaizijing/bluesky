import { ref, shallowRef, watch } from 'vue';
import * as Cesium from 'cesium';
import { RegionMeteoEngine } from '@/region-meteo/RegionMeteoEngine';
import { createMapViewer } from '@/region-meteo/basemap';
import { loadDemoConfig } from '@/region-meteo/config';
import { normalizeRegion } from '@/region-meteo/geo';
import { useAppDashboardStore } from '@/store/modules/appDashboard';
import { useRegionStore } from '@/store/modules/region';
import { dashboardEventBus, DASHBOARD_EVENTS } from '@/utils/eventBus';
import { getMapTilesConfig } from '@/config/mapTiles';
import dashboardConfig from '@/config/dashboard.config.json';

let cesiumWindPromise = null;

function ensureCesiumWindScript() {
  if (window.CesiumWind?.WindLayer) return Promise.resolve();
  if (cesiumWindPromise) return cesiumWindPromise;
  cesiumWindPromise = new Promise((resolve, reject) => {
    const existing = document.querySelector('script[data-region-meteo-wind]');
    if (existing) {
      existing.addEventListener('load', () => resolve());
      existing.addEventListener('error', reject);
      return;
    }
    const script = document.createElement('script');
    script.src = '/region-meteo/lib/cesium-wind.js';
    script.dataset.regionMeteoWind = '1';
    script.onload = () => resolve();
    script.onerror = () => reject(new Error('cesium-wind.js 加载失败'));
    document.head.appendChild(script);
  });
  return cesiumWindPromise;
}

function buildEngineDeps(appStore, regionStore, attachMode = 'standalone') {
  return {
    attachMode,
    getRegion() {
      const cfg = regionStore.regionConfig;
      const regionId = appStore.regionId || cfg?.regionId;
      if (!regionId) return null;
      return normalizeRegion({ ...cfg, regionId });
    },
    getTimelineTime: () => appStore.timelineTime,
    getPickMode: () => appStore.pickMode,
    getDashboardFocus: () => ({
      view: appStore.view,
      focusType: appStore.focus.type,
      focusId: appStore.focus.id,
    }),
    onDrillLanding: attachMode === 'dashboard'
      ? (id) => appStore.drillLanding(id)
      : undefined,
    onDrillRoute: attachMode === 'dashboard'
      ? (id) => appStore.drillRoute(id)
      : undefined,
    getConfig: () => ({
      tiandituToken: getMapTilesConfig().cesium?.tianditu_token,
      defaultLayers: attachMode === 'dashboard'
        ? dashboardConfig.regionMeteo?.defaultLayers
        : undefined,
    }),
  };
}

/**
 * RegionMeteo 地图引擎：独立页创建 viewer，或挂接到 Dashboard 已有 viewer
 */
export function useRegionMeteoEngine() {
  const engine = shallowRef(null);
  const viewerRef = shallowRef(null);
  const status = ref({ text: '初始化…', type: 'loading' });
  const engineState = ref(null);

  const appStore = useAppDashboardStore();
  const regionStore = useRegionStore();

  let teardown = null;
  let ownsViewer = false;

  function syncEngineState() {
    if (engine.value) {
      engineState.value = engine.value.getState();
    }
  }

  async function bindEngine(viewer, attachMode) {
    window.Cesium = Cesium;
    await ensureCesiumWindScript();

    const meteoEngine = new RegionMeteoEngine();
    meteoEngine.onStatusChange = (text, type) => {
      status.value = { text, type };
    };

    await meteoEngine.mount(viewer, buildEngineDeps(appStore, regionStore, attachMode));

    engine.value = meteoEngine;
    viewerRef.value = viewer;
    syncEngineState();

    const offPick = watch(
      () => appStore.pickMode,
      (on) => {
        meteoEngine.setPickMode(on);
        if (!on && attachMode === 'dashboard') {
          appStore.setPickPopup(null);
        }
      },
    );

    const offTime = dashboardEventBus.on(DASHBOARD_EVENTS.MET_TIME_CHANGED, () => {
      meteoEngine.scheduleTimeReload();
      syncEngineState();
    });

    const offRegion = dashboardEventBus.on(DASHBOARD_EVENTS.REGION_CHANGED, () => {
      meteoEngine.scheduleRegionReload();
      syncEngineState();
    });

    const offView = watch(
      () => [appStore.view, appStore.focus.type, appStore.focus.id],
      () => {
        meteoEngine.syncDrillHighlight();
      },
    );

    const offViewEvent = dashboardEventBus.on(DASHBOARD_EVENTS.VIEW_CHANGED, () => {
      meteoEngine.syncDrillHighlight();
    });

    const offResetHome = attachMode === 'dashboard'
      ? dashboardEventBus.on(DASHBOARD_EVENTS.RESET_HOME_CAMERA, () => {
        meteoEngine.resetOverviewCamera();
      })
      : null;

    return () => {
      offPick();
      offTime?.();
      offRegion?.();
      offView();
      offViewEvent?.();
      offResetHome?.();
      meteoEngine.destroy();
      if (ownsViewer) {
        viewer.destroy();
      }
      engine.value = null;
      viewerRef.value = null;
      engineState.value = null;
      ownsViewer = false;
      teardown = null;
    };
  }

  async function initMap(containerEl) {
    if (!containerEl) throw new Error('地图容器未就绪');
    if (teardown) teardown();

    const demoConfig = await loadDemoConfig({
      tiandituToken: getMapTilesConfig().cesium?.tianditu_token,
    });
    const viewer = createMapViewer(containerEl, demoConfig);
    ownsViewer = true;
    teardown = await bindEngine(viewer, 'standalone');
    return { viewer, engine: engine.value };
  }

  async function mountOnViewer(viewer) {
    if (!viewer) throw new Error('viewer 未就绪');
    if (teardown) teardown();
    ownsViewer = false;
    teardown = await bindEngine(viewer, 'dashboard');
    return engine.value;
  }

  function destroyMap() {
    teardown?.();
  }

  async function setLayerToggle(key, enabled) {
    if (!engine.value) return;
    await engine.value.setLayerToggle(key, enabled);
    syncEngineState();
  }

  async function setProduct(productId) {
    if (!engine.value) return;
    await engine.value.setProduct(productId);
    syncEngineState();
  }

  function setHeightM(heightM) {
    engine.value?.setHeightM(heightM);
    syncEngineState();
  }

  function setAlpha(value) {
    engine.value?.setAlpha(value);
    syncEngineState();
  }

  function setIsoSurface(show) {
    engine.value?.setIsoSurface(show);
    syncEngineState();
  }

  function togglePickMode() {
    appStore.togglePickMode();
  }

  return {
    engine,
    viewerRef,
    status,
    engineState,
    initMap,
    mountOnViewer,
    destroyMap,
    setLayerToggle,
    setProduct,
    setHeightM,
    setAlpha,
    setIsoSurface,
    togglePickMode,
    syncEngineState,
    pickMode: () => appStore.pickMode,
  };
}
