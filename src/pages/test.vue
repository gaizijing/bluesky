<template>
  <div class="flex h-screen bg-gradient-to-br from-[#001b2e] to-[#003b5e] text-white">
    <div class="w-48 p-2">
      <IndicatorPanel />
    </div>
    <div class="flex-1 p-2">
      <MainMap />
    </div>
  </div>
</template>

<script setup>
import IndicatorPanel from '@/components/map/IndicatorPanel/index.vue'
import MainMap from '@/components/map/mainMap/index.vue'
</script>