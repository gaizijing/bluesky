/**
 * 将 P2 grid-field / risk/heatmap 响应转为 Cesium 热力图 { points: [{ lnglat, value, reason? }] }
 */

const toNum = (v) => {
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
};

export function gridFieldToHeatmapPayload(apiData) {
  const grid = Array.isArray(apiData?.grid)
    ? apiData.grid
    : Array.isArray(apiData?.cells)
      ? apiData.cells
      : Array.isArray(apiData?.points)
        ? apiData.points
        : [];
  const product = apiData?.product;
  const points = grid
    .map((c) => {
      let lng = toNum(c.lng ?? c.longitude ?? c.lon ?? c.x);
      let lat = toNum(c.lat ?? c.latitude ?? c.y);
      if ((lng == null || lat == null) && Array.isArray(c.lnglat) && c.lnglat.length >= 2) {
        lng = toNum(c.lnglat[0]);
        lat = toNum(c.lnglat[1]);
      }
      const value = toNum(
        c.value ?? c[product] ?? c.temperature ?? c.windSpeed ?? c.precipitation ?? c.visibility
      );
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
      return {
        lnglat: [lng, lat],
        value,
        reason: c.reason || null,
        level: c.level || null,
        factors: c.factors || null,
      };
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
