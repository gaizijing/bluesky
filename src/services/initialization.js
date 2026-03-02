import { WeatherService } from './weatherService';
import { DashboardService } from './dashboardService';
import { AreaService } from './areaService';
import { useAreaStore } from '@/store/modules/area';
import { useModuleStore } from '@/store/modules/module';
import { useLayerSettingsStore } from '@/store/modules/layerSettings'
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
  /**
   * 应用初始化，区域列表、当前区域、区域气象数据、地图模拟气象数据
   */
  async initialize() {
    try {
      //先加载页面在异步初始化 区域列表--当前区域--当前区域基础气象数据-当前区域的可视化数据
      // 并行初始化基础数据
      const [areasInitialized, weatherInitialized] = await Promise.all([
        this.areaService.loadAreaList(),
        this.areaService.loadCurrentSelectedArea(),

      ]);

        await this.initializeAreaWeatherData();

        // 加载地图天气图层
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