<template>
  <div class="async-state">
    <div v-if="loading" class="async-state__loading">
      <slot name="skeleton">
        <div class="async-state__skeleton">
          <div v-for="i in 3" :key="i" class="async-state__skeleton-line" />
        </div>
      </slot>
    </div>
    <div v-else-if="error" class="async-state__error">
      <slot name="error">
        <p>{{ errorMessage || '加载失败' }}</p>
        <el-button v-if="retry" size="small" type="primary" @click="retry">重试</el-button>
      </slot>
    </div>
    <div v-else-if="empty" class="async-state__empty">
      <slot name="empty">
        <p>{{ emptyText || '暂无数据' }}</p>
      </slot>
    </div>
    <div v-else class="async-state__content async-state__content--fill">
      <el-alert
        v-if="stale"
        class="async-state__stale"
        type="warning"
        :closable="false"
        title="数据非最新"
        show-icon
      />
      <slot />
    </div>
  </div>
</template>

<script setup>
defineProps({
  loading: { type: Boolean, default: false },
  error: { type: [Boolean, Object, String], default: false },
  empty: { type: Boolean, default: false },
  stale: { type: Boolean, default: false },
  emptyText: { type: String, default: '' },
  errorMessage: { type: String, default: '' },
  retry: { type: Function, default: null },
});
</script>

<style scoped lang="scss">
.async-state {
  width: 100%;
  height: 100%;
  min-height: 80px;
}

.async-state__skeleton-line {
  height: 12px;
  margin-bottom: 10px;
  border-radius: 4px;
  background: linear-gradient(90deg, rgba(255, 255, 255, 0.08), rgba(255, 255, 255, 0.18), rgba(255, 255, 255, 0.08));
  animation: shimmer 1.2s infinite;
}

@keyframes shimmer {
  0% { opacity: 0.5; }
  50% { opacity: 1; }
  100% { opacity: 0.5; }
}

.async-state__error,
.async-state__empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 12px;
  height: 100%;
  color: rgba(255, 255, 255, 0.75);
  font-size: 14px;
}

.async-state__content--fill {
  display: flex;
  flex-direction: column;
  height: 100%;
  min-height: 0;
}

.async-state__stale {
  margin-bottom: 8px;
}
</style>
