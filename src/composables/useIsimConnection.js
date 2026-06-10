import { ref, computed } from 'vue';
import { useIsimWebSocket } from '@/components/business/IsimAnimation/useIsimWebSocket';
import { useIsimStore } from '@/components/business/IsimAnimation/isimStore';
import { useHeatmapStore } from '@/store/modules/heatmap';
import { useAppDashboardStore } from '@/store/modules/appDashboard';
import { getRouteDetail } from '@/api/v2/route';

const BASE_URL = '/api/isim';
const CONFIG_KEY = 'isim_connection_config';

const DEFAULT_CONFIG = {
  host: '127.0.0.1',
  sendPort: 8154,
  receivePort: 8151,
  longitude: 120.22,
  latitude: 36.04,
  altitude: 300,
};

function loadConfig() {
  try {
    const raw = localStorage.getItem(CONFIG_KEY);
    if (!raw) return { ...DEFAULT_CONFIG };
    return { ...DEFAULT_CONFIG, ...JSON.parse(raw) };
  } catch {
    return { ...DEFAULT_CONFIG };
  }
}

function saveConfig(cfg) {
  try {
    localStorage.setItem(CONFIG_KEY, JSON.stringify(cfg));
  } catch {
    /* ignore */
  }
}

/** ISIM 连接、风场发送与联飞会话状态 */
export function useIsimConnection() {
  const isimStore = useIsimStore();
  const heatmapStore = useHeatmapStore();
  const appStore = useAppDashboardStore();

  const config = ref(loadConfig());
  const wind = ref({ u: 5.0, v: 3.0, w: 0.5 });
  const isUpdating = ref(false);
  const isControlling = ref(false);
  const isSendingWind = ref(false);
  const isDebugSending = ref(false);
  const sendingStatus = ref('stopped');
  const sendStatusMessage = ref('');

  let debugSendTimer = null;

  const {
    isConnected,
    isConnecting,
    connect,
    disconnect,
    sendAircraftPosition,
    activateIsim,
    deactivateIsim,
  } = useIsimWebSocket();

  const isSendingWindData = computed(() => sendingStatus.value === 'started');
  const sendStatusClass = computed(() => (sendingStatus.value === 'started' ? 'success' : 'info'));

  function persistConfig() {
    saveConfig(config.value);
  }

  async function applyRouteStartPosition(routeId) {
    if (!routeId) return;
    try {
      const detail = await getRouteDetail(routeId);
      const wp = detail?.waypoints?.[0];
      if (!wp) return;
      config.value = {
        ...config.value,
        longitude: Number(wp.longitude) || config.value.longitude,
        latitude: Number(wp.latitude) || config.value.latitude,
        altitude: Number(wp.altitude ?? wp.height ?? detail?.flightHeight ?? 300),
      };
      persistConfig();
    } catch (err) {
      console.warn('[ISIM] load route start position failed', err);
    }
  }

  async function updateTarget() {
    if (!config.value.host) return;
    isUpdating.value = true;
    persistConfig();

    try {
      const response = await fetch(`${BASE_URL}/update-target`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(config.value),
      });
      const result = await response.json();

      if (result.success) {
        await connect();
        sendAircraftPosition({
          longitude: config.value.longitude,
          latitude: config.value.latitude,
          altitude: config.value.altitude,
        });
        sendingStatus.value = 'stopped';
        sendStatusMessage.value = '连接成功，请点击「开始发送气象」向 ISIM 推送风场';
        appStore.simConnected = true;
        heatmapStore.switchToCitywideMode();
      } else {
        console.error('[ISIM] 连接失败:', result.message);
      }
    } catch (error) {
      console.error('[ISIM] 连接失败:', error);
    } finally {
      isUpdating.value = false;
    }
  }

  async function handleDisconnect() {
    try {
      const response = await fetch(`${BASE_URL}/disconnect`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });
      const result = await response.json();

      if (result.success) {
        disconnect();
        sendingStatus.value = 'stopped';
        sendStatusMessage.value = '';
        appStore.simConnected = false;
        stopDebugSending();
        heatmapStore.resetToDefault();
      } else {
        console.error('[ISIM] 断开失败:', result.message);
      }
    } catch (error) {
      console.error('[ISIM] 断开失败:', error);
    }
  }

  function toggleConnect() {
    if (isConnected.value) handleDisconnect();
    else updateTarget();
  }

  async function sendBodyWind() {
    isSendingWind.value = true;
    try {
      const params = new URLSearchParams({
        u: wind.value.u,
        v: wind.value.v,
        w: wind.value.w,
      });
      const response = await fetch(`${BASE_URL}/send-body-wind?${params}`, { method: 'POST' });
      const result = await response.json();
      if (!result.success) console.error('[ISIM] 发送风场失败:', result.message);
    } catch (error) {
      console.error('[ISIM] 发送风场失败:', error);
    } finally {
      isSendingWind.value = false;
    }
  }

  function startDebugSending() {
    isDebugSending.value = true;
    sendBodyWind();
    debugSendTimer = setInterval(sendBodyWind, 1000);
  }

  function stopDebugSending() {
    isDebugSending.value = false;
    if (debugSendTimer) {
      clearInterval(debugSendTimer);
      debugSendTimer = null;
    }
  }

  function toggleDebugSending() {
    if (isDebugSending.value) stopDebugSending();
    else startDebugSending();
  }

  async function controlIsim(command) {
    isControlling.value = true;
    try {
      const response = await fetch(`${BASE_URL}/control`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ command }),
      });
      const result = await response.json();

      if (result.success) {
        sendingStatus.value = result.data.status;
        sendStatusMessage.value = result.data.message;
        if (command === 'START_SENDING') {
          activateIsim();
          isimStore.updateAnimationStatus('flying');
        } else if (command === 'STOP_SENDING') {
          stopDebugSending();
          deactivateIsim();
          isimStore.updateAnimationStatus('stopped');
        }
      } else {
        console.error('[ISIM] 命令失败:', result.message);
      }
    } catch (error) {
      console.error('[ISIM] 命令失败:', error);
    } finally {
      isControlling.value = false;
    }
  }

  function dispose() {
    stopDebugSending();
  }

  return {
    config,
    wind,
    isConnected,
    isConnecting,
    isUpdating,
    isControlling,
    isSendingWind,
    isDebugSending,
    isSendingWindData,
    sendingStatus,
    sendStatusMessage,
    sendStatusClass,
    toggleConnect,
    updateTarget,
    handleDisconnect,
    controlIsim,
    sendBodyWind,
    toggleDebugSending,
    applyRouteStartPosition,
    persistConfig,
    dispose,
  };
}
