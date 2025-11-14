// src/api/monitoringPoints.js
import monitoringPointsData from '@/mock/monitoringPoints.json'


// 获取监测点列表
export const fetchMonitoringPoints = async () => {
  try {
    
    // 在实际项目中，这里会是真实的API调用:
    // const response = await axios.get('/api/monitoring-points')
    // return response.data
    
    // 目前使用mock数据
    // 为mock数据添加一些随机性以模拟真实情况
    const pointsWithRandomStatus = monitoringPointsData.map(point => ({
      ...point,
      // 添加一些随机变化，但保持相对稳定
      lastUpdate: Date.now() - Math.random() * 3600000 * 2, // 0-2小时前
      status: Math.random() > 0.85 ? 
        (Math.random() > 0.6 ? "warning" : "unavailable") : 
        point.status
    }))
    
    return pointsWithRandomStatus
  } catch (error) {
    console.error('获取监测点数据失败:', error)
    throw error
  }
}

// 获取单个监测点详情
export const fetchMonitoringPointDetail = async (pointId) => {
  try {
    await delay(500)
    
    // 在实际项目中:
    // const response = await axios.get(`/api/monitoring-points/${pointId}`)
    // return response.data
    
    // 使用mock数据
    const point = monitoringPointsData.find(p => p.id === pointId)
    if (!point) {
      throw new Error('监测点未找到')
    }
    
    return {
      ...point,
      lastUpdate: Date.now(),
      // 添加更多详细信息
      signalStrength: Math.floor(Math.random() * 5) + 5, // 5-10
      temperature: 20 + Math.floor(Math.random() * 15), // 20-35
      humidity: 30 + Math.floor(Math.random() * 40), // 30-70
      battery: Math.floor(Math.random() * 50) + 50, // 50-100
    }
  } catch (error) {
    console.error(`获取监测点${pointId}详情失败:`, error)
    throw error
  }
}

// 更新监测点状态
export const updateMonitoringPointStatus = async (pointId, status) => {
  try {
    await delay(300)
    
    // 在实际项目中:
    // const response = await axios.put(`/api/monitoring-points/${pointId}/status`, { status })
    // return response.data
    
    // 使用mock数据
    return {
      success: true,
      message: '状态更新成功',
      updatedPoint: {
        id: pointId,
        status
      }
    }
  } catch (error) {
    console.error(`更新监测点${pointId}状态失败:`, error)
    throw error
  }
}