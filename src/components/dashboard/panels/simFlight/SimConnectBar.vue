<template>
  <div class="sim-connect">
    <div class="sim-connect__dock">
      <div class="sim-connect__group sim-connect__group--route">
        <span class="sim-connect__dot" :class="{ 'sim-connect__dot--on': isLinkUp }" />
        <span class="sim-connect__label">航路</span>
        <el-select
          v-model="selectedRouteId"
          class="sim-connect__select"
          popper-class="sim-connect-select-popper"
          placeholder="选择航路"
          size="small"
          :loading="loadingRoutes"
          :disabled="isLinkUp"
          filterable
        >
          <el-option
            v-for="r in routes"
            :key="r.id"
            :label="r.name"
            :value="r.id"
          />
        </el-select>
      </div>

      <div class="sim-connect__divider" />

      <div class="sim-connect__group sim-connect__group--actions">
        <button
          type="button"
          class="sim-connect__chip"
          :class="isLinkUp ? 'sim-connect__chip--danger' : 'sim-connect__chip--primary'"
          :disabled="isUpdating || (isConnecting && !isLinkUp) || !selectedRouteId"
          @click="toggleConnect"
        >
          {{ connectLabel }}
        </button>

        <button
          type="button"
          class="sim-connect__chip sim-connect__chip--success"
          :disabled="isControlling || !isLinkUp || sendingStatus === 'started'"
          @click="controlIsim('START_SENDING')"
        >
          开始发送气象
        </button>
        <button
          type="button"
          class="sim-connect__chip sim-connect__chip--muted"
          :disabled="isControlling || !isLinkUp || sendingStatus !== 'started'"
          @click="controlIsim('STOP_SENDING')"
        >
          停止发送
        </button>

        <span
          v-if="isLinkUp"
          class="sim-connect__status"
          :class="isSendingWindData ? 'is-active' : ''"
        >
          {{ isSendingWindData ? '风场发送中' : '风场未发送' }}
        </span>
      </div>

      <div class="sim-connect__divider" />

      <el-popover
        placement="top-end"
        :width="320"
        trigger="click"
        popper-class="sim-connect-popover"
      >
        <template #reference>
          <button type="button" class="sim-connect__gear" title="连接参数">
            <el-icon><Setting /></el-icon>
          </button>
        </template>

        <div class="sim-connect__settings">
          <div class="sim-connect__settings-title">ISIM 连接参数</div>
          <div class="sim-connect__settings-grid">
            <label class="sim-connect__field">
              <span>主机</span>
              <input v-model="config.host" class="sim-connect__input" :disabled="isLinkUp" @change="persistConfig" />
            </label>
            <label class="sim-connect__field">
              <span>发送端口</span>
              <input v-model.number="config.sendPort" type="number" class="sim-connect__input" :disabled="isLinkUp" @change="persistConfig" />
            </label>
            <label class="sim-connect__field">
              <span>接收端口</span>
              <input v-model.number="config.receivePort" type="number" class="sim-connect__input" :disabled="isLinkUp" @change="persistConfig" />
            </label>
            <label class="sim-connect__field">
              <span>经度</span>
              <input v-model.number="config.longitude" type="number" step="0.0001" class="sim-connect__input" :disabled="isLinkUp" @change="persistConfig" />
            </label>
            <label class="sim-connect__field">
              <span>纬度</span>
              <input v-model.number="config.latitude" type="number" step="0.0001" class="sim-connect__input" :disabled="isLinkUp" @change="persistConfig" />
            </label>
            <label class="sim-connect__field">
              <span>高度 m</span>
              <input v-model.number="config.altitude" type="number" class="sim-connect__input" :disabled="isLinkUp" @change="persistConfig" />
            </label>
          </div>
          <button
            v-if="sendingStatus === 'started'"
            type="button"
            class="sim-connect__chip sim-connect__chip--muted sim-connect__chip--block"
            @click="toggleDebugSending"
          >
            {{ isDebugSending ? '停止调试风场' : '调试风场' }}
          </button>
        </div>
      </el-popover>
    </div>
  </div>
</template>

<script setup>
import { computed, watch, onMounted, onUnmounted } from 'vue';
import { Setting } from '@element-plus/icons-vue';
import { useIsimConnection } from '@/composables/useIsimConnection';
import { useSimRouteSelect } from '@/composables/useSimRouteSelect';
import { useAppDashboardStore } from '@/store/modules/appDashboard';

const {
  config,
  isLinkUp,
  isConnecting,
  isUpdating,
  isControlling,
  isDebugSending,
  isSendingWindData,
  sendingStatus,
  toggleConnect,
  controlIsim,
  toggleDebugSending,
  applyRouteStartPosition,
  persistConfig,
  handleDisconnect,
  dispose,
} = useIsimConnection();

const appStore = useAppDashboardStore();

const { routes, loadingRoutes, selectedRouteId } = useSimRouteSelect((id) => {
  if (!isLinkUp.value) applyRouteStartPosition(id);
});

const connectLabel = computed(() => {
  if (isUpdating.value) return '连接中…';
  if (isConnecting.value && !isLinkUp.value) return '握手中…';
  return isLinkUp.value ? '断开' : '连接';
});

watch(
  selectedRouteId,
  (id) => {
    if (id && !isLinkUp.value) applyRouteStartPosition(id);
  },
  { immediate: true },
);

watch(
  () => appStore.view,
  (view, prev) => {
    if (prev === 'simFlight' && view !== 'simFlight' && isLinkUp.value) {
      handleDisconnect();
    }
  },
);

onMounted(() => {
  if (selectedRouteId.value && !isLinkUp.value) {
    applyRouteStartPosition(selectedRouteId.value);
  }
});

onUnmounted(() => {
  dispose();
});
</script>

<style scoped lang="scss">
.sim-connect {
  flex: 0 0 auto;
  margin-top: auto;
  padding-top: 2px;
}

.sim-connect__dock {
  display: flex;
  align-items: center;
  gap: 10px;
  min-height: 34px;
  padding: 4px 2px 0;
  border-top: 1px solid rgba(0, 232, 255, 0.12);
  flex-wrap: wrap;
}

.sim-connect__group {
  display: flex;
  align-items: center;
  gap: 8px;
  min-width: 0;

  &--route {
    flex: 1 1 240px;
  }

  &--actions {
    flex: 0 1 auto;
    flex-wrap: wrap;
    justify-content: center;
  }
}

.sim-connect__dot {
  width: 7px;
  height: 7px;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.25);
  box-shadow: 0 0 0 2px rgba(255, 255, 255, 0.08);
  flex-shrink: 0;

  &--on {
    background: #34d399;
    box-shadow: 0 0 8px rgba(52, 211, 153, 0.65);
  }
}

.sim-connect__label {
  font-size: 11px;
  color: rgba(255, 255, 255, 0.42);
  white-space: nowrap;
}

.sim-connect__select {
  flex: 1 1 160px;
  min-width: 120px;
  max-width: 220px;

  :deep(.el-select__wrapper) {
    min-height: 26px;
    background: rgba(0, 12, 24, 0.55);
    border: 1px solid rgba(0, 232, 255, 0.22);
    box-shadow: none;
  }

  :deep(.el-select__placeholder),
  :deep(.el-select__selected-item) {
    color: #d8f4ff;
    font-size: 12px;
  }
}

.sim-connect__tag {
  padding: 1px 6px;
  font-size: 10px;
  color: rgba(0, 232, 255, 0.8);
  border: 1px solid rgba(0, 232, 255, 0.28);
  border-radius: 2px;
  background: rgba(0, 24, 40, 0.45);
}

.sim-connect__divider {
  width: 1px;
  height: 20px;
  background: rgba(0, 232, 255, 0.12);
  flex-shrink: 0;
}

.sim-connect__chip {
  padding: 4px 12px;
  border-radius: 14px;
  border: 1px solid transparent;
  font-size: 11px;
  line-height: 1.2;
  cursor: pointer;
  white-space: nowrap;
  transition: opacity 0.15s, transform 0.15s;

  &:hover:not(:disabled) {
    transform: translateY(-1px);
  }

  &:disabled {
    opacity: 0.4;
    cursor: not-allowed;
  }

  &--primary {
    color: #fff;
    background: linear-gradient(135deg, rgba(0, 190, 230, 0.95), rgba(0, 120, 170, 0.95));
    border-color: rgba(0, 232, 255, 0.35);
  }

  &--danger {
    color: #fff;
    background: rgba(180, 50, 50, 0.85);
    border-color: rgba(255, 120, 120, 0.35);
  }

  &--success {
    color: #eafff5;
    background: rgba(20, 110, 80, 0.85);
    border-color: rgba(52, 211, 153, 0.35);
  }

  &--muted {
    color: rgba(255, 255, 255, 0.75);
    background: rgba(255, 255, 255, 0.08);
    border-color: rgba(255, 255, 255, 0.14);
  }

  &--block {
    width: 100%;
    margin-top: 8px;
  }
}

.sim-connect__status {
  font-size: 10px;
  color: rgba(255, 255, 255, 0.45);
  padding: 2px 8px;
  border-radius: 10px;
  background: rgba(255, 255, 255, 0.05);

  &.is-active {
    color: #93c5fd;
    background: rgba(96, 165, 250, 0.12);
  }
}

.sim-connect__gear {
  width: 28px;
  height: 28px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  border: 1px solid rgba(0, 232, 255, 0.2);
  background: rgba(0, 16, 32, 0.55);
  color: rgba(0, 232, 255, 0.85);
  cursor: pointer;
  flex-shrink: 0;
  transition: background 0.15s, border-color 0.15s;

  &:hover {
    background: rgba(0, 232, 255, 0.1);
    border-color: rgba(0, 232, 255, 0.45);
  }
}

.sim-connect__settings-title {
  font-size: 12px;
  color: #00e8ff;
  margin-bottom: 10px;
}

.sim-connect__settings-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 8px;
}

.sim-connect__field {
  display: flex;
  flex-direction: column;
  gap: 4px;

  span {
    font-size: 10px;
    color: rgba(255, 255, 255, 0.5);
  }
}

.sim-connect__input {
  width: 85%;
  padding: 4px 8px;
  border: 1px solid rgba(0, 232, 255, 0.2);
  border-radius: 3px;
  background: rgba(0, 0, 0, 0.35);
  color: #e8f4ff;
  font-size: 12px;
  outline: none;

  &:focus {
    border-color: rgba(0, 232, 255, 0.5);
  }

  &:disabled {
    opacity: 0.55;
  }
}
</style>

<style lang="scss">
.sim-connect-select-popper.el-popper {
  background: rgba(6, 18, 32, 0.96) !important;
  border: 1px solid rgba(0, 232, 255, 0.25) !important;

  .el-select-dropdown__item {
    color: rgba(255, 255, 255, 0.85);
    font-size: 12px;
  }

  .el-select-dropdown__item.is-hovering,
  .el-select-dropdown__item:hover {
    background: rgba(0, 232, 255, 0.12);
  }

  .el-select-dropdown__item.is-selected {
    color: #00e8ff;
    font-weight: 600;
  }
}

.sim-connect-popover.el-popper {
  background: rgba(6, 18, 32, 0.96) !important;
  border: 1px solid rgba(0, 232, 255, 0.25) !important;
  color: #fff;
}
</style>
