
import { getRiskWarnings } from "@/api";
import { useDashboardWeatherStore } from "@/store/modules/dashboardWeather";
import { FlyabilityService } from './flyabilityService';

class DashboardWeatherService {
    constructor() {
        this.flyabilityService = new FlyabilityService();
    }

    getDashboardWeatherStore() {
        return useDashboardWeatherStore();
    }

    async getRealTimeWeatherPanelData(pointId) {
        try {
            const { fetchCurrentPointWeather } = await import('@/api');
            const data = await fetchCurrentPointWeather(pointId);
            this.getDashboardWeatherStore().setRealTimeWeatherPanelData(data);
        } catch (error) {
            console.error('加载实时天气数据失败:', error);
            throw error;
        }
    }

    async getweatherForecastPanelData(currentPoint) {
        try {
            // 导入天气预测数据
            const { getWeatherForecastTrend } = await import('@/api');

            // 并行获取趋势和热力图数据
            const trendData = await getWeatherForecastTrend(currentPoint.id);
            this.getDashboardWeatherStore().setWeatherForecastPanelData(trendData);
        } catch (error) {
            console.error('加载天气预测数据失败:', error);
            throw error;
        }
    }
    async loadFlightSuitableAnalysisPanel(currentPoint) {
        await this.flyabilityService.loadFlightSuitableAnalysisPanel(currentPoint);
    }
    async loadRiskWarnings() {
        try {
            const result = await getRiskWarnings();
            const data = result?.warnings || [];
            this.getDashboardWeatherStore().setRiskWarningsData(data);
        } catch (err) {
            console.error("获取风险预警数据失败：", err);
            this.getDashboardWeatherStore().setRiskWarningsData([]);
        }
    }


}
export { DashboardWeatherService };