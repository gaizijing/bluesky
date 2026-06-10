import { buildCatmullPath3D } from '@/utils/routePathBuilder';

function waypointsToControl(waypoints, flightHeight) {
  return (waypoints || []).map((wp) => ({
    lon: Number(wp.longitude ?? wp.lon),
    lat: Number(wp.latitude ?? wp.lat),
    alt: Number(wp.height ?? wp.altitude ?? flightHeight ?? 300),
  }));
}

/** 航路控制点 → 平滑 lon/lat 折线（供小地图虚线绘制） */
export function buildRouteLonLatPath(waypoints, flightHeight, samples = 80) {
  const control = waypointsToControl(waypoints, flightHeight);
  if (control.length < 2) {
    if (control.length === 1) return [{ lon: control[0].lon, lat: control[0].lat }];
    return [];
  }
  return buildCatmullPath3D(control, samples).map((p) => ({ lon: p.lon, lat: p.lat }));
}

export function collectBounds(points) {
  if (!points?.length) return null;
  let minLon = Infinity;
  let maxLon = -Infinity;
  let minLat = Infinity;
  let maxLat = -Infinity;

  for (const p of points) {
    const lon = Number(p.lon ?? p.longitude);
    const lat = Number(p.lat ?? p.latitude);
    if (!Number.isFinite(lon) || !Number.isFinite(lat)) continue;
    minLon = Math.min(minLon, lon);
    maxLon = Math.max(maxLon, lon);
    minLat = Math.min(minLat, lat);
    maxLat = Math.max(maxLat, lat);
  }

  if (!Number.isFinite(minLon)) return null;

  const minSpan = 0.002;
  if (maxLon - minLon < minSpan) {
    const c = (minLon + maxLon) / 2;
    minLon = c - minSpan / 2;
    maxLon = c + minSpan / 2;
  }
  if (maxLat - minLat < minSpan) {
    const c = (minLat + maxLat) / 2;
    minLat = c - minSpan / 2;
    maxLat = c + minSpan / 2;
  }

  return { minLon, maxLon, minLat, maxLat };
}

export function expandBounds(bounds, ratio = 0.14) {
  const lonPad = (bounds.maxLon - bounds.minLon) * ratio;
  const latPad = (bounds.maxLat - bounds.minLat) * ratio;
  return {
    minLon: bounds.minLon - lonPad,
    maxLon: bounds.maxLon + lonPad,
    minLat: bounds.minLat - latPad,
    maxLat: bounds.maxLat + latPad,
  };
}

export function projectLonLat(lon, lat, bounds, width, height, inset = 14) {
  const w = Math.max(1, width - inset * 2);
  const h = Math.max(1, height - inset * 2);
  const lonSpan = bounds.maxLon - bounds.minLon || 1;
  const latSpan = bounds.maxLat - bounds.minLat || 1;
  return {
    x: inset + ((lon - bounds.minLon) / lonSpan) * w,
    y: inset + (1 - (lat - bounds.minLat) / latSpan) * h,
  };
}

export function headingFromDelta(lon1, lat1, lon2, lat2) {
  const midLat = ((lat1 + lat2) / 2) * (Math.PI / 180);
  const dLon = (lon2 - lon1) * Math.cos(midLat);
  const dLat = lat2 - lat1;
  return ((Math.atan2(dLon, dLat) * 180) / Math.PI + 360) % 360;
}

/** t ∈ [0, 1]，沿路径采样位置与航向 */
export function sampleAlongPath(path, t) {
  if (!path?.length) return null;
  if (path.length === 1) return { ...path[0], heading: 0 };

  const clamped = Math.max(0, Math.min(1, t));
  const idx = clamped * (path.length - 1);
  const i = Math.floor(idx);
  const frac = idx - i;
  const p0 = path[Math.min(i, path.length - 1)];
  const p1 = path[Math.min(i + 1, path.length - 1)];
  const lon = p0.lon + (p1.lon - p0.lon) * frac;
  const lat = p0.lat + (p1.lat - p0.lat) * frac;
  const heading = headingFromDelta(p0.lon, p0.lat, p1.lon, p1.lat);
  return { lon, lat, heading };
}
