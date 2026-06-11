const listeners = new Map();

export const DASHBOARD_EVENTS = {
  MET_TIME_CHANGED: 'MET_TIME_CHANGED',
  MET_VIZ_CONFIG_CHANGED: 'MET_VIZ_CONFIG_CHANGED',
  /** MetViz 风场数据/开关变更后刷新可见性 */
  WIND_VISIBILITY_SYNC: 'WIND_VISIBILITY_SYNC',
  /** 态势视图切换（home / drillLanding / drillRoute / simFlight） */
  VIEW_CHANGED: 'VIEW_CHANGED',
  REGION_CHANGED: 'REGION_CHANGED',
  MAP_PICKED: 'MAP_PICKED',
  WARNING_TOAST_CLICKED: 'WARNING_TOAST_CLICKED',
  /** 预警已读 / 处理 / 关闭后刷新外部面板 */
  WARNING_CHANGED: 'WARNING_CHANGED',
  /** 预警详情定位到地图起降点/航路 */
  WARNING_LOCATE: 'WARNING_LOCATE',
  FLIGHT_POSITION_UPDATED: 'FLIGHT_POSITION_UPDATED',
  /** 主地图 ISIM 飞行尾迹聚焦飞机 */
  FOCUS_ISIM_AIRCRAFT: 'FOCUS_ISIM_AIRCRAFT',
  /** 总览模式下重置相机到 Region 默认视角 */
  RESET_HOME_CAMERA: 'RESET_HOME_CAMERA',
};

export const dashboardEventBus = {
  on(event, handler) {
    if (!listeners.has(event)) listeners.set(event, new Set());
    listeners.get(event).add(handler);
    return () => dashboardEventBus.off(event, handler);
  },

  off(event, handler) {
    listeners.get(event)?.delete(handler);
  },

  emit(event, payload) {
    listeners.get(event)?.forEach((handler) => {
      try {
        handler(payload);
      } catch (err) {
        console.error(`[eventBus] ${event} handler error`, err);
      }
    });
  },
};
