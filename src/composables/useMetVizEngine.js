import { watch } from 'vue';
import { MET_VIZ_ENABLED } from '@/config/featureFlags';
import { MetVizEngine } from '@/met-viz';
import { useAppDashboardStore } from '@/store/modules/appDashboard';
import { useMetVizStore } from '@/store/modules/metViz';
import { dashboardEventBus, DASHBOARD_EVENTS } from '@/utils/eventBus';

function logPerf(label, startMs) {
  console.log(`[MetViz][Perf] ${label} — ${(performance.now() - startMs).toFixed(1)}ms`);
}

/**
 * 在 MapContainer Cesium 初始化完成后挂载 MetViz 引擎
 */
export function attachMetViz(viewer) {
  if (!MET_VIZ_ENABLED || !viewer) return null;

  const attachStart = performance.now();
  const appStore = useAppDashboardStore();
  const metStore = useMetVizStore();

  let stepStart = performance.now();
  const engine = new MetVizEngine(viewer);
  logPerf('attachMetViz createEngine', stepStart);

  let syncTimer = null;
  let syncSeq = 0;

  const sync = async () => {
    if (!appStore.regionId) {
      console.log('[MetViz][Perf] sync 跳过 — regionId 未就绪');
      return;
    }
    if (!metStore.heightM) {
      metStore.setHeightM(metStore.heightOptions[0] ?? 100);
    }
    const syncStart = performance.now();
    const seq = ++syncSeq;
    await engine.refresh({
      regionId: appStore.regionId,
      time: appStore.timelineTime,
      product: metStore.product,
      heightM: metStore.heightM,
      enabled: { ...metStore.enabled },
    });
    if (seq !== syncSeq) return;
    metStore.markRefreshed();
    logPerf(`sync 总计 (region=${appStore.regionId})`, syncStart);
  };

  const safeSync = () => {
    if (syncTimer) clearTimeout(syncTimer);
    syncTimer = setTimeout(() => {
      syncTimer = null;
      sync().catch((err) => console.warn('[MetViz] sync failed', err));
    }, 400);
  };

  stepStart = performance.now();
  const offTime = dashboardEventBus.on(DASHBOARD_EVENTS.MET_TIME_CHANGED, safeSync);
  const offRegion = dashboardEventBus.on(DASHBOARD_EVENTS.REGION_CHANGED, safeSync);
  const offConfig = dashboardEventBus.on(DASHBOARD_EVENTS.MET_VIZ_CONFIG_CHANGED, safeSync);
  logPerf('attachMetViz bindListeners', stepStart);
  logPerf('attachMetViz 总计', attachStart);

  return {
    engine,
    sync,
    destroy() {
      if (syncTimer) clearTimeout(syncTimer);
      offTime?.();
      offRegion?.();
      offConfig?.();
      engine.destroy();
    },
  };
}
