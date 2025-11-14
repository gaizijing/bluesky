/**
 * 格式化时间（将字符串转换为更友好的显示格式）
 * @param {string} timeStr - 原始时间字符串（如"2025-11-03 10:00:00"）
 * @returns {string} 格式化后的时间（如"10:00:00"）
 */
export const formatUpdateTime = (timeStr) => {
  if (!timeStr) return '暂无数据'
  // 分割时间字符串，取后面的时分秒
  const parts = timeStr.split(' ')
  return parts[1] || timeStr
}