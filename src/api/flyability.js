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

/** 适飞矩阵 → 大屏热力图数据 */
export async function fetchLandingMatrixChart(params = {}) {
  const { currentPoint, hours = 1, time } = params;
  const landingPointId =
    currentPoint?.landingPointId || currentPoint?.id || currentPoint?.pointId;
  const raw = await fetchLandingMatrix({ landingPointId, time, hours });
  return matrixToChartData(raw, landingPointId) ?? raw;
}
