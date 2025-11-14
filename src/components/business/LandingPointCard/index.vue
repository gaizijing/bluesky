<template>
  <div class="landing-point-card">
  

    <!-- 起降点选择器 -->
    <div class="title-bar">
      <button class="title-bar-button" @click="togglePointSelector">
        切换起降点
      </button>
      
      <!-- 监测点列表弹窗 -->
      <div 
        v-if="showPointSelector" 
        class="dialog-mask"
        @click="togglePointSelector"
      >
        <div class="dialog-container" @click.stop>
          <div class="dialog-header">
            <h3>选择起降点</h3>
            <button class="dialog-close" @click="togglePointSelector">×</button>
          </div>
          <div class="dialog-content">
             <MonitoringPoints 
            ref="monitoringPointsRef"
            @point-selected="handlePointSelected"
            :show-header="false"
          />
          </div>
         
        </div>
      </div>
    </div>

    <!-- 核心数据区 -->
    <div class="card-body">
      <!-- 风速卡片 -->
      <div class="data-panel wind-speed-panel">
        <div class="panel-label">
          <span>实时风速</span>
        </div>
        <div class="panel-value">
          <span class="value">{{ weatherData.windSpeed }}</span>
          <span class="unit">m/s</span>
        </div>
        <div class="panel-desc">当前风速稳定，适合起降</div>
      </div>

      <!-- 风切变等级卡片 -->
      <div class="data-panel wind-shear-panel" :class="`level-${weatherData.windShearLevel}`">
        <div class="panel-label">
          <span>风切变等级</span>
        </div>
        <div class="panel-value">
          <span class="value">{{ windShearMap[weatherData.windShearLevel] }}</span>
          <span class="level-tag" :class="`tag-${weatherData.windShearLevel}`">
            {{ weatherData.windShearLevel.toUpperCase() }}
          </span>
        </div>
        <div class="panel-desc" :class="`desc-${weatherData.windShearLevel}`">
          {{ windShearDesc[weatherData.windShearLevel] }}
        </div>
      </div>

      <!-- 稳定度指数卡片 -->
      <div class="data-panel stability-panel">
        <div class="panel-label">
          <span>稳定度指数</span>
        </div>
        <div class="panel-value">
          <span class="value">{{ weatherData.stabilityIndex }}</span>
          <span class="unit">类</span>
        </div>
        <div class="panel-desc">大气状态稳定，气流波动小</div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import MonitoringPoints from '@/components/business/MonitoringPoints/index.vue'

// 卡片核心数据（可对接接口更新）
const currentLandingPoint = ref('A机场无人机起降坪')
const updateTime = ref('2025-11-05 15:32:45')
const isRefreshing = ref(false)
const showPointSelector = ref(false)
const monitoringPointsRef = ref(null)

const weatherData = ref({
  windSpeed: 7.8, // 实时风速
  windShearLevel: 'medium', // 风切变等级：low/medium/high
  stabilityIndex: 'C' // 稳定度指数
})

// 风切变等级映射（颜色+文本）
const windShearMap = ref({
  low: '低',
  medium: '中',
  high: '高'
})

// 风切变等级描述
const windShearDesc = ref({
  low: '风切变微弱，对起降无影响',
  medium: '存在中等风切变，需谨慎操作',
  high: '强风切变风险！建议暂停起降'
})

// 刷新数据（模拟接口请求）
const refreshData = async () => {
  isRefreshing.value = true
  try {
    // 模拟接口延迟
    await new Promise(resolve => setTimeout(resolve, 800))
    // 随机更新数据（实际对接接口时替换）
    weatherData.value = {
      windSpeed: (Math.random() * 6 + 4).toFixed(1),
      windShearLevel: ['low', 'medium', 'high'][Math.floor(Math.random() * 3)],
      stabilityIndex: ['S', 'C', 'A', 'B'][Math.floor(Math.random() * 4)]
    }
    updateTime.value = new Date().toLocaleString('zh-CN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    })
  } catch (err) {
    console.error('数据刷新失败', err)
  } finally {
    isRefreshing.value = false
  }
}

// 切换起降点选择器显示
const togglePointSelector = () => {
  showPointSelector.value = !showPointSelector.value
  if (showPointSelector.value) {
    document.body.style.overflow = 'hidden'
  } else {
    document.body.style.overflow = ''
  }
}

// 处理起降点选择
const handlePointSelected = (point) => {
  if (point && point.type === 'takeoff') {
    currentLandingPoint.value = point.name
    updateTime.value = new Date().toLocaleString('zh-CN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    })
    // 这里可以调用接口获取该起降点的天气数据
    refreshData()
    togglePointSelector()
  }
}

// 对外暴露方法（供地图点击触发更新）
defineExpose({
  updateLandingPoint: (pointName, newData) => {
    currentLandingPoint.value = pointName
    if (newData) weatherData.value = newData
    updateTime.value = new Date().toLocaleString('zh-CN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    })
  }
})
</script>

<style scoped lang="scss">
// 卡片整体样式（大屏科技感核心）
.landing-point-card {
  width: 100%;
  height: 146px;
}

// 卡片头部
.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 15px;
  padding-bottom: 10px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);

  .header-left {
    display: flex;
    align-items: center;
    gap: 12px;

    .card-icon {
      font-size: 24px;
      color: #3b82f6;
    }

    .header-text {
      h3 {
        margin: 0;
        font-size: 18px;
        font-weight: 600;
        color: #ffffff;
      }

      .location {
        margin: 4px 0 0 0;
        font-size: 13px;
        color: #94a3b8;

        .update-time {
          margin-left: 8px;
          color: #60a5fa;
        }
      }
    }
  }

  .refresh-btn {
    width: 36px;
    height: 36px;
    border-radius: 50%;
    background-color: rgba(59, 130, 246, 0.1);
    border: 1px solid rgba(59, 130, 246, 0.3);
    color: #3b82f6;
    font-size: 16px;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: all 0.2s;

    &:hover {
      background-color: rgba(59, 130, 246, 0.2);
      border-color: #3b82f6;
    }

    &:disabled {
      cursor: not-allowed;
      opacity: 0.6;
    }
  }

  .loading-spinner {
    width: 18px;
    height: 18px;
    border: 2px solid #3b82f6;
    border-top-color: transparent;
    border-radius: 50%;
    animation: spin 1s linear infinite;
  }
}


 

  // 起降点选择器弹窗
  .point-selector-modal {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background-color: rgba(0, 0, 0, 0.7);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 1000;
    padding: 20px;

    .modal-content {
      background-color: #0f1733;
      border-radius: 8px;
      width: 100%;
      max-width: 900px;
      max-height: 80vh;
      display: flex;
      flex-direction: column;
      box-shadow: 0 10px 30px rgba(0, 0, 0, 0.4);

      .modal-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 16px 20px;
        border-bottom: 1px solid rgba(255, 255, 255, 0.1);

        h3 {
          margin: 0;
          font-size: 18px;
          color: #ffffff;
          font-weight: 600;
        }

        .close-btn {
          background: none;
          border: none;
          color: #94a3b8;
          font-size: 22px;
          cursor: pointer;
          transition: all 0.2s;
          width: 32px;
          height: 32px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;

          &:hover {
            color: #ffffff;
            background-color: rgba(255, 255, 255, 0.1);
          }
        }
      }
    }
  }


// 核心数据区（三列布局）
.card-body {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 15px;
  height: 160px;
}

// 数据面板通用样式
.data-panel {
  background-color: rgba(255, 255, 255, 0.05);
  background: url("@/assets/images/bg_icon.png");
  background-size: cover;
  background-position: center;
  border-radius: 8px;
  padding: 36px 14px;
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  position: relative;
  overflow: hidden;


  .panel-label {
    display: flex;
    align-items: center;
    gap: 6px;
    font-size: 13px;
    color: #94a3b8;
    margin-bottom: 8px;

    .icon {
      font-size: 14px;
    }
  }

  .panel-value {
    margin-bottom: 6px;
    display: flex;
    align-items: baseline;
    gap: 6px;

    .value {
      font-size: 24px;
      font-weight: 700;
      color: #ffffff;
    }

    .unit {
      font-size: 12px;
      color: #94a3b8;
    }

    .level-tag {
      padding: 2px 8px;
      border-radius: 12px;
      font-size: 11px;
      font-weight: 600;
    }
  }

  .panel-desc {
    font-size: 11px;
    color: #94a3b8;
    line-height: 1.4;
  }
}

// 风速面板专属样式
.wind-speed-panel {
  

  .value {
    color: #3b82f6;
  }
}

// 风切变面板专属样式（颜色区分等级）
.wind-shear-panel {
  &.level-low {
   

    .value {
      color: #10b981;
    }

    .level-tag.tag-low {
      background-color: rgba(16, 185, 129, 0.2);
      color: #10b981;
      border: 1px solid rgba(16, 185, 129, 0.3);
    }

    .panel-desc.desc-low {
      color: #34d399;
    }
  }

  &.level-medium {
    &::before {
    }

    .value {
      color: #f59e0b;
    }

    .level-tag.tag-medium {
      background-color: rgba(245, 158, 11, 0.2);
      color: #f59e0b;
      border: 1px solid rgba(245, 158, 11, 0.3);
    }

    .panel-desc.desc-medium {
      color: #fbbf24;
    }
  }

  &.level-high {
    

    .value {
      color: #ef4444;
      animation: blink 1.5s infinite alternate;
    }

    .level-tag.tag-high {
      background-color: rgba(239, 68, 68, 0.2);
      color: #ef4444;
      border: 1px solid rgba(239, 68, 68, 0.3);
      animation: blink 1.5s infinite alternate;
    }

    .panel-desc.desc-high {
      color: #f87171;
    }
  }
}

// 稳定度面板专属样式
.stability-panel {


  .value {
    color: #8b5cf6;
    font-size: 28px;
  }
}

// 卡片底部
.card-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-top: 20px;
  padding-top: 15px;
  border-top: 1px solid rgba(255, 255, 255, 0.1);
  font-size: 12px;
  color: #94a3b8;

  .status-indicator {
    display: flex;
    align-items: center;
    gap: 6px;

    .status-dot {
      width: 8px;
      height: 8px;
      border-radius: 50%;

      &.online {
        background-color: #10b981;
        box-shadow: 0 0 10px rgba(16, 185, 129, 0.5);
      }
    }
  }

  .data-source {
    color: #64748b;
  }
}

// 动画定义
@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

@keyframes blink {
  from {
    opacity: 0.8;
  }
  to {
    opacity: 1;
  }
}

// 响应式适配
@media (max-width: 768px) {
  .card-body {
    grid-template-columns: 1fr;
    height: auto;
  }

  .landing-point-card {
    height: auto;
    max-width: 100%;
  }
  
  .point-selector-modal {
    padding: 10px;
    
    .modal-content {
      max-height: 90vh;
    }
  }
}
</style>