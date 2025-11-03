import request from '@/utils/request'

/**
 * 气象数据API封装（模拟后端接口，返回模拟数据）
 */

// 1. 获取指定气象要素的原始数据（用于Cesium渲染）
export const getWeatherData = async (params) => {
  // 模拟API请求延迟
  await new Promise(resolve => setTimeout(resolve, 800))

  const { element = 'temperature', time = new Date().toISOString() } = params
  const timeStr = new Date(time).toLocaleDateString()

  // 模拟不同气象要素的数据格式
  switch (element) {
    // 温度数据（区域面数据）
    case 'temperature':
      return {
        updateTime: time,
        areas: [
          { name: '华北地区', coords: [114.0, 38.0, 118.0, 38.0, 118.0, 34.0, 114.0, 34.0, 114.0, 38.0], value: 18.5 },
          { name: '华东地区', coords: [118.0, 34.0, 122.0, 34.0, 122.0, 28.0, 118.0, 28.0, 118.0, 34.0], value: 22.3 },
          { name: '华南地区', coords: [110.0, 28.0, 120.0, 28.0, 120.0, 20.0, 110.0, 20.0, 110.0, 28.0], value: 26.8 },
          { name: '西北地区', coords: [90.0, 40.0, 105.0, 40.0, 105.0, 30.0, 90.0, 30.0, 90.0, 40.0], value: 15.2 },
        ],
        unit: '℃'
      }

    // 降水数据（粒子系统数据）
    case 'precipitation':
      return {
        updateTime: time,
        intensity: 5.2, // 平均降水强度
        center: { lng: 108.0, lat: 32.0 }, // 降水中心
        areas: [
          { name: '四川盆地', coords: [103.0, 33.0, 108.0, 33.0, 108.0, 28.0, 103.0, 28.0], value: 12.5 },
          { name: '长江中下游', coords: [112.0, 32.0, 120.0, 32.0, 120.0, 28.0, 112.0, 28.0], value: 8.3 },
        ],
        unit: 'mm'
      }

    // 风力数据（流线数据）
    case 'wind':
      return {
        updateTime: time,
        streamLines: [
          { coords: [110.0, 40.0, 2000, 115.0, 38.0, 2000, 120.0, 36.0, 2000], speed: 8.5, direction: '东南' },
          { coords: [100.0, 35.0, 1500, 105.0, 33.0, 1500, 110.0, 31.0, 1500], speed: 6.2, direction: '东南' },
          { coords: [115.0, 25.0, 1000, 120.0, 23.0, 1000, 125.0, 21.0, 1000], speed: 10.8, direction: '东北' },
        ],
        unit: 'm/s'
      }

    // 气压数据（等值线数据）
    case 'pressure':
      return {
        updateTime: time,
        isolines: [
          { value: 1010, coords: [95.0, 45.0, 100.0, 43.0, 105.0, 41.0, 110.0, 39.0, 115.0, 37.0] },
          { value: 1015, coords: [95.0, 40.0, 100.0, 38.0, 105.0, 36.0, 110.0, 34.0, 115.0, 32.0] },
          { value: 1020, coords: [95.0, 35.0, 100.0, 33.0, 105.0, 31.0, 110.0, 29.0, 115.0, 27.0] },
        ],
        unit: 'hPa'
      }

    default:
      return { updateTime: time, data: [], unit: '' }
  }
}

// 2. 获取气象统计数据（最大值/最小值/平均值）
export const getWeatherStatistics = async (params) => {
  await new Promise(resolve => setTimeout(resolve, 600))

  const { element = 'temperature', timeRange = '24h' } = params
  const now = new Date()
  const startTime = new Date(now - (timeRange === '24h' ? 24 * 60 * 60 * 1000 : timeRange === '7d' ? 7 * 24 * 60 * 60 * 1000 : 30 * 24 * 60 * 60 * 1000))

  // 模拟统计数据
  const statMap = {
    temperature: {
      max: 28.5,
      min: 12.3,
      average: 18.7,
      trend: 'up', // 趋势：up/down/stable
      startTime: startTime.toISOString(),
      endTime: now.toISOString(),
      unit: '℃'
    },
    precipitation: {
      max: 15.2,
      min: 0,
      average: 5.8,
      trend: 'stable',
      startTime: startTime.toISOString(),
      endTime: now.toISOString(),
      unit: 'mm'
    },
    wind: {
      max: 12.3,
      min: 2.1,
      average: 6.8,
      trend: 'down',
      startTime: startTime.toISOString(),
      endTime: now.toISOString(),
      unit: 'm/s'
    },
    pressure: {
      max: 1025.3,
      min: 1008.7,
      average: 1016.5,
      trend: 'stable',
      startTime: startTime.toISOString(),
      endTime: now.toISOString(),
      unit: 'hPa'
    }
  }

  return statMap[element] || { max: 0, min: 0, average: 0, trend: 'stable', unit: '' }
}

// 3. 获取气象趋势数据（用于图表展示）
export const getWeatherTrend = async (params) => {
  await new Promise(resolve => setTimeout(resolve, 700))

  const { element = 'temperature', timeRange = '24h' } = params
  const dataPoints = []
  const now = new Date()

  // 生成时间序列数据（24小时→每小时1个点；7天→每天2个点；30天→每天1个点）
  const pointCount = timeRange === '24h' ? 24 : timeRange === '7d' ? 14 : 30
  const interval = timeRange === '24h' ? 60 * 60 * 1000 : timeRange === '7d' ? 12 * 60 * 60 * 1000 : 24 * 60 * 60 * 1000

  // 模拟趋势数据（带随机波动）
  let baseValue = element === 'temperature' ? 18 : element === 'precipitation' ? 5 : element === 'wind' ? 7 : 1015
  for (let i = pointCount - 1; i >= 0; i--) {
    const time = new Date(now - i * interval)
    const random = (Math.random() - 0.5) * (element === 'temperature' ? 5 : element === 'precipitation' ? 3 : element === 'wind' ? 4 : 5)
    const value = Math.max(0, baseValue + random) // 确保非负
    dataPoints.push({
      time: time.toISOString(),
      value: parseFloat(value.toFixed(1)),
      unit: element === 'temperature' ? '℃' : element === 'precipitation' ? 'mm' : element === 'wind' ? 'm/s' : 'hPa'
    })
  }

  // 模拟趋势线（简单线性回归）
  const trendLine = dataPoints.map((point, index) => {
    const trend = element === 'temperature' ? 0.1 * index : element === 'precipitation' ? -0.05 * index : element === 'wind' ? -0.1 * index : 0.02 * index
    return {
      time: point.time,
      value: parseFloat((baseValue + trend).toFixed(1))
    }
  })

  return {
    dataPoints,
    trendLine,
    unit: element === 'temperature' ? '℃' : element === 'precipitation' ? 'mm' : element === 'wind' ? 'm/s' : 'hPa'
  }
}

// 4. 获取气象预警数据
export const getWeatherAlerts = async (params) => {
  await new Promise(resolve => setTimeout(resolve, 500))

  const { time = new Date().toISOString() } = params
  const alertTime = new Date(time)

  // 模拟预警数据
  return [
    {
      id: 'alert-1001',
      level: 'yellow', // 预警等级：blue/yellow/orange/red
      type: 'rainstorm', // 预警类型：rainstorm/wind/snow/high-temperature
      title: '暴雨黄色预警',
      content: '未来12小时，长江中下游地区将出现50-80mm降雨，局部超过100mm，请防范城市内涝和地质灾害。',
      area: '长江中下游地区',
      publishTime: new Date(alertTime - 3 * 60 * 60 * 1000).toISOString(),
      expireTime: new Date(alertTime + 9 * 60 * 60 * 1000).toISOString(),
      source: '国家气象中心'
    },
    {
      id: 'alert-1002',
      level: 'orange',
      type: 'wind',
      title: '大风橙色预警',
      content: '未来6小时，东海海域将出现10-12级大风，阵风13级，请相关海域船只回港避风，暂停海上作业。',
      area: '东海海域',
      publishTime: new Date(alertTime - 2 * 60 * 60 * 1000).toISOString(),
      expireTime: new Date(alertTime + 4 * 60 * 60 * 1000).toISOString(),
      source: '国家海洋预报中心'
    }
  ]
}

// 5. 获取气象详细数据表数据
export const getWeatherDetails = async (params) => {
  await new Promise(resolve => setTimeout(resolve, 600))

  const { element = 'temperature', time = new Date().toISOString() } = params
  const cityList = [
    '北京', '上海', '广州', '深圳', '成都', '重庆', '武汉', '西安', '杭州', '南京',
    '郑州', '长沙', '沈阳', '青岛', '厦门', '昆明', '贵阳', '兰州', '乌鲁木齐', '哈尔滨'
  ]

  // 模拟城市详细数据
  return cityList.map(city => {
    const random = (Math.random() - 0.5) * (element === 'temperature' ? 10 : element === 'precipitation' ? 8 : element === 'wind' ? 5 : 10)
    let value = 0

    // 根据气象要素设置基础值
    switch (element) {
      case 'temperature':
        value = city.includes('哈尔滨') || city.includes('沈阳') ? 15 + random : 
                city.includes('广州') || city.includes('深圳') ? 25 + random : 20 + random
        break
      case 'precipitation':
        value = city.includes('成都') || city.includes('重庆') ? 8 + random : 
                city.includes('北京') || city.includes('西安') ? 2 + random : 5 + random
        break
      case 'wind':
        value = city.includes('青岛') || city.includes('厦门') ? 8 + random : 
                city.includes('成都') || city.includes('贵阳') ? 4 + random : 6 + random
        break
      case 'pressure':
        value = 1015 + random
        break
    }

    return {
      city,
      value: parseFloat(value.toFixed(1)),
      unit: element === 'temperature' ? '℃' : element === 'precipitation' ? 'mm' : element === 'wind' ? 'm/s' : 'hPa',
      updateTime: time,
      status: value > (element === 'temperature' ? 28 : element === 'precipitation' ? 10 : element === 'wind' ? 10 : 1025) ? 'abnormal' : 'normal'
    }
  })
}