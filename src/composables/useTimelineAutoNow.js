import { onMounted, onUnmounted } from 'vue';
import { useAppDashboardStore } from '@/store/modules/appDashboard';

/** 大屏静置时定期回到当前时刻，触发 MET_TIME_CHANGED 刷新各面板 */
const DEFAULT_INTERVAL_MS = 15 * 60 * 1000;

export function useTimelineAutoNow(intervalMs = DEFAULT_INTERVAL_MS) {
  const appStore = useAppDashboardStore();
  let timer = null;

  onMounted(() => {
    if (!intervalMs || intervalMs < 1000) return;
    timer = setInterval(() => {
      appStore.backToNow();
    }, intervalMs);
  });

  onUnmounted(() => {
    if (timer) {
      clearInterval(timer);
      timer = null;
    }
  });
}
