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

export async function loadTerrain(viewerInstance) {
  try {
    console.log('[region-meteo-demo] 加载在线地形:', DEFAULT_ONLINE_TERRAIN);
    const provider = await Cesium.CesiumTerrainProvider.fromUrl(DEFAULT_ONLINE_TERRAIN, {
      requestWaterMask: true,
      requestVertexNormals: true,
    });
    await provider.readyPromise;
    viewerInstance.terrainProvider = provider;
    applyTerrainSceneSettings(viewerInstance);
    return { ok: true, label: '在线地形（×' + TERRAIN_EXAGGERATION + '）' };
  } catch (err) {
    console.warn('[region-meteo-demo] 在线地形加载失败', err);
    viewerInstance.terrainProvider = new Cesium.EllipsoidTerrainProvider();
    viewerInstance.scene.globe.depthTestAgainstTerrain = false;
    return { ok: false, label: '无地形（椭球）' };
  }
}
