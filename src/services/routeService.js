import { WeatherService } from './weatherService';
import { useWeatherStore } from '@/store/modules/weather';
import { useAreaStore } from '@/store/modules/area';

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
    try {
      // 模拟航路列表数据
      const routeData = {
        routes: [
          {
            id: 'ROUTE-001',
            name: '航路一',
            start: '起飞点A',
            end: '降落点B',
            distance: '120km',
            estimatedTime: '15min',
            weatherCondition: '良好',
            status: '可用'
          },
          {
            id: 'ROUTE-002',
            name: '航路二',
            start: '起飞点A',
            end: '降落点C',
            distance: '180km',
            estimatedTime: '22min',
            weatherCondition: '一般',
            status: '可用'
          },
          {
            id: 'ROUTE-003',
            name: '航路三',
            start: '起飞点B',
            end: '降落点C',
            distance: '90km',
            estimatedTime: '12min',
            weatherCondition: '良好',
            status: '可用'
          }
        ],
        total: 3,
        available: 3
      };

      return {
        routeData,
        timestamp: Date.now()
      };
    } catch (error) {
      console.error('加载航路列表数据失败:', error);
      throw error;
    }
  }

  // 加载航路分析详情数据
  async loadRouteAnalysisData(routeId) {
    try {
      // 模拟航路分析详情数据
      const analysisData = {
        routeId,
        routeName: `航路${routeId.split('-')[1]}`,
        weatherAlongRoute: [
          { segment: '起点', wind: '3-4级', visibility: '10km', precipitation: '无' },
          { segment: '中段', wind: '4-5级', visibility: '8km', precipitation: '无' },
          { segment: '终点', wind: '3级', visibility: '12km', precipitation: '无' }
        ],
        riskAssessment: {
          overallRisk: '低',
          factors: [
            { factor: '风速', risk: '低', value: '3.5m/s' },
            { factor: '能见度', risk: '低', value: '9.2km' },
            { factor: '降水量', risk: '低', value: '0mm' }
          ]
        },
        recommendations: [
          '建议飞行高度：300-500米',
          '建议飞行速度：60-80km/h',
          '注意中段风力变化'
        ]
      };

      return {
        analysisData,
        timestamp: Date.now()
      };
    } catch (error) {
      console.error('加载航路分析详情数据失败:', error);
      throw error;
    }
  }
}

// 导出类，不创建单例
export { RouteService };