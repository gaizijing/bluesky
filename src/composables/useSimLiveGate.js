import { computed } from 'vue';
import { storeToRefs } from 'pinia';
import { useIsimStore } from '@/components/business/IsimAnimation/isimStore';
import { useAppDashboardStore } from '@/store/modules/appDashboard';
import { extractAircraftPose } from '@/utils/isimPose';

/** ISIM 已连接且收到有效飞机位姿 */
export function useSimLiveGate() {
  const isimStore = useIsimStore();
  const appStore = useAppDashboardStore();
  const { simData } = storeToRefs(isimStore);

  const hasLiveFlight = computed(() => {
    if (appStore.view !== 'simFlight') return false;
    if (!isimStore.isConnected && !appStore.simConnected) return false;
    if (!simData.value) return false;
    return !!extractAircraftPose(simData.value);
  });

  return { hasLiveFlight };
}
