import request from '@/utils/request';
import { resolveRegionId } from './regionContext';

/**
 * P1：单点气象 GET /weather/point
 * { lng, lat, temperature, windSpeed(m/s), visibility(km), precipitation, bucketTime, isStale, ... }
 */
export async function fetchWeatherPoint(lng, lat, options = {}) {
  const lngN = Number(lng);
  const latN = Number(lat);
  if (!Number.isFinite(lngN) || !Number.isFinite(latN)) {
    throw new Error('无效坐标');
  }
  return request.get('/weather/point', {
    lng: lngN,
    lat: latN,
    heightM: options.heightM ?? 100,
    time: options.time,
    includeRisk: options.includeRisk ?? false,
  });
}

/**
 * P1：起降点实时气象 GET /weather/realtime（与 point 同构，多 landingPointId / regionId）
 */
export async function fetchWeatherRealtime(landingPointId, time) {
  return request.get('/weather/realtime', { pointId: landingPointId, time });
}

/** 大屏实时天气面板字段（由 V2 响应映射，非旧版和风字段名兼容层） */
export function toRealtimePanelFields(payload) {
  if (!payload || payload.error) {
    throw new Error(payload?.message || '获取实时天气失败');
  }
  const windMs = Number(payload.windSpeed);
  const windKmh = Number.isFinite(windMs) ? (windMs * 3.6).toFixed(1) : '0';
  return {
    temp: String(payload.temperature ?? '—'),
    feelsLike: String(payload.temperature ?? '—'),
    icon: '100',
    text: '实时',
    wind360: '0',
    windDir: payload.windDirection != null ? String(payload.windDirection) : '—',
    windScale: '—',
    windSpeed: Number.isFinite(windMs) ? `${windMs.toFixed(1)} m/s（${windKmh} km/h）` : '—',
    humidity: String(payload.humidity ?? '—'),
    precip: String(payload.precipitation ?? '0'),
    pressure: '—',
    vis: String(payload.visibility ?? '—'),
    cloud: '—',
    dew: '—',
    windShearLevel: 'low',
    stabilityIndex: 'C',
    obsTime: payload.computedAt || new Date().toISOString(),
  };
}

/**
 * P2：Region 格点温度场 GET /weather/grid-field
 * @returns {{ grid: Array<{lng,lat,value}>, isStale, bucketTime, product, heightM }}
 */
export async function fetchWeatherGridField({
  regionId,
  product = 'temperature',
  time = 'now',
  heightM = 100,
} = {}) {
  const rid = await resolveRegionId(regionId);
  return request.get('/weather/grid-field', {
    regionId: rid,
    product,
    time,
    heightM,
  });
}

/** GET /weather/forecast-trend → 图表用 minutely 结构 */
export async function fetchForecastTrend(landingPointId) {
  const res = await request.get('/weather/forecast-trend', { pointId: landingPointId });
  if (!res?.data && !res?.time) {
    throw new Error('预报数据格式错误');
  }
  return res.data ?? res;
}

export async function postWeatherByCoordsBatch(body) {
  return request.post('/weather/by-coords/batch', body);
}

export async function fetchCurrentPointWeather(pointId) {
  const data = await request.get('/weather/realtime', { pointId });
  return toRealtimePanelFields(data);
}

export async function getWindData(params = {}) {
  const query = {};
  if (params.regionId) query.regionId = params.regionId;
  if (params.time) query.time = params.time;
  if (params.heightM != null) query.heightM = params.heightM;
  return request.get('/wind-field', query);
}

/** GET /weather/vertical-profile */
export async function fetchVerticalProfile(landingPointId, options = {}) {
  return request.get('/weather/vertical-profile', {
    landingPointId,
    startTime: options.startTime ?? options.time,
    endTime: options.endTime,
    heightLevelsM: options.heightLevelsM,
  });
}
