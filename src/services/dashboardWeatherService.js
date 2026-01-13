
import { getWeatherSuitability } from "@/api";
import { getRiskWarnings } from "@/api";
import { useDashboardWeatherStore } from "@/store/modules/dashboardWeather";

class DashboardWeatherService {
    constructor() {
    }

    getDashboardWeatherStore() {
        return useDashboardWeatherStore();
    }

    async getRealTimeWeatherPanelData() {
        const dashboardWeatherStore = this.getDashboardWeatherStore();
        const data = {
            cloud: "0",
            dew: "-2",
            feelsLike: "2",
            humidity: "44",
            icon: "101",
            obsTime: "2026-01-12T16:34+08:00",
            precip: "0.0",
            pressure: "1003",
            stabilityIndex: "C",
            temp: "5",
            text: "多云",
            vis: "15",
            wind360: "222",
            windDir: "西南风",
            windScale: "1",
            windShearLevel: "medium",
            windSpeed: "5"
        };
        dashboardWeatherStore.setRealTimeWeatherPanelData(data);
    }

    async getweatherForecastPanelData() {
        try {
            // 导入天气预测数据
            const { getWeatherForecastTrend, getWeatherForecastHeatmap } = await import('@/api');

            // 并行获取趋势和热力图数据
            const [trendData, heatmapData] = await Promise.all([
                getWeatherForecastTrend({}),
                getWeatherForecastHeatmap({})
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
    async loadFlightSuitableAnalysisPanel() {
        try {
            const data = await getWeatherSuitability();

            const adaptedData = {
                timeInterval: data.timeInterval,
                totalHours: data.totalHours,
                factors: data.suitabilityList.map(item => item.factor),
                statusData: data.suitabilityList.map(item =>
                    item.detail.map(detail => detail.statusData)
                ),
                valueData: data.suitabilityList.map(item =>
                    item.detail.map(detail => detail.valueData)
                )
            };

            this.getDashboardWeatherStore().setFlightSuitableAnalysisPanelData(adaptedData);
        } catch (error) {
            console.error('Failed to load weather suitability data:', error);
        }
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