import request from '@/utils/request';
import { resolveRegionId } from './regionContext';
import { matrixToChartData, FLYABILITY_BUCKET_MINUTES } from '@/utils/flyabilityChart';

/** 并发请求去重：同一 region/time/hours 只发一次 landing-matrix */
const landingMatrixInflight = new Map();

function landingMatrixKey(rid, time, hours) {
  return `${rid}|${time}|${hours}`;
}

/** P1：起降点适飞矩阵（原始响应） */
export async function fetchLandingMatrix({ regionId, landingPointId, time, hours = 1 } = {}) {
  const rid = await resolveRegionId(regionId);
  return request.get('/flyability/landing-matrix', {
    regionId: rid,
    landingPointId,
    time,
    hours,
  });
}

/** 与总览共用同一份 matrix 响应，避免下钻重复请求导致色条不一致 */
export async function resolveLandingMatrixResponse({ regionId, time, hours = 1, appStore } = {}) {
  const cached = appStore?.getLandingMatrixCache?.(hours);
  if (cached) return cached;

  const rid = await resolveRegionId(regionId);
  const key = landingMatrixKey(rid, time, hours);
  if (landingMatrixInflight.has(key)) {
    return landingMatrixInflight.get(key);
  }

  const promise = fetchLandingMatrix({ regionId: rid, time, hours })
    .then((raw) => {
      landingMatrixInflight.delete(key);
      appStore?.setLandingMatrixCache?.(raw, hours);
      return raw;
    })
    .catch((err) => {
      landingMatrixInflight.delete(key);
      throw err;
    });

  landingMatrixInflight.set(key, promise);
  return promise;
}

/** 时间轴/区域变更时预取，面板 reload 时可直接命中 store 缓存 */
export function prefetchLandingMatrix({ regionId, time, hours = 1, appStore } = {}) {
  if (!regionId && !appStore?.regionId) return Promise.resolve(null);
  return resolveLandingMatrixResponse({
    regionId: regionId || appStore?.regionId,
    time,
    hours,
    appStore,
  }).catch(() => null);
}

/** P1：航路适飞矩阵 */
export async function fetchRouteMatrix({
  regionId,
  routeId,
  routeVersionId,
  time,
  hours = 1,
} = {}) {
  const rid = await resolveRegionId(regionId);
  return request.get('/flyability/route-matrix', {
    regionId: rid,
    routeId,
    routeVersionId,
    time,
    hours,
  });
}

/** 适飞矩阵 → 大屏热力图数据 */
export async function fetchLandingMatrixChart(params = {}) {
  const { currentPoint, hours = 1, time, regionId, maxSlots, appStore } = params;
  const landingPointId =
    currentPoint?.landingPointId || currentPoint?.id || currentPoint?.pointId;
  const raw = await resolveLandingMatrixResponse({ regionId, time, hours, appStore });
  const slotLimit = maxSlots ?? hours * (60 / FLYABILITY_BUCKET_MINUTES);
  return matrixToChartData(raw, landingPointId, { maxSlots: slotLimit });
}

export const fetchFlyabilityRuleSets = async () => {
  const data = await request.get('/flyability-rule-sets');
  return Array.isArray(data) ? data : [];
};

export const createFlyabilityRuleSet = (body) => request.post('/flyability-rule-sets', body);

export const updateFlyabilityRuleSet = (id, body) =>
  request.put(`/flyability-rule-sets/${id}`, body);

export const publishFlyabilityRuleSet = (id) =>
  request.post(`/flyability-rule-sets/${id}/publish`);

export const deleteFlyabilityRuleSet = (id) =>
  request.delete(`/flyability-rule-sets/${id}`);
