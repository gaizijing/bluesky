import { ref, onUnmounted } from 'vue'
import { useIsimStore } from './isimStore'

/**
 * ISIM WebSocket Hook
 * 管理ISIM WebSocket连接和数据接收
 */
export function useIsimWebSocket() {
  const isimStore = useIsimStore()
  
  // WebSocket状态
  const ws = ref(null)
  const isConnected = ref(false)
  const isConnecting = ref(false)
  const reconnectAttempts = ref(0)
  const maxReconnectAttempts = 5
  const reconnectTimeout = ref(null)
  const isUserDisconnect = ref(false)
  
  // WebSocket URL配置
  // 注意：这里需要根据实际后端地址配置
  // 开发环境使用localhost，生产环境使用实际域名
  const getWebSocketUrl = () => {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:'
    const host = window.location.hostname
    const port = window.location.port ? `:${window.location.port}` : ''
    
    // 如果配置了环境变量，使用环境变量
    if (import.meta.env.VITE_ISIM_WS_URL) {
      return import.meta.env.VITE_ISIM_WS_URL
    }
    
    // 默认配置：假设后端运行在8080端口
    // 注意：这里可能需要根据实际部署调整
    return `${protocol}//${host}${port ? port : ':8080'}/api/ws/isim-data`
  }
  
  const wsUrl = getWebSocketUrl()
  
  /**
   * 连接WebSocket
   */
  const connect = () => {
    if (isConnecting.value || isConnected.value) {
      console.log('[ISIM] WebSocket已在连接或已连接')
      return Promise.resolve()
    }
    
    return new Promise((resolve, reject) => {
      isConnecting.value = true
      isimStore.updateConnectionStatus('connecting')
      
      try {
        console.log(`[ISIM] 正在连接WebSocket: ${wsUrl}`)
        ws.value = new WebSocket(wsUrl)
        
        ws.value.onopen = () => {
          console.log('[ISIM] WebSocket连接成功')
          isConnected.value = true
          isConnecting.value = false
          reconnectAttempts.value = 0
          isimStore.updateConnectionStatus('connected')
          
          // 发送连接成功消息
          sendMessage({
            type: 'connection',
            status: 'connected',
            timestamp: new Date().toISOString()
          })
          
          resolve()
        }
        
        ws.value.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data)
            handleWebSocketMessage(data)
          } catch (error) {
            console.error('[ISIM] 解析WebSocket消息失败:', error, event.data)
          }
        }
        
        ws.value.onerror = (error) => {
          console.error('[ISIM] WebSocket错误:', error)
          isConnecting.value = false
          isimStore.updateConnectionStatus('error')
          reject(error)
        }
        
        ws.value.onclose = (event) => {
          console.log(`[ISIM] WebSocket连接关闭，代码: ${event.code}, 原因: ${event.reason}`)
          isConnected.value = false
          isConnecting.value = false
          isimStore.updateConnectionStatus('disconnected')
          
          // 清理重连定时器
          if (reconnectTimeout.value) {
            clearTimeout(reconnectTimeout.value)
            reconnectTimeout.value = null
          }
          
          // 自动重连（排除用户主动断开的情况）
          if (!isUserDisconnect.value && reconnectAttempts.value < maxReconnectAttempts) {
            reconnectAttempts.value++
            const delay = Math.min(1000 * Math.pow(2, reconnectAttempts.value), 30000)
            
            console.log(`[ISIM] ${delay}ms后尝试重连 (${reconnectAttempts.value}/${maxReconnectAttempts})`)
            
            reconnectTimeout.value = setTimeout(() => {
              console.log(`[ISIM] 开始重连尝试...`)
              connect().catch(err => {
                console.error('[ISIM] 重连失败:', err)
              })
            }, delay)
          } else if (isUserDisconnect.value) {
            console.log('[ISIM] 用户主动断开连接，停止重连')
            isUserDisconnect.value = false // 重置标志，以便下次连接
          } else {
            console.log('[ISIM] 已达到最大重连次数，停止重连')
          }
        }
      } catch (error) {
        isConnecting.value = false
        isimStore.updateConnectionStatus('error')
        console.error('[ISIM] 创建WebSocket失败:', error)
        reject(error)
      }
    })
  }
  
  /**
   * 断开WebSocket连接
   */
  const disconnect = () => {
    // 设置用户主动断开标志
    isUserDisconnect.value = true
    
    // 清理重连定时器
    if (reconnectTimeout.value) {
      clearTimeout(reconnectTimeout.value)
      reconnectTimeout.value = null
    }
    
    if (ws.value) {
      // 发送停用ISIM数据处理消息
      try {
        sendMessage({
          type: 'connection_control',
          action: 'deactivate',
          timestamp: new Date().toISOString()
        })
        console.log('[ISIM] 已发送停用ISIM数据处理请求')
      } catch (e) {
        console.warn('[ISIM] 发送停用消息失败:', e)
      }
      
      // 发送断开连接消息
      sendMessage({
        type: 'connection',
        status: 'disconnecting',
        timestamp: new Date().toISOString()
      })
      
      // 关闭连接
      ws.value.close(1000, '用户主动断开连接')
      ws.value = null
    }
    
    isConnected.value = false
    isConnecting.value = false
    reconnectAttempts.value = 0
    isimStore.updateConnectionStatus('disconnected')
    
    console.log('[ISIM] WebSocket连接已断开')
  }
  
  /**
   * 处理WebSocket消息
   */
  const handleWebSocketMessage = (data) => {
    // 更新最后接收时间
    isimStore.lastReceivedTime = Date.now()
    
    // 根据消息类型处理
    const messageType = data.type || (data.header === 'UE5_SIM_DATA' ? 'sim_data' : 'unknown')
    
    switch (messageType) {
      case 'sim_data':
        // ISIM姿态数据
        handleSimData(data)
        break
        
      case 'weather_impact':
        // 气象影响数据
        handleWeatherImpact(data)
        break
        
      case 'status':
        // 状态消息
        handleStatusMessage(data)
        break
        
      case 'error':
        // 错误消息
        handleErrorMessage(data)
        break
        
      case 'command_response':
        // 命令响应
        handleCommandResponse(data)
        break
        
      case 'connection_control':
        // 连接控制响应
        console.log('[ISIM] 收到连接控制响应:', data)
        if (data.status === 'success') {
          console.log(`[ISIM] ISIM数据处理已${data.action === 'activate' ? '激活' : '停用'}`)
        }
        break
        
      default:
        // 未知类型，尝试作为ISIM数据解析
        if (data.header === 'UE5_SIM_DATA' || data.aircraftRoll !== undefined) {
          handleSimData(data)
        } else {
          console.log('[ISIM] 收到未知类型消息:', data)
        }
    }
  }
  
  /**
   * 处理ISIM姿态数据
   */
  const handleSimData = (data) => {
    // 更新状态存储
    isimStore.updateSimData(data)
    
    // 记录飞行轨迹
    if (data.aircraftLon && data.aircraftLat && data.aircraftAlt) {
      if (isimStore.recordFlightPath) {
        isimStore.addFlightPathPoint({
          lon: data.aircraftLon,
          lat: data.aircraftLat,
          alt: data.aircraftAlt,
          roll: data.aircraftRoll,
          pitch: data.aircraftPitch,
          heading: data.aircraftHeading,
          timestamp: data.timestamp || new Date().toISOString()
        })
      }
    }
    
    // 触发数据更新事件（供其他组件监听）
    const event = new CustomEvent('isim-data-update', { detail: data })
    window.dispatchEvent(event)
    
    // 调试信息
    if (isimStore.debugMode) {
      console.log('[ISIM] 收到姿态数据:', data)
    }
  }
  
  /**
   * 处理气象影响数据
   */
  const handleWeatherImpact = (data) => {
    isimStore.updateWeatherImpact(data)
    console.log('[ISIM] 收到气象影响数据:', data)
  }
  
  /**
   * 处理状态消息
   */
  const handleStatusMessage = (data) => {
    console.log(`[ISIM] 状态消息: ${data.message}`)
    
    // 可以显示状态通知
    if (data.showNotification && window.showNotification) {
      window.showNotification({
        title: 'ISIM状态',
        message: data.message,
        type: data.level || 'info'
      })
    }
  }
  
  /**
   * 处理错误消息
   */
  const handleErrorMessage = (data) => {
    console.error(`[ISIM] 错误: ${data.message}`)
    
    // 显示错误通知
    if (window.showNotification) {
      window.showNotification({
        title: 'ISIM错误',
        message: data.message,
        type: 'error'
      })
    }
  }
  
  /**
   * 处理命令响应
   */
  const handleCommandResponse = (data) => {
    console.log(`[ISIM] 命令响应: ${data.command} - ${data.status}`)
    
    // 更新命令状态
    isimStore.updateCommandStatus(data.command, data.status, data.message)
  }
  
  /**
   * 发送消息到后端
   */
  const sendMessage = (message) => {
    if (!ws.value || !isConnected.value) {
      console.warn('[ISIM] WebSocket未连接，无法发送消息')
      return false
    }
    
    try {
      // 确保消息是对象
      const msgToSend = typeof message === 'string' ? { message } : message
      
      // 添加时间戳
      if (!msgToSend.timestamp) {
        msgToSend.timestamp = new Date().toISOString()
      }
      
      // 发送消息
      ws.value.send(JSON.stringify(msgToSend))
      
      // 记录发送日志
      if (isimStore.debugMode) {
        console.log('[ISIM] 发送消息:', msgToSend)
      }
      
      return true
    } catch (error) {
      console.error('[ISIM] 发送消息失败:', error)
      return false
    }
  }
  
  /**
   * 发送控制命令
   */
  const sendCommand = (command, params = {}) => {
    return sendMessage({
      type: 'command',
      command,
      ...params
    })
  }
  
  /**
   * 发送气象数据请求
   */
  const requestWeatherData = (pointId = null) => {
    return sendMessage({
      type: 'request_weather',
      pointId,
      timestamp: new Date().toISOString()
    })
  }
  
  /**
   * 发送起飞指令
   */
  const sendTakeoffCommand = () => {
    return sendCommand('TAKEOFF', {
      action: 'start',
      timestamp: new Date().toISOString()
    })
  }
  
  /**
   * 发送降落指令
   */
  const sendLandCommand = () => {
    return sendCommand('LAND', {
      action: 'start',
      timestamp: new Date().toISOString()
    })
  }
  
  /**
   * 发送重置指令
   */
  const sendResetCommand = () => {
    return sendCommand('RESET', {
      action: 'reset',
      timestamp: new Date().toISOString()
    })
  }
  
  /**
   * 发送飞机位置
   */
  const sendAircraftPosition = (position) => {
    return sendMessage({
      type: 'aircraft_position',
      longitude: position.longitude,
      latitude: position.latitude,
      altitude: position.altitude || 0,
      heading: position.heading || 0,
      pitch: position.pitch || 0,
      roll: position.roll || 0,
      timestamp: new Date().toISOString(),
      source: 'CESIUM'
    })
  }
  
  /**
   * 激活ISIM数据处理
   */
  const activateIsim = () => {
    return sendMessage({
      type: 'connection_control',
      action: 'activate',
      timestamp: new Date().toISOString()
    })
  }
  
  /**
   * 停用ISIM数据处理
   */
  const deactivateIsim = () => {
    return sendMessage({
      type: 'connection_control',
      action: 'deactivate',
      timestamp: new Date().toISOString()
    })
  }
  
  /**
   * 组件卸载时清理
   */
  onUnmounted(() => {
    disconnect()
  })
  
  return {
    // 状态
    ws,
    isConnected,
    isConnecting,
    reconnectAttempts,
    
    // 方法
    connect,
    disconnect,
    sendMessage,
    sendCommand,
    activateIsim,
    deactivateIsim,
    
    // 便捷方法
    requestWeatherData,
    sendTakeoffCommand,
    sendLandCommand,
    sendResetCommand,
    sendAircraftPosition
  }
}