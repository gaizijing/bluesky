<template>
  <AsyncState
    :loading="loading"
    :error="!!error"
    :empty="!landingPointId"
    empty-text="请选择起降点"
    :stale="isStale"
    :retry="reload"
  >
    <FlightSuitableAnalysisPanel />
  </AsyncState>
</template>

<script setup>
import { ref, watch } from 'vue';
import AsyncState from '@/components/common/AsyncState.vue';
import FlightSuitableAnalysisPanel from '@/components/business/FlightSuitableAnalysisPanel/index.vue';
import { fetchLandingMatrixChart } from '@/api/flyability';
import { useDashboardWeatherStore } from '@/store/modules/dashboardWeather';
import { useDrillFocus } from '@/composables/useDrillFocus';
import { usePanelRefresh } from '@/composables/usePanelRefresh';

const weatherStore = useDashboardWeatherStore();
const { landingPointId, timelineTime } = useDrillFocus();
const isStale = ref(false);

async function load() {
  if (!landingPointId.value) {
    weatherStore.setFlightSuitableAnalysisPanelData(null);
    isStale.value = false;
    return;
  }
  const chartData = await fetchLandingMatrixChart({
    currentPoint: { id: landingPointId.value },
    hours: 1,
    time: timelineTime.value,
  });
  weatherStore.setFlightSuitableAnalysisPanelData(chartData);
  isStale.value = Boolean(chartData?.isStale);
}

watch(landingPointId, () => reload());

const { loading, error, reload } = usePanelRefresh(load);
</script>
