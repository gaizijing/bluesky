import dashboardConfig from './dashboard.config.json';
import { MET_VIZ_ENABLED, MET_VIZ_ON_DASHBOARD, REGION_METEO_ON_DASHBOARD } from './featureFlags';

/** 主大屏是否挂载 MetViz（填色 / 风粒子 / R_met） */
export function isMetVizEnabledOnDashboard() {
  if (!MET_VIZ_ENABLED || !MET_VIZ_ON_DASHBOARD) return false;
  if (isRegionMeteoEnabledOnDashboard()) return false;
  return dashboardConfig.metViz?.enabled !== false;
}

/** 主大屏是否挂载 RegionMeteo（优先于旧 MetViz） */
export function isRegionMeteoEnabledOnDashboard() {
  if (!REGION_METEO_ON_DASHBOARD) return false;
  return dashboardConfig.regionMeteo?.enabled !== false;
}

/** 当前路由是否应挂载 MetViz 引擎 */
export function shouldAttachMetViz(route) {
  if (!MET_VIZ_ENABLED) return false;
  if (route?.name === 'MeteorologyViz') return false;
  return isMetVizEnabledOnDashboard();
}

/** 当前路由是否应挂载 RegionMeteo（Dashboard 主屏） */
export function shouldAttachRegionMeteo(route) {
  if (route?.name === 'MeteorologyViz') return false;
  return isRegionMeteoEnabledOnDashboard();
}
