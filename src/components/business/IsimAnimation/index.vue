<template>
  <div class="isim-animation-container">
    <!-- 3D动画容器 -->
    <div ref="animationContainer" class="animation-container">
      <!-- 连接配置区域 - 平铺展示 -->
      <div class="connection-config">
        <!-- 输入项平铺展示 -->
        <div class="config-inputs">
          <div class="input-group">
            <label for="simulator-ip">模拟机IP</label>
            <input 
              id="simulator-ip"
              type="text" 
              v-model="simulatorIp" 
              placeholder="127.0.0.1"
              class="ip-input"
            />
          </div>
          
          <div class="input-group optional">
            <label for="send-port">发送端口</label>
            <input 
              id="send-port"
              type="number" 
              v-model="sendPort" 
              placeholder="8152"
              min="1" 
              max="65535"
              class="port-input"
            />
          </div>
          
          <div class="input-group optional">
            <label for="receive-port">接收端口</label>
            <input 
              id="receive-port"
              type="number" 
              v-model="receivePort" 
              placeholder="8151"
              min="1" 
              max="65535"
              class="port-input"
            />
          </div>
          
          <button 
            @click="toggleConnection" 
            :disabled="isConnecting"
            class="control-button"
            :class="{ 'button-connected': isWebSocketConnected }"
          >
            {{ isWebSocketConnected ? '断开连接' : '连接ISIM' }}
          </button>
        </div>
        
        <div v-if="connectionError" class="error-message">
          {{ connectionError }}
        </div>
      </div>
    </div>
    
    <!-- 状态面板 -->
    <div class="status-panel">
      <div class="status-section compact">
        <div class="section-title">飞机姿态</div>
        <div class="status-grid compact">
          <div class="status-item compact">
            <div class="status-label">滚转</div>
            <div class="status-value">{{ aircraftRoll.toFixed(2) }}°</div>
          </div>
          <div class="status-item compact">
            <div class="status-label">俯仰</div>
            <div class="status-value">{{ aircraftPitch.toFixed(2) }}°</div>
          </div>
          <div class="status-item compact">
            <div class="status-label">航向</div>
            <div class="status-value">{{ aircraftHeading.toFixed(2) }}°</div>
          </div>
        </div>
      </div>
      
      <div class="status-section compact">
        <div class="section-title">位置信息</div>
        <div class="status-grid compact">
          <div class="status-item compact">
            <div class="status-label">经度</div>
            <div class="status-value">{{ aircraftLon.toFixed(6) }}</div>
          </div>
          <div class="status-item compact">
            <div class="status-label">纬度</div>
            <div class="status-value">{{ aircraftLat.toFixed(6) }}</div>
          </div>
          <div class="status-item compact">
            <div class="status-label">高度</div>
            <div class="status-value">{{ aircraftAlt.toFixed(2) }}m</div>
          </div>
        </div>
      </div>
      
      <div class="status-section">
        <div class="section-title">连接状态</div>
        <div class="connection-status">
          <div class="status-indicator" :class="connectionStatusClass"></div>
          <span class="status-text">{{ connectionStatusText }}</span>
        </div>
        <div v-if="flightPath.length > 0" class="flight-info">
          <div class="flight-info-item">
            <span>轨迹点数:</span>
            <span class="flight-info-value">{{ flightPath.length }}</span>
          </div>
          <div class="flight-info-item">
            <span>飞行时间:</span>
            <span class="flight-info-value">{{ flightDuration }}s</span>
          </div>
        </div>
      </div>
    </div>
    
    <!-- 控制面板 -->
    <div class="control-panel">
      <div class="control-group">
        <label class="checkbox-label">
          <input type="checkbox" v-model="autoSendWeather" />
          <span>自动发送气象数据</span>
        </label>
        
        <label class="checkbox-label">
          <input type="checkbox" v-model="recordFlightPath" />
          <span>记录飞行轨迹</span>
        </label>
        
      </div>
      
      <div class="control-group">

        <button 
          @click="focusOnIsimAircraft" 
          :disabled="!isWebSocketConnected || !planeEntity" 
          class="control-button secondary"
        >
          聚焦飞机
        </button>
        <button @click="exportFlightData" class="control-button secondary">
          导出飞行数据
        </button>
        
        <button @click="sendTestCommand" class="control-button secondary">
          发送测试指令
        </button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted, watch, markRaw } from 'vue'
import * as Cesium from 'cesium'
import { useIsimWebSocket } from './useIsimWebSocket'
import { useIsimStore } from './isimStore'
import { PlaneModel } from '@/cesium/entities/routes/PlaneModel'

// 使用WebSocket Hook
const { 
  connect: connectWebSocket, 
  disconnect: disconnectWebSocket, 
  isConnected: isWebSocketConnected,
  isConnecting,
  sendMessage
} = useIsimWebSocket()

// 使用状态管理
const isimStore = useIsimStore()

// Cesium相关
const planeEntity = ref(null)
const planeModel = ref(null)
const isimPlaneId = 'isim_live_aircraft'

// 本地状态
const animationContainer = ref(null)
const isAnimating = ref(false)
const autoSendWeather = ref(true)
const recordFlightPath = ref(true)

// 联机配置
const simulatorIp = ref('127.0.0.1')
const sendPort = ref(8152)
const receivePort = ref(8151)
const connectionError = ref(null)

// 计算属性
const simData = computed(() => isimStore.simData)
const flightPath = computed(() => isimStore.flightPath)

const aircraftRoll = computed(() => simData.value?.aircraftRoll || 0)
const aircraftPitch = computed(() => simData.value?.aircraftPitch || 0)
const aircraftHeading = computed(() => simData.value?.aircraftHeading || 0)
const aircraftLon = computed(() => simData.value?.aircraftLon || 120.3844)
const aircraftLat = computed(() => simData.value?.aircraftLat || 36.1052)
const aircraftAlt = computed(() => simData.value?.aircraftAlt || 100)

const connectionStatusText = computed(() => {
  if (isConnecting.value) return '连接中...'
  return isWebSocketConnected.value ? '已连接' : '未连接'
})

const connectionStatusClass = computed(() => ({
  'connected': isWebSocketConnected.value,
  'connecting': isConnecting.value,
  'disconnected': !isWebSocketConnected.value && !isConnecting.value
}))

const flightDuration = computed(() => {
  if (flightPath.value.length < 2) return 0
  // 简化计算：假设每秒一个点
  return flightPath.value.length
})

// 2D飞机样式（临时方案）
const aircraftStyle = computed(() => {
  const scale = 1 + aircraftAlt.value / 1000 // 高度越高，飞机越小
  return {
    transform: `rotate(${aircraftHeading.value}deg) scale(${scale})`
  }
})

// 方法
const connectToIsim = async () => {
  connectionError.value = null
  
  try {
    // 1. 更新ISIM目标地址
    const updatePayload = {
      host: simulatorIp.value,
      sendPort: sendPort.value,
      receivePort: receivePort.value
    }
    
    const response = await fetch('/api/isim/update-target', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updatePayload)
    })
    
    const result = await response.json()
    
    if (!response.ok) {
      throw new Error(result.message || '更新目标地址失败')
    }
    
    console.log('ISIM目标地址已更新:', result)
    
    // 2. 连接WebSocket
    await connectWebSocket()
    
  } catch (error) {
    console.error('连接ISIM失败:', error)
    connectionError.value = error.message || '连接失败，请检查网络和配置'
  }
}

const toggleConnection = async () => {
  if (isWebSocketConnected.value) {
    await disconnectWebSocket()
    stopAnimation()
    clearCesiumAircraft()
  } else {
    await connectToIsim()
  }
}

const startAnimation = () => {
  if (!isAnimating.value) {
    isAnimating.value = true
    sendTakeoffCommand()
    // 这里可以启动3D渲染
  } else {
    stopAnimation()
  }
}

const stopAnimation = () => {
  isAnimating.value = false
  // 停止3D渲染
}

const resetAnimation = () => {
  stopAnimation()
  isimStore.resetPosition()
}

const sendTakeoffCommand = () => {
  sendMessage({
    type: 'command',
    command: 'TAKEOFF',
    timestamp: new Date().toISOString()
  })
}

const sendTestCommand = () => {
  sendMessage({
    type: 'test',
    message: '测试指令',
    timestamp: new Date().toISOString()
  })
}

const exportFlightData = () => {
  if (!flightPath.value.length) {
    alert('没有可导出的飞行数据')
    return
  }
  
  const dataStr = JSON.stringify(flightPath.value, null, 2)
  const dataBlob = new Blob([dataStr], { type: 'application/json' })
  
  const url = URL.createObjectURL(dataBlob)
  const link = document.createElement('a')
  link.href = url
  link.download = `flight-path-${new Date().toISOString().slice(0, 10)}.json`
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
  
  alert('飞行数据已导出')
}

/**
 * 聚焦到ISIM飞机并跟随
 */
const focusOnIsimAircraft = () => {
  const viewer = window.viewer
  if (!viewer || !planeEntity.value) {
    return
  }
  
  try {
    // 聚焦到飞机
    viewer.trackedEntity = planeEntity.value
    console.log('已聚焦到ISIM飞机并开始跟随')
  } catch (error) {
    console.error('聚焦飞机失败:', error)
  }
}

// ========== Cesium飞机模型管理 ==========

/**
 * 初始化Cesium飞机模型
 */
const initCesiumPlane = async () => {
  const maxRetries = 10
  const retryInterval = 1000 // 1秒
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      // 获取全局Cesium viewer
      const viewer = window.viewer
      if (!viewer) {
        console.warn(`Cesium viewer未找到 (尝试 ${attempt}/${maxRetries})，请确保地图已加载`)
        if (attempt < maxRetries) {
          await new Promise(resolve => setTimeout(resolve, retryInterval))
          continue
        } else {
          console.error('达到最大重试次数，Cesium viewer仍未就绪')
          return false
        }
      }
      
      // 初始化PlaneModel，使用markRaw避免Vue将其包装为Proxy
      planeModel.value = markRaw(new PlaneModel(viewer))
      console.log('Cesium飞机模型管理器已初始化')
      return true
    } catch (error) {
      console.error(`初始化Cesium飞机模型失败 (尝试 ${attempt}/${maxRetries}):`, error)
      if (attempt < maxRetries) {
        await new Promise(resolve => setTimeout(resolve, retryInterval))
      } else {
        console.error('达到最大重试次数，初始化失败')
        return false
      }
    }
  }
  return false
}

/**
 * 创建增强的飞机实体
 */
const createSimpleAircraftEntity = (viewer, position) => {
  try {
    console.log('[DEBUG] 创建增强飞机实体')
    
    // 使用本地小型飞机模型
    const modelUri = '/cesium/model/plane/plane1.glb'
    
    const entity = viewer.entities.add({
      id: isimPlaneId,
      name: 'ISIM实时飞机',
      position: position,
      // 使用优化的姿态更新
      orientation: new Cesium.CallbackProperty((time) => {
        try {
          // 将角度转换为弧度
          const heading = Cesium.Math.toRadians(aircraftHeading.value)
          const pitch = Cesium.Math.toRadians(aircraftPitch.value)
          const roll = Cesium.Math.toRadians(aircraftRoll.value)
          
          // 获取当前位置
          const currentPosition = entity.position.getValue(time)
          if (!currentPosition) {
            return Cesium.Quaternion.IDENTITY
          }
          
          return Cesium.Transforms.headingPitchRollQuaternion(
            currentPosition,
            new Cesium.HeadingPitchRoll(heading, pitch, roll)
          )
        } catch (error) {
          console.warn('[DEBUG] 计算姿态时出错:', error)
          return Cesium.Quaternion.IDENTITY
        }
      }, false),
      // 使用本地小型飞机模型
      model: {
        uri: modelUri,
        scale: 20.0, // 适当放大
        show: true,
        minimumPixelSize: 40, // 增大最小像素大小
        maximumScale: 80000,
        runAnimations: true,
        // 添加详细的错误处理
        error: (error) => {
          console.error('[DEBUG] 飞机模型加载失败:', error)
          console.log('[DEBUG] 降级为简单几何体表示')
          // 降级为几何体
          entity.model = undefined
          entity.box = {
            dimensions: new Cesium.Cartesian3(20, 10, 10),
            material: Cesium.Color.fromBytes(59, 130, 246, 200),
            outline: true,
            outlineColor: Cesium.Color.WHITE
          }
        }
      },
      // 添加增强的标签
      label: {
        text: new Cesium.CallbackProperty(() => {
          return `ISIM飞机\n高度: ${aircraftAlt.value.toFixed(0)}m\n航向: ${aircraftHeading.value.toFixed(1)}°`
        }, false),
        font: '14px sans-serif',
        fillColor: Cesium.Color.WHITE,
        outlineColor: Cesium.Color.BLACK,
        outlineWidth: 2,
        showBackground: true,
        backgroundColor: Cesium.Color.fromCssColorString('rgba(15, 23, 42, 0.9)'),
        backgroundPadding: new Cesium.Cartesian2(8, 6),
        horizontalOrigin: Cesium.HorizontalOrigin.CENTER,
        verticalOrigin: Cesium.VerticalOrigin.TOP,
        pixelOffset: new Cesium.Cartesian2(0, -60),
        disableDepthTestDistance: Number.POSITIVE_INFINITY
      },
      // 添加增强的路径线
      path: {
        resolution: 1,
        width: 8,
        material: new Cesium.PolylineGlowMaterialProperty({
          glowPower: 0.2,
          color: Cesium.Color.fromBytes(59, 130, 246, 180) // 半透明蓝色
        }),
        show: recordFlightPath.value,
        leadTime: 0,
        trailTime: 60, // 轨迹保留60秒
        zIndex: 1
      },
      // 添加飞机灯光效果
      point: {
        pixelSize: 10,
        color: Cesium.Color.fromBytes(255, 255, 0, 200),
        outlineColor: Cesium.Color.YELLOW,
        outlineWidth: 2,
        show: true
      },
      // 添加尾迹效果
      polyline: {
        positions: new Cesium.CallbackProperty(() => {
          if (flightPath.value.length < 2) return []
          const recentPath = flightPath.value.slice(-20) // 最近20个点
          return recentPath.map(point => Cesium.Cartesian3.fromDegrees(
            point.lon,
            point.lat,
            point.alt
          ))
        }, false),
        width: 6,
        material: new Cesium.PolylineGlowMaterialProperty({
          glowPower: 0.3,
          color: Cesium.Color.fromBytes(16, 185, 129, 150)
        }),
        show: new Cesium.CallbackProperty(() => recordFlightPath.value, false)
      }
    })
    
    console.log('[DEBUG] 增强飞机实体创建成功')
    return entity
    
  } catch (error) {
    console.error('[DEBUG] 创建增强飞机实体失败:', error)
    return null
  }
}

/**
 * 专门更新飞机姿态的函数
 * 根据当前姿态数据实时更新飞机模型姿态
 */
const updateAircraftAttitude = () => {
  if (!planeModel.value || !planeEntity.value) {
    console.log('[ISIM] 姿态更新跳过：模型或实体未初始化');
    return;
  }
  
  // 直接更新姿态，不重新创建实体
  try {
    planeModel.value.setPlaneAttitude(isimPlaneId, {
      roll: aircraftRoll.value,
      pitch: aircraftPitch.value,
      heading: aircraftHeading.value
    });
    
    // 调试信息
    console.log('[ISIM] 姿态更新成功:', {
      roll: aircraftRoll.value.toFixed(2),
      pitch: aircraftPitch.value.toFixed(2),
      heading: aircraftHeading.value.toFixed(2)
    });
  } catch (error) {
    console.error('[ISIM] 姿态更新失败:', error);
  }
}

const updateCesiumAircraft = async () => {
  if (!simData.value) {
    return
  }
  
  // 调试：检查Cesium状态
  console.log('[DEBUG] updateCesiumAircraft called', {
    aircraftPos: [aircraftLon.value, aircraftLat.value, aircraftAlt.value],
    aircraftAtt: [aircraftRoll.value, aircraftPitch.value, aircraftHeading.value],
    simDataExists: !!simData.value,
  })
  
  try {
    // 检查Cesium viewer是否存在且正常
    let viewer = window.viewer
    // 检查viewer是否可用
    if (!viewer) {
      console.error('[DEBUG] Cesium viewer not found in window.viewer')
      // 尝试从全局查找
      const cesiumViewer = document.querySelector('.cesium-viewer')
      if (cesiumViewer) {
        console.log('[DEBUG] Found Cesium viewer DOM element, but viewer object missing')
      }
      return
    }
    
    // 检查viewer是否已销毁
    if (viewer.isDestroyed && viewer.isDestroyed()) {
      console.error('[DEBUG] Cesium viewer is destroyed')
      return
    }
    
    // 检查canvas元素
    if (!viewer.canvas) {
      console.error('[DEBUG] Cesium viewer has no canvas element')
      return
    }
    
    console.log('[DEBUG] Cesium viewer check passed')
    
    // 获取飞机位置（Cartesian3）
    const position = Cesium.Cartesian3.fromDegrees(
      aircraftLon.value,
      aircraftLat.value,
      aircraftAlt.value
    )
    
    // 检查是否已存在飞机实体
    let existingEntity = viewer.entities.getById(isimPlaneId)
    
    if (!existingEntity) {
      console.log('[DEBUG] 创建新的ISIM飞机实体')
      
      // 创建新的飞机实体
      if (planeModel.value) {
        // 尝试使用PlaneModel创建飞机
        try {
          planeEntity.value = planeModel.value.createRoutePlane(
            isimPlaneId,
            position, // 初始位置
            {
              scale: 10.0,
              pathColor: Cesium.Color.fromBytes(59, 130, 246, 200),
              showPath: recordFlightPath.value
            }
          )
          
          console.log('[DEBUG] 已使用PlaneModel创建ISIM实时飞机模型')
          
          // 更新飞机姿态（使用专用函数）
          updateAircraftAttitude()
          
          // 聚焦到飞机并跟随
          setTimeout(() => {
            focusOnIsimAircraft()
          }, 100)
        } catch (e) {
          console.error('[DEBUG] PlaneModel创建失败，降级为基础实体:', e)
          planeEntity.value = createSimpleAircraftEntity(viewer, position)
          
          // 聚焦到飞机并跟随
          setTimeout(() => {
            focusOnIsimAircraft()
          }, 100)
        }
      } else {
        // 直接创建基础飞机实体
        planeEntity.value = createSimpleAircraftEntity(viewer, position)
        
        // 聚焦到飞机并跟随
        setTimeout(() => {
          focusOnIsimAircraft()
        }, 100)
      }
    } else {
      // 更新现有实体的位置
      existingEntity.position = position
      console.log('[DEBUG] 更新ISIM飞机实体位置')
      
      // 更新飞机姿态（使用专用函数）
      updateAircraftAttitude()
    }
  } catch (error) {
    console.error('[DEBUG] 更新Cesium飞机模型失败:', error)
  }
}

// 补全缺失的clearCesiumAircraft方法
const clearCesiumAircraft = () => {
  const viewer = window.viewer
  if (viewer && planeEntity.value) {
    viewer.entities.remove(planeEntity.value)
    planeEntity.value = null
  }
}

// 监听simData变化更新飞机模型
watch(simData, (newVal) => {
  if (newVal && isWebSocketConnected.value) {
    updateCesiumAircraft()
  }
}, { deep: true })

// 初始化
onMounted(async () => {
  // 初始化Cesium飞机模型
  await initCesiumPlane()
})

// 清理
onUnmounted(() => {
  if (isWebSocketConnected.value) {
    disconnectWebSocket()
  }
  clearCesiumAircraft()
})
</script>

<style scoped>
/* 连接配置样式 */
.connection-config {
  padding: 16px;
}

.config-inputs {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  align-items: center;
  margin-bottom: 8px;
}

.input-group {
  flex: 1;
  min-width: 180px;
}

.input-group label {
  display: block;
  font-size: 12px;
  color: #94a3b8;
  margin-bottom: 4px;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.input-group input {
  width: 100%;
  padding: 8px 12px;
  border: 1px solid #334155;
  border-radius: 4px;
  font-size: 14px;
  color: #f1f5f9;
  box-shadow: inset 0 1px 3px rgba(0, 0, 0, 0.3);
}

.input-group input:focus {
  outline: none;
  border-color: #06b6d4;
  box-shadow: 0 0 0 2px rgba(6, 182, 212, 0.2);
}

.error-message {
  color: #f87171;
  font-size: 13px;
  margin-top: 8px;
  padding: 8px;
  background: rgba(239, 68, 68, 0.1);
  border: 1px solid rgba(239, 68, 68, 0.3);
  border-radius: 4px;
}

/* 容器样式 */
.isim-animation-container {
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
}

.animation-container {
  flex: 1;
  position: relative;
  overflow: hidden;
}

/* 状态面板样式 */
.status-panel {
  padding: 12px;
  border-top: 1px solid #334155;
}

.status-section {
  margin-bottom: 16px;
}

.status-section.compact {
  margin-bottom: 12px;
}

.section-title {
  font-size: 15px;
  font-weight: 600;
  margin-bottom: 6px;
  color: #f1f5f9;
  display: flex;
  align-items: center;
  gap: 6px;
}

.section-title::before {
  content: '';
  width: 4px;
  height: 16px;
  background: #06b6d4;
  border-radius: 2px;
  box-shadow: 0 0 8px rgba(6, 182, 212, 0.5);
}

.status-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 12px;
}

.status-grid.compact {
  gap: 8px;
  grid-template-columns: repeat(auto-fit, minmax(160px, 1fr));
}

.status-item {
  display: flex;
  flex-direction: column;
  gap: 4px;
  padding: 8px;
  background: #1e293b;
  border-radius: 6px;
  border: 1px solid #334155;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.3);
}

.status-item.compact {
  padding: 6px;
  gap: 3px;
}

.status-label {
  font-size: 11px;
  color: #94a3b8;
  font-weight: 500;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.status-value {
  font-size: 13px;
  font-weight: 600;
  color: #f1f5f9;
  font-family: 'Courier New', monospace;
  text-shadow: 0 0 4px rgba(6, 182, 212, 0.3);
}

/* 连接状态样式 */
.connection-status {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 8px;
}

.status-indicator {
  width: 12px;
  height: 12px;
  border-radius: 50%;
  box-shadow: 0 0 6px currentColor;
}

.status-indicator.connected {
  background: #10b981;
  color: #10b981;
}

.status-indicator.connecting {
  background: #f59e0b;
  color: #f59e0b;
  animation: pulse 2s infinite;
}

.status-indicator.disconnected {
  background: #ef4444;
  color: #ef4444;
}

@keyframes pulse {
  0% {
    box-shadow: 0 0 0 0 rgba(245, 158, 11, 0.7);
  }
  70% {
    box-shadow: 0 0 0 10px rgba(245, 158, 11, 0);
  }
  100% {
    box-shadow: 0 0 0 0 rgba(245, 158, 11, 0);
  }
}

.status-text {
  font-size: 14px;
  color: #f1f5f9;
}

.flight-info {
  display: flex;
  gap: 16px;
  font-size: 14px;
  color: #94a3b8;
}

.flight-info-value {
  font-weight: 500;
  color: #f1f5f9;
  text-shadow: 0 0 4px rgba(6, 182, 212, 0.3);
}

/* 控制面板样式 */
.control-panel {
  padding: 12px;
  border-top: 1px solid #334155;
}

.control-group {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-bottom: 12px;
  align-items: center;
}

.control-button {
  padding: 8px 16px;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 14px;
  background: #06b6d4;
  color: white;
  box-shadow: 0 1px 3px rgba(6, 182, 212, 0.3);
  transition: all 0.2s ease;
}

.control-button:hover {
  opacity: 0.9;
  transform: translateY(-1px);
  box-shadow: 0 2px 6px rgba(6, 182, 212, 0.5);
}

.control-button.secondary {
  color: #f1f5f9;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.3);
}

.control-button.secondary:hover {
  box-shadow: 0 2px 6px rgba(6, 182, 212, 0.3);
}

.control-button:disabled {
  cursor: not-allowed;
  opacity: 0.5;
  box-shadow: none;
  transform: none;
}

.control-button.button-connected {
  background: #10b981;
  box-shadow: 0 1px 3px rgba(16, 185, 129, 0.3);
}

.control-button.button-connected:hover {
  box-shadow: 0 2px 6px rgba(16, 185, 129, 0.5);
}

.checkbox-label {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 14px;
  color: #f1f5f9;
  cursor: pointer;
}
</style>