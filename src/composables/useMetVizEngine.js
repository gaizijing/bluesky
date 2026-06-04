import { watch } from 'vue';
import { MET_VIZ_ENABLED } from '@/config/featureFlags';
import { MetVizEngine } from '@/met-viz';
import { useAppDashboardStore } from '@/store/modules/appDashboard';
import { useMetVizStore } from '@/store/modules/metViz';
import { dashboardEventBus, DASHBOARD_EVENTS } from '@/utils/eventBus';

/**
 * 在 MapContainer Cesium 初始化完成后挂载 MetViz 引擎
 */
export function attachMetViz(viewer) {
  if (!MET_VIZ_ENABLED || !viewer) return null;

  const appStore = useAppDashboardStore();
  const metStore = useMetVizStore();
  const engine = new MetVizEngine(viewer);

  let syncTimer = null;
  let syncSeq = 0;

  const sync = async () => {
    if (!appStore.regionId) return;
    if (!metStore.heightM) {
      metStore.setHeightM(metStore.heightOptions[0] ?? 100);
    }
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
  };

  const safeSync = () => {
    if (syncTimer) clearTimeout(syncTimer);
    syncTimer = setTimeout(() => {
      syncTimer = null;
      sync().catch((err) => console.warn('[MetViz] sync failed', err));
    }, 400);
  };
  const offTime = dashboardEventBus.on(DASHBOARD_EVENTS.MET_TIME_CHANGED, safeSync);
  const offRegion = dashboardEventBus.on(DASHBOARD_EVENTS.REGION_CHANGED, safeSync);
  const offConfig = dashboardEventBus.on(DASHBOARD_EVENTS.MET_VIZ_CONFIG_CHANGED, safeSync);
  const stopRegionWatch = watch(
    () => appStore.regionId,
    (id) => {
      if (id) safeSync();
    },
    { immediate: true }
  );

  watch(
    () => [appStore.regionId, appStore.timelineTime],
    () => {
      if (appStore.regionId) safeSync();
    }
  );

  return {
    engine,
    sync,
    destroy() {
      if (syncTimer) clearTimeout(syncTimer);
      offTime?.();
      offRegion?.();
      offConfig?.();
      stopRegionWatch();
      engine.destroy();
    },
  };
}
