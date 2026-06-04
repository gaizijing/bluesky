import { onMounted, onUnmounted, ref } from 'vue';
import { dashboardEventBus, DASHBOARD_EVENTS } from '@/utils/eventBus';
import { useAppDashboardStore } from '@/store/modules/appDashboard';

/**
 * 面板数据刷新：挂载时加载，Timeline / Region 变更时重载
 * - 首次无数据：loading=true，展示 skeleton
 * - 后续刷新：保留当前内容，接口返回后由 loadFn 直接替换，不闪空
 */
export function usePanelRefresh(loadFn, { immediate = true, refreshOnWarning = false } = {}) {
  const appStore = useAppDashboardStore();
  const loading = ref(false);
  const error = ref(null);
  let hasLoadedOnce = false;

  async function reload(options = {}) {
    const force = options === true || options?.force === true;
    if (appStore.panelsHidden && !force) return;

    const silent = hasLoadedOnce;
    if (!silent) {
      loading.value = true;
      error.value = null;
    }

    try {
      await loadFn();
      hasLoadedOnce = true;
      if (silent) error.value = null;
    } catch (err) {
      if (!silent) error.value = err;
      console.warn('[usePanelRefresh]', err);
    } finally {
      loading.value = false;
    }
  }

  function onRegionChanged() {
    hasLoadedOnce = false;
    reload();
  }

  let offTime = null;
  let offRegion = null;
  let offWarning = null;

  onMounted(() => {
    if (immediate) reload();
    offTime = dashboardEventBus.on(DASHBOARD_EVENTS.MET_TIME_CHANGED, reload);
    offRegion = dashboardEventBus.on(DASHBOARD_EVENTS.REGION_CHANGED, onRegionChanged);
    if (refreshOnWarning) {
      offWarning = dashboardEventBus.on(DASHBOARD_EVENTS.WARNING_CHANGED, () => reload({ force: true }));
    }
  });

  onUnmounted(() => {
    offTime?.();
    offRegion?.();
    offWarning?.();
  });

  return { loading, error, reload };
}
