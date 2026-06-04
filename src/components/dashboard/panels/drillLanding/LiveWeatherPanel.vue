<template>
  <AsyncState
    :loading="loading"
    :error="!!error"
    :empty="!landingPointId"
    empty-text="请选择起降点"
    :retry="reload"
  >
    <RealTimeWeatherPanel />
  </AsyncState>
</template>

<script setup>
import { watch } from 'vue';
import AsyncState from '@/components/common/AsyncState.vue';
import RealTimeWeatherPanel from '@/components/business/Real-timeWeatherPanel/index.vue';
import { fetchWeatherRealtime, toRealtimePanelFields } from '@/api/weather';
import { useDashboardWeatherStore } from '@/store/modules/dashboardWeather';
import { useDrillFocus } from '@/composables/useDrillFocus';
import { usePanelRefresh } from '@/composables/usePanelRefresh';

const weatherStore = useDashboardWeatherStore();
const { landingPointId, timelineTime } = useDrillFocus();

async function load() {
  if (!landingPointId.value) {
    weatherStore.setRealTimeWeatherPanelData(null);
    return;
  }
  const raw = await fetchWeatherRealtime(landingPointId.value, timelineTime.value);
  weatherStore.setRealTimeWeatherPanelData(toRealtimePanelFields(raw));
}

watch(landingPointId, () => reload(), { immediate: false });

const { loading, error, reload } = usePanelRefresh(load);
</script>
