import dashboardConfig from './dashboard.config.json';
import { MET_VIZ_ENABLED, MET_VIZ_ON_DASHBOARD } from './featureFlags';

/** 主大屏是否挂载 MetViz（填色 / 风粒子 / R_met） */
export function isMetVizEnabledOnDashboard() {
  if (!MET_VIZ_ENABLED || !MET_VIZ_ON_DASHBOARD) return false;
  return dashboardConfig.metViz?.enabled !== false;
}

/** 当前路由是否应挂载 MetViz 引擎 */
export function shouldAttachMetViz(route) {
  if (!MET_VIZ_ENABLED) return false;
  if (route?.name === 'MeteorologyViz') return true;
  return isMetVizEnabledOnDashboard();
}
