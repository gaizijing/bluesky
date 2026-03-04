import { defineStore } from 'pinia'
import { ref, computed } from 'vue'

/**
 * ISIM状态管理Store
 */
export const useIsimStore = defineStore('isim', () => {
  // ========== 状态定义 ==========
  
  // ISIM数据状态
  const simData = ref(null)
  const lastReceivedTime = ref(null)
  
  // 连接状态
  const connectionStatus = ref('disconnected') // disconnected, connecting, connected, error
  const connectionError = ref(null)
  
  // 动画状态
  const animationStatus = ref('stopped') // stopped, starting, flying, landing
  
  // 飞行轨迹
  const flightPath = ref([])
  const recordFlightPath = ref(true)
  const maxFlightPathPoints = 1000
  
  // 气象影响
  const weatherImpact = ref(null)
  
  // 命令状态
  const commandStatus = ref({})
  
  // 调试模式
  const debugMode = ref(true)
  
  // ========== 计算属性 ==========
  
  const isConnected = computed(() => connectionStatus.value === 'connected')
  const isConnecting = computed(() => connectionStatus.value === 'connecting')
  const isDisconnected = computed(() => connectionStatus.value === 'disconnected')
  
  const isAnimating = computed(() => animationStatus.value !== 'stopped')
  const isFlying = computed(() => animationStatus.value === 'flying')
  const isLanding = computed(() => animationStatus.value === 'landing')
  
  const flightPathLength = computed(() => flightPath.value.length)
  
  const lastUpdateAgo = computed(() => {
    if (!lastReceivedTime.value) return null
    return Date.now() - lastReceivedTime.value
  })
  
  const isDataStale = computed(() => {
    if (!lastReceivedTime.value) return true
    return Date.now() - lastReceivedTime.value > 5000 // 5秒无数据认为过期
  })
  
  const aircraftPosition = computed(() => {
    if (!simData.value) return null
    return {
      lon: simData.value.aircraftLon,
      lat: simData.value.aircraftLat,
      alt: simData.value.aircraftAlt
    }
  })
  
  const aircraftAttitude = computed(() => {
    if (!simData.value) return null
    return {
      roll: simData.value.aircraftRoll,
      pitch: simData.value.aircraftPitch,
      heading: simData.value.aircraftHeading
    }
  })
  
  // ========== 动作方法 ==========
  
  /**
   * 更新ISIM数据
   */
  const updateSimData = (data) => {
    simData.value = {
      // 保留原有数据
      ...simData.value,
      // 更新新数据
      ...data,
      // 确保时间戳
      timestamp: data.timestamp || new Date().toISOString(),
      // 确保数据来源
      source: data.source || 'ISIM'
    }
    
    lastReceivedTime.value = Date.now()
    
    // 触发数据更新事件
    window.dispatchEvent(new CustomEvent('isim-data-updated', { detail: data }))
  }
  
  /**
   * 更新连接状态
   */
  const updateConnectionStatus = (status, error = null) => {
    connectionStatus.value = status
    connectionError.value = error
    
    // 记录状态变更
    if (debugMode.value) {
      console.log(`[ISIM Store] 连接状态变更: ${status}`, error)
    }
    
    // 触发连接状态事件
    window.dispatchEvent(new CustomEvent('isim-connection-changed', { 
      detail: { status, error }
    }))
  }
  
  /**
   * 更新动画状态
   */
  const updateAnimationStatus = (status) => {
    const oldStatus = animationStatus.value
    animationStatus.value = status
    
    // 记录状态变更
    if (debugMode.value) {
      console.log(`[ISIM Store] 动画状态变更: ${oldStatus} -> ${status}`)
    }
    
    // 触发动画状态事件
    window.dispatchEvent(new CustomEvent('isim-animation-changed', { 
      detail: { oldStatus, newStatus: status }
    }))
  }
  
  /**
   * 添加飞行轨迹点
   */
  const addFlightPathPoint = (point) => {
    if (!recordFlightPath.value) return
    
    // 确保点数据完整
    const fullPoint = {
      lon: point.lon,
      lat: point.lat,
      alt: point.alt,
      roll: point.roll || 0,
      pitch: point.pitch || 0,
      heading: point.heading || 0,
      timestamp: point.timestamp || new Date().toISOString(),
      speed: point.speed || 0,
      verticalSpeed: point.verticalSpeed || 0
    }
    
    flightPath.value.push(fullPoint)
    
    // 限制轨迹点数量
    if (flightPath.value.length > maxFlightPathPoints) {
      flightPath.value = flightPath.value.slice(-maxFlightPathPoints)
    }
    
    // 触发轨迹更新事件
    window.dispatchEvent(new CustomEvent('isim-flight-path-updated', { 
      detail: { point: fullPoint, totalPoints: flightPath.value.length }
    }))
  }
  
  /**
   * 更新气象影响数据
   */
  const updateWeatherImpact = (data) => {
    weatherImpact.value = {
      ...data,
      timestamp: data.timestamp || new Date().toISOString()
    }
    
    // 触发气象影响更新事件
    window.dispatchEvent(new CustomEvent('isim-weather-impact-updated', { 
      detail: weatherImpact.value
    }))
  }
  
  /**
   * 更新命令状态
   */
  const updateCommandStatus = (command, status, message = '') => {
    commandStatus.value[command] = {
      status,
      message,
      timestamp: new Date().toISOString(),
      lastUpdate: Date.now()
    }
    
    // 触发命令状态事件
    window.dispatchEvent(new CustomEvent('isim-command-status-updated', { 
      detail: { command, status, message }
    }))
  }
  
  /**
   * 重置飞机位置
   */
  const resetPosition = () => {
    // 重置到默认位置（青岛中心）
    simData.value = {
      header: 'UE5_SIM_DATA',
      aircraftRoll: 0,
      aircraftPitch: 0,
      aircraftHeading: 0,
      aircraftLon: 120.3844,
      aircraftLat: 36.1052,
      aircraftAlt: 100,
      eyeLon: 120.3845,
      eyeLat: 36.1053,
      eyeAlt: 101,
      trailHide: 0,
      airwayHide: 0,
      observeLon: 120.3850,
      observeLat: 36.1060,
      observeAlt: 150,
      observePitch: 10,
      observeHeading: 90,
      ownshipLight: 1,
      timestamp: new Date().toISOString(),
      source: 'RESET'
    }
    
    // 清空飞行轨迹
    flightPath.value = []
    
    // 更新动画状态
    updateAnimationStatus('stopped')
    
    // 触发重置事件
    window.dispatchEvent(new CustomEvent('isim-position-reset'))
  }
  
  /**
   * 清空飞行轨迹
   */
  const clearFlightPath = () => {
    flightPath.value = []
    
    // 触发清空事件
    window.dispatchEvent(new CustomEvent('isim-flight-path-cleared'))
  }
  
  /**
   * 切换调试模式
   */
  const toggleDebugMode = () => {
    debugMode.value = !debugMode.value
    console.log(`[ISIM Store] 调试模式: ${debugMode.value ? '开启' : '关闭'}`)
  }
  
  /**
   * 导出飞行数据
   */
  const exportFlightData = () => {
    if (flightPath.value.length === 0) {
      return null
    }
    
    const exportData = {
      metadata: {
        exportTime: new Date().toISOString(),
        totalPoints: flightPath.value.length,
        duration: flightPath.value.length, // 假设每秒一个点
        startTime: flightPath.value[0]?.timestamp,
        endTime: flightPath.value[flightPath.value.length - 1]?.timestamp,
        connectionStatus: connectionStatus.value,
        animationStatus: animationStatus.value
      },
      flightPath: flightPath.value,
      aircraftInfo: simData.value ? {
        finalPosition: {
          lon: simData.value.aircraftLon,
          lat: simData.value.aircraftLat,
          alt: simData.value.aircraftAlt
        },
        finalAttitude: {
          roll: simData.value.aircraftRoll,
          pitch: simData.value.aircraftPitch,
          heading: simData.value.aircraftHeading
        },
        finalData: simData.value
      } : null,
      weatherImpact: weatherImpact.value,
      commandStatus: commandStatus.value
    }
    
    return exportData
  }
  
  /**
   * 导入飞行数据
   */
  const importFlightData = (data) => {
    if (!data || !data.flightPath) {
      console.error('[ISIM Store] 导入数据无效')
      return false
    }
    
    try {
      // 清空现有数据
      flightPath.value = []
      commandStatus.value = {}
      
      // 导入飞行轨迹
      if (Array.isArray(data.flightPath)) {
        flightPath.value = data.flightPath.slice(0, maxFlightPathPoints)
      }
      
      // 导入飞机信息
      if (data.aircraftInfo?.finalData) {
        simData.value = {
          ...data.aircraftInfo.finalData,
          timestamp: new Date().toISOString(),
          source: 'IMPORT'
        }
      }
      
      // 导入气象影响
      if (data.weatherImpact) {
        weatherImpact.value = data.weatherImpact
      }
      
      // 导入命令状态
      if (data.commandStatus) {
        commandStatus.value = data.commandStatus
      }
      
      // 更新接收时间
      lastReceivedTime.value = Date.now()
      
      // 触发导入事件
      window.dispatchEvent(new CustomEvent('isim-flight-data-imported', { 
        detail: data 
      }))
      
      return true
    } catch (error) {
      console.error('[ISIM Store] 导入飞行数据失败:', error)
      return false
    }
  }
  
  /**
   * 获取命令状态
   */
  const getCommandStatus = (command) => {
    return commandStatus.value[command] || null
  }
  
  /**
   * 清除命令状态
   */
  const clearCommandStatus = (command = null) => {
    if (command) {
      delete commandStatus.value[command]
    } else {
      commandStatus.value = {}
    }
    
    // 触发清除事件
    window.dispatchEvent(new CustomEvent('isim-command-status-cleared', { 
      detail: { command }
    }))
  }
  
  /**
   * 获取飞行统计
   */
  const getFlightStatistics = () => {
    if (flightPath.value.length === 0) {
      return null
    }
    
    const points = flightPath.value
    let totalDistance = 0
    let maxAltitude = -Infinity
    let minAltitude = Infinity
    let maxSpeed = 0
    let avgSpeed = 0
    
    // 计算统计数据
    for (let i = 1; i < points.length; i++) {
      const prev = points[i - 1]
      const curr = points[i]
      
      // 计算两点间距离（简化球面距离）
      const dlat = (curr.lat - prev.lat) * 111319.9 // 纬度距离
      const dlon = (curr.lon - prev.lon) * 111319.9 * Math.cos(prev.lat * Math.PI / 180)
      const dalt = curr.alt - prev.alt
      const distance = Math.sqrt(dlat * dlat + dlon * dlon + dalt * dalt)
      totalDistance += distance
      
      // 更新高度范围
      maxAltitude = Math.max(maxAltitude, curr.alt)
      minAltitude = Math.min(minAltitude, curr.alt)
      
      // 更新速度
      if (curr.speed) {
        maxSpeed = Math.max(maxSpeed, curr.speed)
        avgSpeed += curr.speed
      }
    }
    
    avgSpeed = points.length > 0 ? avgSpeed / points.length : 0
    
    return {
      totalPoints: points.length,
      totalDistance: totalDistance.toFixed(2),
      maxAltitude: maxAltitude.toFixed(2),
      minAltitude: minAltitude.toFixed(2),
      maxSpeed: maxSpeed.toFixed(2),
      avgSpeed: avgSpeed.toFixed(2),
      duration: points.length, // 假设每秒一个点
      startTime: points[0]?.timestamp,
      endTime: points[points.length - 1]?.timestamp
    }
  }
  
  /**
   * 设置默认飞机位置
   */
  const setDefaultPosition = (position) => {
    if (!simData.value) {
      resetPosition()
      return
    }
    
    // 更新位置，保持其他姿态不变
    simData.value = {
      ...simData.value,
      aircraftLon: position.lon || simData.value.aircraftLon,
      aircraftLat: position.lat || simData.value.aircraftLat,
      aircraftAlt: position.alt || simData.value.aircraftAlt,
      timestamp: new Date().toISOString(),
      source: 'MANUAL_SET'
    }
    
    // 触发位置更新事件
    window.dispatchEvent(new CustomEvent('isim-position-set', { 
      detail: position 
    }))
  }
  
  /**
   * 开始起飞动画
   */
  const startTakeoffAnimation = () => {
    updateAnimationStatus('starting')
    
    // 模拟起飞数据（在实际应用中，这会由ISIM发送）
    const takeoffData = {
      header: 'UE5_SIM_DATA_TAKEOFF',
      aircraftAlt: 100,
      verticalSpeed: 5,
      timestamp: new Date().toISOString(),
      source: 'ANIMATION'
    }
    
    updateSimData(takeoffData)
    updateCommandStatus('TAKEOFF', 'executing', '起飞指令执行中')
    
    // 模拟起飞过程
    setTimeout(() => {
      updateAnimationStatus('flying')
      updateCommandStatus('TAKEOFF', 'completed', '起飞完成')
    }, 2000)
  }
  
  /**
   * 开始降落动画
   */
  const startLandingAnimation = () => {
    updateAnimationStatus('landing')
    updateCommandStatus('LAND', 'executing', '降落指令执行中')
    
    // 模拟降落数据
    const landingData = {
      header: 'UE5_SIM_DATA_LANDING',
      verticalSpeed: -3,
      timestamp: new Date().toISOString(),
      source: 'ANIMATION'
    }
    
    updateSimData(landingData)
    
    // 模拟降落过程
    setTimeout(() => {
      updateAnimationStatus('stopped')
      updateCommandStatus('LAND', 'completed', '降落完成')
      
      // 重置到地面
      if (simData.value) {
        simData.value.aircraftAlt = 100
        simData.value.verticalSpeed = 0
      }
    }, 3000)
  }
  
  // ========== 返回所有状态和方法 ==========
  
  return {
    // 状态
    simData,
    lastReceivedTime,
    connectionStatus,
    connectionError,
    animationStatus,
    flightPath,
    recordFlightPath,
    weatherImpact,
    commandStatus,
    debugMode,
    
    // 计算属性
    isConnected,
    isConnecting,
    isDisconnected,
    isAnimating,
    isFlying,
    isLanding,
    flightPathLength,
    lastUpdateAgo,
    isDataStale,
    aircraftPosition,
    aircraftAttitude,
    
    // 动作方法
    updateSimData,
    updateConnectionStatus,
    updateAnimationStatus,
    addFlightPathPoint,
    updateWeatherImpact,
    updateCommandStatus,
    resetPosition,
    clearFlightPath,
    toggleDebugMode,
    exportFlightData,
    importFlightData,
    getCommandStatus,
    clearCommandStatus,
    getFlightStatistics,
    setDefaultPosition,
    startTakeoffAnimation,
    startLandingAnimation
  }
})