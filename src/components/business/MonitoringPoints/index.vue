<template>
  <div class="monitoring-points-container">
    <!-- 顶部统计区 -->
    <div class="stats-header">
      <div class="stats-summary">
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

    </div>

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
          <button class="detail-btn" @click="openDetail(point)">详情</button>
        </div>
      </div>
       </div>
      
    </div>

    <!-- 监测点详情弹窗 -->
    <div
      v-if="showDetailModal"
      class="modal-overlay"
      @click="closeModal"
      :class="{ 'modal-visible': showDetailModal }"
    >
      <div class="modal-content" @click.stop>
        <div class="modal-header">
          <h3>{{ currentPoint.name }} - 详情</h3>
          <button class="close-btn" @click="closeModal" aria-label="关闭">
            ×
          </button>
        </div>
        <div class="modal-body">
          <div class="detail-grid">
            <div class="detail-section basic-info">
              <h4>基本信息</h4>
              <div class="info-item">
                <span class="info-label">ID</span>
                <span class="info-value">{{ currentPoint.id }}</span>
              </div>
              <div class="info-item">
                <span class="info-label">类型</span>
                <span class="info-value">{{
                  currentPoint.type === "takeoff" ? "起降点" : "作业点"
                }}</span>
              </div>
              <div class="info-item">
                <span class="info-label">位置</span>
                <span class="info-value">{{ currentPoint.location }}</span>
              </div>
              <div class="info-item">
                <span class="info-label">坐标</span>
                <span class="info-value">{{
                  currentPoint.coordinates.join(", ")
                }}</span>
              </div>
              <div class="info-item">
                <span class="info-label">状态</span>
                <span
                  class="info-value"
                  :class="`status-${currentPoint.status}`"
                >
                  {{ getStatusText(currentPoint.status) }}
                </span>
              </div>
            </div>

            <div class="detail-section metrics">
              <h4>监测指标</h4>
              <div class="info-item">
                <span class="info-label">信号强度</span>
                <span class="info-value"
                  >{{ currentPoint.signalStrength }}/10</span
                >
              </div>
              <div class="info-item">
                <span class="info-label">设备温度</span>
                <span class="info-value">{{ currentPoint.temperature }}°C</span>
              </div>
              <div class="info-item">
                <span class="info-label">湿度</span>
                <span class="info-value">{{ currentPoint.humidity }}%</span>
              </div>
              <div class="info-item">
                <span class="info-label">电池电量</span>
                <span class="info-value">{{ currentPoint.battery }}%</span>
              </div>
              <div class="info-item">
                <span class="info-label">最后更新</span>
                <span class="info-value">{{
                  formatTime(currentPoint.lastUpdate)
                }}</span>
              </div>
            </div>

            <div
              class="detail-section warnings"
              v-if="currentPoint.status === 'warning'"
            >
              <h4>预警信息</h4>
              <div class="warning-message">
                {{ currentPoint.warningReason }}
              </div>
              <div class="warning-history">
                <h5>近期预警记录</h5>
                <div
                  v-for="(warning, idx) in currentPoint.warningHistory"
                  :key="idx"
                  class="warning-record"
                >
                  <span class="warning-time">{{
                    formatTime(warning.time)
                  }}</span>
                  <span class="warning-text">{{ warning.message }}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
        <div class="modal-footer">
          <button
            class="maintain-btn"
            @click="handleMaintenance"
            v-if="currentPoint.status !== 'available'"
          >
            申请维护
          </button>
          <button class="close-modal-btn" @click="closeModal">关闭</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, nextTick } from "vue";

// 状态管理
const points = ref([]);
const isLoading = ref(true);
const isRefreshing = ref(false);
const searchKeyword = ref("");
const typeFilter = ref("all");
const showDetailModal = ref(false);
const currentPoint = ref(null);
const showSearchInput = ref(false);
const searchInputRef = ref(null);
const statusFilter = ref("all");

// 过滤后的监测点列表
const filteredPoints = computed(() => {
  return points.value.filter((point) => {
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
const totalPoints = computed(() => points.value.length);
const availablePoints = computed(
  () => points.value.filter((p) => p.status === "available").length
);
const unavailablePoints = computed(
  () => points.value.filter((p) => p.status === "unavailable").length
);
const warningPoints = computed(
  () => points.value.filter((p) => p.status === "warning").length
);

// 生成模拟监测点数据
const generatePoints = () => {
  const pointTypes = ["takeoff", "operation"];
  const locations = [
    "东部区域",
    "西部区域",
    "南部区域",
    "北部区域",
    "中部区域",
  ];
  const pointCount = 8 + Math.floor(Math.random() * 7); // 8-14个监测点
  const results = [];

  for (let i = 0; i < pointCount; i++) {
    const type = pointTypes[Math.floor(Math.random() * pointTypes.length)];
    const baseStatus = Math.random();
    let status;
    let warningReason = "";

    // 随机状态
    if (baseStatus < 0.7) {
      status = "available";
    } else if (baseStatus < 0.9) {
      status = "warning";
      // 随机预警原因
      const warnings = [
        "信号强度不稳定",
        "电池电量偏低",
        "温度异常",
        "数据传输延迟",
        "湿度超标",
      ];
      warningReason = warnings[Math.floor(Math.random() * warnings.length)];
    } else {
      status = "unavailable";
    }

    // 生成预警历史
    const warningHistory = [];
    if (status === "warning") {
      const historyCount = 1 + Math.floor(Math.random() * 3);
      for (let j = 0; j < historyCount; j++) {
        warningHistory.push({
          time: Date.now() - (j + 1) * 3600000 * (1 + Math.random() * 4),
          message: `预警: ${
            ["信号弱", "温度高", "湿度大", "电量低"][
              Math.floor(Math.random() * 4)
            ]
          }`,
        });
      }
    }

    results.push({
      id: `point-${i + 1}`,
      name: `${type === "takeoff" ? "起降点" : "作业点"}${i + 1}`,
      type,
      location: `${locations[Math.floor(Math.random() * locations.length)]}-${
        Math.floor(Math.random() * 10) + 1
      }号区域`,
      coordinates: [116.2 + Math.random() * 0.5, 39.8 + Math.random() * 0.4],
      status,
      warningReason,
      warningHistory,
      signalStrength: Math.floor(Math.random() * 5) + 5, // 5-10
      temperature: 20 + Math.floor(Math.random() * 15), // 20-35
      humidity: 30 + Math.floor(Math.random() * 40), // 30-70
      battery: Math.floor(Math.random() * 50) + 50, // 50-100
      lastUpdate: Date.now() - Math.random() * 3600000 * 2, // 0-2小时前
    });
  }

  return results;
};

// 加载监测点数据
const loadPoints = async () => {
  isLoading.value = true;
  try {
    // 模拟API请求延迟
    await new Promise((resolve) => setTimeout(resolve, 800));
    points.value = generatePoints();
  } catch (error) {
    console.error("加载监测点数据失败:", error);
  } finally {
    isLoading.value = false;
  }
};

// 刷新监测点数据
const refreshPoints = async () => {
  isRefreshing.value = true;
  try {
    await new Promise((resolve) => setTimeout(resolve, 800));
    points.value = generatePoints();
  } finally {
    isRefreshing.value = false;
  }
};

// 重置筛选条件
const resetFilters = () => {
  searchKeyword.value = "";
  typeFilter.value = "all";
  statusFilter.value = "all";
};

// 打开详情弹窗
const openDetail = (point) => {
  currentPoint.value = { ...point };
  showDetailModal.value = true;
  document.body.style.overflow = "hidden";
};

// 关闭弹窗
const closeModal = () => {
  showDetailModal.value = false;
  setTimeout(() => {
    currentPoint.value = null;
  }, 300);
  document.body.style.overflow = "";
};

// 处理维护申请
const handleMaintenance = () => {
  if (!currentPoint.value) return;
  alert(`已提交 ${currentPoint.value.name} 的维护申请`);
  // 实际应用中可发送API请求
};

// 格式化时间
const formatTime = (timestamp) => {
  const date = new Date(timestamp);
  return date.toLocaleString("zh-CN", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
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

// 切换搜索输入框显示
const toggleSearch = () => {
  showSearchInput.value = !showSearchInput.value;
  if (showSearchInput.value) {
    nextTick(() => {
      searchInputRef.value?.focus();
    });
  }
};

// 设置状态筛选
const setFilter = (status) => {
  statusFilter.value = status;
};

// 初始化加载数据
onMounted(() => {
  loadPoints();
});
</script>

<style scoped lang="scss">
.monitoring-points-container {
  height: 300px;
  
}

/* 头部统计区 */
.stats-header {

  .section-title {
    display: flex;
    align-items: center;
    gap: 10px;
    margin-bottom: 15px;

    h2 {
      margin: 0;
      font-size: 18px;
      color: #ffffff;
      font-weight: 600;
    }

    .icon-marker {
      font-size: 20px;
      color: #3b82f6;
    }
  }

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

  .filter-controls {
    display: flex;
    gap: 10px;
    align-items: center;
    flex-wrap: wrap;

    .search-container {
      position: relative;
      
      .search-toggle {
        padding: 6px;
        border-radius: 4px;
        background-color: rgba(59, 130, 246, 0.1);
        border: 1px solid rgba(59, 130, 246, 0.3);
        color: #3b82f6;
        cursor: pointer;
        transition: all 0.2s;
        width: 36px;
        height: 36px;

        &:hover {
          background-color: rgba(59, 130, 246, 0.2);
          border-color: #3b82f6;
        }
      }

      .search-input {
        position: absolute;
        right: 0;
        top: 0;
        padding: 6px 12px;
        border-radius: 4px;
        border: 1px solid rgba(59, 130, 246, 0.3);
        background-color: rgba(255, 255, 255, 0.05);
        color: #ffffff;
        font-size: 13px;
        min-width: 150px;
        transform-origin: right center;
        animation: slideIn 0.2s ease;

        &::placeholder {
          color: #94a3b8;
        }
      }

      @keyframes slideIn {
        from {
          opacity: 0;
          transform: scaleX(0);
        }
        to {
          opacity: 1;
          transform: scaleX(1);
        }
      }
    }

    .type-filter {
      padding: 6px 12px;
      border-radius: 4px;
      border: 1px solid rgba(59, 130, 246, 0.3);
      background-color: rgba(255, 255, 255, 0.05);
      color: #ffffff;
      font-size: 13px;
      cursor: pointer;

      option {
        background-color: #1e293b;
        color: #ffffff;
      }
    }

    .refresh-btn {
      padding: 6px;
      border-radius: 4px;
      background-color: rgba(59, 130, 246, 0.1);
      border: 1px solid rgba(59, 130, 246, 0.3);
      color: #3b82f6;
      cursor: pointer;
      transition: all 0.2s;
      width: 36px;
      height: 36px;

      &:hover {
        background-color: rgba(59, 130, 246, 0.2);
        border-color: #3b82f6;
      }

      &:disabled {
        opacity: 0.6;
        cursor: not-allowed;
      }
    }

    .loading-spinner {
      width: 14px;
      height: 14px;
      border: 2px solid #3b82f6;
      border-top-color: transparent;
      border-radius: 50%;
      animation: spin 1s linear infinite;
    }
  }
}

/* 表格样式 */
.points-table {
  display: flex;
  flex-direction: column;
  height: 200px;
}

// .table-header {
//   display: grid;
//   grid-template-columns: 1fr 2fr 1fr 1fr 1fr;
//   padding: 12px 20px;
//   font-weight: 600;
//   font-size: 13px;
//   position: sticky;
//   top: 0;
//   z-index: 10;

//   .table-cell {
//     color: #94a3b8;
//     display: flex;
//     align-items: center;
//   }
// }

.table-row {
  display: grid;
  grid-template-columns: 1fr 2fr 1fr 1fr 1fr;
  border-bottom: 1px solid rgba(255, 255, 255, 0.05);
  transition: all 0.2s ease;
  align-items: center;

  &:hover {
    background-color: rgba(56, 70, 100, 0.3);
  }

  &:last-child {
    border-bottom: none;
  }

  // 状态样式
  &.available {
    border-left: 3px solid #10b981;
  }

  &.warning {
    border-left: 3px solid #f59e0b;
  }

  &.unavailable {
    border-left: 3px solid #ef4444;
    opacity: 0.85;
  }
}

.table-cell {
  font-size: 13px;

  &.name {
    .point-name {
      font-weight: 500;
      color: #e2e8f0;
    }
  }

  &.location {
    .point-location {
      font-size: 12px;
      color: #94a3b8;
    }
  }

  &.type {
    .type-badge {
      padding: 3px 8px;
      border-radius: 4px;
      font-size: 12px;
      font-weight: 500;

      &.takeoff {
        background-color: rgba(59, 130, 246, 0.15);
        color: #3b82f6;
      }

      &.operation {
        background-color: rgba(16, 185, 129, 0.15);
        color: #10b981;
      }
    }
  }

  &.status {
    display: flex;
    align-items: center;

    .status-indicator {
      width: 8px;
      height: 8px;
      border-radius: 50%;
    }

    &.available .status-indicator {
      background-color: #10b981;
      box-shadow: 0 0 0 2px rgba(16, 185, 129, 0.2);
    }

    &.warning .status-indicator {
      background-color: #f59e0b;
      box-shadow: 0 0 0 2px rgba(245, 158, 11, 0.2);
    }

    &.unavailable .status-indicator {
      background-color: #ef4444;
      box-shadow: 0 0 0 2px rgba(239, 68, 68, 0.2);
    }

    .warning-tooltip {
      color: #f59e0b;
      font-size: 12px;
      cursor: help;
    }
  }

  &.actions {
    display: flex;
    justify-content: flex-start;
  }
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

/* 弹窗样式 */
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: rgba(0, 0, 0, 0.7);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  padding: 20px;
  opacity: 0;
  visibility: hidden;
  transition: all 0.3s ease;

  &.modal-visible {
    opacity: 1;
    visibility: visible;
  }
}

.modal-content {
  background-color: #0f1733;
  border-radius: 8px;
  width: 100%;
  max-width: 800px;
  max-height: 90vh;
  display: flex;
  flex-direction: column;
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.4);
  transform: translateY(20px) scale(0.98);
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);

  .modal-overlay.modal-visible & {
    transform: translateY(0) scale(1);
  }
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px 20px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);

  h3 {
    margin: 0;
    font-size: 18px;
    color: #ffffff;
    font-weight: 600;
  }
}

.close-btn {
  background: none;
  border: none;
  color: #94a3b8;
  font-size: 22px;
  cursor: pointer;
  transition: all 0.2s;
  width: 32px;
  height: 32px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;

  &:hover {
    color: #ffffff;
    background-color: rgba(255, 255, 255, 0.1);
  }
}

.modal-body {
  flex: 1;
  overflow-y: auto;
  padding: 20px;

  .detail-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 20px;

    @media (max-width: 768px) {
      grid-template-columns: 1fr;
    }
  }

  .detail-section {
    background-color: rgba(255, 255, 255, 0.03);
    border-radius: 6px;
    padding: 15px;

    h4 {
      margin: 0 0 15px 0;
      font-size: 15px;
      color: #ffffff;
      padding-bottom: 8px;
      border-bottom: 1px solid rgba(255, 255, 255, 0.05);
    }

    .info-item {
      display: flex;
      margin-bottom: 12px;

      &:last-child {
        margin-bottom: 0;
      }

      .info-label {
        flex: 0 0 90px;
        font-size: 13px;
        color: #94a3b8;
      }

      .info-value {
        flex: 1;
        font-size: 13px;
        color: #e2e8f0;

        &.status-available {
          color: #10b981;
        }

        &.status-warning {
          color: #f59e0b;
        }

        &.status-unavailable {
          color: #ef4444;
        }
      }
    }
  }

  .warnings {
    grid-column: 1 / -1;

    .warning-message {
      background-color: rgba(245, 158, 11, 0.1);
      border-left: 3px solid #f59e0b;
      padding: 10px 15px;
      border-radius: 4px;
      margin-bottom: 15px;
      font-size: 13px;
      color: #fde68a;
    }

    h5 {
      margin: 0 0 10px 0;
      font-size: 13px;
      color: #94a3b8;
    }

    .warning-history {
      background-color: rgba(255, 255, 255, 0.02);
      border-radius: 4px;
      padding: 10px;
    }

    .warning-record {
      display: flex;
      margin-bottom: 8px;

      &:last-child {
        margin-bottom: 0;
      }

      .warning-time {
        flex: 0 0 100px;
        font-size: 12px;
        color: #94a3b8;
      }

      .warning-text {
        flex: 1;
        font-size: 12px;
        color: #e2e8f0;
      }
    }
  }
}

.modal-footer {
  padding: 15px 20px;
  border-top: 1px solid rgba(255, 255, 255, 0.1);
  display: flex;
  justify-content: flex-end;
  gap: 10px;
}

.maintain-btn {
  padding: 8px 16px;
  background-color: rgba(239, 68, 68, 0.1);
  border: 1px solid #ef4444;
  color: #ef4444;
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.2s;
  font-size: 13px;

  &:hover {
    background-color: rgba(239, 68, 68, 0.2);
  }
}

.close-modal-btn {
  padding: 8px 16px;
  background-color: #3b82f6;
  color: white;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.2s;
  font-size: 13px;

  &:hover {
    background-color: #2563eb;
  }
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

// /* 响应式调整 */
// @media (max-width: 768px) {
//   .table-header,
//   .point-item {
//     grid-template-columns: 2fr 1fr 1fr 1fr;
//   }

//   .table-header .table-cell.location,
//   .point-item .table-cell.location {
//     display: none;
//   }
  
//   .stats-summary {
//     gap: 10px;
//   }

//   .stat-item {
//     min-width: auto;
//     flex: 1;
//     text-align: center;
//   }
// }
</style>