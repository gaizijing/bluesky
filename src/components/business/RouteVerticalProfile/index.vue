<template>
  <div
    v-show="visible"
    class="route-vertical-profile-dock"
    role="region"
    aria-label="航线垂直剖面"
  >
    <div class="dock-header">
      <span>垂直剖面</span>
      <span v-if="title" class="dock-sub">{{ title }}</span>
    </div>
    <div ref="chartRef" class="dock-chart" />
    <p class="dock-hint">折线颜色表示风速；点击超过阈值区段可定位到地图。</p>
  </div>
</template>

<script setup>
import { ref, watch, onMounted, onUnmounted, computed, nextTick } from 'vue'
import { storeToRefs } from 'pinia'
import * as echarts from 'echarts'
import { useRouteStore } from '@/store/modules/routeStore'
/** 与默认适飞规则 windSpeedMs.yellow 一致，用于剖面图风速高亮 */
const DEFAULT_WIND_SPEED_YELLOW_MS = 8

const routeStore = useRouteStore()
const { verticalProfileAfterPreview, sessionPathOnMap, currentRoute } = storeToRefs(routeStore)

const chartRef = ref(null)
let chart

const visible = computed(() => {
  if (!verticalProfileAfterPreview.value) return false
  if (!sessionPathOnMap.value) return false
  const r = currentRoute.value
  return !!(r && r.mode === 'session' && Array.isArray(r.pathSamples) && r.pathSamples.length > 1)
})

const title = computed(() => {
  const r = currentRoute.value
  if (!r) return ''
  return `${r.startName || '起点'} → ${r.endName || '终点'}`
})

function buildOption(route) {
  const samples = route.pathSamples || []
  const dist = route.distKm || []
  const wind = route.windAlong || []
  const thr = DEFAULT_WIND_SPEED_YELLOW_MS
  const vmax = Math.max(thr, ...wind.map((w) => w.windSpeed || 0), 0.1)

  const data = samples.map((p, i) => [
    dist[i] ?? 0,
    Math.min(500, Math.max(0, p.alt || 0)),
    wind[i]?.windSpeed ?? 0
  ])

  return {
    grid: { left: 56, right: 40, top: 32, bottom: 52 },
    tooltip: { trigger: 'axis' },
    visualMap: {
      show: true,
      dimension: 2,
      min: 0,
      max: vmax,
      orient: 'horizontal',
      left: 'center',
      bottom: 4,
      inRange: {
        color: ['#1d4ed8', '#22c55e', '#eab308', '#ef4444']
      },
      text: ['高', '低'],
      textStyle: { color: '#94a3b8', fontSize: 10 }
    },
    xAxis: {
      type: 'value',
      name: '距离 (km)',
      nameTextStyle: { color: '#94a3b8' },
      axisLabel: { color: '#94a3b8' },
      splitLine: { lineStyle: { color: 'rgba(148,163,184,0.15)' } }
    },
    yAxis: {
      type: 'value',
      name: '高度 (m)',
      min: 0,
      max: 500,
      nameTextStyle: { color: '#94a3b8' },
      axisLabel: { color: '#94a3b8' },
      splitLine: { lineStyle: { color: 'rgba(148,163,184,0.15)' } }
    },
    series: [
      {
        type: 'line',
        smooth: 0.35,
        symbol: 'circle',
        symbolSize: 6,
        lineStyle: { width: 3 },
        data,
        encode: { x: 0, y: 1, tooltip: [0, 1, 2] }
      }
    ]
  }
}

function refreshChart() {
  const route = currentRoute.value
  if (!chart || !route?.pathSamples?.length) return
  chart.setOption(buildOption(route), true)
}

watch(
  currentRoute,
  async () => {
    if (!visible.value) {
      chart?.clear()
      return
    }
    await nextTick()
    if (!chart && chartRef.value) {
      chart = echarts.init(chartRef.value)
      chart.on('click', onChartClick)
    }
    refreshChart()
  },
  { deep: true }
)

function onChartClick(params) {
  const route = currentRoute.value
  if (!route?.pathSamples?.length) return
  const idx = params?.dataIndex
  if (idx == null || idx < 0) return
  const ws = route.windAlong?.[idx]?.windSpeed ?? 0
  const thr = DEFAULT_WIND_SPEED_YELLOW_MS
  if (ws < thr) return
  const p = route.pathSamples[idx]
  if (!p) return
  window.dispatchEvent(
    new CustomEvent('route-vertical-flyto', {
      detail: { lon: p.lon, lat: p.lat, height: p.alt ?? 300 }
    })
  )
}

onMounted(async () => {
  await nextTick()
  if (chartRef.value && !chart) {
    chart = echarts.init(chartRef.value)
    chart.on('click', onChartClick)
  }
  window.addEventListener('resize', resize)
  refreshChart()
})

onUnmounted(() => {
  window.removeEventListener('resize', resize)
  chart?.dispose()
  chart = null
})

function resize() {
  chart?.resize()
}
</script>

<style scoped lang="scss">
.route-vertical-profile-dock {
  position: fixed;
  z-index: 12;
  left: 0;
  right: 0;
  bottom: 0;
  width: 100%;
  height: min(32vh, 280px);
  min-height: 200px;
  background: rgba(15, 23, 42, 0.92);
  border-top: 1px solid rgba(148, 163, 184, 0.4);
  border-radius: 0;
  box-shadow: 0 -8px 32px rgba(0, 0, 0, 0.35);
  display: flex;
  flex-direction: column;
  pointer-events: auto;
}

.dock-header {
  display: flex;
  align-items: baseline;
  gap: 10px;
  padding: 8px 12px 0;
  font-size: 13px;
  font-weight: 600;
  color: #e2e8f0;
}

.dock-sub {
  font-weight: 400;
  font-size: 12px;
  color: #94a3b8;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.dock-chart {
  flex: 1;
  min-height: 0;
}

.dock-hint {
  margin: 0;
  padding: 0 12px 6px;
  font-size: 11px;
  color: #64748b;
}
</style>
