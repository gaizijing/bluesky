import * as Cesium from 'cesium';
import { getMapTilesConfig } from '@/config/mapTiles';

const DEFAULT_ONLINE_TERRAIN = 'https://data.mars3d.cn/terrain';

function applyTerrainSceneSettings(viewerInstance, exaggeration) {
  viewerInstance.scene.globe.enableLighting = false;
  viewerInstance.scene.skyAtmosphere.show = true;
  viewerInstance.scene.globe.depthTestAgainstTerrain = true;
  if (viewerInstance.scene.verticalExaggeration !== undefined) {
    viewerInstance.scene.verticalExaggeration = exaggeration;
  } else {
    viewerInstance.scene.globe.terrainExaggeration = exaggeration;
  }
}

/** 加载在线 quantized-mesh 地形 */
export const loadTerrain = async (viewerInstance, cfg = getMapTilesConfig()) => {
  if (!viewerInstance) return;

  const c = cfg.cesium || {};
  const terrainUrl = String(c.terrain_url || DEFAULT_ONLINE_TERRAIN).trim();
  const exaggeration = c.terrain_exaggeration || 1.25;

  try {
    if (c.use_ion_terrain) {
      console.log('[Terrain] 加载 Cesium Ion 地形');
      viewerInstance.terrainProvider = await Cesium.createWorldTerrainAsync({
        requestWaterMask: true,
        requestVertexNormals: true,
      });
    } else {
      console.log('[Terrain] 加载在线地形:', terrainUrl);
      const provider = await Cesium.CesiumTerrainProvider.fromUrl(terrainUrl, {
        requestWaterMask: true,
        requestVertexNormals: true,
      });
      await provider.readyPromise;
      viewerInstance.terrainProvider = provider;
    }
    applyTerrainSceneSettings(viewerInstance, exaggeration);
  } catch (error) {
    console.warn('[Terrain] 在线地形加载失败', error);
    viewerInstance.terrainProvider = new Cesium.EllipsoidTerrainProvider();
  }
};
