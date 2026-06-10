import { computed } from 'vue';
import { storeToRefs } from 'pinia';
import { useIsimStore } from '@/components/business/IsimAnimation/isimStore';
import { useAppDashboardStore } from '@/store/modules/appDashboard';

/** ISIM 已连接且飞机开始飞行（有有效姿态数据） */
export function useSimLiveGate() {
  const isimStore = useIsimStore();
  const appStore = useAppDashboardStore();
  const { simData } = storeToRefs(isimStore);

  const hasLiveFlight = computed(() => {
    if (appStore.view !== 'simFlight') return false;
    if (!isimStore.isConnected || !isimStore.isFlying) return false;
    if (isimStore.isDataStale || !simData.value) return false;
    const d = simData.value;
    return Number.isFinite(Number(d.aircraftLon)) && Number.isFinite(Number(d.aircraftLat));
  });

  return { hasLiveFlight };
}
