// 计算综合评分的函数
export const calculateFlightScore = (weatherItems) => {
  // 1. 定义要素权重（总和100%）
  const weights = {
    windSpeed: 0.3,
    visibility: 0.2,
    precipitation: 0.15,
    humidity: 0.1,
    temperature: 0.1,
    others: 0.15 // 气压、云量等综合权重
  };

  // 2. 定义各要素安全阈值（与数据中warningThreshold一致）
  const thresholds = {
    windSpeed: 10, // m/s
    visibility: 5, // km（反向计算）
    precipitation: 2, // mm/h
    humidity: 85, // %
    temperature: 35, // ℃
    others: 1 // 其他要素默认阈值（正常为0分）
  };

  // 3. 提取当前时间点的气象数据（默认值处理）
  const getValue = (type, defaultValue) => {
    const item = weatherItems.find(i => i.type === type);
    return item ? item.value : defaultValue;
  };

  const windSpeed = getValue('windSpeed', 3); // 默认微风3m/s
  const visibility = getValue('visibility', 10); // 默认能见度10km
  const precipitation = getValue('precipitation', 0); // 默认无降水
  const humidity = getValue('humidity', 60); // 默认湿度60%
  const temperature = getValue('temperature', 25); // 默认温度25℃
  const others = 0; // 其他要素正常时为0


  // 4. 计算单项得分
  const scores = {
    windSpeed: Math.min((windSpeed / thresholds.windSpeed) * 100, 100),
    visibility: Math.min((thresholds.visibility / visibility) * 100, 100), // 反向计算
    precipitation: Math.min((precipitation / thresholds.precipitation) * 100, 100),
    humidity: Math.min((humidity / thresholds.humidity) * 100, 100),
    temperature: Math.min((temperature / thresholds.temperature) * 100, 100),
    others: others
  };

  // 5. 加权计算综合评分（四舍五入取整数）
  const totalScore = Math.round(
    scores.windSpeed * weights.windSpeed +
    scores.visibility * weights.visibility +
    scores.precipitation * weights.precipitation +
    scores.humidity * weights.humidity +
    scores.temperature * weights.temperature +
    scores.others * weights.others
  );

  return totalScore;
};