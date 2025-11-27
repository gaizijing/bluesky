import * as Cesium from 'cesium'

export const loadTerrain = async (viewerInstance) => {
  try {
    // 启用更详细的地形加载，包括水面遮罩和法线（用于更好的光照效果）
    const terrainProvider = await Cesium.createWorldTerrainAsync({
      // requestWaterMask: true,      // 启用水面遮罩
      // requestVertexNormals: true   // 启用顶点法线（增强地形光照效果）
    })
    viewerInstance.terrainProvider = terrainProvider
    viewerInstance.scene.globe.enableLighting = true

    // 添加地形夸张设置，增强地形特征显示（在气象应用中很有用）
    viewerInstance.scene.globe.terrainExaggeration = 1.5  // 地形高度夸张1.5倍

    // 确保相机考虑地形高度
    viewerInstance.scene.globe.depthTestAgainstTerrain = true

  } catch (error) {
    console.warn('地形加载失败，使用默认地形:', error)
    viewerInstance.terrainProvider = new Cesium.EllipsoidTerrainProvider()
  }
}