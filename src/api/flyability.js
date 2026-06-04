import request from '@/utils/request';
import { resolveRegionId } from './regionContext';
import { matrixToChartData } from '@/utils/flyabilityChart';

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
  const { currentPoint, hours = 1, time } = params;
  const landingPointId =
    currentPoint?.landingPointId || currentPoint?.id || currentPoint?.pointId;
  const raw = await fetchLandingMatrix({ landingPointId, time, hours });
  return matrixToChartData(raw, landingPointId) ?? raw;
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
