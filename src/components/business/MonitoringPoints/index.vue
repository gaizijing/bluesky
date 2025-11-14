<template>
  <div class="monitoring-points-container">
    <div class="stats-header">
      <div class="stats-summary">
        <!-- 统计项保持不变 -->
        <div class="stat-item" @click="setFilter('all')">
          <div class="stat-label">总监测点</div>
          <div class="stat-value">{{ totalPoints }}</div>
        </div>
        <div class="stat-item available" @click="setFilter('available')">
          <div class="stat-label">可用</div>
          <div class="stat-value">{{ availablePoints }}</div>
        </div>
        <div class="stat-item unavailable" @click="setFilter('unavailable')">
          <div class="stat-label">不可用</div>
          <div class="stat-value">{{ unavailablePoints }}</div>
        </div>
        <div class="stat-item warning" @click="setFilter('warning')">
          <div class="stat-label">预警中</div>
          <div class="stat-value">{{ warningPoints }}</div>
        </div>
      </div>
      <!-- 添加搜索框和类型筛选 -->
      <div class="controls-bar">
        <div class="search-box">
          <input
            ref="searchInputRef"
            v-model="searchKeyword"
            type="text"
            placeholder="搜索监测点名称或位置..."
            class="search-input"
          />
        </div>

        <div class="filter-tabs">
          <button
            class="filter-tab"
            :class="{ active: typeFilter === 'all' }"
            @click="typeFilter = 'all'"
          >
            全部类型
          </button>
          <button
            class="filter-tab"
            :class="{ active: typeFilter === 'takeoff' }"
            @click="typeFilter = 'takeoff'"
          >
            起降点
          </button>
          <button
            class="filter-tab"
            :class="{ active: typeFilter === 'operation' }"
            @click="typeFilter = 'operation'"
          >
            作业点
          </button>
        </div>
      </div>
    </div>

    <!-- 其余部分保持不变 -->
    <!-- 监测点列表 -->
    <div class="points-table">
      <div class="table-header">
        <div class="table-cell">名称</div>
        <div class="table-cell">位置</div>
        <div class="table-cell">类型</div>
        <div class="table-cell">状态</div>
        <div class="table-cell">详情</div>
      </div>

      <!-- 加载状态 -->
      <div v-if="isLoading" class="loading-state">
        <div class="spinner"></div>
        <p>加载监测点数据中...</p>
      </div>

      <!-- 空状态 -->
      <div v-if="!isLoading && filteredPoints.length === 0" class="empty-state">
        <div class="empty-icon">📌</div>
        <p>没有找到匹配的监测点</p>
        <button class="reset-btn" @click="resetFilters">重置筛选条件</button>
      </div>

      <!-- 监测点列表项 -->
      <div class="table-body">
        <div
          v-for="point in filteredPoints"
          :key="point.id"
          class="table-row"
          :class="point.status"
        >
          <div class="table-cell name">
            <div class="point-name">{{ point.name }}</div>
          </div>
          <div class="table-cell location">
            <div class="point-location">{{ point.location }}</div>
          </div>
          <div class="table-cell type">
            <span class="type-badge" :class="point.type">
              {{ point.type === "takeoff" ? "起降点" : "作业点" }}
            </span>
          </div>
          <div class="table-cell status">
            <div class="status-indicator"></div>
            <span class="status-text">
              {{ getStatusText(point.status) }}
            </span>
            <span
              v-if="point.warningReason"
              class="warning-tooltip"
              :title="point.warningReason"
            >
              ⓘ
            </span>
          </div>
          <div class="table-cell actions">
            <button class="detail-btn" @click="switchPoint(point)">
              切换到此地点
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
<script setup>
import { ref, computed, onMounted, onBeforeMount } from "vue";
import { useMonitoringPoints } from "@/composables/useMonitoringPoints";

// 使用组合函数
const {
  monitoringPointStore
} = useMonitoringPoints();

// 状态管理
const searchKeyword = ref("");
const typeFilter = ref("all");
const currentPoint = ref(null);
const statusFilter = ref("all");

// 添加 emit
const emit = defineEmits(["point-selected"]);

// 过滤后的监测点列表（从store中获取）
const filteredPoints = computed(() => {
  return monitoringPointStore.pointsList.filter((point) => {
    // 类型过滤
    const typeMatch =
      typeFilter.value === "all" || point.type === typeFilter.value;

    // 状态过滤
    const statusMatch =
      statusFilter.value === "all" || point.status === statusFilter.value;

    // 搜索过滤
    const searchMatch =
      !searchKeyword.value ||
      point.name.toLowerCase().includes(searchKeyword.value.toLowerCase()) ||
      point.location.toLowerCase().includes(searchKeyword.value.toLowerCase());

    return typeMatch && searchMatch && statusMatch;
  });
});

// 统计数据
const totalPoints = computed(() => monitoringPointStore.pointsList.length);
const availablePoints = computed(
  () =>
    monitoringPointStore.pointsList.filter((p) => p.status === "available")
      .length
);
const unavailablePoints = computed(
  () =>
    monitoringPointStore.pointsList.filter((p) => p.status === "unavailable")
      .length
);
const warningPoints = computed(
  () =>
    monitoringPointStore.pointsList.filter((p) => p.status === "warning").length
);

// 重置筛选条件
const resetFilters = () => {
  searchKeyword.value = "";
  typeFilter.value = "all";
  statusFilter.value = "all";
};

const switchPoint = (point) => {
  currentPoint.value = { ...point };

  // 保存到全局状态
  monitoringPointStore.setSelectedPoint(point);

  // 触发事件通知父组件
  emit("point-selected", point);
};

// 获取状态文本
const getStatusText = (status) => {
  const statusMap = {
    available: "可用",
    warning: "预警中",
    unavailable: "不可用",
  };
  return statusMap[status] || "未知";
};

// 设置状态筛选
const setFilter = (status) => {
  statusFilter.value = status;
};



</script>
<style scoped lang="scss">
.monitoring-points-container {
  overflow: hidden;
}

/* 头部统计区 */
.stats-header {
  .stats-summary {
    display: flex;
    gap: 15px;
    margin-bottom: 15px;
    flex-wrap: wrap;
    cursor: pointer;
    justify-content: space-between;
    .stat-item {
      min-width: 110px;
      text-align: center;
      background: url("@/assets/images/298.png");
      background-size: cover;
      background-position: center;
      height: 60px;
      transition: transform 0.2s;
      font-family: "aideepFont";
      font-style: normal;
      &:hover {
        transform: translateY(-2px);
      }

      .stat-label {
        font-size: 12px;
        color: #94a3b8;
        margin-bottom: 3px;
        display: block;
      }

      .stat-value {
        font-size: 18px;
        font-weight: 600;
      }

      &.available .stat-value {
        color: #10b981;
      }

      &.unavailable .stat-value {
        color: #ef4444;
      }

      &.warning .stat-value {
        color: #f59e0b;
      }
    }
  }
}

/* 表格样式 */
.points-table {
  display: flex;
  flex-direction: column;
  height: 200px;
}

.detail-btn {
  padding: 5px 12px;
  background-color: rgba(59, 130, 246, 0.1);
  border: 1px solid #3b82f6;
  color: #3b82f6;
  border-radius: 4px;
  cursor: pointer;
  font-size: 12px;
  transition: all 0.2s;

  &:hover {
    background-color: rgba(59, 130, 246, 0.2);
  }
}

/* 加载和空状态 */
.loading-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 60px 0;
  color: #94a3b8;

  .spinner {
    width: 36px;
    height: 36px;
    border: 3px solid rgba(59, 130, 246, 0.2);
    border-top-color: #3b82f6;
    border-radius: 50%;
    animation: spin 1s linear infinite;
    margin-bottom: 18px;
  }

  p {
    margin: 0;
    font-size: 14px;
  }
}

.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 60px 0;
  color: #94a3b8;
  text-align: center;

  .empty-icon {
    font-size: 48px;
    margin-bottom: 15px;
    opacity: 0.7;
  }

  p {
    margin: 0 0 20px 0;
    font-size: 14px;
    max-width: 300px;
  }

  .reset-btn {
    padding: 7px 14px;
    background-color: rgba(59, 130, 246, 0.1);
    border: 1px solid #3b82f6;
    color: #3b82f6;
    border-radius: 6px;
    cursor: pointer;
    font-size: 13px;
    transition: all 0.2s;

    &:hover {
      background-color: rgba(59, 130, 246, 0.2);
    }
  }
}
.controls-bar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 15px;
  gap: 15px;
  flex-wrap: wrap;

  .search-box {
    flex: 1;

    .search-input {
      padding: 8px 12px;
      background-color: rgba(255, 255, 255, 0.08);
      border: 1px solid rgba(255, 255, 255, 0.15);
      border-radius: 4px;
      color: #fff;
      font-size: 13px;

      &::placeholder {
        color: #94a3b8;
      }

      &:focus {
        outline: none;
        border-color: #3b82f6;
      }
    }
  }

  .filter-tabs {
    display: flex;

    .filter-tab {
      padding: 6px 12px;
      background: none;
      border: none;
      color: #94a3b8;
      font-size: 13px;
      cursor: pointer;
      border-radius: 4px;
      transition: all 0.2s;

      &.active {
        background-color: #3b82f6;
        color: white;
      }

      &:hover:not(.active) {
        background-color: rgba(255, 255, 255, 0.1);
      }
    }
  }
}

@media (max-width: 768px) {
  .controls-bar {
    flex-direction: column;
    align-items: stretch;

    .search-box {
      max-width: none;
    }

    .filter-tabs {
      justify-content: center;
    }
  }
}
@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}
</style>