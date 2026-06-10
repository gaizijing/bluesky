import dashboardConfig from './dashboard.config.json';
import { REGION_METEO_ON_DASHBOARD } from './featureFlags';

/** 主大屏是否挂载 RegionMeteo（Kriging 标量 + 静态 GFS 风场） */
export function isRegionMeteoEnabledOnDashboard() {
  if (!REGION_METEO_ON_DASHBOARD) return false;
  return dashboardConfig.regionMeteo?.enabled !== false;
}

/** 当前路由是否应挂载 RegionMeteo（Dashboard 主屏） */
export function shouldAttachRegionMeteo(route) {
  if (route?.name === 'MeteorologyViz') return false;
  return isRegionMeteoEnabledOnDashboard();
}
