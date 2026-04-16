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
      
      const weatherData = await fetchCurrentPointWeather(area.id);
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
      console.error('加载风场数据失败:', error);
      throw error;
    }
  }


}

// 导出类，不创建单例
export { WeatherService };