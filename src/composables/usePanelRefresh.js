import { onMounted, onUnmounted, ref } from 'vue';
import { dashboardEventBus, DASHBOARD_EVENTS } from '@/utils/eventBus';

/**
 * 面板数据刷新：挂载时加载，Timeline / Region 变更时重载
 * - 首次无数据：loading=true，展示 skeleton
 * - 后续刷新：保留当前内容，接口返回后由 loadFn 直接替换，不闪空
 */
export function usePanelRefresh(loadFn, { immediate = true, refreshOnWarning = false, debounceMs = 200 } = {}) {
  const loading = ref(false);
  const error = ref(null);
  let hasLoadedOnce = false;
  let reloadDebounceTimer = null;

  async function reload() {

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

  function scheduleReload() {
    if (reloadDebounceTimer) clearTimeout(reloadDebounceTimer);
    reloadDebounceTimer = setTimeout(() => {
      reloadDebounceTimer = null;
      reload();
    }, debounceMs);
  }

  let offTime = null;
  let offRegion = null;
  let offWarning = null;

  onMounted(() => {
    if (immediate) reload();
    offTime = dashboardEventBus.on(DASHBOARD_EVENTS.MET_TIME_CHANGED, () => scheduleReload());
    offRegion = dashboardEventBus.on(DASHBOARD_EVENTS.REGION_CHANGED, onRegionChanged);
    if (refreshOnWarning) {
      offWarning = dashboardEventBus.on(DASHBOARD_EVENTS.WARNING_CHANGED, () => reload());
    }
  });

  onUnmounted(() => {
    offTime?.();
    offRegion?.();
    offWarning?.();
    if (reloadDebounceTimer) clearTimeout(reloadDebounceTimer);
  });

  return { loading, error, reload };
}
