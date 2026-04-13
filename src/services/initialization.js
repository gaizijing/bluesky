import { WeatherService } from './weatherService';
import { DashboardService } from './dashboardService';
import { AreaService } from './areaService';
import { useAreaStore } from '@/store/modules/area';
import { useModuleStore } from '@/store/modules/module';
import { useLayerSettingsStore } from '@/store/modules/layerSettings'
import { useRegionStore } from '@/store/modules/region';
export class InitializationService {
  constructor() {
    this.weatherService = new WeatherService();
    this.dashboardService = new DashboardService();
    this.areaService = new AreaService();
  }

  // 获取store实例
  getAreaStore() {
    return useAreaStore();
  }

  getWeatherStore() {
    return useWeatherStore();
  }

  getModuleStore() {
    return useModuleStore();
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
    try {
      // 1. 首先初始化地区配置（最基本的配置）
      const regionStore = this.getRegionStore();
      try {
        await regionStore.fetchRegionConfig();
        console.log('地区配置初始化成功');
      } catch (error) {
        console.warn('地区配置初始化失败，使用默认配置:', error);
      }

      // 2. 并行初始化其他基础数据
      const [areasInitialized] = await Promise.all([
        this.areaService.loadAreaList(),
        this.areaService.loadCurrentSelectedArea(),
      ]);

      // 3. 初始化区域天气数据
      await this.initializeAreaWeatherData();

      // 4. 加载地图天气图层
      await this.initializeMapWeatherLayer()

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
   * 初始化地图气象图层
   */

  async initializeMapWeatherLayer() {
   // if (this.getLayerSettingsStore().layers.wind.visible) {
      await this.weatherService.loadWindData()
   // }
   // if (this.getLayerSettingsStore().layers.temperature.visible) {
      await this.weatherService.loadHeatMapData()
  //  }
  }

  async initializeModuleData() {
    const moduleStore = this.getModuleStore();
    if (moduleStore.currentModule) {
      try {
        await this.dashboardService.loadModuleData(moduleStore.currentModule);
        return true;
      } catch (error) {
        console.error('初始化模块数据失败:', error);
        return false;
      }
    }
    return false;
  }

}