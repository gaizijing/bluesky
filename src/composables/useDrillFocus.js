import { computed } from 'vue';
import { useAppDashboardStore } from '@/store/modules/appDashboard';

export function useDrillFocus() {
  const appStore = useAppDashboardStore();

  const landingPointId = computed(() =>
    appStore.focus.type === 'landingPoint' ? appStore.focus.id : null
  );

  const routeId = computed(() =>
    appStore.focus.type === 'route' ? appStore.focus.id : null
  );

  const timelineTime = computed(() => appStore.timelineTime);

  return {
    focus: computed(() => appStore.focus),
    landingPointId,
    routeId,
    timelineTime,
    regionId: computed(() => appStore.regionId),
  };
}
