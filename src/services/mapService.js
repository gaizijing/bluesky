// 获取地图加载所需要的数据
import { WeatherService } from './weatherService.js';
class MapService {
  constructor() {
    this.weatherService = new WeatherService();
  }
}
// 导出类，不创建单例
export { MapService };