import { WeatherService } from './weatherService';
import { useWeatherStore } from '@/store/modules/weather';
import { useAreaStore } from '@/store/modules/area';
import { getRoutes, getRouteDetail } from '@/api';
import { useRouteStore } from '@/store/modules/routeStore';

class RouteService {
  constructor() {
    this.weatherService = new WeatherService();
  }

  // 获取store实例
  getWeatherStore() {
    return useWeatherStore();
  }

  getAreaStore() {
    return useAreaStore();
  }

  getRouteStore() {
    return useRouteStore();
  }

  // 加载飞行分析模块数据
  async loadFlightAnalysisData() {
    try {
      const weatherStore = this.getWeatherStore();
      const weatherParams = {
        element: weatherStore.currentElement,
        timeRange: weatherStore.timeRange,
        time: weatherStore.currentTime
      };

      const weatherData = await this.weatherService.getBatchData(weatherParams);

      return {
        weatherData,
        timestamp: Date.now()
      };
    } catch (error) {
      console.error('加载飞行分析数据失败:', error);
      throw error;
    }
  }

  // 加载航路列表数据
  async loadRouteListData() {

    const routeData = await getRoutes();

    // 更新 store
    const routeStore = this.getRouteStore();
    if (routeData && routeData.routes) {
      routeStore.setRouteList(routeData.routes);
    }

    return routeData;
  }

  // 加载航路分析详情数据
  async loadRouteAnalysisData(routeId) {
    const analysisData = await getRouteDetail(routeId);
    return analysisData;
  }
}

// 导出类，不创建单例
export { RouteService };
