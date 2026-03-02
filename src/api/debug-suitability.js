// 调试脚本：定位getWeatherSuitability高频调用问题
// 将此代码添加到你的项目中，然后查看控制台输出

import { getWeatherSuitability as originalGetWeatherSuitability } from './index.js';

// 创建调试包装器
let callCount = 0;
const callHistory = [];
const MAX_CALLS = 50;

// 包装原函数
export const getWeatherSuitability = function(...args) {
  callCount++;
  const timestamp = Date.now();
  const stack = new Error().stack;
  
  // 记录调用信息
  const callInfo = {
    count: callCount,
    timestamp,
    time: new Date(timestamp).toLocaleTimeString('zh-CN'),
    args: JSON.stringify(args),
    stack: stack.split('\n').slice(2, 7).join('\n') // 获取调用栈前几行
  };
  callHistory.push(callInfo);
  
  console.group(`🔍 [DEBUG] getWeatherSuitability 第${callCount}次调用`);
  console.log('🕐 时间:', callInfo.time);
  console.log('📝 参数:', args);
  console.log('📋 调用栈:', callInfo.stack);
  
  // 检查调用频率
  if (callHistory.length > 1) {
    const lastCall = callHistory[callHistory.length - 2];
    const interval = timestamp - lastCall.timestamp;
    console.log(`⏱️  与上次调用间隔: ${interval}ms`);
    
    if (interval < 1000) {
      console.warn(`⚠️  警告：调用过于频繁！间隔仅 ${interval}ms`);
    }
  }
  
  console.groupEnd();
  
  // 防止无限循环
  if (callCount > MAX_CALLS) {
    console.error(`❌ 错误：getWeatherSuitability 调用超过${MAX_CALLS}次！`);
    console.table(callHistory.slice(-10)); // 显示最近10次调用
    throw new Error(`getWeatherSuitability 可能陷入无限循环，已调用${callCount}次`);
  }
  
  // 调用原函数
  try {
    return originalGetWeatherSuitability.apply(this, args);
  } catch (error) {
    console.error(`❌ getWeatherSuitability 执行失败:`, error);
    throw error;
  }
};

// 监控定时器
export function monitorTimers() {
  const originalSetInterval = window.setInterval;
  const originalSetTimeout = window.setTimeout;
  const activeTimers = new Set();
  
  window.setInterval = function(callback, delay, ...args) {
    const id = originalSetInterval(callback, delay, ...args);
    activeTimers.add(id);
    
    // 检查是否调用了getWeatherSuitability
    const callbackStr = callback.toString();
    if (callbackStr.includes('getWeatherSuitability') || 
        callbackStr.includes('suitability') ||
        callbackStr.includes('Suitability')) {
      console.warn(`⚠️  发现调用getWeatherSuitability的定时器 #${id}, 间隔: ${delay}ms`);
      console.trace('定时器创建位置:');
    } else if (delay < 2000) {
      console.log(`⏰ 发现短间隔定时器 #${id}, 间隔: ${delay}ms`);
    }
    
    return id;
  };
  
  // 提供清理方法
  window.clearAllDebugTimers = function() {
    console.log(`🧹 清理所有定时器，共${activeTimers.size}个`);
    activeTimers.forEach(id => {
      window.clearInterval(id);
      console.log(`  清除定时器 #${id}`);
    });
    activeTimers.clear();
  };
  
  return { activeTimers, clearAllDebugTimers: window.clearAllDebugTimers };
}

// 防抖函数 - 防止高频调用
export function createDebouncedSuitability(originalFunc, delay = 5000) {
  let lastCallTime = 0;
  let pendingCall = null;
  let debounceCount = 0;
  
  return function(...args) {
    const now = Date.now();
    const timeSinceLastCall = now - lastCallTime;
    
    if (timeSinceLastCall < delay) {
      debounceCount++;
      console.log(`🚫 [防抖#${debounceCount}] 跳过调用，距离上次调用仅 ${timeSinceLastCall}ms (需要等待 ${delay}ms)`);
      
      // 取消之前的pending调用
      if (pendingCall) {
        clearTimeout(pendingCall);
      }
      
      // 设置新的延迟调用
      pendingCall = setTimeout(() => {
        lastCallTime = Date.now();
        console.log(`🔄 [防抖] 执行延迟调用`);
        originalFunc.apply(this, args);
        pendingCall = null;
      }, delay - timeSinceLastCall);
      
      return Promise.resolve({ 
        message: '调用被防抖跳过',
        debounceCount,
        nextCallIn: delay - timeSinceLastCall 
      });
    }
    
    lastCallTime = now;
    return originalFunc.apply(this, args);
  };
}

// 使用说明
console.log(`
🎯 getWeatherSuitability 调试工具已加载

使用方法：
1. 在main.js或入口文件中导入：
   import { getWeatherSuitability, monitorTimers } from './api/debug-suitability';

2. 启动定时器监控：
   const timerMonitor = monitorTimers();

3. 如果需要临时停止高频调用，在控制台执行：
   window.clearAllDebugTimers();

4. 查看调用统计：
   - 控制台会显示每次调用的详细信息
   - 超过20次调用会显示警告
   - 超过50次调用会抛出错误

5. 如果需要防抖功能：
   import { createDebouncedSuitability } from './api/debug-suitability';
   const debouncedSuitability = createDebouncedSuitability(originalGetWeatherSuitability, 5000);
`);