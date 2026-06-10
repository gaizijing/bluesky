export function clamp(v, lo, hi) {
  return Math.max(lo, Math.min(hi, v));
}

/** 沿方位角偏移经纬度（米），与 map.js offsetLatLonMeters 一致 */
export function offsetLatLonMeters(lat, lon, bearingDeg, distanceM) {
  const r = 6378137.0;
  const br = (bearingDeg * Math.PI) / 180.0;
  const dByR = distanceM / r;
  const lat1 = (lat * Math.PI) / 180.0;
  const lon1 = (lon * Math.PI) / 180.0;
  const lat2 = Math.asin(
    Math.sin(lat1) * Math.cos(dByR) + Math.cos(lat1) * Math.sin(dByR) * Math.cos(br),
  );
  const lon2 = lon1 + Math.atan2(
    Math.sin(br) * Math.sin(dByR) * Math.cos(lat1),
    Math.cos(dByR) - Math.sin(lat1) * Math.sin(lat2),
  );
  return {
    lat: (lat2 * 180.0) / Math.PI,
    lon: (lon2 * 180.0) / Math.PI,
  };
}
