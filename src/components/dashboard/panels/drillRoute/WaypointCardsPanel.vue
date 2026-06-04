<template>
  <AsyncState
    :loading="loading"
    :error="!!error"
    :empty="!cards.length"
    empty-text="请选择航路"
    :retry="reload"
  >
    <div class="waypoint-cards">
      <article v-for="card in cards" :key="card.sequence" class="waypoint-card">
        <header class="waypoint-card__head">
          <span class="waypoint-card__seq">#{{ card.sequence }}</span>
          <span class="waypoint-card__name">{{ card.name }}</span>
        </header>
        <p class="waypoint-card__coords">
          {{ card.lon.toFixed(4) }}, {{ card.lat.toFixed(4) }} · {{ card.height }}m
        </p>
        <div class="waypoint-card__metrics">
          <span>风 {{ card.windSpeed }}</span>
          <span>能见度 {{ card.visibility }}</span>
          <span>温度 {{ card.temperature }}</span>
        </div>
      </article>
    </div>
  </AsyncState>
</template>

<script setup>
import { ref, watch } from 'vue';
import AsyncState from '@/components/common/AsyncState.vue';
import { getRouteDetail } from '@/api/v2/route';
import { fetchWeatherPoint } from '@/api/weather';
import { useDrillFocus } from '@/composables/useDrillFocus';
import { usePanelRefresh } from '@/composables/usePanelRefresh';

const { routeId, timelineTime } = useDrillFocus();
const cards = ref([]);

async function load() {
  if (!routeId.value) {
    cards.value = [];
    return;
  }
  const detail = await getRouteDetail(routeId.value);
  const waypoints = detail?.waypoints || [];
  const weatherList = await Promise.all(
    waypoints.map((wp) =>
      fetchWeatherPoint(wp.longitude, wp.latitude, { time: timelineTime.value }).catch(() => null)
    )
  );

  cards.value = waypoints.map((wp, i) => {
    const w = weatherList[i] || {};
    return {
      sequence: wp.sequence ?? i + 1,
      name: wp.name || `航点 ${i + 1}`,
      lon: Number(wp.longitude),
      lat: Number(wp.latitude),
      height: wp.height ?? detail.flightHeight ?? 300,
      windSpeed: formatWind(w.windSpeed),
      visibility: w.visibility != null ? `${w.visibility} km` : '—',
      temperature: w.temperature != null ? `${w.temperature}°C` : '—',
    };
  });
}

function formatWind(v) {
  const n = Number(v);
  return Number.isFinite(n) ? `${n.toFixed(1)} m/s` : '—';
}

watch(routeId, () => reload());

const { loading, error, reload } = usePanelRefresh(load);
</script>

<style scoped lang="scss">
.waypoint-cards {
  display: flex;
  flex-direction: column;
  gap: 10px;
  max-height: 100%;
  overflow-y: auto;
}

.waypoint-card {
  padding: 10px 12px;
  border-radius: 6px;
  background: rgba(15, 36, 51, 0.55);
  border: 1px solid rgba(255, 255, 255, 0.06);
}

.waypoint-card__head {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 6px;
}

.waypoint-card__seq {
  font-size: 11px;
  font-weight: 700;
  color: #60a5fa;
}

.waypoint-card__name {
  font-size: 13px;
  font-weight: 600;
  color: #f1f5f9;
}

.waypoint-card__coords {
  margin: 0 0 8px;
  font-size: 11px;
  color: #94a3b8;
}

.waypoint-card__metrics {
  display: flex;
  flex-wrap: wrap;
  gap: 8px 12px;
  font-size: 11px;
  color: #cbd5e1;
}
</style>
