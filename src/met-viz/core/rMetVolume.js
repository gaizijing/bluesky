/** 由 Region 边界 + 风险格点构建 R_met 三维体采样器 */

const DEFAULT_HEIGHT_RANGE = { minHeight: 100, maxHeight: 2000, nz: 8 };

/**
 * @param {{ west, south, east, north }} bounds
 * @param {Array<{ lng, lat, value, heightM? }>} cells
 */
export function buildVolumeFromRegion(bounds, cells = [], heightRange = DEFAULT_HEIGHT_RANGE) {
  const west = Number(bounds?.west);
  const south = Number(bounds?.south);
  const east = Number(bounds?.east);
  const north = Number(bounds?.north);
  if (![west, south, east, north].every(Number.isFinite)) {
    return null;
  }

  return {
    west,
    south,
    east,
    north,
    minHeight: heightRange.minHeight,
    maxHeight: heightRange.maxHeight,
    nx: 64,
    ny: 64,
    nz: heightRange.nz,
    cells: Array.isArray(cells) ? cells : [],
  };
}

/**
 * @returns {(lon: number, lat: number, height: number) => number} 0..1
 */
export function createRiskSampler(volume) {
  const cells = volume?.cells || [];
  const cap = 100;

  return (lon, lat, height) => {
    if (!cells.length) return 0;
    let sum = 0;
    let wSum = 0;
    for (const c of cells) {
      const clng = Number(c.lng);
      const clat = Number(c.lat);
      const raw = Number(c.value);
      if (!Number.isFinite(clng) || !Number.isFinite(clat) || !Number.isFinite(raw)) continue;
      const ch = Number(c.heightM);
      const spatial = Math.hypot(lon - clng, lat - clat);
      const vertical = Number.isFinite(ch) ? Math.abs(height - ch) / 800 : 0;
      const w = 1 / (spatial * spatial + 0.0004 + vertical * vertical * 0.5);
      sum += Math.min(1, raw / cap) * w;
      wSum += w;
    }
    if (!wSum) return 0;
    const base = sum / wSum;
    const hNorm = Math.max(0, Math.min(1, (height - volume.minHeight) / (volume.maxHeight - volume.minHeight)));
    return Math.min(1, Math.max(0, base * (0.65 + 0.35 * hNorm)));
  };
}

/** 将 0–100 风险值映射到 MC 等值面阈值 */
export function riskIsovalueFromCells(cells, fallback = 0.42) {
  const vals = (cells || [])
    .map((c) => Number(c.value))
    .filter(Number.isFinite);
  if (!vals.length) return fallback;
  const avg = vals.reduce((a, b) => a + b, 0) / vals.length;
  return Math.min(0.75, Math.max(0.25, avg / 100));
}
