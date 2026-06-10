<template>
  <AsyncState
    class="waypoint-panel"
    :loading="loading"
    :error="!!error"
    :empty="!cards.length"
    empty-text="请选择航路"
    :retry="reload"
  >
    <div class="waypoint-list">
      <article
        v-for="(card, idx) in cards"
        :key="card.sequence"
        class="waypoint-item"
        :class="[
          `waypoint-item--${card.role}`,
          `waypoint-item--fly-${card.flyLevel}`,
        ]"
      >
        <div class="waypoint-item__rail">
          <span class="waypoint-item__seq">{{ card.sequence }}</span>
          <span
            v-if="idx < cards.length - 1"
            class="waypoint-item__connector"
            aria-hidden="true"
          />
        </div>

        <div class="waypoint-item__card">
          <header class="waypoint-item__head">
            <div class="waypoint-item__identity">
              <span class="waypoint-item__role">{{ card.roleLabel }}</span><h3 class="waypoint-item__name">{{ card.name }}</h3>
            </div>
            <div
              class="waypoint-item__fly-badge"
              :class="`waypoint-item__fly-badge--${card.flyLevel}`"
            >
              <span class="waypoint-item__fly-dot" aria-hidden="true" />
              <span class="waypoint-item__fly-text">{{ card.flyLabel }}</span>
            </div>
          </header>

          <div class="waypoint-item__hero">
            <div
              class="hero-metric hero-metric--primary"
              :class="`hero-metric--fly-${card.flyLevel}`"
            >
              <span class="hero-metric__main">
                {{ card.windValue }}<small v-if="card.windUnit">{{ card.windUnit }}</small>
              </span>
              <span class="hero-metric__label">风速</span>
            </div>
            <div class="hero-metric">
              <span class="hero-metric__main hero-metric__main--sub">
                {{ card.visibilityValue }}<small v-if="card.visibilityUnit">{{ card.visibilityUnit }}</small>
              </span>
              <span class="hero-metric__label">能见度</span>
            </div>
            <div class="hero-metric">
              <span class="hero-metric__main hero-metric__main--sub">
                {{ card.temperatureValue }}<small v-if="card.temperatureUnit">{{ card.temperatureUnit }}</small>
              </span>
              <span class="hero-metric__label">温度</span>
            </div>
          </div>

          <div class="waypoint-item__loc">
            <span class="loc-item">经 {{ card.lon.toFixed(4) }}°</span>
            <span class="loc-item">纬 {{ card.lat.toFixed(4) }}°</span>
            <span class="loc-item loc-item--alt">高 {{ card.height }} m</span>
          </div>
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

function waypointRole(index, total) {
  if (index === 0) return 'start';
  if (index === total - 1) return 'end';
  return 'mid';
}

function roleLabel(role) {
  if (role === 'start') return '起点';
  if (role === 'end') return '终点';
  return '途经';
}

function flyLevelFromWind(speed) {
  const n = Number(speed);
  if (!Number.isFinite(n)) return 'gray';
  if (n >= 10) return 'red';
  if (n >= 6) return 'yellow';
  return 'green';
}

function flyLabelFromLevel(level) {
  if (level === 'red') return '不适飞';
  if (level === 'yellow') return '谨慎';
  return '适飞';
}

function splitMetric(formatted, fallbackUnit = '') {
  if (!formatted || formatted === '—') {
    return { value: '—', unit: '' };
  }
  const parts = String(formatted).trim().split(/\s+/);
  if (parts.length >= 2) {
    return { value: parts[0], unit: parts.slice(1).join(' ') };
  }
  return { value: formatted, unit: fallbackUnit };
}

async function load() {
  if (!routeId.value) {
    cards.value = [];
    return;
  }
  const detail = await getRouteDetail(routeId.value);
  const waypoints = detail?.waypoints || [];
  const weatherList = await Promise.all(
    waypoints.map((wp) =>
      fetchWeatherPoint(wp.longitude, wp.latitude, { time: timelineTime.value }).catch(() => null),
    ),
  );

  cards.value = waypoints.map((wp, i) => {
    const w = weatherList[i] || {};
    const role = waypointRole(i, waypoints.length);
    const flyLevel = flyLevelFromWind(w.windSpeed);
    const wind = splitMetric(formatWind(w.windSpeed), 'm/s');
    const vis = splitMetric(w.visibility != null ? `${w.visibility} km` : '—');
    const temp = splitMetric(w.temperature != null ? `${w.temperature}°C` : '—');

    return {
      sequence: wp.sequence ?? i + 1,
      name: wp.name || `航点 ${i + 1}`,
      role,
      roleLabel: roleLabel(role),
      lon: Number(wp.longitude),
      lat: Number(wp.latitude),
      height: wp.height ?? wp.altitude ?? detail.flightHeight ?? 300,
      windValue: wind.value,
      windUnit: wind.unit,
      visibilityValue: vis.value,
      visibilityUnit: vis.unit,
      temperatureValue: temp.value,
      temperatureUnit: temp.unit,
      flyLevel,
      flyLabel: flyLabelFromLevel(flyLevel),
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
.waypoint-panel {
  height: 100%;
  min-height: 0;
  overflow: hidden;
  display: flex;
  flex-direction: column;

  :deep(.async-state__content--fill) {
    flex: 1 1 auto;
    min-height: 0;
    overflow: hidden;
    display: flex;
    flex-direction: column;
  }
}

.waypoint-list {
  flex: 1 1 auto;
  display: flex;
  flex-direction: column;
  gap: 8px;
  min-height: 0;
  overflow-x: hidden;
  overflow-y: auto;
  padding: 2px 4px 8px 0;
  scrollbar-gutter: stable;

  scrollbar-width: thin;
  scrollbar-color: rgba(96, 165, 250, 0.45) rgba(255, 255, 255, 0.05);

  &::-webkit-scrollbar {
    width: 5px;
  }

  &::-webkit-scrollbar-track {
    background: rgba(255, 255, 255, 0.04);
    border-radius: 4px;
    margin: 2px 0;
  }

  &::-webkit-scrollbar-thumb {
    background: linear-gradient(180deg, rgba(56, 189, 248, 0.35), rgba(37, 99, 235, 0.5));
    border-radius: 4px;
    border: 1px solid rgba(56, 189, 248, 0.12);
  }

  &::-webkit-scrollbar-thumb:hover {
    background: linear-gradient(180deg, rgba(56, 189, 248, 0.55), rgba(37, 99, 235, 0.7));
  }
}

.waypoint-item {
  display: flex;
  flex-shrink: 0;
  align-items: stretch;
  gap: 8px;
  width: 100%;

  &--fly-green .waypoint-item__card {
    background: linear-gradient(145deg, rgba(6, 40, 30, 0.55) 0%, rgba(15, 23, 42, 0.72) 100%);
  }

  &--fly-yellow .waypoint-item__card {
    background: linear-gradient(145deg, rgba(45, 35, 8, 0.5) 0%, rgba(15, 23, 42, 0.72) 100%);
  }

  &--fly-red .waypoint-item__card {
    background: linear-gradient(145deg, rgba(45, 12, 12, 0.45) 0%, rgba(15, 23, 42, 0.72) 100%);
  }

  &--start .waypoint-item__seq {
    background: linear-gradient(135deg, #0891b2, #22d3ee);
    box-shadow: 0 0 14px rgba(34, 211, 238, 0.4);
  }

  &--end .waypoint-item__seq {
    background: linear-gradient(135deg, #7c3aed, #a78bfa);
    box-shadow: 0 0 14px rgba(167, 139, 250, 0.35);
  }

  &--mid .waypoint-item__seq {
    background: linear-gradient(135deg, #2563eb, #60a5fa);
    box-shadow: 0 0 12px rgba(96, 165, 250, 0.35);
  }
}

.waypoint-item__rail {
  display: flex;
  flex-direction: column;
  align-items: center;
  flex: 0 0 24px;
  width: 24px;
  padding-top: 4px;
}

.waypoint-item__seq {
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 22px;
  height: 22px;
  border-radius: 50%;
  font-size: 11px;
  font-weight: 700;
  color: #fff;
}

.waypoint-item__connector {
  flex: 1 1 auto;
  width: 2px;
  min-height: 12px;
  margin: 4px 0 0;
  border-radius: 1px;
  background: linear-gradient(180deg, rgba(96, 165, 250, 0.55) 0%, rgba(96, 165, 250, 0.1) 100%);
}

.waypoint-item__card {
  flex: 1 1 auto;
  display: flex;
  flex-direction: column;
  flex-shrink: 0;
  min-width: 0;
  padding: 8px 10px 7px;
  border-radius: 8px;
  border: 1px solid rgba(255, 255, 255, 0.08);
  transition: border-color 0.2s, box-shadow 0.2s;

  .waypoint-item:hover & {
    border-color: rgba(96, 165, 250, 0.35);
  }

  .waypoint-item--start & {
    border-left: 2px solid rgba(34, 211, 238, 0.75);
  }

  .waypoint-item--end & {
    border-left: 2px solid rgba(167, 139, 250, 0.75);
  }

  .waypoint-item--mid & {
    border-left: 2px solid rgba(96, 165, 250, 0.55);
  }
}

.waypoint-item__head {
  display: flex;
  flex-shrink: 0;
  align-items: center;
  justify-content: space-between;
  gap: 6px;
  margin-bottom: 6px;
}

.waypoint-item__identity {
  min-width: 0;
  flex: 1;
  line-height: 1.25;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.waypoint-item__role {
  display: inline-block;
  margin-right: 5px;
  margin-bottom: 0;
  padding: 1px 6px;
  border-radius: 3px;
  font-size: 10px;
  font-weight: 700;
  vertical-align: middle;
  color: #93c5fd;
  background: rgba(59, 130, 246, 0.2);
  border: 1px solid rgba(59, 130, 246, 0.25);

  .waypoint-item--start & {
    color: #a5f3fc;
    background: rgba(34, 211, 238, 0.15);
    border-color: rgba(34, 211, 238, 0.3);
  }

  .waypoint-item--end & {
    color: #ddd6fe;
    background: rgba(167, 139, 250, 0.15);
    border-color: rgba(167, 139, 250, 0.3);
  }
}

.waypoint-item__name {
  display: inline;
  margin: 0;
  font-size: 13px;
  font-weight: 600;
  color: #f1f5f9;
  line-height: 1.25;
  vertical-align: middle;
}

.waypoint-item__fly-badge {
  flex-shrink: 0;
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 2px 7px;
  border-radius: 6px;
  font-size: 11px;
  font-weight: 700;
  white-space: nowrap;

  &--green {
    color: #bbf7d0;
    background: rgba(22, 163, 74, 0.2);
    border: 1px solid rgba(74, 222, 128, 0.4);
  }

  &--yellow {
    color: #fef08a;
    background: rgba(202, 138, 4, 0.2);
    border: 1px solid rgba(250, 204, 21, 0.4);
  }

  &--red {
    color: #fecaca;
    background: rgba(220, 38, 38, 0.2);
    border: 1px solid rgba(248, 113, 113, 0.45);
  }

  &--gray {
    color: #cbd5e1;
    background: rgba(100, 116, 139, 0.2);
    border: 1px solid rgba(148, 163, 184, 0.35);
  }
}

.waypoint-item__fly-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: currentColor;
}

.waypoint-item__hero {
  display: flex;
  flex-shrink: 0;
  gap: 4px;
  margin-bottom: 6px;
}

.hero-metric {
  flex: 1 1 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  min-width: 0;
  padding: 4px 3px 3px;
  border-radius: 6px;
  background: rgba(0, 0, 0, 0.2);
  border: 1px solid rgba(255, 255, 255, 0.05);

  &--primary {
    border-color: rgba(255, 255, 255, 0.1);
  }

  &--fly-green.hero-metric--primary {
    background: rgba(22, 163, 74, 0.12);
    border-color: rgba(74, 222, 128, 0.25);
  }

  &--fly-yellow.hero-metric--primary {
    background: rgba(202, 138, 4, 0.12);
    border-color: rgba(250, 204, 21, 0.25);
  }

  &--fly-red.hero-metric--primary {
    background: rgba(220, 38, 38, 0.12);
    border-color: rgba(248, 113, 113, 0.28);
  }
}

.hero-metric__main {
  font-size: 14px;
  font-weight: 700;
  line-height: 1.2;
  color: #f1f5f9;
  font-variant-numeric: tabular-nums;
  white-space: nowrap;

  small {
    margin-left: 2px;
    font-size: 10px;
    font-weight: 500;
    color: rgba(148, 163, 184, 0.95);
  }

  &--sub {
    font-size: 13px;
    font-weight: 600;
  }
}

.hero-metric__label {
  margin-top: 2px;
  font-size: 9px;
  font-weight: 600;
  color: #64748b;
}

.waypoint-item__loc {
  display: flex;
  flex-shrink: 0;
  flex-wrap: wrap;
  gap: 4px 8px;
  padding-top: 5px;
  border-top: 1px solid rgba(255, 255, 255, 0.06);
}

.loc-item {
  font-size: 10px;
  font-weight: 500;
  color: rgba(148, 163, 184, 0.95);
  font-family: ui-monospace, 'Cascadia Code', monospace;
  white-space: nowrap;

  &--alt {
    color: #7dd3fc;
    font-weight: 600;
  }
}
</style>
