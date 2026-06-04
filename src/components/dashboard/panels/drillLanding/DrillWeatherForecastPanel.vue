<template>
  <AsyncState
    :loading="loading"
    :error="!!error"
    :empty="!landingPointId"
    empty-text="请选择起降点"
    :retry="reload"
  >
    <WeatherForecastPanel />
  </AsyncState>
</template>

<script setup>
import { watch } from 'vue';
import AsyncState from '@/components/common/AsyncState.vue';
import WeatherForecastPanel from '@/components/business/WeatherForecastPanel/index.vue';
import { fetchForecastTrend } from '@/api/weather';
import { useDashboardWeatherStore } from '@/store/modules/dashboardWeather';
import { useDrillFocus } from '@/composables/useDrillFocus';
import { usePanelRefresh } from '@/composables/usePanelRefresh';

const weatherStore = useDashboardWeatherStore();
const { landingPointId } = useDrillFocus();

async function load() {
  if (!landingPointId.value) {
    weatherStore.setWeatherForecastPanelData(null);
    return;
  }
  const data = await fetchForecastTrend(landingPointId.value);
  weatherStore.setWeatherForecastPanelData(data);
}

watch(landingPointId, () => reload());

const { loading, error, reload } = usePanelRefresh(load);
</script>
