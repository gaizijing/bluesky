/** 预警状态展示文案（ACKNOWLEDGED 对用户即「已读」） */
export const WARNING_STATUS_LABEL = {
  NEW: '未读',
  ACKNOWLEDGED: '已读',
  HANDLED: '已处理',
  CLOSED: '已关闭',
};

export function warningStatusText(status) {
  return WARNING_STATUS_LABEL[status] || status || '—';
}

/** 未读预警：右上角红点 */
export function isWarningUnread(status) {
  return status === 'NEW';
}
