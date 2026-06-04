<template>
  <AsyncState :loading="loading" :error="!!error" :empty="!landingPointId" empty-text="请选择起降点">
    <SurveillanceFootage />
  </AsyncState>
</template>

<script setup>
import { watch, ref, onMounted } from 'vue';
import AsyncState from '@/components/common/AsyncState.vue';
import SurveillanceFootage from '@/components/business/SurveillanceFootage/index.vue';
import { useRegionLandingStore } from '@/store/modules/regionLanding';
import { useDrillFocus } from '@/composables/useDrillFocus';
import { useAppDashboardStore } from '@/store/modules/appDashboard';

const landingStore = useRegionLandingStore();
const appStore = useAppDashboardStore();
const { landingPointId } = useDrillFocus();
const loading = ref(false);
const error = ref(null);

async function syncSelectedPoint() {
  if (!landingPointId.value) return;
  loading.value = true;
  error.value = null;
  try {
    if (!landingStore.landingPoints.length) {
      await landingStore.loadLandingPoints(appStore.regionId);
    }
    const point = landingStore.landingPoints.find(
      (p) => (p.id || p.landingPointId) === landingPointId.value
    );
    if (point) landingStore.setSelectedLandingPoint(point);
  } catch (err) {
    error.value = err;
  } finally {
    loading.value = false;
  }
}

watch(landingPointId, syncSelectedPoint, { immediate: true });
onMounted(syncSelectedPoint);
</script>
