<!--
时间进度条组件 (TimeProgressBar)

功能说明：
- 在地图底部显示时间进度条，用于控制和查看时间信息
- 支持播放/暂停时间动画
- 支持点击进度条跳转到指定时间
- 支持拖动时间指示器调整时间
- 区分显示过去时间（灰色）和未来时间（正常颜色）
- 禁用过去时间的交互功能

使用方法：
1. 导入组件
   import TimeProgressBar from '@/components/map/TimeProgressBar.vue'

2. 在模板中使用
   <TimeProgressBar
     :start-time="customStartTime"
     :end-time="customEndTime"
     :interval="7200000"  // 2小时
     :auto-play="false"
     @time-change="handleTimeChange"
   />

3. 处理时间变化事件
   const handleTimeChange = (time) => {
     console.log('Selected time:', time)
     // 在这里可以调用Cesium的时间设置方法，如：
     // viewer.clock.currentTime = Cesium.JulianDate.fromDate(time)
   }

Props：
- startTime: Date - 开始时间（默认：今天0点）
- endTime: Date - 结束时间（默认：第二天0点）
- interval: Number - 时间标记间隔（毫秒，默认：7200000 - 2小时）
- autoPlay: Boolean - 是否自动播放（默认：false）

Events：
- time-change: 当时间变化时触发，参数为选中的Date对象
-->
<template>
  
  <div class="time-progress-bar-container">
    <!-- 时间进度条 -->
    <div class="time-progress-bar">
      <!-- 控制按钮 -->
      <div class="control-buttons">
        <button class="control-btn" @click="handlePlayPause">
          <svg v-if="!isPlaying" width="16" height="16" viewBox="0 0 16 16" fill="none">
            <path d="M5 3L13 8L5 13V3Z" fill="white"/>
          </svg>
          <svg v-else width="16" height="16" viewBox="0 0 16 16" fill="none">
            <rect x="4" y="3" width="3" height="10" fill="white"/>
            <rect x="9" y="3" width="3" height="10" fill="white"/>
          </svg>
        </button>
      </div>

      <!-- 进度条 -->
      <div class="progress-container">
        <div class="time-markers">
          <div v-for="marker in timeMarkers" :key="marker.time" class="time-marker">
            <span class="marker-label">{{ marker.label }}</span>
            <div class="marker-line"></div>
          </div>
        </div>

        <div class="progress-bar-track" ref="progressBarRef" @click="handleProgressClick">
          <!-- 已完成进度 -->
          <div class="progress-bar-fill" :style="{ width: progressWidth }"></div>
          
          <!-- 过去时间区域（灰色） -->
          <div class="past-time-area" :style="{ width: currentTimePosition }" v-if="now < props.endTime"></div>
          
          <!-- 当前时间指示器 -->
          <div class="current-time-indicator" :style="{ left: progressWidth }" @mousedown="handleIndicatorMouseDown">
            <div class="indicator-line"></div>
            
            <!-- 时间弹出提示（小pop） -->
            <div class="time-tooltip">
              <div class="tooltip-content">{{ formattedCurrentTime }}</div>
              <div class="tooltip-arrow"></div>
            </div>
          </div>
        </div>
      </div>

    </div>
  </div>
</template>
<script setup>
import { ref, computed, onMounted, onUnmounted, watch } from 'vue'
import { formatDate } from '@/utils/dateUtils'
import VueProgressBar from "vue-progress-bar-player";

// 定义props
const props = defineProps({
  startTime: {
    type: Date,
    default: () => {
      // 设置为今天的0点
      const today = new Date()
      today.setHours(0, 0, 0, 0)
      return today
    }
  },
  endTime: {
    type: Date,
    default: () => {
      // 设置为第二天的0点
      const tomorrow = new Date()
      tomorrow.setHours(24, 0, 0, 0)
      return tomorrow
    }
  },
  interval: {
    type: Number,
    default: 7200000 // 默认2小时间隔
  },
  autoPlay: {
    type: Boolean,
    default: false
  },
  isPlaying: {
    type: Boolean,
    default: false
  }
})

// 定义emits
const emit = defineEmits(['time-change', 'play-pause-change'])

// 响应式状态
const isPlaying = ref(props.isPlaying || props.autoPlay)
const currentTime = ref(new Date()) // 初始化为当前时间
const showTooltip = ref(true)
const progressBarRef = ref(null)
let animationTimer = null
let isDragging = ref(false)
const dragUpdateTimer = ref(null)

// 监听外部isPlaying prop的变化
watch(() => props.isPlaying, (newValue) => {
  if (newValue !== isPlaying.value) {
    isPlaying.value = newValue
    if (isPlaying.value) {
      startAnimation()
    } else {
      stopAnimation()
    }
  }
})

// 计算属性
const timeRange = computed(() => props.endTime - props.startTime)
const currentProgress = computed(() => (currentTime.value - props.startTime) / timeRange.value)
const progressWidth = computed(() => `${Math.max(0, Math.min(100, currentProgress.value * 100))}%`)

// 获取当前时间在进度条上的位置（用于区分过去和未来时间）
const now = new Date()
const currentTimePosition = computed(() => {
  const nowProgress = (now - props.startTime) / timeRange.value
  return `${Math.max(0, Math.min(100, nowProgress * 100))}%`
})

const formattedCurrentTime = computed(() => {
  return formatDate(currentTime.value, 'yyyy-MM-dd HH:mm:ss')
})

// 生成时间标记
const timeMarkers = computed(() => {
  const markers = []
  const markerCount = Math.floor(timeRange.value / props.interval) + 1
  
  for (let i = 0; i < markerCount; i++) {
    const time = new Date(props.startTime.getTime() + i * props.interval)
    markers.push({
      time,
      label: formatDate(time, 'HH:mm'),
      position: `${(i / (markerCount - 1)) * 100}%`
    })
  }
  
  return markers
})

// 控制按钮事件
const handlePlayPause = () => {
  isPlaying.value = !isPlaying.value
  if (isPlaying.value) {
    startAnimation()
  } else {
    stopAnimation()
  }
  // 向外发出播放/暂停状态变化事件
  emit('play-pause-change', isPlaying.value)
}

// 进度条点击事件
const handleProgressClick = (event) => {
  console.log("handleProgressClick");
  if (!progressBarRef.value) return
  
  const rect = progressBarRef.value.getBoundingClientRect()
  const clickX = event.clientX - rect.left
  let progress = clickX / rect.width
  
  // 计算10分钟的毫秒数
  const TEN_MINUTES = 10 * 60 * 1000
  
  // 计算总的10分钟间隔数
  const totalIntervals = Math.ceil(timeRange.value / TEN_MINUTES)
  
  // 将进度转换为10分钟间隔的索引
  const intervalIndex = Math.round(progress * totalIntervals)
  
  // 确保索引在有效范围内
  const clampedIndex = Math.max(0, Math.min(totalIntervals, intervalIndex))
  
  // 计算对应的时间
  const newTime = new Date(props.startTime.getTime() + clampedIndex * TEN_MINUTES)
  
  // 只允许点击当前时间及之后的位置
  if (newTime >= now) {
    currentTime.value = newTime
    emitTimeChange()
  }
}

// 指示器拖拽事件
const handleIndicatorMouseDown = (event) => {
  isDragging.value = true
  stopAnimation()
  
  // 只有在开始拖动时才注册事件监听
  document.addEventListener('mousemove', handleMouseMove)
  document.addEventListener('mouseup', handleMouseUp)
}

const handleMouseMove = (event) => {
  if (!isDragging.value || !progressBarRef.value) return
  
  const rect = progressBarRef.value.getBoundingClientRect()
  const mouseX = Math.max(0, Math.min(event.clientX - rect.left, rect.width))
  let progress = mouseX / rect.width
  
  // 计算10分钟的毫秒数
  const TEN_MINUTES = 10 * 60 * 1000
  
  // 计算总的10分钟间隔数
  const totalIntervals = Math.ceil(timeRange.value / TEN_MINUTES)
  
  // 将进度转换为10分钟间隔的索引
  const intervalIndex = Math.round(progress * totalIntervals)
  
  // 确保索引在有效范围内
  const clampedIndex = Math.max(0, Math.min(totalIntervals, intervalIndex))
  
  // 计算对应的时间
  const newTime = new Date(props.startTime.getTime() + clampedIndex * TEN_MINUTES)
  
  // 只允许拖动到当前时间及之后的位置
  if (newTime >= now) {
    // 立即更新当前时间
    currentTime.value = newTime
    
    // 使用防抖技术减少更新频率
    if (dragUpdateTimer.value) {
      clearTimeout(dragUpdateTimer.value)
    }
    
    // 每100毫秒更新一次热力图数据
    dragUpdateTimer.value = setTimeout(() => {
      emitTimeChange()
    }, 100)
  }
}

const handleMouseUp = () => {
  console.log("handleMouseUp");
  
  isDragging.value = false
  
  // 清除拖拽更新定时器
  if (dragUpdateTimer.value) {
    clearTimeout(dragUpdateTimer.value)
    dragUpdateTimer.value = null
  }
  
  // 移除事件监听
  document.removeEventListener('mousemove', handleMouseMove)
  document.removeEventListener('mouseup', handleMouseUp)
  
  // 鼠标松开时确保最后一次更新被触发
  emitTimeChange()
}

// 动画控制
const startAnimation = () => {
  console.log("startAnimation");

  if (animationTimer) return
  
  animationTimer = setInterval(() => {
    const newTime = new Date(currentTime.value.getTime() + 1000) // 每次前进1秒
    
    if (newTime >= props.endTime) {
      // 到达结束时间，停止播放
      currentTime.value = props.endTime
      isPlaying.value = false
      stopAnimation()
      // 向外发出播放/暂停状态变化事件
      emit('play-pause-change', false)
    } else {
      currentTime.value = newTime
    }
    
    emitTimeChange()
  }, 1000) // 每秒更新一次
}

const stopAnimation = () => {
  if (animationTimer) {
    clearInterval(animationTimer)
    animationTimer = null
  }
}

// 发射时间变化事件
const emitTimeChange = () => {
  console.log("emitTimeChange");
  
  emit('time-change', currentTime.value)
}

// 生命周期
onMounted(() => {
  if (props.autoPlay) {
    startAnimation()
  }
  
  // 添加鼠标事件监听
  // document.addEventListener('mousemove', handleMouseMove)
  // document.addEventListener('mouseup', handleMouseUp)
})

onUnmounted(() => {
  stopAnimation()
  
  // 清除所有定时器
  if (dragUpdateTimer.value) {
    clearTimeout(dragUpdateTimer.value)
    dragUpdateTimer.value = null
  }
  
  // 移除鼠标事件监听
  // document.removeEventListener('mousemove', handleMouseMove)
  // document.removeEventListener('mouseup', handleMouseUp)
})
</script>

<style scoped lang="scss">
.time-progress-bar-container {
  position: absolute;
  bottom: 20px;
  left: 50%;
  transform: translateX(-50%);
  width: 90%;
  max-width: 1200px;
  z-index: 100;
}

.time-progress-bar {
  display: flex;
  align-items: center;
  gap: 20px;
  padding: 15px 20px;
  background: rgba(15, 23, 51, 0.9);
  border-radius: 8px;
  backdrop-filter: blur(10px);
  border: 1px solid rgba(255, 255, 255, 0.1);
}

.control-buttons {
  display: flex;
  gap: 10px;
}

.control-btn {
  width: 32px;
  height: 32px;
  border: none;
  background: rgba(59, 130, 246, 0.3);
  border-radius: 4px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s;
  
  &:hover {
    background: rgba(59, 130, 246, 0.5);
    transform: scale(1.05);
  }
  
  &:active {
    transform: scale(0.95);
  }
}

.progress-container {
  flex: 1;
  position: relative;
}

.time-markers {
  display: flex;
  justify-content: space-between;
  margin-bottom: 5px;
  padding: 0 5px;
}

.time-marker {
  display: flex;
  flex-direction: column;
  align-items: center;
}

.marker-label {
  font-size: 12px;
  color: rgba(255, 255, 255, 0.7);
  margin-bottom: 5px;
}

.marker-line {
  width: 1px;
  height: 5px;
  background: rgba(255, 255, 255, 0.3);
}

.progress-bar-track {
  position: relative;
  width: 100%;
  height: 8px;
  background: rgba(255, 255, 255, 0.2);
  border-radius: 4px;
  cursor: pointer;
  overflow: visible;
}

// 过去时间区域（灰色）
.past-time-area {
  position: absolute;
  top: 0;
  left: 0;
  height: 100%;
  background: rgba(156, 163, 175, 0.6); /* 灰色半透明 */
  z-index: 1;
}

.progress-bar-fill {
  height: 100%;
  background: linear-gradient(90deg, #3b82f6 0%, #60a5fa 100%);
  border-radius: 4px;
  transition: width 0s ease; /* 拖动时无过渡效果，确保实时更新 */
}

.current-time-indicator {
  position: absolute;
  top: 50%;
  padding: 15px;
  transform: translate(-50%, -50%);
  cursor: grab;
  z-index: 2;
  
  &:active {
    cursor: grabbing;
  }
}

.indicator-line {
  width: 2px;
  height: 16px;
  background: white;
  box-shadow: 0 0 5px rgba(255, 255, 255, 0.8);
}

// 时间弹出提示（小pop）
.time-tooltip {
  position: absolute;
  bottom: 100%;
  left: 50%;
  transform: translateX(-50%) translateY(-10px);
  background: rgba(15, 23, 51, 0.95);
  color: white;
  padding: 8px 12px;
  border-radius: 6px;
  font-size: 12px;
  white-space: nowrap;
  z-index: 10;
  backdrop-filter: blur(10px);
  border: 1px solid rgba(255, 255, 255, 0.1);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
  
  // 添加动画效果
  animation: tooltipFadeIn 0.2s ease-out;
}

@keyframes tooltipFadeIn {
  from {
    opacity: 0;
    transform: translateX(-50%) translateY(-15px);
  }
  to {
    opacity: 1;
    transform: translateX(-50%) translateY(-10px);
  }
}

.tooltip-arrow {
  position: absolute;
  top: 100%;
  left: 50%;
  transform: translateX(-50%);
  width: 0;
  height: 0;
  border-left: 6px solid transparent;
  border-right: 6px solid transparent;
  border-top: 6px solid rgba(15, 23, 51, 0.95);
}

.current-time-display {
  font-size: 14px;
  color: white;
  min-width: 150px;
  text-align: right;
  font-weight: 500;
}
</style>