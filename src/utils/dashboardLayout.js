import dashboardConfig from '@/config/dashboard.config.json';

/** 当前视图可见模块（与 DashboardLayout 过滤规则一致） */
export function getViewModules(viewId, showHomeWarningSummary = true) {
  const view = dashboardConfig.main.views[viewId];
  let modules = view?.modules ?? [];
  if (viewId === 'home') {
    modules = modules.filter((mod) => {
      if (mod.id === 'home-right' || mod.module === 'warningSummary') {
        return showHomeWarningSummary;
      }
      return true;
    });
  }
  return modules;
}

function moduleHasVisiblePanels(mod) {
  return (mod.panels || []).some((p) => p.visible !== false);
}

/** 当前视图是否有右侧固定面板（region: right） */
export function viewHasRightPanel(viewId, showHomeWarningSummary = true) {
  return getViewModules(viewId, showHomeWarningSummary).some(
    (mod) => mod.region === 'right' && moduleHasVisiblePanels(mod),
  );
}

/**
 * 工具栏 right 偏移：有右侧面板时贴面板左缘，否则贴屏幕右缘
 * @returns {string|null} CSS right 值；null 表示无右侧面板
 */
export function getMapToolbarRightInset(viewId, showHomeWarningSummary = true) {
  const modules = getViewModules(viewId, showHomeWarningSummary);
  const rightMod = modules.find(
    (mod) => mod.region === 'right' && moduleHasVisiblePanels(mod),
  );
  if (!rightMod) return null;
  const width = rightMod.width || '25%';
  return `calc(${width} + 35px + 12px)`;
}
