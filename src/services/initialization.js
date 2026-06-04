import { WeatherService } from './weatherService';
import { AreaService } from './areaService';
import { useAreaStore } from '@/store/modules/area';
import { useLayerSettingsStore } from '@/store/modules/layerSettings'
import { useRegionStore } from '@/store/modules/region';
import { getToken } from '@/utils/storageUtils';
export class InitializationService {
  constructor() {
    this.weatherService = new WeatherService();
    this.areaService = new AreaService();
  }

  // 获取store实例
  getAreaStore() {
    return useAreaStore();
  }

  getLayerSettingsStore() {
    return useLayerSettingsStore();
  }

  getRegionStore() {
    return useRegionStore();
  }
  /**
   * 应用初始化，区域列表、当前区域、区域气象数据、地图模拟气象数据
   */
  async initialize() {
    if (!getToken()) {
      return false;
    }
    try {
      const regionStore = this.getRegionStore();
      let regionReady = false;
      try {
        await regionStore.fetchRegionConfig();
        regionReady = true;
        console.log('地区配置初始化成功');
      } catch (error) {
        console.warn('地区配置初始化失败，跳过后续依赖 Region 的数据加载:', error);
      }

      if (regionReady && regionStore.regionId) {
        try {
          await this.areaService.loadLandingPoints(regionStore.regionId);
        } catch (error) {
          console.warn('起降点加载失败:', error);
        }
      }

      await this.initializeAreaWeatherData();

      return true;
    } catch (error) {
      console.error('初始化失败:', error);
      return false;
    }
  }

  /**
   * 初始化区域天气数据
   */
  async initializeAreaWeatherData() {
    try {
      const areaStore = this.getAreaStore();
      if (!areaStore.hasSelectedArea) {
        return false;
      }
      const weatherData = await this.weatherService.loadAreaWeatherData(areaStore.selectedArea);
      return true;
    } catch (error) {
      console.error('初始化区域天气数据失败:', error);
      return false;
    }
  }
  /**
   * @deprecated 风场由 MetViz WindParticleLayer 拉取 /wind-field，此处不再加载
   */
  async initializeMapWeatherLayer() {
    return true;
  }
}