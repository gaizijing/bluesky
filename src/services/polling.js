import { InitializationService } from './initialization';

export class PollingService {
  constructor() {
    this.initializationService = new InitializationService();
    this.intervalId = null;
    this.interval = 60000; // 默认1分钟
  }

  /**
   * 开始轮询
   * @param {number} interval - 轮询间隔（毫秒）
   */
  start(interval = this.interval) {
    this.stop(); // 先停止之前的轮询
    
    this.interval = interval;
    
    this.intervalId = setInterval(async () => {
      try {
        // 并行更新天气和仪表盘数据
        await Promise.all([
          this.initializationService.initializeAreaWeatherData(),
          this.initializationService.initializeMapWeatherLayer(),
          this.initializationService.initializeModuleData(),
        ]);
      } catch (error) {
        console.error('轮询更新失败:', error);
      }
    }, interval);
  }



  /**
   * 停止轮询
   */
  stop() {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
  } /**
   * 暂停轮询
   */
  pause() {
    this.stop();
  }

  /**
   * 恢复轮询
   */
  resume() {
    this.start(this.interval);
  }
}