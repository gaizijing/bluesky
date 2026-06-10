import { ref, computed, watch, onMounted, onUnmounted } from 'vue';
import { storeToRefs } from 'pinia';
import { useIsimStore } from '@/components/business/IsimAnimation/isimStore';
import { calculateAircraftSpeed } from '@/components/business/IsimAnimation/isimDataParser';
import { fetchWeatherPoint } from '@/api/weather';
import { useAppDashboardStore } from '@/store/modules/appDashboard';
import { dashboardEventBus, DASHBOARD_EVENTS } from '@/utils/eventBus';
import { useSimLiveGate } from '@/composables/useSimLiveGate';

const IDLE = {
  windSpeedH: 0,
  windDir: 0,
  windSpeedV: 0,
  visibilityM: 0,
  precipitation: 0,
  temperature: 0,
  roll: 0,
  pitch: 0,
  verticalSpeed: 0,
  altitude: 0,
  speed: 0,
  battery: 0,
};

function fmt(n, digits = 1) {
  if (n == null || !Number.isFinite(Number(n))) return '—';
  return Number(n).toFixed(digits);
}

export function useSimDashboardData() {
  const isimStore = useIsimStore();
  const appStore = useAppDashboardStore();
  const { simData, weatherImpact } = storeToRefs(isimStore);
  const { hasLiveFlight } = useSimLiveGate();

  const weather = ref({ ...IDLE });
  const derivedSpeed = ref({ groundSpeed: 0, verticalSpeed: 0 });
  let prevSimSnapshot = null;
  let prevSimTime = 0;
  let weatherTimer = null;
  let offFlight = null;

  const hasLiveData = hasLiveFlight;

  const flight = computed(() => {
    if (!hasLiveData.value) {
      return {
        roll: IDLE.roll,
        pitch: IDLE.pitch,
        altitude: IDLE.altitude,
        verticalSpeed: IDLE.verticalSpeed,
        speed: IDLE.speed,
        battery: IDLE.battery,
      };
    }
    const d = simData.value;
    if (!d) {
      return {
        roll: IDLE.roll,
        pitch: IDLE.pitch,
        altitude: IDLE.altitude,
        verticalSpeed: IDLE.verticalSpeed,
        speed: IDLE.speed,
        battery: IDLE.battery,
      };
    }
    return {
      roll: d.aircraftRoll ?? 0,
      pitch: d.aircraftPitch ?? 0,
      altitude: d.aircraftAlt ?? 0,
      verticalSpeed: d.verticalSpeed ?? derivedSpeed.value.verticalSpeed ?? 0,
      speed: d.groundSpeed ?? d.speed ?? derivedSpeed.value.groundSpeed ?? 0,
      battery: d.battery ?? d.batteryPercent ?? 0,
    };
  });

  const weatherStrip = computed(() => {
    const w = weather.value;
    const impact = weatherImpact.value;
    const windH = impact?.windSpeed ?? w.windSpeedH;
    const windDir = impact?.windDirection ?? w.windDir;
    const windV = impact?.verticalWindSpeed ?? w.windSpeedV;
    const vis = impact?.visibility ?? w.visibilityM;
    const precip = impact?.precipitation ?? w.precipitation;
    const temp = impact?.temperature ?? w.temperature;

    return [
      { key: 'windH', label: '水平风速', value: `${fmt(windH)}m/s` },
      { key: 'windDir', label: '风向', value: `${fmt(windDir)}°` },
      { key: 'windV', label: '垂直风速', value: `${fmt(windV, 2)}m/s` },
      { key: 'vis', label: '能见度', value: `${Math.round(Number(vis) || 0)}m` },
      { key: 'precip', label: '降水量', value: `${fmt(precip, 0)}mm/h` },
      { key: 'temp', label: '温度', value: `${fmt(temp)}°C` },
    ];
  });

  function applySpeedFromSnapshot(snapshot, ts) {
    if (!prevSimSnapshot || !ts || ts <= prevSimTime) return;
    const dt = (ts - prevSimTime) / 1000;
    if (dt <= 0 || dt > 10) return;
    derivedSpeed.value = calculateAircraftSpeed(prevSimSnapshot, snapshot, dt);
  }

  function onSimUpdate(data) {
    if (!data) return;
    const ts = data.timestamp ? new Date(data.timestamp).getTime() : Date.now();
    applySpeedFromSnapshot(data, ts);
    prevSimSnapshot = { ...data };
    prevSimTime = ts;
    scheduleWeatherFetch(data);
  }

  async function loadWeatherAt(lon, lat, alt) {
    if (!Number.isFinite(lon) || !Number.isFinite(lat)) return;
    try {
      const raw = await fetchWeatherPoint(lon, lat, {
        heightM: alt ?? 100,
        time: appStore.timelineTime,
      });
      const visKm = Number(raw.visibility);
      weather.value = {
        windSpeedH: Number(raw.windSpeed) || 0,
        windDir: Number(raw.windDirection) || 0,
        windSpeedV: Number(raw.verticalWindSpeed) || 0,
        visibilityM: Number.isFinite(visKm) ? visKm * 1000 : 0,
        precipitation: Number(raw.precipitation) || 0,
        temperature: Number(raw.temperature) || 0,
      };
    } catch {
      /* 保留上次值 */
    }
  }

  function scheduleWeatherFetch(data) {
    if (weatherTimer) clearTimeout(weatherTimer);
    weatherTimer = setTimeout(() => {
      loadWeatherAt(data.aircraftLon, data.aircraftLat, data.aircraftAlt);
    }, 800);
  }

  watch(simData, (val) => {
    if (hasLiveData.value && val) onSimUpdate(val);
  }, { deep: true });

  onMounted(() => {
    if (hasLiveData.value && simData.value) onSimUpdate(simData.value);
    offFlight = dashboardEventBus.on(DASHBOARD_EVENTS.FLIGHT_POSITION_UPDATED, (payload) => {
      if (hasLiveData.value && payload) onSimUpdate(payload);
    });
  });

  onUnmounted(() => {
    offFlight?.();
    if (weatherTimer) clearTimeout(weatherTimer);
  });

  return {
    hasLiveData,
    flight,
    weatherStrip,
  };
}
