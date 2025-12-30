<template>
  <div class="areas-container">
    <div class="stats-header">
      <div class="stats-summary">
        <!-- 统计项保持不变 -->
        <div class="stat-item" @click="setFilter('all')">
          <div class="stat-label">总重点关注区域</div>
          <div class="stat-value">{{ totalAreas }}</div>
        </div>
        <div class="stat-item available" @click="setFilter('available')">
          <div class="stat-label">可用</div>
          <div class="stat-value">{{ availableAreas }}</div>
        </div>
        <div class="stat-item unavailable" @click="setFilter('unavailable')">
          <div class="stat-label">不可用</div>
          <div class="stat-value">{{ unavailableAreas }}</div>
        </div>
        <div class="stat-item warning" @click="setFilter('warning')">
          <div class="stat-label">预警中</div>
          <div class="stat-value">{{ warningAreas }}</div>
        </div>
      </div>
      <!-- 添加搜索框和类型筛选 -->
      <div class="controls-bar">
        <div class="search-box">
          <input
            ref="searchInputRef"
            v-model="searchKeyword"
            type="text"
            placeholder="搜索重点关注区域名称或位置..."
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

        <button class="add-area-btn" @click="handleAddArea">
          <span class="add-icon">+</span> 添加新区域
        </button>
      </div>
    </div>

    <!-- 其余部分保持不变 -->
    <!-- 重点关注区域列表 -->
    <div class="areas-table">
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
        <p>加载重点关注区域数据中...</p>
      </div>

      <!-- 空状态 -->
      <div v-if="!isLoading && filteredAreas.length === 0" class="empty-state">
        <div class="empty-icon">📌</div>
        <p>没有找到匹配的重点关注区域</p>
        <button class="reset-btn" @click="resetFilters">重置筛选条件</button>
      </div>

      <!-- 重点关注区域列表项 -->
      <div class="table-body">
        <div
          v-for="area in filteredAreas"
          :key="area.id"
          class="table-row"
          :class="area.status"
        >
          <div class="table-cell name">
            <div class="area-name">{{ area.name }}</div>
          </div>
          <div class="table-cell location">
            <div class="area-location">{{ area.location }}</div>
          </div>
          <div class="table-cell type">
            <span class="type-badge" :class="area.type">
              {{ area.type === "takeoff" ? "起降点" : "作业点" }}
            </span>
          </div>
          <div class="table-cell status">
            <div class="status-indicator"></div>
            <span class="status-text">
              {{ getStatusText(area.status) }}
            </span>
            <span
              v-if="area.warningReason"
              class="warning-tooltip"
              :title="area.warningReason"
            >
              ⓘ
            </span>
          </div>
          <div class="table-cell actions">
            <button class="detail-btn" @click="switchArea(area)">
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
import { useAreaStore } from "@/store/modules/area";
import { updateSelectedArea } from "@/api";

// 使用组合函数
const areaStore= useAreaStore();

// 状态管理
const searchKeyword = ref("");
const typeFilter = ref("all");
const currentArea = ref(null);
const statusFilter = ref("all");

// 添加 emit
const emit = defineEmits(["area-selected", "add-area"]);

// 过滤后的重点关注区域列表（从store中获取）
const filteredAreas = computed(() => {
  return areaStore.areaList.filter((area) => {
    // 类型过滤
    const typeMatch =
      typeFilter.value === "all" || area.type === typeFilter.value;

    // 状态过滤
    const statusMatch =
      statusFilter.value === "all" || area.status === statusFilter.value;

    // 搜索过滤
    const searchMatch =
      !searchKeyword.value ||
      area.name.toLowerCase().includes(searchKeyword.value.toLowerCase()) ||
      area.location.toLowerCase().includes(searchKeyword.value.toLowerCase());

    return typeMatch && searchMatch && statusMatch;
  });
});

// 统计数据
const totalAreas = computed(() => areaStore.areaList.length);
const availableAreas = computed(
  () =>
    areaStore.areaList.filter((a) => a.status === "available")
      .length
);
const unavailableAreas = computed(
  () =>
    areaStore.areaList.filter((a) => a.status === "unavailable")
      .length
);
const warningAreas = computed(
  () =>
    areaStore.areaList.filter((a) => a.status === "warning").length
);

// 重置筛选条件
const resetFilters = () => {
  searchKeyword.value = "";
  typeFilter.value = "all";
  statusFilter.value = "all";
};
const switchArea = async (area) => {
  currentArea.value = { ...area };

  // 保存到全局状态
  areaStore.setSelectedArea(area);

  try {
    // 调用API保存到后台
    await updateSelectedArea(area);
  } catch (error) {
    console.error('保存重点关注区域信息失败:', error);
    // 即使保存失败，也继续执行后续操作
  }

  // 触发事件通知父组件
  emit("area-selected", area);
};

// 处理添加新区域
const handleAddArea = () => {
  emit("add-area");
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
.area-container {
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
      background: url("@/assets/images/bg_mp_type.png");
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
.areas-table {
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

  .add-area-btn {
    padding: 6px 12px;
    background-color: rgba(16, 185, 129, 0.2);
    border: 1px solid #10b981;
    color: #10b981;
    border-radius: 4px;
    font-size: 13px;
    cursor: pointer;
    transition: all 0.2s;
    display: flex;
    align-items: center;
    gap: 4px;

    .add-icon {
      font-size: 16px;
      font-weight: bold;
    }

    &:hover {
      background-color: rgba(16, 185, 129, 0.3);
      transform: translateY(-1px);
    }

    &:active {
      transform: translateY(0);
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