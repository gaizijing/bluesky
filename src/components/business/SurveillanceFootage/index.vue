<template>
  <div class="surveillance-footage" v-loading="loading">
    <div v-if="!selectedPointId" class="camera-empty-panel">
      <div class="camera-empty-panel__icon">📹</div>
      <div class="camera-empty-panel__title">未选择监测点</div>
      <div class="camera-empty-panel__text">请先选择起降点，再查看关联摄像头画面。</div>
    </div>

    <template v-else-if="cameras.length">
      <div class="camera-toolbar">
        <span class="camera-toolbar__label">实时监控</span>
        <span class="camera-toolbar__stat">
          <span class="dot dot--online" />{{ onlineCount }} 在线
          <span class="dot dot--offline" />{{ offlineCount }} 离线
        </span>
      </div>

      <div class="camera-grid">
        <button
          v-for="(camera, index) in cameras"
          :key="camera.id"
          type="button"
          class="camera-card"
          :class="{
            'camera-card--offline': camera.status !== 'online',
            'camera-card--active': previewCamera?.id === camera.id,
          }"
          @click="openPreview(camera, index)"
        >
          <div class="camera-card__view">
            <template v-if="camera.status === 'online' && camera.previewUrl">
              <img :src="camera.previewUrl" :alt="camera.name" class="camera-card__img" loading="lazy" />
              <div class="camera-card__scan" aria-hidden="true" />
              <span class="camera-card__live">LIVE</span>
            </template>

            <template v-else-if="camera.status === 'online'">
              <div class="camera-card__placeholder">
                <el-icon :size="28"><VideoCamera /></el-icon>
                <span>未配置预览</span>
              </div>
            </template>

            <template v-else>
              <div class="camera-card__offline">
                <el-icon :size="32"><VideoCameraFilled /></el-icon>
                <span>设备离线</span>
              </div>
            </template>

            <div class="camera-card__footer">
              <span class="camera-card__name">{{ camera.name }}</span>
              <span class="camera-card__expand">
                <el-icon><FullScreen /></el-icon>
              </span>
            </div>
          </div>
        </button>
      </div>
    </template>

    <div v-else class="camera-empty-panel">
      <div class="camera-empty-panel__icon">📹</div>
      <div class="camera-empty-panel__title">暂无摄像头</div>
      <div class="camera-empty-panel__text">当前起降点未配置监控设备。</div>
    </div>

    <DialogContainer
      :visible="dialogVisible"
      :title="dialogTitle"
      :close-on-click-mask="true"
      @close="closePreview"
    >
      <div v-if="previewCamera" class="camera-dialog">
        <div class="camera-dialog__stage">
          <template v-if="previewCamera.status === 'online' && previewImageUrl">
            <img
              :src="previewImageUrl"
              :alt="previewCamera.name"
              class="camera-dialog__img"
            />
            <span class="camera-dialog__live">实时画面</span>
          </template>
          <div v-else class="camera-dialog__offline">
            <el-icon :size="48"><VideoCameraFilled /></el-icon>
            <p>{{ previewCamera.status === 'online' ? '暂无预览地址' : '摄像头离线，无法查看实时画面' }}</p>
          </div>
        </div>

        <div class="camera-dialog__meta">
          <div class="meta-row">
            <span class="meta-label">设备名称</span>
            <span class="meta-value">{{ previewCamera.name }}</span>
          </div>
          <div class="meta-row">
            <span class="meta-label">运行状态</span>
            <span
              class="meta-badge"
              :class="previewCamera.status === 'online' ? 'meta-badge--online' : 'meta-badge--offline'"
            >
              {{ previewCamera.status === 'online' ? '在线' : '离线' }}
            </span>
          </div>
          <div v-if="previewCamera.location" class="meta-row">
            <span class="meta-label">安装位置</span>
            <span class="meta-value">{{ previewCamera.location }}</span>
          </div>
          <div v-if="previewCamera.resolution" class="meta-row">
            <span class="meta-label">分辨率</span>
            <span class="meta-value">{{ previewCamera.resolution }}</span>
          </div>
        </div>

        <div class="camera-dialog__nav">
          <button
            type="button"
            class="nav-btn"
            :disabled="previewIndex <= 0"
            @click="switchPreview(-1)"
          >
            上一路
          </button>
          <span class="nav-indicator">{{ previewIndex + 1 }} / {{ cameras.length }}</span>
          <button
            type="button"
            class="nav-btn"
            :disabled="previewIndex >= cameras.length - 1"
            @click="switchPreview(1)"
          >
            下一路
          </button>
        </div>
      </div>
    </DialogContainer>
  </div>
</template>

<script setup>
import { computed, onMounted, onUnmounted, ref, watch } from 'vue'
import { FullScreen, VideoCamera, VideoCameraFilled } from '@element-plus/icons-vue'
import { getCameras, getCameraPreview } from '@/api'
import { useRegionLandingStore } from '@/store/modules/regionLanding'
import { extractList } from '@/utils/admin'
import DialogContainer from '@/components/common/DialogContainer.vue'

const USE_MOCK_WHEN_EMPTY = import.meta.env.VITE_SURVEILLANCE_MOCK !== 'false'

function buildMockCameras(pointId) {
  const seed = String(pointId || 'demo').replace(/\W/g, '')
  return [
    {
      id: `MOCK-${seed}-1`,
      name: '东侧全景',
      location: '东侧围栏',
      resolution: '1920×1080',
      status: 'online',
      previewUrl: `https://picsum.photos/seed/${seed}-east/1280/720`,
    },
    {
      id: `MOCK-${seed}-2`,
      name: '跑道入口',
      location: '起降区主入口',
      resolution: '2560×1440',
      status: 'online',
      previewUrl: `https://picsum.photos/seed/${seed}-runway/1280/720`,
    },
    {
      id: `MOCK-${seed}-3`,
      name: '机库门口',
      location: '机库南侧',
      resolution: '1920×1080',
      status: 'offline',
      previewUrl: null,
    },
    {
      id: `MOCK-${seed}-4`,
      name: '北侧监控',
      location: '北侧道路',
      resolution: '1280×720',
      status: 'online',
      previewUrl: `https://picsum.photos/seed/${seed}-north/1280/720`,
    },
  ]
}

const landingStore = useRegionLandingStore()
const cameras = ref([])
const loading = ref(false)
const dialogVisible = ref(false)
const previewCamera = ref(null)
const previewIndex = ref(0)
const previewImageUrl = ref('')

const selectedPointId = computed(() => {
  const point = landingStore.selectedLandingPoint
  if (!point) return ''
  return String(point.id || point.landingPointId || '').trim()
})

const onlineCount = computed(() =>
  cameras.value.filter((c) => c.status === 'online').length
)
const offlineCount = computed(() => cameras.value.length - onlineCount.value)

const dialogTitle = computed(() => {
  if (!previewCamera.value) return '实时监控'
  const pointName = landingStore.selectedLandingPoint?.name || selectedPointId.value
  return `${pointName} · ${previewCamera.value.name}`
})

async function resolvePreviewUrl(camera) {
  if (!camera || camera.status !== 'online') return ''
  if (String(camera.id).startsWith('MOCK-')) {
    return camera.previewUrl || ''
  }
  if (camera.previewUrl) return camera.previewUrl
  try {
    const res = await getCameraPreview(camera.id)
    return typeof res === 'string' ? res : (res?.url || res?.previewUrl || '')
  } catch {
    return camera.previewUrl || ''
  }
}

async function openPreview(camera, index) {
  previewCamera.value = camera
  previewIndex.value = index
  previewImageUrl.value = await resolvePreviewUrl(camera)
  dialogVisible.value = true
}

function closePreview() {
  dialogVisible.value = false
  previewCamera.value = null
  previewImageUrl.value = ''
}

async function switchPreview(delta) {
  const next = previewIndex.value + delta
  if (next < 0 || next >= cameras.value.length) return
  previewIndex.value = next
  previewCamera.value = cameras.value[next]
  previewImageUrl.value = await resolvePreviewUrl(previewCamera.value)
}

function onKeydown(e) {
  if (!dialogVisible.value) return
  if (e.key === 'Escape') closePreview()
  if (e.key === 'ArrowLeft') switchPreview(-1)
  if (e.key === 'ArrowRight') switchPreview(1)
}

async function loadCameras() {
  const pointId = selectedPointId.value
  if (!pointId) {
    cameras.value = []
    return
  }

  loading.value = true
  try {
    const data = await getCameras({ pointId })
    const list = extractList(data)
    cameras.value = list.length
      ? list
      : (USE_MOCK_WHEN_EMPTY ? buildMockCameras(pointId) : [])
  } catch (error) {
    console.error('加载摄像头数据失败:', error)
    cameras.value = USE_MOCK_WHEN_EMPTY ? buildMockCameras(pointId) : []
  } finally {
    loading.value = false
  }
}

watch(
  () => selectedPointId.value,
  async () => {
    closePreview()
    await loadCameras()
  }
)

onMounted(async () => {
  if (!landingStore.selectedLandingPoint && landingStore.landingPoints.length) {
    landingStore.setSelectedLandingPoint(landingStore.landingPoints[0])
  }
  await loadCameras()
  window.addEventListener('keydown', onKeydown)
})

onUnmounted(() => {
  window.removeEventListener('keydown', onKeydown)
})
</script>

<style scoped lang="scss">
.surveillance-footage {
  height: 100%;
  min-height: 0;
  display: flex;
  flex-direction: column;
  padding: 4px 2px 0;
}

.camera-toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 8px;
  padding: 0 2px;
}

.camera-toolbar__label {
  font-size: 12px;
  font-weight: 600;
  color: #cbd5e1;
  letter-spacing: 0.04em;
}

.camera-toolbar__stat {
  display: inline-flex;
  align-items: center;
  gap: 10px;
  font-size: 11px;
  color: #94a3b8;
}

.dot {
  display: inline-block;
  width: 6px;
  height: 6px;
  border-radius: 50%;
  margin-right: 4px;

  &--online {
    background: #22c55e;
    box-shadow: 0 0 6px rgba(34, 197, 94, 0.7);
  }

  &--offline {
    background: #ef4444;
    box-shadow: 0 0 6px rgba(239, 68, 68, 0.5);
  }
}

.camera-grid {
  flex: 1;
  min-height: 0;
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  grid-template-rows: repeat(2, minmax(0, 1fr));
  gap: 8px;
}

.camera-card {
  position: relative;
  padding: 0;
  border: 1px solid rgba(59, 130, 246, 0.22);
  border-radius: 10px;
  background: linear-gradient(160deg, rgba(12, 24, 48, 0.95), rgba(8, 14, 28, 0.92));
  overflow: hidden;
  cursor: pointer;
  text-align: left;
  transition: transform 0.2s ease, border-color 0.2s ease, box-shadow 0.2s ease;

  &:hover {
    transform: translateY(-2px);
    border-color: rgba(96, 165, 250, 0.55);
    box-shadow: 0 8px 24px rgba(15, 23, 51, 0.45), 0 0 0 1px rgba(59, 130, 246, 0.15);
  }

  &--active {
    border-color: rgba(96, 165, 250, 0.85);
    box-shadow: 0 0 0 1px rgba(59, 130, 246, 0.35), 0 0 18px rgba(37, 99, 235, 0.25);
  }

  &--offline {
    opacity: 0.88;
  }
}

.camera-card__view {
  position: relative;
  height: 100%;
  min-height: 96px;
  overflow: hidden;
}

.camera-card__img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
  filter: saturate(1.05) contrast(1.02);
}

.camera-card__scan {
  position: absolute;
  inset: 0;
  background: linear-gradient(
    180deg,
    transparent 0%,
    rgba(59, 130, 246, 0.08) 50%,
    transparent 100%
  );
  background-size: 100% 200%;
  animation: scan 3s linear infinite;
  pointer-events: none;
}

@keyframes scan {
  0% { background-position: 0 -100%; }
  100% { background-position: 0 100%; }
}

.camera-card__live {
  position: absolute;
  top: 6px;
  left: 6px;
  padding: 2px 6px;
  border-radius: 4px;
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 0.06em;
  color: #fff;
  background: rgba(220, 38, 38, 0.85);
  box-shadow: 0 0 8px rgba(220, 38, 38, 0.4);
}

.camera-card__footer {
  position: absolute;
  left: 0;
  right: 0;
  bottom: 0;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 6px;
  padding: 20px 8px 6px;
  background: linear-gradient(180deg, transparent, rgba(0, 0, 0, 0.78));
}

.camera-card__name {
  flex: 1;
  min-width: 0;
  font-size: 11px;
  font-weight: 600;
  color: #f1f5f9;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.camera-card__expand {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 22px;
  height: 22px;
  border-radius: 6px;
  color: #93c5fd;
  background: rgba(59, 130, 246, 0.2);
  flex-shrink: 0;
}

.camera-card__placeholder,
.camera-card__offline {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 6px;
  height: 100%;
  color: #64748b;
  font-size: 11px;
}

.camera-card__offline {
  color: #f87171;
  background: radial-gradient(circle at center, rgba(127, 29, 29, 0.15), transparent 70%);
}

.camera-empty-panel {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 8px;
  min-height: 160px;
  border-radius: 10px;
  border: 1px dashed rgba(59, 130, 246, 0.25);
  background: rgba(8, 18, 36, 0.55);
  text-align: center;
  padding: 16px;
}

.camera-empty-panel__icon {
  font-size: 28px;
  opacity: 0.7;
}

.camera-empty-panel__title {
  font-size: 14px;
  font-weight: 600;
  color: #e2e8f0;
}

.camera-empty-panel__text {
  font-size: 12px;
  color: #94a3b8;
  line-height: 1.5;
  max-width: 220px;
}

/* 弹窗内容 */
.camera-dialog__stage {
  position: relative;
  width: 100%;
  aspect-ratio: 16 / 9;
  border-radius: 8px;
  overflow: hidden;
  background: #0a1220;
  border: 1px solid rgba(59, 130, 246, 0.25);
  margin-bottom: 16px;
}

.camera-dialog__img {
  width: 100%;
  height: 100%;
  object-fit: contain;
  background: #000;
}

.camera-dialog__live {
  position: absolute;
  top: 10px;
  left: 10px;
  padding: 4px 10px;
  border-radius: 6px;
  font-size: 12px;
  font-weight: 600;
  color: #fff;
  background: rgba(220, 38, 38, 0.88);
}

.camera-dialog__offline {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 12px;
  height: 100%;
  color: #94a3b8;

  p {
    margin: 0;
    font-size: 14px;
  }
}

.camera-dialog__meta {
  display: grid;
  gap: 10px;
  padding: 12px 14px;
  border-radius: 8px;
  background: rgba(15, 23, 51, 0.6);
  border: 1px solid rgba(255, 255, 255, 0.06);
  margin-bottom: 16px;
}

.meta-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  font-size: 13px;
}

.meta-label {
  color: #94a3b8;
  flex-shrink: 0;
}

.meta-value {
  color: #e2e8f0;
  text-align: right;
}

.meta-badge {
  padding: 2px 10px;
  border-radius: 999px;
  font-size: 12px;
  font-weight: 600;

  &--online {
    color: #86efac;
    background: rgba(34, 197, 94, 0.15);
    border: 1px solid rgba(34, 197, 94, 0.35);
  }

  &--offline {
    color: #fca5a5;
    background: rgba(239, 68, 68, 0.12);
    border: 1px solid rgba(239, 68, 68, 0.3);
  }
}

.camera-dialog__nav {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 16px;
}

.nav-btn {
  padding: 6px 16px;
  border-radius: 8px;
  border: 1px solid rgba(59, 130, 246, 0.4);
  background: rgba(59, 130, 246, 0.15);
  color: #bfdbfe;
  font-size: 13px;
  cursor: pointer;
  transition: background 0.15s ease, border-color 0.15s ease;

  &:hover:not(:disabled) {
    background: rgba(59, 130, 246, 0.3);
    border-color: rgba(96, 165, 250, 0.6);
    color: #fff;
  }

  &:disabled {
    opacity: 0.35;
    cursor: not-allowed;
  }
}

.nav-indicator {
  font-size: 13px;
  color: #94a3b8;
  min-width: 64px;
  text-align: center;
}

@media (max-width: 768px) {
  .camera-card__view {
    min-height: 110px;
  }
}
</style>

<style lang="scss">
/* 加宽监控弹窗 */
.dialog-mask .dialog-container:has(.camera-dialog) {
  width: min(920px, 92vw);
  max-height: 92vh;
}
</style>
