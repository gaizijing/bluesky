<template>
  <AsyncState
    :loading="loading"
    :error="!!error"
    :empty="!landingPointId"
    empty-text="请选择起降点"
    :retry="reload"
  >
    <FlightSuitableAnalysisPanel />
  </AsyncState>
</template>

<script setup>
import { watch } from 'vue';
import AsyncState from '@/components/common/AsyncState.vue';
import FlightSuitableAnalysisPanel from '@/components/business/FlightSuitableAnalysisPanel/index.vue';
import { fetchLandingMatrixChart } from '@/api/flyability';
import {
  FLYABILITY_MATRIX_SLOT_LIMIT,
  FLYABILITY_OVERVIEW_HOURS,
} from '@/utils/flyabilityChart';
import { useAppDashboardStore } from '@/store/modules/appDashboard';
import { useDashboardWeatherStore } from '@/store/modules/dashboardWeather';
import { useDrillFocus } from '@/composables/useDrillFocus';
import { usePanelRefresh } from '@/composables/usePanelRefresh';

const appStore = useAppDashboardStore();
const weatherStore = useDashboardWeatherStore();
const { landingPointId, timelineTime, regionId } = useDrillFocus();

async function load() {
  if (!landingPointId.value) {
    weatherStore.setFlightSuitableAnalysisPanelData(null);
    return;
  }
  const chartData = await fetchLandingMatrixChart({
    currentPoint: { id: landingPointId.value },
    hours: FLYABILITY_OVERVIEW_HOURS,
    maxSlots: FLYABILITY_MATRIX_SLOT_LIMIT,
    time: timelineTime.value,
    regionId: regionId.value,
    appStore,
  });
  weatherStore.setFlightSuitableAnalysisPanelData(chartData);
}

watch(landingPointId, () => reload());

const { loading, error, reload } = usePanelRefresh(load);
</script>
