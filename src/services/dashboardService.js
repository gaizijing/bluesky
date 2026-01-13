import { DashboardWeatherService } from './dashboardWeatherService';
import { DeviceService } from './deviceService';
import { RouteService } from './routeService';
import { DASHBOARD_MODULES } from '@/config/constants.js';

class DashboardService {
  constructor() {
    this.dashboardWeatherService = new DashboardWeatherService();
    this.deviceService = new DeviceService();
    this.routeService = new RouteService();
  }


  // 根据模块键加载数据
  async loadModuleData(moduleKey) {
    switch (moduleKey) {
      case DASHBOARD_MODULES.DEVICE_MONITOR:
        this.deviceService.loadDeviceCount();
        this.deviceService.loadEquipmentAlarm();
        this.deviceService.loadHistoryData();
        break
      case DASHBOARD_MODULES.FLIGHT_ANALYSIS:
        this.routeService.loadRouteListData();
        break;
      case DASHBOARD_MODULES.LANDING_MONITOR:
        this.dashboardWeatherService.getRealTimeWeatherPanelData();
        this.dashboardWeatherService.getweatherForecastPanelData();
        this.dashboardWeatherService.loadFlightSuitableAnalysisPanel();
        this.dashboardWeatherService.loadRiskWarnings();
        console.log("加载风险预警数据完成");
        break
      default:
        return null;
    }
  }
}

// 导出类，不创建单例
export { DashboardService };