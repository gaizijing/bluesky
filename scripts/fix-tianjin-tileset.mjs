/**
 * geobuilding 导出的天津 tileset：子瓦片 transform 旋转矩阵错误，
 * local Z 轴落在水平面而非 Up，导致 glTF 高度轴（Z）被铺到天上。
 * 按锚点经纬度重建标准 ENU → ECEF 旋转，保留原平移位置。
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const tilesetPath = path.resolve(__dirname, '../public/cesium/model/tianjin/tileset.json');

const DEG2RAD = Math.PI / 180;
const A = 6378137;
const E2 = 6.69437999014e-3;

function ecefToLonLat(x, y, z) {
  const lon = Math.atan2(y, x);
  const p = Math.sqrt(x * x + y * y);
  let lat = Math.atan2(z, p * (1 - E2));
  for (let i = 0; i < 8; i += 1) {
    const s = Math.sin(lat);
    const n = A / Math.sqrt(1 - E2 * s * s);
    lat = Math.atan2(z + E2 * n * s, p);
  }
  return { lon: lon / DEG2RAD, lat: lat / DEG2RAD };
}

/** Cesium eastNorthUpToFixedFrame（列主序） */
function enuMatrixAt(lonDeg, latDeg, heightM = 0) {
  const lon = lonDeg * DEG2RAD;
  const lat = latDeg * DEG2RAD;
  const sinLon = Math.sin(lon);
  const cosLon = Math.cos(lon);
  const sinLat = Math.sin(lat);
  const cosLat = Math.cos(lat);
  const n = A / Math.sqrt(1 - E2 * sinLat * sinLat);
  const tx = (n + heightM) * cosLat * cosLon;
  const ty = (n + heightM) * cosLat * sinLon;
  const tz = (n * (1 - E2) + heightM) * sinLat;

  const eastX = -sinLon;
  const eastY = cosLon;
  const eastZ = 0;
  const northX = -sinLat * cosLon;
  const northY = -sinLat * sinLon;
  const northZ = cosLat;
  const upX = cosLat * cosLon;
  const upY = cosLat * sinLon;
  const upZ = sinLat;

  return [
    eastX, eastY, eastZ, 0,
    northX, northY, northZ, 0,
    upX, upY, upZ, 0,
    tx, ty, tz, 1,
  ];
}

function colDotUp(transform, up) {
  return transform[8] * up[0] + transform[9] * up[1] + transform[10] * up[2];
}

function fixRegion(region) {
  if (!Array.isArray(region) || region.length < 4) return null;
  const [west, south, east, north, minH = 0, maxH = 500] = region;
  if (Math.abs(west) <= 3 && Math.abs(north) <= 1.6) return null;
  return [
    west * DEG2RAD,
    south * DEG2RAD,
    east * DEG2RAD,
    north * DEG2RAD,
    minH,
    maxH,
  ];
}

function fixChildTransform(transform) {
  if (!Array.isArray(transform) || transform.length < 16) return false;
  const { lon, lat } = ecefToLonLat(transform[12], transform[13], transform[14]);
  const up = [
    Math.cos(lat * DEG2RAD) * Math.cos(lon * DEG2RAD),
    Math.cos(lat * DEG2RAD) * Math.sin(lon * DEG2RAD),
    Math.sin(lat * DEG2RAD),
  ];
  if (Math.abs(colDotUp(transform, up) - 1) < 0.05) return false;

  const fixed = enuMatrixAt(lon, lat, 0);
  for (let i = 0; i < 16; i += 1) transform[i] = fixed[i];
  return true;
}

function walk(node, stats) {
  if (!node) return;
  if (node.transform && fixChildTransform(node.transform)) stats.transforms += 1;
  if (Array.isArray(node.children)) {
    node.children.forEach((child) => walk(child, stats));
  }
}

const tileset = JSON.parse(fs.readFileSync(tilesetPath, 'utf8'));
const stats = { transforms: 0, region: false };

const fixedRegion = fixRegion(tileset?.root?.boundingVolume?.region);
if (fixedRegion) {
  tileset.root.boundingVolume.region = fixedRegion;
  stats.region = true;
}

walk(tileset.root, stats);
fs.writeFileSync(tilesetPath, JSON.stringify(tileset));
console.log('天津 tileset 已修复:', stats);
