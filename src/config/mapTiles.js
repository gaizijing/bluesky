/**
 * Cesium 离线/在线地图配置（结构与 map.js + map_tiles_offline.json 一致）
 */
const OFFLINE_BOUNDS = {
  west: 71.5950593789314,
  south: 15.020339633342324,
  east: 131.51428060515838,
  north: 50.333759101454,
};

export function getMapTilesConfig() {
  const env = import.meta.env;
  const offlineMode = String(env.VITE_MAP_OFFLINE_MODE || 'true').toLowerCase() === 'true';
  const tileServerPort = Number(env.VITE_MAP_TILE_SERVER_PORT) || 8765;
  const tileServerHost = String(env.VITE_MAP_TILE_SERVER_HOST || '127.0.0.1').trim() || '127.0.0.1';
  const tileServerBase = `http://${tileServerHost}:${tileServerPort}`;

  const tileUrl = String(
    env.VITE_MAP_TILE_URL || `${tileServerBase}/CT/{z}/{x}/{y}.png`,
  ).trim();
  const terrainUrl = String(
    env.VITE_MAP_TERRAIN_URL || 'https://data.mars3d.cn/terrain',
  ).trim();
  const tiandituToken = String(
    env.VITE_TIANDITU_TOKEN,
  ).trim();

  let baseLayer = String(env.VITE_MAP_BASE_LAYER || (offlineMode ? 'local' : 'tianditu')).toLowerCase();
  if (offlineMode && !tileUrl && baseLayer !== 'local') {
    baseLayer = 'local';
  }

  return {
    offline_mode: offlineMode,
    min_zoom: Number(env.VITE_MAP_MIN_ZOOM) || 0,
    max_zoom: Number(env.VITE_MAP_MAX_ZOOM) || 18,
    cesium: {
      base_layer: baseLayer,
      use_ion_terrain: String(env.VITE_MAP_USE_ION_TERRAIN || '').toLowerCase() === 'true',
      terrain_url: terrainUrl,
      terrain_exaggeration: Number(env.VITE_MAP_TERRAIN_EXAGGERATION) || 1.25,
      tianditu_token: tiandituToken,
      aircraft_model_heading_offset_deg: Number(env.VITE_AIRCRAFT_HEADING_OFFSET_DEG) || -90,
    },
    tile_layer: {
      url_template: tileUrl,
      tms: String(env.VITE_MAP_TILE_TMS || 'true').toLowerCase() === 'true',
      projection: env.VITE_MAP_TILE_PROJECTION || 'EPSG:4326',
      tile_size: Number(env.VITE_MAP_TILE_SIZE) || 256,
      maximumLevel: Number(env.VITE_MAP_MAX_ZOOM) || 18,
      bounds: parseBounds(env.VITE_MAP_TILE_BOUNDS) || (offlineMode ? OFFLINE_BOUNDS : null),
    },
  };
}

function parseBounds(raw) {
  if (!raw) return null;
  try {
    const b = typeof raw === 'string' ? JSON.parse(raw) : raw;
    if (b?.west != null && b?.south != null && b?.east != null && b?.north != null) {
      return b;
    }
  } catch {
    /* ignore */
  }
  return null;
}
