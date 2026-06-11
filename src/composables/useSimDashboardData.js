import { ref, computed, watch, onMounted, onUnmounted, shallowRef } from 'vue';
import { storeToRefs } from 'pinia';
import { useIsimStore } from '@/components/business/IsimAnimation/isimStore';
import { calculateAircraftSpeed } from '@/components/business/IsimAnimation/isimDataParser';
import { fetchWeatherPoint } from '@/api/weather';
import { getRouteDetail } from '@/api/v2/route';
import { useAppDashboardStore } from '@/store/modules/appDashboard';
import { dashboardEventBus, DASHBOARD_EVENTS } from '@/utils/eventBus';
import { extractAircraftPose } from '@/utils/isimPose';
import { createCancellableRafScheduler } from '@/utils/rafSchedule';

const ISIM_CONFIG_KEY = 'isim_connection_config';
const DEFAULT_ISIM_CONFIG = {
  longitude: 120.22,
  latitude: 36.04,
  altitude: 300,
};

function loadIsimConfig() {
  try {
    const raw = localStorage.getItem(ISIM_CONFIG_KEY);
    if (!raw) return { ...DEFAULT_ISIM_CONFIG };
    return { ...DEFAULT_ISIM_CONFIG, ...JSON.parse(raw) };
  } catch {
    return { ...DEFAULT_ISIM_CONFIG };
  }
}

const IDLE = {
  windSpeedH: 0,
  windDir: 0,
  windSpeedV: 0,
  visibilityM: 0,
  precipitation: 0,
  temperature: 0,
  heading: 0,
  roll: 0,
  pitch: 0,
  verticalSpeed: 0,
  altitude: 0,
  speed: 0,
  battery: 100,
};

function fmt(n, digits = 1) {
  if (n == null || !Number.isFinite(Number(n))) return '—';
  return Number(n).toFixed(digits);
}

function toFiniteNumber(val, fallback = 0) {
  const n = Number(val);
  return Number.isFinite(n) ? n : fallback;
}

function round1(n) {
  const v = Number(n);
  return Number.isFinite(v) ? Math.round(v * 10) / 10 : 0;
}

function createStickyReader(initial = 0) {
  let last = initial;
  const read = (raw, validate) => {
    const n = Number(raw);
    if (!validate(n)) return last;
    last = n;
    return n;
  };
  read.reset = () => {
    last = initial;
  };
  return read;
}

/** 优先用 ISIM 直传字段（含 0），否则用推算值 */
function pickFlightMetric(directVal, derivedVal, fallback = 0) {
  if (directVal !== undefined && directVal !== null && directVal !== '') {
    const n = Number(directVal);
    if (Number.isFinite(n)) return n;
  }
  const derived = Number(derivedVal);
  if (Number.isFinite(derived)) return derived;
  return fallback;
}

function parseSimTimestamp(data) {
  const raw = data?.timestamp;
  if (raw == null || raw === '') return Date.now();
  if (typeof raw === 'number' && Number.isFinite(raw)) {
    return raw > 1e12 ? raw : raw * 1000;
  }
  if (Array.isArray(raw)) {
    const [y, mo, d, h = 0, mi = 0, s = 0, nano = 0] = raw;
    const ms = new Date(y, (mo ?? 1) - 1, d ?? 1, h, mi, s, Math.floor((nano ?? 0) / 1e6)).getTime();
    return Number.isFinite(ms) ? ms : Date.now();
  }
  const ms = new Date(raw).getTime();
  return Number.isFinite(ms) ? ms : Date.now();
}

/** 优先用非零 ISIM 影响值，否则用按飞机位置拉取的气象 */
function pickMetric(impactVal, fetchedVal) {
  const i = Number(impactVal);
  const f = Number(fetchedVal);
  if (Number.isFinite(i) && i !== 0) return i;
  if (Number.isFinite(f)) return f;
  if (Number.isFinite(i)) return i;
  return 0;
}

export function useSimDashboardData() {
  const isimStore = useIsimStore();
  const appStore = useAppDashboardStore();
  const { simData, weatherImpact } = storeToRefs(isimStore);

  const weather = ref({ ...IDLE });
  const derivedSpeed = ref({ groundSpeed: 0, verticalSpeed: 0 });
  let prevSimSnapshot = null;
  let prevSimTime = 0;
  let weatherTimer = null;
  let lastWeatherKey = '';
  let routeStartCache = { routeId: null, lon: null, lat: null, alt: null };
  let offFlight = null;
  let scheduleSimUpdate = null;
  let syncFlightDisplay = null;

  const readAltitude = createStickyReader(0);
  const readHeading = createStickyReader(0);

  const hasSimSession = computed(() => {
    if (appStore.view !== 'simFlight') return false;
    return isimStore.isConnected || appStore.simConnected;
  });

  const hasLiveFlight = computed(() => {
    if (!hasSimSession.value || !simData.value) return false;
    return !!extractAircraftPose(simData.value);
  });

  const flightInternal = computed(() => {
    if (!hasSimSession.value) {
      return { ...IDLE };
    }
    const d = simData.value;
    if (!d) {
      return { ...IDLE };
    }
    const heading = readHeading(
      d.aircraftHeading,
      (n) => Number.isFinite(n),
    );
    const altitude = readAltitude(
      d.aircraftAlt,
      (n) => Number.isFinite(n) && n >= 0 && n <= 12000,
    );
    return {
      heading: Math.round(((heading % 360) + 360) % 360),
      roll: round1(toFiniteNumber(d.aircraftRoll ?? d.roll)),
      pitch: round1(toFiniteNumber(d.aircraftPitch ?? d.pitch)),
      altitude: round1(altitude),
      verticalSpeed: round1(Math.max(-80, Math.min(80, pickFlightMetric(
        d.verticalSpeed,
        derivedSpeed.value.verticalSpeed,
      )))),
      speed: round1(Math.max(0, Math.min(150, pickFlightMetric(
        d.groundSpeed,
        derivedSpeed.value.groundSpeed,
      )))),
      battery: toFiniteNumber(d.battery ?? d.batteryPercent, 100),
    };
  });

  /** 仪表显示：每帧最多更新一次，避免 UDP 高频推送导致跳动 */
  const flight = shallowRef({ ...IDLE });

  function flightDisplayChanged(prev, next) {
    return prev.heading !== next.heading
      || prev.roll !== next.roll
      || prev.pitch !== next.pitch
      || prev.altitude !== next.altitude
      || prev.verticalSpeed !== next.verticalSpeed
      || prev.speed !== next.speed
      || prev.battery !== next.battery;
  }

  syncFlightDisplay = createCancellableRafScheduler((next) => {
    if (!flightDisplayChanged(flight.value, next)) return;
    flight.value = next;
  });

  const weatherStrip = computed(() => {
    const w = weather.value;
    const impact = weatherImpact.value;
    const liveAtAircraft = hasLiveFlight.value;

    const windH = liveAtAircraft ? w.windSpeedH : pickMetric(impact?.windSpeed, w.windSpeedH);
    const windDir = liveAtAircraft ? w.windDir : pickMetric(impact?.windDirection, w.windDir);
    const windV = liveAtAircraft ? w.windSpeedV : pickMetric(impact?.verticalWindSpeed, w.windSpeedV);
    const vis = liveAtAircraft ? w.visibilityM : pickMetric(impact?.visibility, w.visibilityM);
    const precip = liveAtAircraft ? w.precipitation : pickMetric(impact?.precipitation, w.precipitation);
    const temp = liveAtAircraft ? w.temperature : pickMetric(impact?.temperature, w.temperature);

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
    if (!prevSimSnapshot || !Number.isFinite(ts) || ts <= prevSimTime) return;
    const dt = (ts - prevSimTime) / 1000;
    if (dt < 0.05 || dt > 10) return;
    const hasDirectSpeed = Number.isFinite(Number(snapshot?.groundSpeed))
      || Number.isFinite(Number(snapshot?.verticalSpeed));
    if (hasDirectSpeed) return;
    derivedSpeed.value = calculateAircraftSpeed(prevSimSnapshot, snapshot, dt);
  }

  function onSimUpdate(data) {
    if (!data || !hasSimSession.value) return;
    const ts = parseSimTimestamp(data);
    applySpeedFromSnapshot(data, ts);
    prevSimSnapshot = { ...data };
    prevSimTime = ts;
    if (extractAircraftPose(data)) {
      scheduleWeatherFetch(data);
    }
  }

  async function resolveRouteStart(routeId) {
    if (!routeId) return null;
    if (routeStartCache.routeId === routeId
      && Number.isFinite(routeStartCache.lon)
      && Number.isFinite(routeStartCache.lat)) {
      return routeStartCache;
    }
    try {
      const detail = await getRouteDetail(routeId);
      const wp = detail?.waypoints?.[0];
      if (!wp) return null;
      routeStartCache = {
        routeId,
        lon: Number(wp.longitude),
        lat: Number(wp.latitude),
        alt: Number(wp.altitude ?? wp.height ?? detail?.flightHeight ?? 300),
      };
      return routeStartCache;
    } catch (err) {
      console.warn('[SimDashboard] resolve route start failed', err);
      return null;
    }
  }

  /** 联飞中仅取飞机位姿；未连接时回退航路起点 / 配置坐标 */
  async function resolveWeatherLocation(data) {
    const snapshot = data ?? simData.value;
    const pose = snapshot ? extractAircraftPose(snapshot) : null;
    if (pose) return pose;
    if (hasSimSession.value) return null;

    const routeStart = await resolveRouteStart(appStore.routeIdForSim);
    if (routeStart) {
      return { lon: routeStart.lon, lat: routeStart.lat, alt: routeStart.alt };
    }

    const cfg = loadIsimConfig();
    const lon = Number(cfg.longitude);
    const lat = Number(cfg.latitude);
    if (!Number.isFinite(lon) || !Number.isFinite(lat)) return null;
    return { lon, lat, alt: Number(cfg.altitude) || 300 };
  }

  async function loadWeatherAt(lon, lat, alt) {
    if (!Number.isFinite(lon) || !Number.isFinite(lat)) return;
    try {
      const raw = await fetchWeatherPoint(lon, lat, {
        heightM: Math.round(Number(alt) || 100),
        time: appStore.timelineTime,
      });
      const visKm = Number(raw.visibility);
      const windDir = Number(raw.windDirection ?? raw.wind360);
      const next = {
        windSpeedH: Number(raw.windSpeed) || 0,
        windDir: Number.isFinite(windDir) ? windDir : 0,
        windSpeedV: Number(raw.verticalWindSpeed) || 0,
        visibilityM: Number.isFinite(visKm) ? visKm * 1000 : 0,
        precipitation: Number(raw.precipitation) || 0,
        temperature: Number(raw.temperature) || 0,
      };
      weather.value = next;
      isimStore.updateWeatherImpact({
        windSpeed: next.windSpeedH,
        windDirection: next.windDir,
        verticalWindSpeed: next.windSpeedV,
        visibility: next.visibilityM,
        precipitation: next.precipitation,
        temperature: next.temperature,
        source: 'WEATHER_API',
      });
    } catch (err) {
      console.warn('[SimDashboard] load weather failed', err);
    }
  }

  function scheduleWeatherFetch(data, { force = false } = {}) {
    if (appStore.view !== 'simFlight') return;
    const live = hasLiveFlight.value;
    const debounceMs = live ? 200 : 400;
    if (weatherTimer) clearTimeout(weatherTimer);
    weatherTimer = setTimeout(async () => {
      weatherTimer = null;
      const pose = await resolveWeatherLocation(data ?? simData.value);
      if (!pose) return;
      const key = `${pose.lon.toFixed(4)},${pose.lat.toFixed(4)},${Math.round(pose.alt ?? 0)},${appStore.timelineTime}`;
      if (!force && key === lastWeatherKey) return;
      lastWeatherKey = key;
      loadWeatherAt(pose.lon, pose.lat, pose.alt);
    }, debounceMs);
  }

  scheduleSimUpdate = createCancellableRafScheduler((data) => {
    if (hasSimSession.value && data) onSimUpdate(data);
  });

  watch(flightInternal, (next) => {
    if (!hasSimSession.value) {
      flight.value = { ...IDLE };
      return;
    }
    syncFlightDisplay(next);
  }, { immediate: true });

  watch(simData, (val) => {
    if (hasSimSession.value && val) scheduleSimUpdate(val);
  });

  watch(hasSimSession, (active) => {
    if (!active) {
      readAltitude.reset();
      readHeading.reset();
      flight.value = { ...IDLE };
      syncFlightDisplay?.cancel();
      if (appStore.view === 'simFlight') {
        lastWeatherKey = '';
        scheduleWeatherFetch(null, { force: true });
      } else {
        lastWeatherKey = '';
        weather.value = { ...IDLE };
      }
      return;
    }
    if (simData.value) {
      onSimUpdate(simData.value);
      if (extractAircraftPose(simData.value)) {
        scheduleWeatherFetch(simData.value, { force: true });
      }
    }
  });

  watch(
    () => appStore.view,
    (view) => {
      if (view === 'simFlight') {
        scheduleWeatherFetch(hasLiveFlight.value ? simData.value : null, { force: true });
        return;
      }
      lastWeatherKey = '';
      routeStartCache = { routeId: null, lon: null, lat: null, alt: null };
      weather.value = { ...IDLE };
    },
  );

  watch(
    () => appStore.routeIdForSim,
    () => {
      if (hasLiveFlight.value) return;
      routeStartCache = { routeId: null, lon: null, lat: null, alt: null };
      if (appStore.view === 'simFlight') {
        lastWeatherKey = '';
        scheduleWeatherFetch(null, { force: true });
      }
    },
  );

  watch(
    () => appStore.timelineTime,
    () => {
      if (appStore.view !== 'simFlight') return;
      lastWeatherKey = '';
      scheduleWeatherFetch(hasLiveFlight.value ? simData.value : null, { force: true });
    },
  );

  onMounted(() => {
    if (appStore.view === 'simFlight') {
      scheduleWeatherFetch(hasLiveFlight.value ? simData.value : null, { force: true });
    }
    if (hasSimSession.value && simData.value) {
      onSimUpdate(simData.value);
    }
    offFlight = dashboardEventBus.on(DASHBOARD_EVENTS.FLIGHT_POSITION_UPDATED, (payload) => {
      if (!hasSimSession.value || !payload) return;
      scheduleSimUpdate(payload);
      if (extractAircraftPose(payload)) {
        scheduleWeatherFetch(payload);
      }
    });
  });

  onUnmounted(() => {
    offFlight?.();
    scheduleSimUpdate?.cancel();
    syncFlightDisplay?.cancel();
    if (weatherTimer) clearTimeout(weatherTimer);
  });

  return {
    hasLiveData: hasSimSession,
    flight,
    weatherStrip,
  };
}
