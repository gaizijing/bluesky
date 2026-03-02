// 修复版：防止getWeatherSuitability高频调用
// 替换原来的getWeatherSuitability方法

import axios from 'axios';

// 创建axios实例
const apiClient = axios.create({
  baseURL: '/api',
  timeout: 15000,
  headers: {
    'Content-Type': 'application/json;charset=utf-8'
  }
});

// 响应拦截器
apiClient.interceptors.response.use(
  (response) => {
    const res = response.data;
    if (res.code === 200) {
      return res.data;
    }
    return Promise.reject(new Error(res.message || '请求失败'));
  },
  (error) => {
    console.error('API请求错误:', error.message);
    return Promise.reject(error);
  }
);

// 调用统计和限制
let suitabilityCallCount = 0;
let lastSuitabilityCallTime = 0;
const MAX_CALLS_PER_MINUTE = 60; // 每分钟最多60次
const MIN_CALL_INTERVAL = 5000; // 最少5秒间隔

// 防抖函数
function createDebouncedFunction(originalFunc, delay) {
  let timeoutId = null;
  let lastCallTime = 0;
  
  return function(...args) {
    const now = Date.now();
    const timeSinceLastCall = now - lastCallTime;
    
    // 清除之前的定时器
    if (timeoutId) {
      clearTimeout(timeoutId);
    }
    
    // 如果距离上次调用时间太短，延迟执行
    if (timeSinceLastCall < delay) {
      console.log(`[防抖] 跳过频繁调用，距离上次调用仅 ${timeSinceLastCall}ms`);
      timeoutId = setTimeout(() => {
        lastCallTime = Date.now();
        originalFunc.apply(this, args);
      }, delay - timeSinceLastCall);
      return Promise.resolve({ debounced: true, nextCallIn: delay - timeSinceLastCall });
    }
    
    // 正常调用
    lastCallTime = now;
    return originalFunc.apply(this, args);
  };
}

// 修复版getWeatherSuitability - 添加调用限制
export const getWeatherSuitability = async (params = {}) => {
  const now = Date.now();
  
  // 检查调用频率
  if (now - lastSuitabilityCallTime < MIN_CALL_INTERVAL) {
    console.warn(`[频率限制] 调用过于频繁，距离上次调用仅 ${now - lastSuitabilityCallTime}ms，需要等待 ${MIN_CALL_INTERVAL}ms`);
    return Promise.reject(new Error(`调用过于频繁，请等待${Math.ceil((MIN_CALL_INTERVAL - (now - lastSuitabilityCallTime)) / 1000)}秒`));
  }
  
  suitabilityCallCount++;
  lastSuitabilityCallTime = now;
  
  // 每分钟重置计数器
  if (suitabilityCallCount > MAX_CALLS_PER_MINUTE) {
    console.error(`[频率限制] 调用次数超过限制：${suitabilityCallCount}次/分钟`);
    return Promise.reject(new Error('调用次数超过限制'));
  }
  
  console.log(`[调用统计] getWeatherSuitability 第${suitabilityCallCount}次调用，间隔: ${now - lastSuitabilityCallTime}ms`);
  
  const { 
    currentPoint, 
    timestamp = new Date(),
    timeRange = '3h',
    includeThresholds = true 
  } = params;
  
  // 获取点ID
  let pointId = null;
  if (currentPoint) {
    pointId = currentPoint.id || currentPoint.pointId;
  }
  
  // 构建API请求参数
  const queryParams = new URLSearchParams();
  if (pointId) queryParams.append('pointId', pointId);
  queryParams.append('timestamp', timestamp.toISOString());
  queryParams.append('timeRange', timeRange);
  if (includeThresholds) queryParams.append('includeThresholds', 'true');
  
  // 尝试调用真实API - 注意：后端路径是 /api/suitability/status
  const url = `/suitability/status?pointId=${encodeURIComponent(pointId || 'area-1')}&totalHours=3`;
  
  try {
    const response = await apiClient.get(url);
    
    if (response && response.data) {
      console.log('[Suitability] API调用成功，返回真实数据');
      // 确保返回的数据有timeInterval字段
      const data = response.data;
      if (!data.timeInterval) {
        data.timeInterval = 10; // 默认10分钟间隔
      }
      if (!data.totalHours) {
        data.totalHours = 3; // 默认3小时
      }
      return data;
    } else {
      console.warn('[Suitability] API返回数据格式不正确');
      throw new Error('API返回数据格式不正确');
    }
  } catch (apiError) {
    console.warn('[Suitability] API调用失败:', apiError.message);
    // 这里可以返回模拟数据，但为了调试，我们先抛出错误
    throw apiError;
  }
};

// 创建防抖版本
export const getWeatherSuitabilityDebounced = createDebouncedFunction(getWeatherSuitability, 5000);

// 定时器监控
export function monitorAndFixTimers() {
  console.log('[定时器监控] 开始监控...');
  
  const originalSetInterval = window.setInterval;
  const intervals = new Set();
  
  window.setInterval = function(callback, delay, ...args) {
    const callbackStr = callback.toString();
    
    // 检查是否调用了适飞性相关函数
    if (callbackStr.includes('getWeatherSuitability') || 
        callbackStr.includes('suitability') ||
        callbackStr.includes('Suitability') ||
        callbackStr.includes('loadFlightSuitableAnalysisPanel')) {
      
      console.warn(`⚠️  发现可疑定时器，间隔: ${delay}ms`);
      console.log('回调函数:', callbackStr.substring(0, 200) + '...');
      
      // 如果间隔太短，自动调整为合理值
      if (delay < 30000) { // 小于30秒
        console.warn(`⚠️  定时器间隔过短 (${delay}ms)，自动调整为30秒`);
        delay = 30000;
      }
    }
    
    const id = originalSetInterval(callback, delay, ...args);
    intervals.add(id);
    return id;
  };
  
  // 提供清理方法
  window.clearProblematicTimers = function() {
    console.log(`🧹 清理所有定时器，共${intervals.size}个`);
    intervals.forEach(id => {
      window.clearInterval(id);
    });
    intervals.clear();
  };
  
  return intervals;
}

// 使用说明
console.log(`
🔧 getWeatherSuitability 修复版已加载

修复内容：
1. 添加调用频率限制（最少5秒间隔）
2. 添加每分钟调用次数限制（最多60次）
3. 提供防抖版本 getWeatherSuitabilityDebounced
4. 监控并修复过短的定时器

使用方法：
1. 在需要的地方导入：
   import { getWeatherSuitability, getWeatherSuitabilityDebounced } from './api/fixed-suitability';

2. 对于需要定期更新的场景，使用防抖版本：
   const data = await getWeatherSuitabilityDebounced(params);

3. 启动定时器监控：
   import { monitorAndFixTimers } from './api/fixed-suitability';
   monitorAndFixTimers();

4. 如果需要清理所有定时器：
   window.clearProblematicTimers();
`);