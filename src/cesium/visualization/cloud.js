import * as Cesium from 'cesium'
import { useWeatherStore } from '@/store/modules/weather'
import { useRegionStore } from '@/store/modules/region'

// 获取地区配置
const getRegionConfig = () => {
  const regionStore = useRegionStore();
  return {
    center: regionStore.getRegionCenter,
    west: regionStore.getRegionBounds.west,
    east: regionStore.getRegionBounds.east,
    south: regionStore.getRegionBounds.south,
    north: regionStore.getRegionBounds.north,
    name: regionStore.getRegionName
  };
};

/**
 * 地区上空默认云层（无交互）
 */
export default class Cloud {
  constructor(viewer) {
    this.viewer = viewer
    this.clouds = null
  }

  /**
   * 初始化并显示云
   */
  show() {
    if (!this.viewer || !this.viewer.scene) {
      console.warn('viewer 未初始化完成')
      return
    }

    // 防止重复创建
    if (this.clouds) {
      return
    }

    const weatherStore = useWeatherStore();

    ///////////////////////////
    // Create clouds for Qingdao with realistic density and layered clouds
    ///////////////////////////

    // 设置随机数种子
    Cesium.Math.setRandomNumberSeed(2.5);

    function getRandomNumberInRange(minValue, maxValue) {
      return minValue + Cesium.Math.nextRandomNumber() * (maxValue - minValue);
    }

    this.clouds = new Cesium.CloudCollection();

    // 根据天气数据计算云量参数
    let cloudCover = 0.5; // 默认云量
    if (weatherStore.currentPointWeather && weatherStore.currentPointWeather.cloud !== undefined) {
      cloudCover = weatherStore.currentPointWeather.cloud / 100; // 转换为0-1范围
    }
    
    // 确保即使云量为0时也有一些云
    const adjustedCloudCover = Math.max(cloudCover, 0.1); // 最少10%的云量
    
    // 根据云量计算云的数量和密度
    const baseCloudCount = 200;
    const baseHighCloudCount = 100;
    const minSlice = 0.1;
    const maxSlice = 0.6;
    
    const cloudCount = Math.round(baseCloudCount * adjustedCloudCover);
    const highCloudCount = Math.round(baseHighCloudCount * adjustedCloudCover);
    const sliceRange = {
      min: minSlice + (1 - adjustedCloudCover) * 0.1, // 云量越少，密度越低
      max: maxSlice * adjustedCloudCover + 0.1 // 确保有最小密度
    };

    // 后层云（远山背景云，较稀疏）
    function createBackLayerClouds() {
      const { center } = getRegionConfig();
      const [centerLng, centerLat] = center;
      this.clouds.add({
        position: Cesium.Cartesian3.fromDegrees(centerLng - 0.02, centerLat - 0.03, 400), // 地区坐标
        scale: new Cesium.Cartesian2(1800, 350),
        maximumSize: new Cesium.Cartesian3(60, 20, 18),
        slice: 0.25,  // 降低密度
      });

      this.clouds.add({
        position: Cesium.Cartesian3.fromDegrees(centerLng - 0.04, centerLat - 0.03, 435),
        scale: new Cesium.Cartesian2(1800, 400),
        maximumSize: new Cesium.Cartesian3(60, 18, 20),
        slice: 0.28,  // 降低密度
      });

      this.clouds.add({
        position: Cesium.Cartesian3.fromDegrees(centerLng - 0.04, centerLat - 0.02, 360),
        scale: new Cesium.Cartesian2(2200, 400),
        maximumSize: new Cesium.Cartesian3(60, 18, 20),
        slice: 0.32,  // 降低密度
      });

      this.clouds.add({
        position: Cesium.Cartesian3.fromDegrees(centerLng - 0.025, centerLat - 0.01, 350),
        scale: new Cesium.Cartesian2(330, 150),
        maximumSize: new Cesium.Cartesian3(18, 18, 18),
        slice: 0.18,  // 降低密度
      });

      this.clouds.add({
        position: Cesium.Cartesian3.fromDegrees(centerLng - 0.03, centerLat - 0.008, 370),
        scale: new Cesium.Cartesian2(1900, 400),
        maximumSize: new Cesium.Cartesian3(60, 18, 20),
        slice: 0.38,  // 降低密度
      });

      this.clouds.add({
        position: Cesium.Cartesian3.fromDegrees(centerLng - 0.025, centerLat - 0.005, 350),
        scale: new Cesium.Cartesian2(330, 150),
        maximumSize: new Cesium.Cartesian3(20, 18, 20),
        slice: 0.25,  // 降低密度
      });

      this.clouds.add({
        position: Cesium.Cartesian3.fromDegrees(centerLng - 0.039, centerLat, 320),
        scale: new Cesium.Cartesian2(1800, 600),
        maximumSize: new Cesium.Cartesian3(40, 25, 22),
        slice: 0.30,  // 降低密度
      });
    }

    // 地区的随机云生成（更真实的参数）
    function createRandomClouds(
      numClouds,
      startLong,
      stopLong,
      startLat,
      stopLat,
      minHeight,
      maxHeight
    ) {
      const rangeLong = stopLong - startLong;
      const rangeLat = stopLat - startLat;
      for (let i = 0; i < numClouds; i++) {
        long = startLong + getRandomNumberInRange(0, rangeLong);
        lat = startLat + getRandomNumberInRange(0, rangeLat);
        height = getRandomNumberInRange(minHeight, maxHeight);
        
        // 调整云的尺寸，使其更自然
        scaleX = getRandomNumberInRange(2000, 10000);  // 稍微增大尺寸，减少数量
        scaleY = scaleX / 2.0 - getRandomNumberInRange(0, scaleX / 5.0);  // 更自然的比例
        slice = getRandomNumberInRange(sliceRange.min, sliceRange.max);  // 根据云量调整密度
        depth = getRandomNumberInRange(8, 25);     // 调整深度
        aspectRatio = getRandomNumberInRange(1.5, 2.5);  // 更自然的长宽比
        cloudHeight = getRandomNumberInRange(8, 25);     // 调整高度
        
        this.clouds.add({
          position: Cesium.Cartesian3.fromDegrees(long, lat, height),
          scale: new Cesium.Cartesian2(scaleX, scaleY),
          maximumSize: new Cesium.Cartesian3(
            aspectRatio * cloudHeight,
            cloudHeight,
            depth
          ),
          slice: slice
        });
      }
    }

    // 前层云（前景云，较稀疏）
    function createFrontLayerClouds() {
      const { center } = getRegionConfig();
      const [centerLng, centerLat] = center;
      this.clouds.add({
        position: Cesium.Cartesian3.fromDegrees(centerLng + 0.026, centerLat - 0.017, 150), // 地区坐标
        scale: new Cesium.Cartesian2(500, 200),
        maximumSize: new Cesium.Cartesian3(30, 18, 20),
        slice: 0.28,  // 降低密度
      });

      this.clouds.add({
        position: Cesium.Cartesian3.fromDegrees(centerLng + 0.0255, centerLat - 0.004, 130),
        scale: new Cesium.Cartesian2(550, 250),
        maximumSize: new Cesium.Cartesian3(30, 20, 18),
        slice: 0.25,  // 降低密度
      });
    }

    // 声明变量
    let long, lat, height, scaleX, scaleY, aspectRatio, cloudHeight, depth, slice;

    // 添加后层云
    createBackLayerClouds.bind(this)();

    // 根据云量添加不同数量的云
    const { west, east, south, north } = getRegionConfig();
    createRandomClouds.bind(this)(cloudCount, west, east, south, north, 100, 200);

    // 添加第二层中等高度的云
    createRandomClouds.bind(this)(highCloudCount, west, east, south, north, 200, 300);

    // 添加高层稀疏云层增加层次感
    //createRandomClouds(300, 120.35, 120.45, 36.05, 36.15, 450, 600);

    // 添加前层云
    createFrontLayerClouds.bind(this)();

    this.viewer.scene.primitives.add(this.clouds);

 
    const { name } = getRegionConfig();
    console.log(`${name}云层已生成，云量: ${(adjustedCloudCover * 100).toFixed(0)}%`)
  

  }

  /**
   * 控制云的显示/隐藏
   * @param {boolean} visible - 是否显示云
   */
  setVisible(visible) {
    if (this.clouds) {
      this.clouds.show = visible;
    }
  }

  /**
   * 检查云是否可见
   * @returns {boolean} - 云是否可见
   */
  isVisible() {
    return this.clouds ? this.clouds.show : false;
  }

  /**
   * 移除云
   */
  destroy() {
    if (this.clouds) {
      this.clouds.removeAll()
      this.viewer.scene.primitives.remove(this.clouds)
      this.clouds = null
    }
  }
}