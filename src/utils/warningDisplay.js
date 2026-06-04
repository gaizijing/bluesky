import { formatDate, parseApiDateTime } from './dateUtils';

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

/** 预警时间：当天 HH:mm，跨日 MM-dd HH:mm */
export function formatWarningTime(value) {
  const dt = parseApiDateTime(value);
  if (!dt) return '';
  const now = new Date();
  const isToday =
    dt.getFullYear() === now.getFullYear()
    && dt.getMonth() === now.getMonth()
    && dt.getDate() === now.getDate();
  return isToday ? formatDate(dt, 'HH:mm') : formatDate(dt, 'MM-dd HH:mm');
}

/** P1 /warnings 列表 → 大屏展示结构 */
export function toWarningDisplay(record) {
  const triggered = record.lastTriggeredAt || record.createdAt || '';
  return {
    warningId: record.warningId,
    level: WARNING_LEVEL_MAP[record.level] || 'warning',
    targetType: TARGET_TYPE_MAP[record.targetType] || 'takeoff',
    detail: record.content || record.title || '预警',
    title: record.title,
    startTime: formatWarningTime(triggered) || formatDate(new Date(), 'HH:mm'),
    status: record.status,
    warningType: record.warningType,
    raw: record,
  };
}
