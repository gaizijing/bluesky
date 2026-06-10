import { getMapTilesConfig } from '@/config/mapTiles';

const DEFAULT_ONLINE_TERRAIN = 'https://data.mars3d.cn/terrain';
const TERRAIN_EXAGGERATION = 1.25;

export function applyTerrainSceneSettings(viewerInstance, exaggeration) {
  const ex = exaggeration ?? TERRAIN_EXAGGERATION;
  viewerInstance.scene.globe.enableLighting = false;
  viewerInstance.scene.skyAtmosphere.show = true;
  viewerInstance.scene.globe.depthTestAgainstTerrain = false;
  if (viewerInstance.scene.verticalExaggeration !== undefined) {
    viewerInstance.scene.verticalExaggeration = ex;
  } else {
    viewerInstance.scene.globe.terrainExaggeration = ex;
  }
}

function withTimeout(promise, ms, label) {
  return Promise.race([
    promise,
    new Promise((_, reject) => {
      setTimeout(() => reject(new Error(`${label} 超时（${ms}ms）`)), ms);
    }),
  ]);
}

export async function loadTerrain(viewerInstance) {
  const mapCfg = getMapTilesConfig();
  const terrainUrl = String(mapCfg.cesium?.terrain_url || DEFAULT_ONLINE_TERRAIN).trim();
  const exaggeration = mapCfg.cesium?.terrain_exaggeration || TERRAIN_EXAGGERATION;

  try {
    console.log('[region-meteo] 加载在线地形:', terrainUrl);
    const provider = await withTimeout(
      Cesium.CesiumTerrainProvider.fromUrl(terrainUrl, {
        requestWaterMask: true,
        requestVertexNormals: true,
      }),
      12000,
      '地形服务',
    );
    await withTimeout(provider.readyPromise, 12000, '地形就绪');
    viewerInstance.terrainProvider = provider;
    applyTerrainSceneSettings(viewerInstance, exaggeration);
    return { ok: true, label: '在线地形（×' + exaggeration + '）' };
  } catch (err) {
    console.warn('[region-meteo] 在线地形加载失败', err);
    viewerInstance.terrainProvider = new Cesium.EllipsoidTerrainProvider();
    viewerInstance.scene.globe.depthTestAgainstTerrain = false;
    return { ok: false, label: '无地形（椭球）' };
  }
}
