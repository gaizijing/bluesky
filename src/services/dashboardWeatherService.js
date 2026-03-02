
import { getRiskWarnings } from "@/api";
import { useDashboardWeatherStore } from "@/store/modules/dashboardWeather";
import { SuitabilityService } from './suitabilityService';

class DashboardWeatherService {
    constructor() {
        this.suitabilityService = new SuitabilityService();
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
            const { getWeatherForecastTrend, getWeatherForecastHeatmap } = await import('@/api');

            // 并行获取趋势和热力图数据
            const [trendData, heatmapData] = await Promise.all([
                getWeatherForecastTrend({}),
                getWeatherForecastHeatmap({ currentPoint })
            ]);

            const data = {
                trendData,
                heatmapData,
            };
            this.getDashboardWeatherStore().setWeatherForecastPanelData(data);
        } catch (error) {
            console.error('加载天气预测数据失败:', error);
            throw error;
        }
    }
    async loadFlightSuitableAnalysisPanel(currentPoint) {
        await this.suitabilityService.loadFlightSuitableAnalysisPanel(currentPoint);
    }
    async loadRiskWarnings() {
        console.log("获取风险预警数据...");

        try {
            const result = await getRiskWarnings();

            const data = result.warnings.map((w) => ({
                ...w,
                targetType:
                    w.targetType ||
                    ["takeoff", "route", "airspace"][Math.floor(Math.random() * 3)],
                detail:
                    w.detail ||
                    `${w.area ? `【${w.area}】` : ""}${w.riskReason || "飞行存在严重风险"
                    }`,
            }));
            console.log("风险预警数据:", data);

            this.getDashboardWeatherStore().setRiskWarningsData(data);

        } catch (err) {
            console.error("获取风险预警数据失败：", err);
        } finally {

        }
    }


}
export { DashboardWeatherService };