/**
 * 日期工具函数
 * 提供日期格式化、时间差计算等常用功能
 */

/**
 * 格式化日期
 * @param {Date|string|number} date - 日期（支持Date对象、时间戳、ISO字符串）
 * @param {string} format - 格式化字符串（如 'yyyy-MM-dd HH:mm:ss'）
 * @returns {string} 格式化后的日期字符串
 * 
 * 格式说明：
 * yyyy - 四位年份（如 2023）
 * MM - 两位月份（01-12）
 * dd - 两位日期（01-31）
 * HH - 24小时制小时（00-23）
 * mm - 分钟（00-59）
 * ss - 秒（00-59）
 * SSS - 毫秒（000-999）
 */
export const formatDate = (date, format = 'yyyy-MM-dd HH:mm:ss') => {
  // 处理输入：转换为Date对象
  if (!date) return '';
  let targetDate;
  if (date instanceof Date) {
    targetDate = date;
  } else if (typeof date === 'string' || typeof date === 'number') {
    targetDate = new Date(date);
  } else {
    return ''; // 无效类型
  }

  // 检查日期是否有效
  if (isNaN(targetDate.getTime())) {
    console.error('无效的日期:', date);
    return '';
  }

  // 提取日期部分
  const year = targetDate.getFullYear();
  const month = targetDate.getMonth() + 1; // 月份从0开始，需+1
  const day = targetDate.getDate();
  const hours = targetDate.getHours();
  const minutes = targetDate.getMinutes();
  const seconds = targetDate.getSeconds();
  const milliseconds = targetDate.getMilliseconds();

  // 替换格式化字符串
  return format
    .replace('yyyy', year)
    .replace('MM', padZero(month))
    .replace('dd', padZero(day))
    .replace('HH', padZero(hours))
    .replace('mm', padZero(minutes))
    .replace('ss', padZero(seconds))
    .replace('SSS', padZero(milliseconds, 3));
};

/**
 * 数字补零（如 3 → '03'，5 → '005'）
 * @param {number} num - 数字
 * @param {number} length - 目标长度（默认2）
 * @returns {string} 补零后的字符串
 */
const padZero = (num, length = 2) => {
  return String(num).padStart(length, '0');
};

/**
 * 计算两个日期的差值（毫秒）
 * @param {Date|string} startDate - 开始日期
 * @param {Date|string} endDate - 结束日期
 * @returns {number} 差值（毫秒，endDate - startDate）
 */
export const getDateDiff = (startDate, endDate) => {
  const start = new Date(startDate).getTime();
  const end = new Date(endDate).getTime();
  return isNaN(start) || isNaN(end) ? 0 : end - start;
};

/**
 * 获取n天后的日期
 * @param {number} days - 天数（正数未来，负数过去）
 * @param {Date} baseDate - 基准日期（默认当前日期）
 * @returns {Date} 计算后的日期
 */
export const getDateAfterDays = (days, baseDate = new Date()) => {
  const result = new Date(baseDate);
  result.setDate(result.getDate() + days);
  return result;
};