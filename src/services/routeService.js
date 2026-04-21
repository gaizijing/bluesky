import { WeatherService } from './weatherService';
import { useWeatherStore } from '@/store/modules/weather';
import { useAreaStore } from '@/store/modules/area';
import { getRoutes } from '@/api';
import { fetchRouteRiskAnalysis } from './routeRiskService';
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
    const routeStore = this.getRouteStore();

    try {
      const routeData = await getRoutes();

      if (routeData && routeData.routes) {
        routeStore.setRouteList(routeData.routes);
      } else {
        routeStore.clearRouteList();
      }

      return routeData;
    } catch (error) {
      routeStore.clearRouteList();
      console.error('加载航路列表数据失败:', error);
      throw error;
    }
  }

  // 加载航路分析详情数据
  async loadRouteAnalysisData(routeId) {
    try {
      const analysisData = await fetchRouteRiskAnalysis(routeId, {
        currentTime: new Date().toISOString()
      });
      return analysisData;
    } catch (error) {
      console.error('加载航路分析详情失败:', error);
      throw error;
    }
  }
}

// 导出类，不创建单例
export { RouteService };
