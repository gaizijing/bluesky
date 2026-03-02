import { fetchCurrentPointWeather } from "@/api";
import { getWindData } from '@/api';
import { useWindStore } from '@/store/modules/wind';
import { useWeatherStore } from '@/store/modules/weather';
import { useHeatmapStore } from '@/store/modules/heatmap';



class WeatherService {
  constructor() {

  }
  getWindStore() {
    return useWindStore();
  }
  getWeatherStore() {
    return useWeatherStore();
  }
  getHeatmapStore() {
    return useHeatmapStore();
  }
  // 加载区域天气数据
  async loadAreaWeatherData(area) {
    try {
      const weatherStore = this.getWeatherStore();
      weatherStore.setIsLoading(true);
      
      const weatherData = await fetchCurrentPointWeather(area);
      weatherStore.setCurrentAreaWeather(weatherData);
      weatherStore.setIsLoading(false);
      return weatherData;
    } catch (error) {
      console.error('加载区域天气数据失败:', error);

      throw error;
    } finally {
      const weatherStore = this.getWeatherStore();
      weatherStore.setIsLoading(false);
    }
  }
  async loadWindData() {
    try {
      const windData = await getWindData();
      
      this.getWindStore().setWindData(windData);
    } catch (error) {
      console.error('加载区域天气数据失败:', error);
      throw error;
    }
  }
  async loadHeatMapData() {
    try {
      const { getHeatmapData } = await import('@/api');
      const heatmapData = await getHeatmapData();
      this.getHeatmapStore().setHeatmapData(heatmapData);
    } catch (error) {
      console.error('加载热力图数据失败，使用空数据:', error.message);
      // 不抛出错误，而是设置空数据
      this.getHeatmapStore().setHeatmapData(null);
    }
  }

}

// 导出类，不创建单例
export { WeatherService };