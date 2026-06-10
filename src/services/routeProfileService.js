/**
 * 航路剖面：mock 风场 + 真实航迹几何
 * - 风羽/等风速面：buildMockRouteProfileGrid 合成（约 2–8 m/s）
 * - 飞行轨迹：沿航路 Catmull 插值
 */

import { getRouteDetail } from '@/api/v2/route';
import { buildCatmullPath3D } from '@/utils/routePathBuilder';
import {
  buildMockRouteProfileGrid,
  BARB_HEIGHT_MAX_M,
} from '@/utils/routeProfileChart';

const PATH_LINE_POINTS = 48;

function resolveProfileMaxM(flightHeight, pathLine) {
  const maxAlt = Math.max(
    Number(flightHeight) || 300,
    ...(pathLine || []).map((p) => Number(p[1]) || 0),
  );
  return Math.min(BARB_HEIGHT_MAX_M, Math.max(500, Math.ceil(maxAlt / 100) * 100));
}

function haversineKm(lon1, lat1, lon2, lat2) {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function waypointsToControl(waypoints, flightHeight) {
  return (waypoints || []).map((wp) => ({
    lon: Number(wp.longitude ?? wp.lon),
    lat: Number(wp.latitude ?? wp.lat),
    alt: Number(wp.height ?? wp.altitude ?? flightHeight ?? 300),
  }));
}

function buildDensePath(waypoints, flightHeight) {
  const control = waypointsToControl(waypoints, flightHeight);
  if (control.length < 2) {
    if (control.length === 1) {
      return [{ lon: control[0].lon, lat: control[0].lat, alt: control[0].alt, distKm: 0 }];
    }
    return [];
  }

  const dense = buildCatmullPath3D(control, Math.max(120, PATH_LINE_POINTS * 3));
  const cumDist = [0];
  for (let i = 1; i < dense.length; i += 1) {
    const prev = dense[i - 1];
    const cur = dense[i];
    cumDist.push(cumDist[i - 1] + haversineKm(prev.lon, prev.lat, cur.lon, cur.lat));
  }

  return dense.map((p, i) => ({
    lon: p.lon,
    lat: p.lat,
    height: p.alt,
    distKm: cumDist[i],
  }));
}

function buildFlightPathLine(waypoints, flightHeight, pointCount = PATH_LINE_POINTS) {
  const dense = buildDensePath(waypoints, flightHeight);
  if (!dense.length) return [];
  if (dense.length <= pointCount) {
    return dense.map((p) => [p.distKm, p.height]);
  }

  const totalKm = dense[dense.length - 1].distKm || 0;
  const line = [];
  for (let i = 0; i < pointCount; i += 1) {
    const target = (totalKm * i) / Math.max(1, pointCount - 1);
    let idx = 0;
    while (idx < dense.length - 1 && dense[idx + 1].distKm < target) idx += 1;
    const p0 = dense[idx];
    const p1 = dense[Math.min(idx + 1, dense.length - 1)];
    const d0 = p0.distKm;
    const d1 = p1.distKm;
    const t = d1 === d0 ? 0 : (target - d0) / (d1 - d0);
    const height = p0.height + (p1.height - p0.height) * t;
    line.push([target, height]);
  }
  return line;
}

/** 拉取航路剖面格点（mock 风场 + 真实航迹） */
export async function fetchRouteProfileGrid({ routeId, time }) {
  const detail = await getRouteDetail(routeId);
  const waypoints = detail?.waypoints || [];
  const flightHeight = detail?.flightHeight ?? 300;
  const pathLine = buildFlightPathLine(waypoints, flightHeight, PATH_LINE_POINTS);
  const profileMaxM = resolveProfileMaxM(flightHeight, pathLine);
  const pathTotalKm = pathLine.length ? pathLine[pathLine.length - 1][0] : 0;

  const grid = buildMockRouteProfileGrid({
    waypoints,
    profileMaxM,
    totalKm: pathTotalKm || undefined,
    time,
  });
  if (pathLine.length) {
    grid.pathLine = pathLine;
  }
  if (pathTotalKm > 0) {
    grid.totalKm = pathTotalKm;
  }
  grid.dataSource = 'mock';
  return grid;
}
