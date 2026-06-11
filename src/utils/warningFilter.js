/** 按 targetType + targetId 过滤预警列表 */
export function filterWarningsByTarget(warnings, { targetType, targetId } = {}) {
  if (!targetId || !Array.isArray(warnings)) return [];
  const type = String(targetType || '').toUpperCase();
  const id = String(targetId);
  return warnings.filter((item) => {
    const raw = item.raw || item;
    return String(raw.targetType || '').toUpperCase() === type
      && String(raw.targetId || '') === id;
  });
}
