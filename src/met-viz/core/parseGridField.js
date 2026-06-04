const toNum = (v) => {
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
};

/**
 * 解析 /weather/grid-field 响应为规则格网
 * @returns {{ cells: {lng, lat, value}[], bounds: { west, south, east, north }, product?: string } | null}
 */
export function parseGridFieldResponse(apiData) {
  const product = apiData?.product;
  const grid = Array.isArray(apiData?.grid)
    ? apiData.grid
    : Array.isArray(apiData?.cells)
      ? apiData.cells
      : [];

  const cells = grid
    .map((c) => {
      let lng = toNum(c.lng ?? c.longitude ?? c.lon ?? c.x);
      let lat = toNum(c.lat ?? c.latitude ?? c.y);
      if ((lng == null || lat == null) && Array.isArray(c.lnglat) && c.lnglat.length >= 2) {
        lng = toNum(c.lnglat[0]);
        lat = toNum(c.lnglat[1]);
      }
      const value = toNum(
        c.value ?? c[product] ?? c.temperature ?? c.windSpeed ?? c.wind
      );
      if (lng == null || lat == null || value == null) return null;
      return { lng, lat, value };
    })
    .filter(Boolean);

  if (!cells.length) return null;

  let west = toNum(apiData?.west);
  let east = toNum(apiData?.east);
  let south = toNum(apiData?.south);
  let north = toNum(apiData?.north);

  if (west == null || east == null || south == null || north == null) {
    west = Math.min(...cells.map((c) => c.lng));
    east = Math.max(...cells.map((c) => c.lng));
    south = Math.min(...cells.map((c) => c.lat));
    north = Math.max(...cells.map((c) => c.lat));
  }

  return { cells, bounds: { west, south, east, north }, product };
}

/**
 * 将散列格点排成规则二维数组（按唯一经纬排序）
 */
export function cellsToRegularGrid(cells) {
  const lngs = [...new Set(cells.map((c) => c.lng))].sort((a, b) => a - b);
  const lats = [...new Set(cells.map((c) => c.lat))].sort((a, b) => a - b);
  const width = lngs.length;
  const height = lats.length;
  if (width < 2 || height < 2) return null;

  const values = new Float32Array(width * height);
  values.fill(NaN);

  const lngEps = Math.max(1e-8, (lngs[lngs.length - 1] - lngs[0]) * 1e-6);
  const latEps = Math.max(1e-8, (lats[lats.length - 1] - lats[0]) * 1e-6);

  const findIdx = (arr, v, eps) => {
    for (let i = 0; i < arr.length; i++) {
      if (Math.abs(arr[i] - v) <= eps) return i;
    }
    return -1;
  };

  for (const c of cells) {
    const xi = findIdx(lngs, c.lng, lngEps);
    const yi = findIdx(lats, c.lat, latEps);
    if (xi >= 0 && yi >= 0) {
      values[yi * width + xi] = c.value;
    }
  }

  return {
    width,
    height,
    lngs,
    lats,
    values,
    west: lngs[0],
    east: lngs[width - 1],
    south: lats[0],
    north: lats[height - 1],
  };
}
