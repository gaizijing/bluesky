<template>
  <div class="surveillance-footage" v-loading="loading">
    <div v-if="!selectedPointId" class="camera-global-empty">
      <div class="camera-global-empty__title">未选择监测点</div>
      <div class="camera-global-empty__text">请先选择监测点，再查看该点位关联的摄像头画面。</div>
    </div>

    <div v-else-if="cameras.length" class="camera-grid">
      <div
        v-for="(camera, index) in cameras"
        :key="camera.id"
        class="camera-item"
        :class="{ active: selectedCameraIndex === index }"
        @click="selectCamera(index)"
      >
        <div class="camera-view">
          <template v-if="camera.status === 'online'">
            <div v-if="camera.previewUrl" class="video-container">
              <img :src="camera.previewUrl" :alt="camera.name" class="camera-preview" />
              <div class="camera-overlay">
                <div class="camera-name">{{ camera.name }}</div>
              </div>
            </div>
            <div v-else class="camera-empty-state">
              <div class="camera-empty-state__title">未配置预览地址</div>
              <div class="camera-empty-state__text">{{ camera.name }}</div>
            </div>
          </template>

          <div v-else class="offline-placeholder">
            <div class="offline-icon">CAM</div>
            <div class="offline-text">摄像头离线</div>
          </div>
        </div>
      </div>
    </div>

    <div v-else class="camera-global-empty">
      <div class="camera-global-empty__title">当前监测点暂无摄像头</div>
      <div class="camera-global-empty__text">接口未返回该监测点关联的摄像头数据。</div>
    </div>
  </div>
</template>

<script setup>
import { computed, onMounted, ref, watch } from 'vue'
import { getCameras } from '@/api'
import { useRegionLandingStore } from '@/store/modules/regionLanding'
import { extractList } from '@/utils/admin'

const landingStore = useRegionLandingStore()
const selectedCameraIndex = ref(0)
const cameras = ref([])
const loading = ref(false)

const selectedPointId = computed(() => {
  const point = landingStore.selectedLandingPoint
  if (!point) {
    return ''
  }
  return String(point.id || point.landingPointId || '').trim()
})

const loadSelectedArea = async () => {
  if (selectedPointId.value || landingStore.landingPoints.length) {
    if (!landingStore.selectedLandingPoint && landingStore.landingPoints.length) {
      landingStore.setSelectedLandingPoint(landingStore.landingPoints[0])
    }
    return
  }
}

const loadCameras = async () => {
  const pointId = selectedPointId.value
  if (!pointId) {
    cameras.value = []
    return
  }

  loading.value = true
  try {
    const data = await getCameras({ pointId })
    cameras.value = extractList(data)
    if (selectedCameraIndex.value >= cameras.value.length) {
      selectedCameraIndex.value = 0
    }
  } catch (error) {
    console.error('加载摄像头数据失败:', error)
    cameras.value = []
  } finally {
    loading.value = false
  }
}

const selectCamera = (index) => {
  selectedCameraIndex.value = index
}

watch(
  () => selectedPointId.value,
  async () => {
    selectedCameraIndex.value = 0
    await loadCameras()
  }
)

onMounted(async () => {
  await loadSelectedArea()
  await loadCameras()
})
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
  margin-left: 10px;
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
    border-color: #409eff;
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

.camera-empty-state,
.offline-placeholder,
.camera-global-empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 100%;
  text-align: center;
}

.camera-empty-state {
  gap: 6px;
  padding: 12px;
  background: linear-gradient(135deg, rgba(19, 33, 61, 0.95), rgba(11, 18, 35, 0.92));
}

.camera-empty-state__title,
.camera-global-empty__title {
  color: #d9ecff;
  font-size: 14px;
  font-weight: 700;
}

.camera-empty-state__text,
.camera-global-empty__text {
  color: rgba(217, 236, 255, 0.66);
  font-size: 12px;
  line-height: 1.5;
}

.offline-placeholder {
  background: rgba(0, 0, 0, 0.3);
}

.offline-icon {
  display: grid;
  place-items: center;
  width: 44px;
  height: 44px;
  border-radius: 999px;
  background: rgba(245, 108, 108, 0.16);
  color: #f56c6c;
  font-size: 14px;
  font-weight: 700;
  letter-spacing: 0.08em;
}

.offline-text {
  margin-top: 10px;
  color: #f56c6c;
  font-size: 14px;
}

.camera-global-empty {
  flex: 1;
  min-height: 180px;
  margin-left: 10px;
  border-radius: 8px;
  border: 1px dashed rgba(255, 255, 255, 0.16);
  background: rgba(8, 18, 36, 0.6);
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
