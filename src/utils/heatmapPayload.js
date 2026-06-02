/**
 * 将 P2 grid-field / risk/heatmap 响应转为 Cesium 热力图 { points: [{ lnglat, value, reason? }] }
 */

const toNum = (v) => {
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
};

export function gridFieldToHeatmapPayload(apiData) {
  const grid = Array.isArray(apiData?.grid) ? apiData.grid : [];
  const points = grid
    .map((c) => {
      const lng = toNum(c.lng ?? c.longitude);
      const lat = toNum(c.lat ?? c.latitude);
      const value = toNum(c.value);
      if (lng == null || lat == null || value == null) return null;
      return { lnglat: [lng, lat], value, reason: c.reason || null };
    })
    .filter(Boolean);
  return {
    points,
    isStale: Boolean(apiData?.isStale),
    source: 'grid-field',
    product: apiData?.product,
    bucketTime: apiData?.bucketTime,
  };
}

export function riskHeatmapToHeatmapPayload(apiData) {
  const cells = Array.isArray(apiData?.cells) ? apiData.cells : [];
  const points = cells
    .map((c) => {
      const lng = toNum(c.lng);
      const lat = toNum(c.lat);
      const value = toNum(c.value);
      if (lng == null || lat == null || value == null) return null;
      return { lnglat: [lng, lat], value, reason: c.reason || null };
    })
    .filter(Boolean);
  return {
    points,
    isStale: Boolean(apiData?.isStale),
    source: 'risk-heatmap',
    bucketTime: apiData?.bucketTime,
    heightM: apiData?.heightM,
  };
}
