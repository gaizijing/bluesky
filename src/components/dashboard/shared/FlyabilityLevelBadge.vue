<template>
  <span class="flyability-badge" :class="`flyability-badge--${flyabilityClass(level)}`">
    <span class="flyability-badge__dot" :style="{ backgroundColor: flyabilityColor(level) }" />
    <span class="flyability-badge__text">{{ flyabilityLabel(level) }}</span>
  </span>
</template>

<script setup>
import { flyabilityClass, flyabilityColor, flyabilityLabel } from '@/utils/flyabilityLevel';

defineProps({
  level: { type: String, default: 'GREEN' },
});
</script>

<style scoped lang="scss">
.flyability-badge {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-size: 12px;
  color: #e2e8f0;
}

.flyability-badge__dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  flex-shrink: 0;
}
</style>
