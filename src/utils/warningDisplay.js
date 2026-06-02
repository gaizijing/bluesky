const WARNING_LEVEL_MAP = {
  RED: 'danger',
  HIGH: 'danger',
  YELLOW: 'warning',
  MEDIUM: 'warning',
  GREEN: 'info',
  LOW: 'info',
  INFO: 'info',
};

const TARGET_TYPE_MAP = {
  LANDING_POINT: 'takeoff',
  ROUTE: 'route',
  AIRSPACE: 'airspace',
  REGION: 'airspace',
};

/** P1 /warnings 列表 → 大屏展示结构 */
export function toWarningDisplay(record) {
  const triggered = record.lastTriggeredAt || record.createdAt || '';
  const timeStr = triggered ? String(triggered).replace('T', ' ') : '';
  return {
    warningId: record.warningId,
    level: WARNING_LEVEL_MAP[record.level] || 'warning',
    targetType: TARGET_TYPE_MAP[record.targetType] || 'takeoff',
    detail: record.content || record.title || '预警',
    title: record.title,
    startTime: timeStr || new Date().toTimeString().slice(0, 8),
    status: record.status,
    warningType: record.warningType,
    raw: record,
  };
}
