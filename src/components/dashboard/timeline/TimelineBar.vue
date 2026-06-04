<template>
  <div class="timeline-bar" :style="{ height: `${barHeight}px` }">
    <div class="timeline-bar__track" ref="trackRef" @click="onTrackClick">
      <div class="timeline-bar__fill" :style="{ width: fillWidth }" />
      <div class="timeline-bar__thumb" :style="{ left: fillWidth }" @mousedown.prevent="startDrag" />
    </div>
    <span class="timeline-bar__current">{{ currentLabel }}</span>
    <el-button v-if="showBackToNow" size="small" class="timeline-bar__now" @click="backToNow">
      回到当前
    </el-button>
  </div>
</template>

<script setup>
import { computed, onMounted, onUnmounted, ref } from 'vue';
import dashboardConfig from '@/config/dashboard.config.json';
import { useAppDashboardStore } from '@/store/modules/appDashboard';
import { parseOrNow } from '@/utils/timeBucket';

const appStore = useAppDashboardStore();
const barHeight = dashboardConfig.main.timeline.height ?? 48;
const showBackToNow = dashboardConfig.main.timeline.showBackToNow !== false;

const trackRef = ref(null);
const dragging = ref(false);
/** 拖动中仅更新 UI，松手后再 setTimelineTime，避免连续触发 MET_TIME_CHANGED */
const dragPreviewMs = ref(null);
let lastDragClientX = null;

const rangeHours = 24;
const startTime = computed(() => {
  const now = new Date();
  now.setMinutes(0, 0, 0);
  return now;
});
const endTime = computed(() => new Date(startTime.value.getTime() + rangeHours * 3600000));

const currentDate = computed(() => parseOrNow(appStore.timelineTime));

const displayDate = computed(() => {
  if (dragPreviewMs.value != null) return new Date(dragPreviewMs.value);
  return currentDate.value;
});

const progress = computed(() => {
  const total = endTime.value - startTime.value;
  if (total <= 0) return 0;
  return Math.max(0, Math.min(1, (displayDate.value - startTime.value) / total));
});

const fillWidth = computed(() => `${progress.value * 100}%`);

function fmtTime(date) {
  const h = String(date.getHours()).padStart(2, '0');
  const m = String(date.getMinutes()).padStart(2, '0');
  return `${h}:${m}`;
}

function fmtDateTime(date) {
  const mo = String(date.getMonth() + 1).padStart(2, '0');
  const da = String(date.getDate()).padStart(2, '0');
  return `${mo}-${da} ${fmtTime(date)}`;
}

const currentLabel = computed(() => fmtDateTime(displayDate.value));

function snapToQuarterHour(date) {
  const snapped = new Date(date);
  const q = Math.round(snapped.getMinutes() / 15) * 15;
  snapped.setMinutes(q, 0, 0);
  return snapped;
}

function timeFromClientX(clientX) {
  if (!trackRef.value) return null;
  const rect = trackRef.value.getBoundingClientRect();
  const ratio = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
  const ms = startTime.value.getTime() + ratio * (endTime.value - startTime.value);
  return snapToQuarterHour(new Date(ms));
}

function previewFromClientX(clientX) {
  const snapped = timeFromClientX(clientX);
  if (snapped) dragPreviewMs.value = snapped.getTime();
}

function commitFromClientX(clientX) {
  const snapped = timeFromClientX(clientX);
  if (!snapped) return;
  dragPreviewMs.value = null;
  appStore.setTimelineTime(snapped);
}

function onTrackClick(e) {
  commitFromClientX(e.clientX);
}

function onMouseMove(e) {
  if (!dragging.value) return;
  lastDragClientX = e.clientX;
  previewFromClientX(e.clientX);
}

function onMouseUp(e) {
  if (dragging.value) {
    const x = e?.clientX ?? lastDragClientX;
    if (x != null) commitFromClientX(x);
  }
  dragging.value = false;
  dragPreviewMs.value = null;
  lastDragClientX = null;
  document.removeEventListener('mousemove', onMouseMove);
  document.removeEventListener('mouseup', onMouseUp);
}

function startDrag() {
  dragging.value = true;
  lastDragClientX = null;
  document.addEventListener('mousemove', onMouseMove);
  document.addEventListener('mouseup', onMouseUp);
}

function backToNow() {
  appStore.backToNow();
}

onMounted(() => {
  if (!appStore.timelineTime) appStore.backToNow();
});

onUnmounted(onMouseUp);
</script>

<style scoped lang="scss">
.timeline-bar {
  position: absolute;
  left: 0;
  right: 0;
  bottom: 0;
  z-index: 18;
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 8px 20px;
  background: rgba(15, 23, 51, 0.92);
  border-top: 1px solid rgba(255, 255, 255, 0.08);
  box-sizing: border-box;
}

.timeline-bar__track {
  position: relative;
  flex: 1;
  height: 8px;
  background: rgba(255, 255, 255, 0.15);
  border-radius: 4px;
  cursor: pointer;
}

.timeline-bar__fill {
  height: 100%;
  background: linear-gradient(90deg, #2563eb, #60a5fa);
  border-radius: 4px;
}

.timeline-bar__thumb {
  position: absolute;
  top: 50%;
  width: 14px;
  height: 14px;
  margin-left: -7px;
  transform: translateY(-50%);
  border-radius: 50%;
  background: #fff;
  box-shadow: 0 0 8px rgba(96, 165, 250, 0.8);
  cursor: grab;
}

.timeline-bar__current {
  flex-shrink: 0;
  font-size: 12px;
  color: #60a5fa;
  font-weight: 600;
  min-width: 96px;
  text-align: center;
}

.timeline-bar__now {
  flex-shrink: 0;
}
</style>
