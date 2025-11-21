// 导入axios（用于发送HTTP请求）
import axios from 'axios'

// 创建axios实例，配置基础路径（开发环境用mock数据）
const request = axios.create({
  baseURL: '/', // 基础路径，对应public文件夹
  timeout: 5000 // 请求超时时间：5秒
})

// 定义：获取核心气象要素数据的接口
export const getCoreIndicators = async () => {
  try {
    // 开发阶段请求本地mock数据，后续替换为真实后端接口
    const mockData = await import('@/mock/coreIndicators.json')
    // 只返回data中的数据（简化前端使用）
    return mockData.default
  } catch (error) {
    // 错误处理：打印错误信息，并返回失败状态
    console.error('获取核心气象要素失败：', error)
    return { code: 500, message: '获取数据失败' }
  }
}
// 获取微尺度天气数据
export const getMicroscaleWeather = async () => {
  try {
    const response = await import('@/mock/microscaleWeather.json')
    return response.default
  } catch (error) {
    console.error('获取微尺度天气数据失败：', error)
    return { code: 500, message: '获取数据失败' }
  }
}
// 获取垂直剖面数据
export const getVerticalProfile = async () => {
  try {
    const response = await import('@/mock/verticalProfile.json')
    return response.default
  } catch (error) {
    console.error('获取垂直剖面数据失败：', error)
    return { code: 500, message: '获取数据失败' }
  }
}
export const getDeviceTrace = async () => {
  try {
    const response = await import('@/mock/deviceTrace.json')
    return response.default
  } catch (error) {
    console.error('获取设备溯源数据失败：', error)
    return { code: 500, message: '获取数据失败' }
  }
}
// 获取飞行任务数据
export const getFlightTasks = async () => {
  try {
    const response = await import('@/mock/flightTasks.json')
    return response.default
  } catch (error) {
    console.error('获取飞行任务数据失败：', error)
    return { code: 500, message: '获取数据失败' }
  }
}
// 获取飞行器适配数据
export const getAircraftAdapt = async () => {
  try {
    const response = await import('@/mock/aircraftAdapt.json')
    return response.default
  } catch (error) {
    console.error('获取飞行器适配数据失败：', error)
    return { code: 500, message: '获取数据失败' }
  }
}

// 模拟获取垂直剖面数据
export const getVerticalProfileData = async (timeType = 'current') => {
  // 模拟不同时间的数据差异（仅风速变化）
  const baseData = {
    updateTime: '2025-11-03 10:35:22',
    heightLayers: [
      { height: 0, windSpeed: 5.2, temperature: 25.3, humidity: 65, visibility: 8.5 },
      { height: 100, windSpeed: 6.8, temperature: 24.8, humidity: 62, visibility: 8.2 },
      { height: 200, windSpeed: 7.5, temperature: 24.1, humidity: 60, visibility: 8.0 },
      { height: 300, windSpeed: 8.5, temperature: 23.5, humidity: 58, visibility: 7.8 },
      { height: 400, windSpeed: 8.2, temperature: 23.0, humidity: 56, visibility: 7.5 },
      { height: 500, windSpeed: 7.9, temperature: 22.5, humidity: 55, visibility: 7.2 },
      { height: 600, windSpeed: 14.3, temperature: 21.8, humidity: 53, visibility: 6.8 },
      { height: 700, windSpeed: 15.7, temperature: 21.0, humidity: 50, visibility: 6.5 },
      { height: 800, windSpeed: 16.2, temperature: 20.2, humidity: 48, visibility: 6.0 },
      { height: 900, windSpeed: 12.5, temperature: 19.5, humidity: 45, visibility: 5.8 },
      { height: 1000, windSpeed: 10.8, temperature: 18.8, humidity: 42, visibility: 5.5 }
    ],
    safetyThresholds: {
      windSpeed: 12,
      temperature: [-10, 35],
      humidity: 90,
      visibility: 1.5
    },
    currentTask: {
      taskId: 'FT20251103001',
      requiredHeightRange: [200, 500],
      taskType: '救援'
    }
  };

  // 1小时前数据（600米以上风速较低）
  if (timeType === '1h_ago') {
    baseData.heightLayers = baseData.heightLayers.map(layer => ({
      ...layer,
      windSpeed: layer.height >= 600 ? layer.windSpeed - 5 : layer.windSpeed
    }));
    baseData.updateTime = '2025-11-03 09:35:22';
  }

  // 1小时预报（600米以上风速更高）
  if (timeType === '1h_forecast') {
    baseData.heightLayers = baseData.heightLayers.map(layer => ({
      ...layer,
      windSpeed: layer.height >= 600 ? layer.windSpeed + 3 : layer.windSpeed
    }));
    baseData.updateTime = '2025-11-03 11:35:22（预报）';
  }

  return new Promise(resolve => {
    setTimeout(() => {
      resolve({ code: 200, data: baseData });
    }, 500);
  });
};