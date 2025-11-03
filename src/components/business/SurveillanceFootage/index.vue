<!-- src/components/business/SurveillanceFootage/index.vue -->
<template>
  <div class="surveillance-footage">
    <div class="panel-header">
      <span class="panel-title">实时监控画面</span>
    </div>
    
    <div class="camera-grid">
      <div 
        class="camera-item"
        v-for="(camera, index) in cameras"
        :key="camera.id"
        @click="selectCamera(index)"
        :class="{ active: selectedCameraIndex === index }"
      >
        <div class="camera-view">
          <div v-if="camera.status === 'online'" class="video-container">
            <!-- 实际项目中这里会是视频流 -->
            <img 
              :src="camera.previewImage" 
              :alt="camera.name" 
              class="camera-preview"
            />
            <div class="camera-overlay">
                 <div class="camera-name">{{ camera.name }}</div>
          <!-- <div class="camera-status" :class="camera.status">
            <span class="status-indicator"></span>
            {{ camera.status === 'online' ? '在线' : '离线' }}
          </div> -->
              <!-- <div class="camera-time">{{ getCurrentTime() }}</div> -->
            </div>
          </div>
          
          <div v-else class="offline-placeholder">
            <div class="offline-icon">📷</div>
            <div class="offline-text">摄像头离线</div>
          </div>
        </div>
        
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue';
import monitoringImg1 from '@/assets/images/Monitoring1.jpg';
import monitoringImg2 from '@/assets/images/Monitoring2.jpg';
import monitoringImg3 from '@/assets/images/Monitoring3.jpg';
import monitoringImg4 from '@/assets/images/Monitoring4.jpg';



// 当前选中的摄像头索引
const selectedCameraIndex = ref(0);

// 摄像头数据
const cameras = ref([
  {
    id: 1,
    name: '气象站监控01',
    location: 'A区气象站',
    status: 'online',
    resolution: '1920x1080',
    previewImage: monitoringImg1
  },
  {
    id: 2,
    name: '雷达站监控01',
    location: 'B区雷达站',
    status: 'online',
    resolution: '1280x720',
    previewImage: monitoringImg2
  },
  {
    id: 3,
    name: '观测塔监控01',
    location: 'C区观测塔',
    status: 'offline',
    resolution: '1920x1080',
    previewImage: monitoringImg3
  },
  {
    id: 4,
    name: '指挥中心监控01',
    location: 'D区指挥中心',
    status: 'online',
    resolution: '2560x1440',
    previewImage: monitoringImg4
  }
]);

// 选择摄像头
const selectCamera = (index) => {
  selectedCameraIndex.value = index;
};

// 获取当前时间
const getCurrentTime = () => {
  const now = new Date();
  return now.toLocaleString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false
  });
};

// 定时更新时间（可选）
// import { onMounted, onUnmounted } from 'vue';
// let timer = null;
// onMounted(() => {
//   timer = setInterval(() => {
//     // 触发重新渲染
//   }, 1000);
// });
// onUnmounted(() => {
//   if (timer) clearInterval(timer);
// });
</script>

<style scoped lang="scss">
.surveillance-footage {
  height: 100%;
  display: flex;
  flex-direction: column;
}


.camera-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  grid-template-rows: repeat(2, 1fr);
  gap: 5px;
  flex: 1;
  margin-left:10px
}

.camera-item {
  background: rgba(15, 23, 51, 0.7);
  border-radius: 8px;
  overflow: hidden;
  transition: all 0.3s ease;
  border: 1px solid rgba(255, 255, 255, 0.1);
  
  &:hover {
    transform: translateY(-3px);
    box-shadow: 0 5px 15px rgba(0, 0, 0, 0.3);
    border-color: rgba(64, 158, 255, 0.5);
  }
  
  &.active {
    border-color: #409EFF;
    box-shadow: 0 0 15px rgba(64, 158, 255, 0.5);
  }
}

.camera-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 10px;
  background: rgba(10, 15, 35, 0.8);
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
}

.camera-name {
  font-size: 14px;
  font-weight: bold;
  color: #ffffff;
}

.camera-status {
  display: flex;
  align-items: center;
  font-size: 12px;
  
  &.online {
    color: #67C23A;
  }
  
  &.offline {
    color: #F56C6C;
  }
}

.status-indicator {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  margin-right: 5px;
  
  .online & {
    background-color: #67C23A;
    box-shadow: 0 0 5px #67C23A;
  }
  
  .offline & {
    background-color: #F56C6C;
  }
}

.camera-view {
  position: relative;
  height: 105px;
  overflow: hidden;
}

.video-container {
  position: relative;
  width: 100%;
  height: 100%;
}

.camera-preview {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.camera-overlay {
  position: absolute;
  top: 5px;
  right: 5px;
  background: rgba(0, 0, 0, 0.5);
  padding: 2px 8px;
  border-radius: 4px;
}

.camera-time {
  color: #ffffff;
  font-size: 12px;
  font-family: 'monospace';
}

.offline-placeholder {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 100%;
  background: rgba(0, 0, 0, 0.3);
}

.offline-icon {
  font-size: 32px;
  margin-bottom: 10px;
  opacity: 0.5;
}

.offline-text {
  color: #F56C6C;
  font-size: 14px;
}

.camera-info {
  padding: 10px;
  background: rgba(15, 23, 51, 0.5);
}

.info-item {
  display: flex;
  justify-content: space-between;
  margin-bottom: 5px;
  
  &:last-child {
    margin-bottom: 0;
  }
}

.info-label {
  color: #b3c7e6;
  font-size: 12px;
}

.info-value {
  color: #ffffff;
  font-size: 12px;
  font-weight: 500;
}

// 响应式调整
@media (max-width: 768px) {
  .camera-grid {
    gap: 10px;
  }
  
  .camera-view {
    height: 120px;
  }
}
</style>