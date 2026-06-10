import request from '@/utils/request';
import { resolveRegionId } from './regionContext';
import { matrixToChartData, FLYABILITY_BUCKET_MINUTES } from '@/utils/flyabilityChart';

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

  const raw = await fetchLandingMatrix({ regionId, time, hours });
  appStore?.setLandingMatrixCache?.(raw, hours);
  return raw;
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
