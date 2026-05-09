<template>
  <div class="isim-container">
    <!-- 主内容区域 -->
    <div class="main-content">
      <!-- 连接配置 -->
      <div class="section">
        <div class="section-header">
          <h3>连接配置</h3>
          <div class="status-badges">
            <span class="status-badge" :class="isConnected ? 'connected' : 'disconnected'">
              {{ isConnected ? '已连接' : '未连接' }}
            </span>
            <span class="status-badge" :class="isSendingWindData ? 'sending' : 'idle'">
              {{ isSendingWindData ? '发送中' : '空闲' }}
            </span>
          </div>
        </div>

        <div class="form-row">
          <div class="form-group">
            <label>ISIM主机地址</label>
            <input v-model="config.host" type="text" class="input-field" />
          </div>
          <div class="form-group">
            <label>发送端口</label>
            <input v-model.number="config.sendPort" type="number" min="1" max="65535" class="input-field" />
          </div>
          <div class="form-group">
            <label>接收端口</label>
            <input v-model.number="config.receivePort" type="number" min="1" max="65535" class="input-field" />
          </div>
        </div>

        <div class="divider"></div>

        <div class="form-row">
          <div class="form-group">
            <label>初始经度</label>
            <input v-model.number="config.longitude" type="number" min="-180" max="180" step="0.0001"
              class="input-field" />
          </div>
          <div class="form-group">
            <label>初始纬度</label>
            <input v-model.number="config.latitude" type="number" min="-90" max="90" step="0.0001"
              class="input-field" />
          </div>
          <div class="form-group">
            <label>初始高度(m)</label>
            <input v-model.number="config.altitude" type="number" min="0" max="10000" class="input-field" />
          </div>
        </div>
        <div class="control-buttons">

          <button @click="handleConnectButtonClick" class="btn" :class="isConnected ? 'btn-danger' : 'btn-primary'"
            :disabled="isUpdating || isConnecting">
            {{ isUpdating ? '更新中...' : (isConnecting ? '连接中...' : (isConnected ? '断开连接' : '连接ISIM')) }}
          </button>
          <button @click="focusOnIsimAircraft" class="btn btn-secondary" :disabled="!isConnected"> 聚焦飞机
          </button>
        </div>
      </div>

      <!-- 控制按钮 -->
      <div class="section">
        <h3>数据传输控制</h3>
        <div class="control-buttons">
          <button @click="controlIsim('START_SENDING')" class="btn btn-success"
            :disabled="isControlling || sendingStatus === 'started' || !isConnected">
            ▶ 开始发送气象数据
          </button>
          <button @click="controlIsim('STOP_SENDING')" class="btn btn-danger"
            :disabled="isControlling || sendingStatus !== 'started'">
            ■ 停止发送
          </button>
        </div>
        <div v-if="sendStatusMessage" class="status-message" :class="sendStatusClass">
          {{ sendStatusMessage }}
        </div>
      </div>

      <!-- 调试面板 -->
      <div class="section debug-panel">
        <h3>调试面板</h3>
        <div class="form-row">
          <div class="form-group">
            <label>X风 (m/s)</label>
            <input v-model.number="wind.u" type="number" step="0.1" class="input-field"
              :disabled="sendingStatus === 'started'" />
          </div>
          <div class="form-group">
            <label>Y风 (m/s)</label>
            <input v-model.number="wind.v" type="number" step="0.1" class="input-field"
              :disabled="sendingStatus === 'started'" />
          </div>
          <div class="form-group">
            <label>Z风 (m/s)</label>
            <input v-model.number="wind.w" type="number" step="0.1" class="input-field"
              :disabled="sendingStatus === 'started'" />
          </div>
        </div>
        <button @click="toggleDebugSending" class="btn btn-secondary" :disabled="sendingStatus !== 'started'">
          {{ isDebugSending ? '⏹ 停止发送' : '▶ 开始调试发送' }}
        </button>
        <div v-if="isDebugSending" class="debug-status">
          <span class="pulse-dot"></span>
          <span>正在持续发送风分量...</span>
        </div>
      </div>


    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted, markRaw, watch } from 'vue'
import * as Cesium from 'cesium'
import { useIsimWebSocket } from './useIsimWebSocket'
import { useIsimStore } from './isimStore'
import { useHeatmapStore } from '@/store/modules/heatmap'
import { PlaneModel } from '@/cesium/entities/routes/PlaneModel'

// 状态数据
const isUpdating = ref(false)
const isControlling = ref(false)
const isSendingWind = ref(false)
const isDebugSending = ref(false)

// 飞机模型相关
const planeEntity = ref(null)
const planeModel = ref(null)
const isimPlaneId = 'isim_live_aircraft'

// 使用状态管理
const isimStore = useIsimStore()
const heatmapStore = useHeatmapStore()

// 计算属性 - 从状态管理获取飞机数据
const simData = computed(() => isimStore.simData)
const flightPath = computed(() => isimStore.flightPath)

const aircraftRoll = computed(() => simData.value?.aircraftRoll)
const aircraftPitch = computed(() => simData.value?.aircraftPitch)
const aircraftHeading = computed(() => simData.value?.aircraftHeading)
const aircraftLon = computed(() => simData.value?.aircraftLon)
const aircraftLat = computed(() => simData.value?.aircraftLat)
const aircraftAlt = computed(() => simData.value?.aircraftAlt)

// 调试发送定时器
let debugSendTimer = null

// 配置数据
const config = ref({
  host: '127.0.0.1',
  sendPort: 8154,
  receivePort: 8151,
  longitude: 117.5,
  latitude: 39.3,
  altitude: 1500
})

// 风分量数据
const wind = ref({
  u: 5.0,
  v: 3.0,
  w: 0.5
})

// 发送状态
const sendingStatus = ref('stopped')
const sendStatusMessage = ref('')

// 基础路径
const baseUrl = '/api/isim'

// WebSocket hook
const {
  isConnected,
  isConnecting,
  connect,
  disconnect,
  sendMessage,
  sendCommand,
  sendAircraftPosition,
  activateIsim,
  deactivateIsim
} = useIsimWebSocket()

// 计算发送状态样式
const sendStatusClass = computed(() => {
  return sendingStatus.value === 'started' ? 'success' : 'info'
})

// 判断是否正在发送风场数据
const isSendingWindData = computed(() => {
  return sendingStatus.value === 'started'
})

// 格式化时间戳
const formatTime = (timestamp) => {
  if (!timestamp) return 'N/A'

  const date = new Date(timestamp)
  const hours = date.getHours().toString().padStart(2, '0')
  const minutes = date.getMinutes().toString().padStart(2, '0')
  const seconds = date.getSeconds().toString().padStart(2, '0')
  const ms = date.getMilliseconds().toString().padStart(3, '0')

  return `${hours}:${minutes}:${seconds}.${ms}`
}

// 连接按钮点击处理
const handleConnectButtonClick = () => {
  console.log('[ISIM] 连接按钮被点击')

  if (isConnected.value) {
    handleDisconnect()
  } else {
    updateTarget()
  }
}

// 更新目标地址和初始位置
const updateTarget = async () => {
  if (!config.value.host) {
    return
  }

  isUpdating.value = true

  try {
    const response = await fetch(`${baseUrl}/update-target`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(config.value)
    })
    const result = await response.json()

    if (result.success) {
      await connect()

      sendAircraftPosition({
        longitude: config.value.longitude,
        latitude: config.value.latitude,
        altitude: config.value.altitude
      })

      sendingStatus.value = 'stopped'
      sendStatusMessage.value = ''

      heatmapStore.switchToCitywideMode()
      console.log('[ISIM] 连接成功，已切换到全市热力图模式')
    } else {
      console.error('连接失败:', result.message)
    }
  } catch (error) {
    console.error('连接失败:', error)
  } finally {
    isUpdating.value = false
  }
}

// 断开连接
const handleDisconnect = async () => {
  try {
    const response = await fetch(`${baseUrl}/disconnect`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    })
    const result = await response.json()

    if (result.success) {
      disconnect()
      sendingStatus.value = 'stopped'
      sendStatusMessage.value = ''
      clearCesiumAircraft()

      heatmapStore.resetToDefault()
      console.log('[ISIM] 已断开连接，已恢复到默认热力图模式')
    } else {
      console.error('断开连接失败:', result.message)
    }
  } catch (error) {
    console.error('断开连接失败:', error)
  }
}

// 发送风分量（调试用）
const sendBodyWind = async () => {
  isSendingWind.value = true

  try {
    const params = new URLSearchParams({
      u: wind.value.u,
      v: wind.value.v,
      w: wind.value.w
    })

    const response = await fetch(`${baseUrl}/send-body-wind?${params}`, {
      method: 'POST'
    })
    const result = await response.json()

    if (!result.success) {
      console.error('发送失败:', result.message)
    }
  } catch (error) {
    console.error('发送风分量失败:', error)
  } finally {
    isSendingWind.value = false
  }
}

// 切换调试发送状态
const toggleDebugSending = () => {
  if (isDebugSending.value) {
    stopDebugSending()
  } else {
    startDebugSending()
  }
}

// 开始调试发送（持续发送）
const startDebugSending = () => {
  isDebugSending.value = true
  sendBodyWind()

  debugSendTimer = setInterval(() => {
    sendBodyWind()
  }, 1000)
}

// 停止调试发送
const stopDebugSending = () => {
  isDebugSending.value = false
  if (debugSendTimer) {
    clearInterval(debugSendTimer)
    debugSendTimer = null
  }
}

// 控制ISIM数据传输
const controlIsim = async (command) => {
  isControlling.value = true

  try {
    const response = await fetch(`${baseUrl}/control`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ command })
    })
    const result = await response.json()

    if (result.success) {
      sendingStatus.value = result.data.status
      sendStatusMessage.value = result.data.message

      if (command === 'START_SENDING') {
        activateIsim()
        console.log('[ISIM] 已发送激活ISIM数据处理请求')
      } else if (command === 'STOP_SENDING') {
        stopDebugSending()
        deactivateIsim()
        console.log('[ISIM] 已发送停用ISIM数据处理请求')
      }
    } else {
      console.error('命令执行失败:', result.message)
    }
  } catch (error) {
    console.error('控制命令失败:', error)
  } finally {
    isControlling.value = false
  }
}



/**
 * 更新Cesium飞机位置和姿态
 */
const updateCesiumAircraft = async () => {
  if (!simData.value || !planeModel.value) {
    return
  }

  try {
    const viewer = window.viewer
    if (!viewer) {
      console.error('[ISIM] Cesium viewer not found in window.viewer')
      return
    }

    const position = Cesium.Cartesian3.fromDegrees(
      aircraftLon.value,
      aircraftLat.value,
      aircraftAlt.value
    )

    let existingEntity = viewer.entities.getById(isimPlaneId)

    if (!existingEntity) {
      console.log('[ISIM] 创建新的ISIM飞机实体')

      planeEntity.value = planeModel.value.createRoutePlane(
        isimPlaneId,
        position,
        {
          getAttitude: () => ({
            heading: aircraftHeading.value,
            pitch: aircraftPitch.value,
            roll: aircraftRoll.value
          }),
          getAltitude: () => aircraftAlt.value,
          getFlightPath: () => flightPath.value,
          getRecordFlightPath: () => isimStore.recordFlightPath
        }
      )

      setTimeout(() => {
        focusOnIsimAircraft()
      }, 100)
    } else {
      planeModel.value.updatePlanePosition(isimPlaneId, position)
      console.log('[ISIM] 更新ISIM飞机实体位置')
    }
  } catch (error) {
    console.error('[ISIM] 更新Cesium飞机模型失败:', error)
  }
}

/**
 * 清理Cesium飞机
 */
const clearCesiumAircraft = () => {
  if (planeModel.value) {
    planeModel.value.removePlane(isimPlaneId)
    planeEntity.value = null
    console.log('[ISIM] 已清理Cesium飞机模型')
  }
}

// 监听simData变化更新飞机模型
watch(simData, (newVal) => {
  if (newVal && isConnected.value) {
    updateCesiumAircraft()
  }
}, { deep: true })

// 聚焦到ISIM飞机
const focusOnIsimAircraft = () => {
  const viewer = window.viewer
  if (!viewer) {
    console.error('[ISIM] Cesium viewer not found')
    return
  }

  try {
    if (planeEntity.value) {
      viewer.trackedEntity = planeEntity.value
      console.log('[ISIM] 已聚焦到ISIM飞机并开始跟随')
    } else {
      const existingEntity = viewer.entities.getById(isimPlaneId)
      if (existingEntity) {
        viewer.trackedEntity = existingEntity
        console.log('[ISIM] 已聚焦到ISIM飞机并开始跟随')
      } else {
        console.warn('[ISIM] 未找到ISIM飞机实体')
      }
    }
  } catch (error) {
    console.error('[ISIM] 聚焦飞机失败:', error)
  }
}

// 处理位置数据更新（聚焦飞机）
const handleIsimDataUpdate = (event) => {
  const data = event.detail

  if (data && (data.aircraftLon !== undefined || data.aircraftLat !== undefined)) {
    console.log('[ISIM] 收到位置数据:', {
      lon: data.aircraftLon,
      lat: data.aircraftLat,
      alt: data.aircraftAlt
    })

    const focusEvent = new CustomEvent('isim-focus-aircraft', {
      detail: {
        longitude: data.aircraftLon,
        latitude: data.aircraftLat,
        altitude: data.aircraftAlt || 1000
      }
    })
    window.dispatchEvent(focusEvent)
  }
}

// 初始化
onMounted(async () => {
  console.log('[ISIM] 组件初始化')
  window.addEventListener('isim-data-update', handleIsimDataUpdate)
  planeModel.value = markRaw(new PlaneModel(viewer))

})

onUnmounted(() => {
  window.removeEventListener('isim-data-update', handleIsimDataUpdate)

  if (debugSendTimer) {
    clearInterval(debugSendTimer)
    debugSendTimer = null
  }

  clearCesiumAircraft()
})
</script>

<style scoped>
.isim-container {
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
  border-radius: 8px;
  overflow: hidden;
}

.main-content {
  flex: 1;
  overflow-y: auto;
  overflow-x: hidden;
}

.main-content::-webkit-scrollbar {
  width: 6px;
}



.section {
  border-radius: 8px;
  padding: 12px;
  margin-bottom: 12px;
  border: 1px solid #334155;
}

.section-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
}

.section h3 {
  font-size: 13px;
  font-weight: 600;
  color: #f1f5f9;
  margin: 0 0 12px 0;
}

.section-header h3 {
  margin-bottom: 0;
}

.status-badges {
  display: flex;
  gap: 8px;
}

.status-badge {
  padding: 3px 8px;
  border-radius: 4px;
  font-size: 11px;
  font-weight: 500;
}

.status-badge.connected {
  background: rgba(16, 185, 129, 0.2);
  color: #10b981;
}

.status-badge.disconnected {
  background: rgba(239, 68, 68, 0.2);
  color: #ef4444;
}

.status-badge.sending {
  background: rgba(59, 130, 246, 0.2);
  color: #3b82f6;
}

.status-badge.idle {
  background: rgba(148, 163, 184, 0.2);
  color: #94a3b8;
}

.form-row {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  margin-bottom: 12px;
}

.form-group {
  flex: 1;
  min-width: 100px;
}

.form-group label {
  display: block;
  font-size: 11px;
  color: #94a3b8;
  margin-bottom: 4px;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.input-field {
  width: 100%;
  padding: 6px 8px;
  border: 1px solid #334155;
  border-radius: 4px;
  font-size: 12px;
  color: #f1f5f9;
  background: rgba(0, 0, 0, 0.3);
}

.input-field:focus {
  outline: none;
  border-color: #06b6d4;
  box-shadow: 0 0 0 2px rgba(6, 182, 212, 0.2);
}

.input-field:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.divider {
  height: 1px;
  background: #334155;
  margin: 12px 0;
}

.btn {
  padding: 7px 14px;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 12px;
  font-weight: 500;
  transition: all 0.2s ease;
}

.btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.btn-primary {
  background: linear-gradient(135deg, #06b6d4, #0891b2);
  color: white;
}

.btn-primary:hover:not(:disabled) {
  box-shadow: 0 2px 8px rgba(6, 182, 212, 0.4);
}

.btn-danger {
  background: linear-gradient(135deg, #ef4444, #dc2626);
  color: white;
}

.btn-danger:hover:not(:disabled) {
  box-shadow: 0 2px 8px rgba(239, 68, 68, 0.4);
}

.btn-success {
  background: linear-gradient(135deg, #10b981, #059669);
  color: white;
}

.btn-success:hover:not(:disabled) {
  box-shadow: 0 2px 8px rgba(16, 185, 129, 0.4);
}

.btn-secondary {
  background: #334155;
  color: #f1f5f9;
}

.btn-secondary:hover:not(:disabled) {
  background: #475569;
}

.control-buttons {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}

.status-message {
  margin-top: 10px;
  padding: 8px;
  border-radius: 4px;
  font-size: 12px;
}

.status-message.success {
  background: rgba(16, 185, 129, 0.1);
  color: #10b981;
  border: 1px solid rgba(16, 185, 129, 0.3);
}

.status-message.info {
  background: rgba(59, 130, 246, 0.1);
  color: #3b82f6;
  border: 1px solid rgba(59, 130, 246, 0.3);
}

.debug-status {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-top: 10px;
  padding: 8px;
  background: rgba(245, 158, 11, 0.1);
  border-radius: 4px;
  font-size: 12px;
  color: #f59e0b;
}

.pulse-dot {
  width: 8px;
  height: 8px;
  background: #f59e0b;
  border-radius: 50%;
  animation: pulse 1.5s infinite;
}

@keyframes pulse {

  0%,
  100% {
    opacity: 1;
  }

  50% {
    opacity: 0.5;
  }
}
</style>