/**
 * ISIM数据解析工具
 * 处理ISIM WebSocket数据和格式转换
 */

/**
 * 验证ISIM数据格式
 * @param {Object} data - 待验证的数据
 * @returns {boolean} 是否有效
 */
export function validateIsimData(data) {
  if (!data || typeof data !== 'object') {
    console.warn('[ISIM Parser] 数据为空或不是对象')
    return false
  }
  
  // 检查必需字段（至少需要有header或aircraftLon）
  const hasHeader = data.header && typeof data.header === 'string'
  const hasPosition = data.aircraftLon !== undefined && data.aircraftLat !== undefined
  
  if (!hasHeader && !hasPosition) {
    console.warn('[ISIM Parser] 数据缺少必需字段')
    return false
  }
  
  // 验证数值类型
  const numericFields = [
    'aircraftRoll', 'aircraftPitch', 'aircraftHeading',
    'aircraftLon', 'aircraftLat', 'aircraftAlt',
    'eyeLon', 'eyeLat', 'eyeAlt',
    'observeLon', 'observeLat', 'observeAlt',
    'observePitch', 'observeHeading',
    'trailHide', 'airwayHide', 'ownshipLight'
  ]
  
  for (const field of numericFields) {
    if (data[field] !== undefined && typeof data[field] !== 'number') {
      console.warn(`[ISIM Parser] 字段 ${field} 不是数字类型:`, data[field])
      return false
    }
  }
  
  return true
}

/**
 * 解析ISIM数据
 * @param {Object|string} rawData - 原始数据
 * @returns {Object|null} 解析后的标准格式数据
 */
export function parseIsimData(rawData) {
  try {
    let data
    
    // 处理不同输入格式
    if (typeof rawData === 'string') {
      try {
        data = JSON.parse(rawData)
      } catch (e) {
        // 尝试解析为分号分隔的字符串
        data = parseStringFormat(rawData)
      }
    } else if (typeof rawData === 'object') {
      data = rawData
    } else {
      console.error('[ISIM Parser] 不支持的数据类型:', typeof rawData)
      return null
    }
    
    // 验证数据
    if (!validateIsimData(data)) {
      return null
    }
    
    // 标准化数据格式
    const normalizedData = normalizeIsimData(data)
    
    // 添加时间戳
    if (!normalizedData.timestamp) {
      normalizedData.timestamp = new Date().toISOString()
    }
    
    // 添加数据来源
    if (!normalizedData.source) {
      normalizedData.source = 'ISIM'
    }
    
    return normalizedData
  } catch (error) {
    console.error('[ISIM Parser] 解析ISIM数据失败:', error)
    return null
  }
}

/**
 * 解析字符串格式的ISIM数据
 * 格式: header;roll;pitch;heading;lon;lat;alt;eyeLon;eyeLat;eyeAlt;...
 * @param {string} str - 分号分隔的字符串
 * @returns {Object} 解析后的对象
 */
function parseStringFormat(str) {
  if (!str || typeof str !== 'string') {
    return null
  }
  
  const parts = str.split(';')
  if (parts.length < 7) { // 至少需要header+6个核心字段
    console.warn('[ISIM Parser] 字符串格式字段不足:', parts.length)
    return null
  }
  
  try {
    const data = {
      header: parts[0],
      aircraftRoll: parseFloat(parts[1]) || 0,
      aircraftPitch: parseFloat(parts[2]) || 0,
      aircraftHeading: parseFloat(parts[3]) || 0,
      aircraftLon: parseFloat(parts[4]) || 0,
      aircraftLat: parseFloat(parts[5]) || 0,
      aircraftAlt: parseFloat(parts[6]) || 0
    }
    
    // 可选字段
    if (parts.length > 7) data.eyeLon = parseFloat(parts[7]) || 0
    if (parts.length > 8) data.eyeLat = parseFloat(parts[8]) || 0
    if (parts.length > 9) data.eyeAlt = parseFloat(parts[9]) || 0
    if (parts.length > 10) data.observeLon = parseFloat(parts[10]) || 0
    if (parts.length > 11) data.observeLat = parseFloat(parts[11]) || 0
    if (parts.length > 12) data.observeAlt = parseFloat(parts[12]) || 0
    if (parts.length > 13) data.observePitch = parseFloat(parts[13]) || 0
    if (parts.length > 14) data.observeHeading = parseFloat(parts[14]) || 0
    if (parts.length > 15) data.trailHide = parseInt(parts[15]) || 0
    if (parts.length > 16) data.airwayHide = parseInt(parts[16]) || 0
    if (parts.length > 17) data.ownshipLight = parseInt(parts[17]) || 0
    
    return data
  } catch (error) {
    console.error('[ISIM Parser] 解析字符串格式失败:', error)
    return null
  }
}

/**
 * 标准化ISIM数据格式
 * @param {Object} data - 原始数据
 * @returns {Object} 标准化后的数据
 */
function normalizeIsimData(data) {
  const normalized = { ...data }
  
  // 确保核心字段存在
  const defaults = {
    header: data.header || 'UE5_SIM_DATA',
    aircraftRoll: data.aircraftRoll || 0,
    aircraftPitch: data.aircraftPitch || 0,
    aircraftHeading: data.aircraftHeading || 0,
    aircraftLon: data.aircraftLon || 120.3844, // 默认青岛
    aircraftLat: data.aircraftLat || 36.1052,
    aircraftAlt: data.aircraftAlt || 100,
    eyeLon: data.eyeLon || (data.aircraftLon || 120.3844) + 0.0001,
    eyeLat: data.eyeLat || (data.aircraftLat || 36.1052) + 0.0001,
    eyeAlt: data.eyeAlt || (data.aircraftAlt || 100) + 1,
    observeLon: data.observeLon || (data.aircraftLon || 120.3844) + 0.0006,
    observeLat: data.observeLat || (data.aircraftLat || 36.1052) + 0.0008,
    observeAlt: data.observeAlt || (data.aircraftAlt || 100) + 50,
    observePitch: data.observePitch || 10,
    observeHeading: data.observeHeading || 90,
    trailHide: data.trailHide || 0,
    airwayHide: data.airwayHide || 0,
    ownshipLight: data.ownshipLight || 1
  }
  
  // 应用默认值
  Object.keys(defaults).forEach(key => {
    if (normalized[key] === undefined) {
      normalized[key] = defaults[key]
    }
  })
  
  // 确保数值类型
  Object.keys(normalized).forEach(key => {
    if (typeof defaults[key] === 'number' && typeof normalized[key] !== 'number') {
      normalized[key] = parseFloat(normalized[key]) || defaults[key]
    }
  })
  
  return normalized
}

/**
 * 计算飞机速度（基于连续两个数据点）
 * @param {Object} prevData - 上一个数据点
 * @param {Object} currData - 当前数据点
 * @param {number} timeDiff - 时间差（秒）
 * @returns {Object} 速度信息
 */
export function calculateAircraftSpeed(prevData, currData, timeDiff = 1) {
  if (!prevData || !currData || timeDiff <= 0) {
    return { groundSpeed: 0, verticalSpeed: 0, totalSpeed: 0 }
  }
  
  try {
    // 计算地面距离（简化球面距离）
    const earthRadius = 6371000 // 地球半径（米）
    
    const lat1 = prevData.aircraftLat * Math.PI / 180
    const lat2 = currData.aircraftLat * Math.PI / 180
    const dlat = (currData.aircraftLat - prevData.aircraftLat) * Math.PI / 180
    const dlon = (currData.aircraftLon - prevData.aircraftLon) * Math.PI / 180
    
    const a = Math.sin(dlat/2) * Math.sin(dlat/2) +
              Math.cos(lat1) * Math.cos(lat2) *
              Math.sin(dlon/2) * Math.sin(dlon/2)
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a))
    const groundDistance = earthRadius * c // 米
    
    // 计算垂直距离
    const verticalDistance = currData.aircraftAlt - prevData.aircraftAlt // 米
    
    // 计算速度（米/秒）
    const groundSpeed = groundDistance / timeDiff
    const verticalSpeed = verticalDistance / timeDiff
    const totalSpeed = Math.sqrt(groundSpeed * groundSpeed + verticalSpeed * verticalSpeed)
    
    return {
      groundSpeed: parseFloat(groundSpeed.toFixed(2)),
      verticalSpeed: parseFloat(verticalSpeed.toFixed(2)),
      totalSpeed: parseFloat(totalSpeed.toFixed(2)),
      distance: parseFloat(groundDistance.toFixed(2))
    }
  } catch (error) {
    console.error('[ISIM Parser] 计算速度失败:', error)
    return { groundSpeed: 0, verticalSpeed: 0, totalSpeed: 0, distance: 0 }
  }
}

/**
 * 转换角度到弧度
 * @param {number} degrees - 角度
 * @returns {number} 弧度
 */
export function degreesToRadians(degrees) {
  return degrees * Math.PI / 180
}

/**
 * 转换弧度到角度
 * @param {number} radians - 弧度
 * @returns {number} 角度
 */
export function radiansToDegrees(radians) {
  return radians * 180 / Math.PI
}

/**
 * 计算飞机之间的相对位置
 * @param {Object} aircraft1 - 飞机1数据
 * @param {Object} aircraft2 - 飞机2数据
 * @returns {Object} 相对位置信息
 */
export function calculateRelativePosition(aircraft1, aircraft2) {
  if (!aircraft1 || !aircraft2) {
    return null
  }
  
  try {
    const earthRadius = 6371000 // 地球半径（米）
    
    // 转换为弧度
    const lat1 = aircraft1.aircraftLat * Math.PI / 180
    const lon1 = aircraft1.aircraftLon * Math.PI / 180
    const lat2 = aircraft2.aircraftLat * Math.PI / 180
    const lon2 = aircraft2.aircraftLon * Math.PI / 180
    
    // 计算距离
    const dlat = lat2 - lat1
    const dlon = lon2 - lon1
    
    const a = Math.sin(dlat/2) * Math.sin(dlat/2) +
              Math.cos(lat1) * Math.cos(lat2) *
              Math.sin(dlon/2) * Math.sin(dlon/2)
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a))
    const distance = earthRadius * c
    
    // 计算方位角
    const y = Math.sin(dlon) * Math.cos(lat2)
    const x = Math.cos(lat1) * Math.sin(lat2) -
              Math.sin(lat1) * Math.cos(lat2) * Math.cos(dlon)
    const bearing = (Math.atan2(y, x) * 180 / Math.PI + 360) % 360
    
    // 高度差
    const altitudeDiff = aircraft2.aircraftAlt - aircraft1.aircraftAlt
    
    return {
      distance: parseFloat(distance.toFixed(2)),
      bearing: parseFloat(bearing.toFixed(2)),
      altitudeDiff: parseFloat(altitudeDiff.toFixed(2)),
      horizontalDistance: parseFloat(distance.toFixed(2)),
      relativeAltitude: parseFloat(altitudeDiff.toFixed(2))
    }
  } catch (error) {
    console.error('[ISIM Parser] 计算相对位置失败:', error)
    return null
  }
}

/**
 * 生成测试数据
 * @param {Object} overrides - 覆盖默认值
 * @returns {Object} 测试数据
 */
export function generateTestData(overrides = {}) {
  const baseData = {
    header: 'UE5_SIM_DATA_TEST',
    aircraftRoll: Math.random() * 20 - 10, // -10到10度
    aircraftPitch: Math.random() * 10 - 5, // -5到5度
    aircraftHeading: Math.random() * 360, // 0-360度
    aircraftLon: 120.3844 + (Math.random() * 0.01 - 0.005), // 青岛附近
    aircraftLat: 36.1052 + (Math.random() * 0.01 - 0.005),
    aircraftAlt: 100 + Math.random() * 100, // 100-200米
    eyeLon: 120.3845 + (Math.random() * 0.01 - 0.005),
    eyeLat: 36.1053 + (Math.random() * 0.01 - 0.005),
    eyeAlt: 101 + Math.random() * 100,
    observeLon: 120.3850 + (Math.random() * 0.01 - 0.005),
    observeLat: 36.1060 + (Math.random() * 0.01 - 0.005),
    observeAlt: 150 + Math.random() * 100,
    observePitch: 10 + Math.random() * 10,
    observeHeading: 90 + Math.random() * 30,
    trailHide: 0,
    airwayHide: 0,
    ownshipLight: 1,
    timestamp: new Date().toISOString(),
    source: 'TEST'
  }
  
  return { ...baseData, ...overrides }
}

/**
 * 格式化数据为显示字符串
 * @param {Object} data - ISIM数据
 * @returns {string} 格式化字符串
 */
export function formatIsimData(data) {
  if (!data) return '无数据'
  
  const lines = []
  
  if (data.header) lines.push(`标识: ${data.header}`)
  if (data.source) lines.push(`来源: ${data.source}`)
  if (data.timestamp) lines.push(`时间: ${new Date(data.timestamp).toLocaleString()}`)
  
  lines.push('')
  lines.push('飞机姿态:')
  lines.push(`  滚转: ${(data.aircraftRoll || 0).toFixed(2)}°`)
  lines.push(`  俯仰: ${(data.aircraftPitch || 0).toFixed(2)}°`)
  lines.push(`  航向: ${(data.aircraftHeading || 0).toFixed(2)}°`)
  
  lines.push('')
  lines.push('飞机位置:')
  lines.push(`  经度: ${(data.aircraftLon || 0).toFixed(6)}`)
  lines.push(`  纬度: ${(data.aircraftLat || 0).toFixed(6)}`)
  lines.push(`  高度: ${(data.aircraftAlt || 0).toFixed(2)}m`)
  
  return lines.join('\n')
}

export default {
  validateIsimData,
  parseIsimData,
  calculateAircraftSpeed,
  degreesToRadians,
  radiansToDegrees,
  calculateRelativePosition,
  generateTestData,
  formatIsimData
}