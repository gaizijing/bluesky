import { ref } from 'vue'
import { useIsimStore } from './isimStore'
import { useAppDashboardStore } from '@/store/modules/appDashboard'
import { parseIsimData } from './isimDataParser'

const WS_CONNECT_TIMEOUT_MS = 12000

/** 模块级单例，避免多处调用 hook 时 WS 状态不一致 */
const ws = ref(null)
const isConnected = ref(false)
const isConnecting = ref(false)
const reconnectAttempts = ref(0)
const maxReconnectAttempts = 5
const reconnectTimeout = ref(null)
const isUserDisconnect = ref(false)
let connectPromise = null
let connectTimeoutId = null

function getWebSocketUrl() {
  const envUrl = import.meta.env.VITE_ISIM_WS_URL
  if (envUrl) return envUrl

  const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:'
  const apiBase = import.meta.env.VITE_API_BASE_URL || '/api'
  if (apiBase.startsWith('http://') || apiBase.startsWith('https://')) {
    const wsOrigin = apiBase.replace(/^http/i, protocol === 'wss:' ? 'wss' : 'ws')
    return `${wsOrigin}/ws/isim-data`
  }
  return `${protocol}//${window.location.host}${apiBase}/ws/isim-data`
}

function clearConnectTimeout() {
  if (connectTimeoutId) {
    clearTimeout(connectTimeoutId)
    connectTimeoutId = null
  }
}

function resetConnectPromise() {
  clearConnectTimeout()
  connectPromise = null
}

function markWsConnected(isimStore) {
  isConnected.value = true
  isConnecting.value = false
  isimStore.updateConnectionStatus('connected')
  try {
    useAppDashboardStore().simConnected = true
  } catch {
    /* pinia 未就绪 */
  }
}

function clearConnectingState(isimStore) {
  isConnecting.value = false
  if (!isConnected.value) {
    isimStore.updateConnectionStatus('disconnected')
  }
}
  
/**
 * ISIM WebSocket Hook（单例连接）
 */
export function useIsimWebSocket() {
  const isimStore = useIsimStore()

  /**
   * 连接WebSocket
   */
  const connect = () => {
    if (ws.value?.readyState === WebSocket.OPEN) {
      markWsConnected(isimStore)
      return Promise.resolve()
    }
    if (isConnected.value) {
      return Promise.resolve()
    }
    if (connectPromise) {
      return connectPromise
    }
    if (ws.value?.readyState === WebSocket.CONNECTING) {
      try {
        ws.value.close()
      } catch {
        /* ignore */
      }
      ws.value = null
    }

    const url = getWebSocketUrl()

    connectPromise = new Promise((resolve, reject) => {
      isConnecting.value = true
      isimStore.updateConnectionStatus('connecting')
      isUserDisconnect.value = false

      let settled = false
      const resolveOnce = () => {
        if (settled) return
        settled = true
        resetConnectPromise()
        resolve()
      }
      const rejectOnce = (err) => {
        if (settled) return
        settled = true
        isConnecting.value = false
        resetConnectPromise()
        reject(err instanceof Error ? err : new Error('WebSocket 连接失败'))
      }

      try {
        console.log(`[ISIM] 正在连接WebSocket: ${url}`)

        if (ws.value) {
          ws.value.onopen = null
          ws.value.onclose = null
          ws.value.onerror = null
          ws.value.onmessage = null
          try {
            ws.value.close()
          } catch {
            /* ignore */
          }
          ws.value = null
        }

        ws.value = new WebSocket(url)

        connectTimeoutId = setTimeout(() => {
          rejectOnce(new Error('WebSocket 连接超时'))
          try {
            ws.value?.close()
          } catch {
            /* ignore */
          }
        }, WS_CONNECT_TIMEOUT_MS)

        ws.value.onopen = () => {
          clearConnectTimeout()
          console.log('[ISIM] WebSocket连接成功')
          markWsConnected(isimStore)
          reconnectAttempts.value = 0

          sendMessage({
            type: 'connection',
            status: 'connected',
            timestamp: new Date().toISOString(),
          })

          resolveOnce()
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
          isimStore.updateConnectionStatus('error')
          rejectOnce(new Error('WebSocket 连接失败'))
        }

        ws.value.onclose = (event) => {
          clearConnectTimeout()
          const wasConnected = isConnected.value
          isConnected.value = false
          isConnecting.value = false
          isimStore.updateConnectionStatus('disconnected')

          if (!settled) {
            rejectOnce(new Error(`WebSocket 连接关闭 (${event.code})`))
          }

          if (reconnectTimeout.value) {
            clearTimeout(reconnectTimeout.value)
            reconnectTimeout.value = null
          }

          // 仅曾成功连上后再自动重连，避免初次失败时一直「握手中」
          if (wasConnected && !isUserDisconnect.value && reconnectAttempts.value < maxReconnectAttempts) {
            reconnectAttempts.value++
            const delay = Math.min(1000 * Math.pow(2, reconnectAttempts.value), 30000)
            console.log(`[ISIM] ${delay}ms后尝试重连 (${reconnectAttempts.value}/${maxReconnectAttempts})`)
            reconnectTimeout.value = setTimeout(() => {
              connect().catch((err) => {
                console.error('[ISIM] 重连失败:', err)
              })
            }, delay)
          } else if (isUserDisconnect.value) {
            isUserDisconnect.value = false
          }
        }
      } catch (error) {
        isimStore.updateConnectionStatus('error')
        console.error('[ISIM] 创建WebSocket失败:', error)
        rejectOnce(error)
      }
    })

    return connectPromise
  }
  
  /**
   * 断开WebSocket连接
   */
  const disconnect = () => {
    isUserDisconnect.value = true
    resetConnectPromise()

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
      case 'connected':
        markWsConnected(isimStore)
        break

      case 'ack':
        break

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
    markWsConnected(isimStore)
    const parsed = parseIsimData(data) || data
    // 更新状态存储
    isimStore.updateSimData(parsed)
    
    // 记录飞行轨迹
    const lon = Number(parsed.aircraftLon);
    const lat = Number(parsed.aircraftLat);
    const alt = Number(parsed.aircraftAlt);
    if (Number.isFinite(lon) && Number.isFinite(lat) && Number.isFinite(alt)) {
      if (isimStore.recordFlightPath) {
        isimStore.addFlightPathPoint({
          lon,
          lat,
          alt,
          roll: parsed.aircraftRoll,
          pitch: parsed.aircraftPitch,
          heading: parsed.aircraftHeading,
          timestamp: parsed.timestamp || new Date().toISOString()
        })
      }
    }
    
    // 触发数据更新事件（供其他组件监听）
    const event = new CustomEvent('isim-data-update', { detail: parsed })
    window.dispatchEvent(event)
    
    // 调试信息（高频数据默认不刷屏）
    if (isimStore.debugMode && import.meta.env.DEV) {
      console.debug('[ISIM] 收到姿态数据:', data)
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
  
  return {
    // 状态
    ws,
    isConnected,
    isConnecting,
    reconnectAttempts,

    // 方法
    connect,
    disconnect,
    resetConnectPromise,
    clearConnectingState,
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