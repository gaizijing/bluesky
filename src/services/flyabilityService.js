import { fetchLandingMatrixChart } from '@/api/flyability';
import { useAreaStore } from '@/store/modules/area';
import { useDashboardWeatherStore } from '@/store/modules/dashboardWeather';

/** P1 适飞服务：只消费 /flyability/* */
export class FlyabilityService {
  getAreaStore() {
    return useAreaStore();
  }

  getDashboardWeatherStore() {
    return useDashboardWeatherStore();
  }

  async loadFlightSuitableAnalysisPanel(currentPoint) {
    try {
      const chartData = await fetchLandingMatrixChart({ currentPoint, hours: 1 });
      this.getDashboardWeatherStore().setFlightSuitableAnalysisPanelData(chartData);
    } catch (error) {
      console.error('加载适飞分析数据失败:', error);
    }
  }
}
