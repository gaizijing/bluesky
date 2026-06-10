import { ref, computed, watch } from 'vue';
import { useAppDashboardStore } from '@/store/modules/appDashboard';
import { fetchRoutes } from '@/api/v2/route';

/** 联飞航路下拉选项 */
export function useSimRouteSelect(onSelect) {
  const appStore = useAppDashboardStore();
  const routes = ref([]);
  const loadingRoutes = ref(false);

  const selectedRouteId = computed({
    get: () => appStore.routeIdForSim,
    set: (id) => {
      if (!id || id === appStore.routeIdForSim) return;
      appStore.routeIdForSim = id;
      onSelect?.(id);
    },
  });

  async function loadRoutes() {
    if (!appStore.regionId) {
      routes.value = [];
      return;
    }
    loadingRoutes.value = true;
    try {
      const page = await fetchRoutes(appStore.regionId, 1, 50);
      const records = page?.records || [];
      routes.value = records.map((r) => ({
        id: r.routeId || r.id,
        name: r.name || r.routeName || r.id,
      }));
      if (!appStore.routeIdForSim && routes.value.length) {
        selectedRouteId.value = routes.value[0].id;
      }
    } catch (err) {
      console.warn('[SimRouteSelect] load routes failed', err);
      routes.value = [];
    } finally {
      loadingRoutes.value = false;
    }
  }

  watch(
    () => appStore.regionId,
    () => loadRoutes(),
    { immediate: true },
  );

  return {
    routes,
    loadingRoutes,
    selectedRouteId,
    loadRoutes,
  };
}
