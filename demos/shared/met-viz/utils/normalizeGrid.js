import { gridFieldToHeatmapPayload, riskHeatmapToHeatmapPayload } from '@/utils/heatmapPayload';

/** 将格点值归一化到 0–100，供 heatmap.js 色带使用 */
export function normalizePointsToHeatmap(rawPoints) {
  if (!rawPoints?.length) return [];
  const values = rawPoints.map((p) => Number(p.value)).filter(Number.isFinite);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const span = max - min || 1;

  return rawPoints.map((p) => {
    const v = Number(p.value);
    const norm = Number.isFinite(v) ? ((v - min) / span) * 100 : 0;
    return {
      x: p.lnglat[0],
      y: p.lnglat[1],
      value: Math.max(0, Math.min(100, norm)),
      rawValue: v,
      reason: p.reason || null,
      level: p.level || null,
      factors: p.factors || null,
    };
  });
}

export function gridApiToHeatmapPoints(apiData) {
  const payload = gridFieldToHeatmapPayload(apiData);
  const raw = (payload.points || []).map((p) => ({
    lnglat: p.lnglat,
    value: p.value,
    reason: p.reason,
  }));
  return {
    points: normalizePointsToHeatmap(raw),
    meta: {
      isStale: payload.isStale,
      bucketTime: payload.bucketTime,
      product: payload.product,
    },
  };
}

export function riskApiToHeatmapPoints(apiData) {
  const payload = riskHeatmapToHeatmapPayload(apiData);
  const raw = (payload.points || []).map((p) => ({
    lnglat: p.lnglat,
    value: p.value,
    reason: p.reason,
    level: p.level,
    factors: p.factors,
  }));
  return {
    points: normalizePointsToHeatmap(raw),
    meta: {
      isStale: payload.isStale,
      bucketTime: payload.bucketTime,
      heightM: payload.heightM,
      cells: apiData?.cells || [],
    },
  };
}
