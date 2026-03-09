<!-- src/components/business/SurveillanceFootage/index.vue -->
<template>
  <div class="surveillance-footage">
    <div class="camera-grid">
      <div class="camera-item" v-for="(camera, index) in cameras" :key="camera.id" @click="selectCamera(index)"
        :class="{ active: selectedCameraIndex === index }">
        <div class="camera-view">
          <div v-if="camera.status === 'online'" class="video-container">
            <img :src="camera.previewImage || defaultImage" :alt="camera.name" class="camera-preview"
              @error="handleImageError" />
            <div class="camera-overlay">
              <div class="camera-name">{{ camera.name }}</div>
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
import { ref, onMounted } from 'vue';
import { getCameras } from '@/api';
import defaultImage from '@/assets/images/Monitoring1.jpg';

// 当前选中的摄像头索引
const selectedCameraIndex = ref(0);

// 摄像头数据
const cameras = ref([]);
const loading = ref(false);

// 加载摄像头数据
const loadCameras = async () => {
  loading.value = true;

  const data = await getCameras();
  if (data && Array.isArray(data)) {
    cameras.value = data.map((camera, index) => ({
      ...camera,
      // 如果没有预览图，使用默认图片
      previewImage: camera.previewImage || getDefaultImage(index)
    }));
  }
  loading.value = false;
};

// 获取默认图片
const getDefaultImage = (index) => {
  // 动态导入默认图片
  const images = [
    new URL('@/assets/images/Monitoring1.jpg', import.meta.url).href,
    new URL('@/assets/images/Monitoring2.jpg', import.meta.url).href,
    new URL('@/assets/images/Monitoring3.jpg', import.meta.url).href,
    new URL('@/assets/images/Monitoring4.jpg', import.meta.url).href
  ];
  return images[index % images.length];
};

// 图片加载失败处理
const handleImageError = (event) => {
  event.target.src = defaultImage;
};

// 选择摄像头
const selectCamera = (index) => {
  selectedCameraIndex.value = index;
};

// 组件挂载时加载数据
onMounted(() => {
  loadCameras();
});
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
  margin-left: 10px
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

.camera-name {
  font-size: 14px;
  font-weight: bold;
  color: #ffffff;
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

@media (max-width: 768px) {
  .camera-grid {
    gap: 10px;
  }

  .camera-view {
    height: 120px;
  }
}
</style>
