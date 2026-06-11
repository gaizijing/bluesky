import { ref, computed } from 'vue';
import { useIsimWebSocket } from '@/components/business/IsimAnimation/useIsimWebSocket';
import { useIsimStore } from '@/components/business/IsimAnimation/isimStore';
import { useHeatmapStore } from '@/store/modules/heatmap';
import { useAppDashboardStore } from '@/store/modules/appDashboard';
import { getRouteDetail } from '@/api/v2/route';
import request from '@/utils/request';

const CONFIG_KEY = 'isim_connection_config';

/** V2 已启用 JWT；与 axios 封装一致，避免裸 fetch 不带 Token */
const ISIM_REQ = { showLoading: false, skipLoading: true };

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

const CONTROL_STATUS_MESSAGES = {
  started: '已开始向 ISIM 推送风场',
  stopped: '已停止推送风场',
};

let debugSendTimer = null;

function stopDebugSendingTimer() {
  if (debugSendTimer) {
    clearInterval(debugSendTimer);
    debugSendTimer = null;
  }
}

/** 断开 ISIM 联飞会话（供 goHome 等全局入口调用） */
export async function disconnectSimSession() {
  const isimStore = useIsimStore();
  const heatmapStore = useHeatmapStore();
  const appStore = useAppDashboardStore();
  const { disconnect } = useIsimWebSocket();

  if (!appStore.simConnected && isimStore.connectionStatus !== 'connected') {
    return;
  }

  try {
    await request.post('/isim/disconnect', {}, ISIM_REQ);
    disconnect();
    appStore.simConnected = false;
    isimStore.updateConnectionStatus('disconnected');
    stopDebugSendingTimer();
    heatmapStore.resetToDefault();
  } catch (error) {
    console.error('[ISIM] 断开失败:', error);
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

  const {
    isConnected,
    isConnecting,
    connect,
    disconnect,
    resetConnectPromise,
    clearConnectingState,
  } = useIsimWebSocket();

  const isSendingWindData = computed(() => sendingStatus.value === 'started');
  const sendStatusClass = computed(() => (sendingStatus.value === 'started' ? 'success' : 'info'));
  const isLinkUp = computed(() => isConnected.value || appStore.simConnected);

  function sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /** 等待 WebSocket 或后端 UDP 链路就绪（后端 3s 内有 ISIM 数据即 connected） */
  async function waitForIsimLink(timeoutMs = 15000) {
    const deadline = Date.now() + timeoutMs;
    while (Date.now() < deadline) {
      if (isConnected.value) return true;
      if (isimStore.lastReceivedTime && Date.now() - isimStore.lastReceivedTime < 4000) {
        return true;
      }
      try {
        const status = await request.get('/isim/status', {}, ISIM_REQ);
        if (status?.runtime?.connected) return true;
      } catch {
        /* 轮询重试 */
      }
      await sleep(400);
    }
    return false;
  }

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
    resetConnectPromise();

    try {
      const data = await request.post('/isim/update-target', config.value, ISIM_REQ);

      try {
        await connect();
      } catch (wsErr) {
        console.warn('[ISIM] WebSocket 握手失败，继续等待 UDP 数据链路:', wsErr?.message || wsErr);
      }

      const linked = await waitForIsimLink();
      if (!linked) {
        throw new Error('未收到 ISIM 数据，请确认 ISIM 已启动且 UDP 接收端口配置正确');
      }

      sendingStatus.value = 'stopped';
      sendStatusMessage.value =
        data?.message || '连接成功，请点击「开始发送气象」向 ISIM 推送风场';
      appStore.simConnected = true;
      isimStore.updateConnectionStatus('connected');
      heatmapStore.switchToCitywideMode();
    } catch (error) {
      console.error('[ISIM] 连接失败:', error);
      sendStatusMessage.value = error.message || '连接失败';
      appStore.simConnected = false;
      isimStore.updateConnectionStatus('error', error.message);
    } finally {
      isUpdating.value = false;
      if (!isConnected.value && !appStore.simConnected) {
        clearConnectingState();
      }
    }
  }

  async function handleDisconnect() {
    await disconnectSimSession();
    sendingStatus.value = 'stopped';
    sendStatusMessage.value = '';
    isDebugSending.value = false;
  }

  function toggleConnect() {
    if (isLinkUp.value) handleDisconnect();
    else updateTarget();
  }

  async function sendBodyWind() {
    isSendingWind.value = true;
    try {
      await request.post(
        '/isim/send-body-wind',
        {},
        {
          ...ISIM_REQ,
          params: { u: wind.value.u, v: wind.value.v, w: wind.value.w },
        },
      );
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
    stopDebugSendingTimer();
  }

  function toggleDebugSending() {
    if (isDebugSending.value) stopDebugSending();
    else startDebugSending();
  }

  async function controlIsim(command) {
    isControlling.value = true;
    try {
      const data = await request.post('/isim/control', { command }, ISIM_REQ);
      sendingStatus.value = data?.status ?? sendingStatus.value;
      sendStatusMessage.value =
        data?.message || CONTROL_STATUS_MESSAGES[data?.status] || '';
      if (command === 'START_SENDING') {
        isimStore.updateAnimationStatus('flying');
      } else if (command === 'STOP_SENDING') {
        stopDebugSending();
        isimStore.updateAnimationStatus('stopped');
      }
    } catch (error) {
      console.error('[ISIM] 命令失败:', error);
      sendStatusMessage.value = error.message || '命令执行失败';
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
    isLinkUp,
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
