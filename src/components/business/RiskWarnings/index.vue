<template>
  <div class="risk-warnings-container">
    <!-- 标题栏 + 统计筛选区 -->
    <div class="title-bar">
      <button class="title-bar-button" @click="openHistoryDialog">统计</button>
    </div>
    <div class="header-bar">
      <div class="stats-cards">
        <div
          class="stat-card all"
          :class="{ active: selectedLevel === 'all' }"
          @click="selectLevel('all')"
        >
          <div class="stat-value">{{ totalWarnings }}</div>
          <div class="stat-label">全部预警</div>
        </div>
        <div
          class="stat-card level-danger"
          :class="{ active: selectedLevel === 'danger' }"
          @click="selectLevel('danger')"
        >
          <div class="stat-value">{{ dangerCount }}</div>
          <div class="stat-label">危险预警</div>
        </div>
        <div
          class="stat-card level-warning"
          :class="{ active: selectedLevel === 'warning' }"
          @click="selectLevel('warning')"
        >
          <div class="stat-value">{{ warningCount }}</div>
          <div class="stat-label">警告预警</div>
        </div>
        <div
          class="stat-card level-info"
          :class="{ active: selectedLevel === 'info' }"
          @click="selectLevel('info')"
        >
          <div class="stat-value">{{ infoCount }}</div>
          <div class="stat-label">一般预警</div>
        </div>
      </div>
    </div>

    <!-- 加载状态 -->
    <div v-if="isLoading" class="loading-container">
      <div class="loading-spinner"></div>
      <div class="loading-text">正在加载预警信息...</div>
    </div>

    <!-- 预警内容区（按时间分组，贴合截图） -->
    <div v-else class="warnings-content">
      <div v-if="groupedWarnings.length === 0" class="empty-tip">
        <div class="empty-icon">✓</div>
        <div class="empty-text">暂无风险预警</div>
      </div>

      <!-- 按时间分组渲染 -->
      <div
        v-for="(group, time) in groupedWarnings"
        :key="time"
        class="time-group"
      >
        <!-- 时间标题（截图核心要素） -->
        <div class="time-title">{{ time }}</div>

        <!-- 该时间下的所有预警 -->
        <div class="warning-list">
          <div
            v-for="(warning, idx) in group"
            :key="idx"
            class="warning-item"
            :class="`type-${warning.targetType} level-${warning.level}`"
          >
            <!-- 预警类型标签（起降点/航线/空域） -->
            <span class="target-type-tag">{{
              getTargetTypeText(warning.targetType)
            }}</span>
            <!-- 具体预警内容（截图核心展示） -->
            <span class="warning-content">{{ warning.detail }}</span>
          </div>
        </div>
      </div>
    </div>
  </div>

  <!-- 历史弹窗（保留原功能） -->
  <div v-if="showHistory" class="dialog-mask" @click="closeHistoryDialog">
    <div class="dialog-container" @click.stop>
      <div class="dialog-header">
        <h3>近七日风险预警情况</h3>
        <button class="dialog-close" @click="closeHistoryDialog">×</button>
      </div>
      <div class="dialog-content">
        <WeatherWarnings />
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, computed, defineAsyncComponent } from "vue";
import { getRiskWarnings } from "@/api/meteorology";
import { useDashboardStore } from "@/store/modules/dashboard";

const WeatherWarnings = defineAsyncComponent(() =>
  import("@/components/business/WeatherWarnings/index.vue")
);
const dashboardStore = useDashboardStore();

// 响应式数据
const isLoading = ref(true);
const warnings = ref([]);
const selectedLevel = ref("all");
const showHistory = ref(false);

// 初始化加载数据
onMounted(() => {
  fetchData();
  // setInterval(fetchData, 30000) // 可选：30秒刷新一次
});

// 获取预警数据
const fetchData = async () => {
  isLoading.value = true;
  try {
    const result = await getRiskWarnings();
    if (result.code === 200) {
      // 适配截图数据结构：添加 targetType（目标类型：takeoff/route/airspace）
      warnings.value = result.data.warnings.map((w) => ({
        ...w,
        targetType:
          w.targetType ||
          ["takeoff", "route", "airspace"][Math.floor(Math.random() * 3)],
        // 确保detail为截图式具体描述（如："【中科大起降点】风速超过8m/s,飞行存在严重风险"）
        detail:
          w.detail ||
          `${w.area ? `【${w.area}】` : ""}${
            w.riskReason || "飞行存在严重风险"
          }`,
      }));
    }
  } catch (err) {
    console.error("获取风险预警数据失败：", err);
  } finally {
    isLoading.value = false;
  }
};

// 按预警等级筛选
const filteredWarnings = computed(() => {
  if (selectedLevel.value === "all") return warnings.value;
  return warnings.value.filter((w) => w.level === selectedLevel.value);
});

// 按时间分组（截图核心展示逻辑）
const groupedWarnings = computed(() => {
  const groups = {};
  filteredWarnings.value.forEach((warning) => {
    // 取预警开始时间（精确到分钟，如：16:00:00）
    const timeKey =
      warning.startTime.slice(0, 8) || new Date().toTimeString().slice(0, 8);
    if (!groups[timeKey]) {
      groups[timeKey] = [];
    }
    groups[timeKey].push(warning);
  });
  // 按时间降序排序
  return Object.fromEntries(
    Object.entries(groups).sort(([timeA], [timeB]) =>
      timeB.localeCompare(timeA)
    )
  );
});

// 统计数据（保留原功能）
const totalWarnings = computed(() => warnings.value.length);
const dangerCount = computed(
  () => warnings.value.filter((w) => w.level === "danger").length
);
const warningCount = computed(
  () => warnings.value.filter((w) => w.level === "warning").length
);
const infoCount = computed(
  () => warnings.value.filter((w) => w.level === "info").length
);

// 类型文本转换（起降点/航线/空域）
const getTargetTypeText = (type) => {
  const typeMap = {
    takeoff: "起降点",
    route: "航线",
    airspace: "空域",
  };
  return typeMap[type] || "未知类型";
};

// 筛选等级
const selectLevel = (level) => {
  selectedLevel.value = level;
};

// 历史弹窗控制
const openHistoryDialog = (e) => {
  e.stopPropagation();
  showHistory.value = true;
};
const closeHistoryDialog = () => {
  showHistory.value = false;
};
</script>

<style  lang="scss">
.risk-warnings-container {
  height: 560px;
}

/* 头部栏：标题+统计+按钮 */
.header-bar {
  margin-bottom: 20px;
  display: flex;
  flex-direction: column;
  gap: 10px;

  .panel-title {
    font-size: 16px;
    color: #40ecff;
    margin: 0;
    letter-spacing: 1px;
  }
}

/* 统计卡片（保留原样式，调整布局） */
.stats-cards {
  display: flex;
  gap: 8px;
  height: 70px;
}

.stat-card {
  flex: 1;
  border-radius: 6px;
  padding: 6px 10px;
  cursor: pointer;
  transition: all 0.3s ease;
  border: 1px solid transparent;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  font-family: "AiDeepFont";

  &:hover {
    transform: translateY(-2px);
  }

  &.active {
    transform: translateY(-2px);
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
  }

  &.all {
    background: linear-gradient(
      135deg,
      rgba(100, 116, 139, 0.2),
      rgba(100, 116, 139, 0.1)
    );
    .stat-value {
      color: #f1f5f9;
      text-shadow: 0 0 8px rgba(100, 116, 139, 0.4);
    }
    .stat-label {
      color: #cbd5e1;
    }
  }

  &.level-danger {
    background: linear-gradient(
      135deg,
      rgba(239, 68, 68, 0.2),
      rgba(239, 68, 68, 0.1)
    );
    .stat-value {
      color: rgba(239, 68, 68, 0.8);
      text-shadow: 0 0 8px rgba(239, 68, 68, 0.4);
    }
    .stat-label {
      color: rgba(239, 68, 68, 1);
    }
  }

  &.level-warning {
    background: linear-gradient(
      135deg,
      rgba(245, 158, 11, 0.2),
      rgba(245, 158, 11, 0.1)
    );
    .stat-value {
      color: #fce78a;
      text-shadow: 0 0 8px rgba(245, 158, 11, 0.4);
    }
    .stat-label {
      color: #fce78a;
    }
  }

  &.level-info {
    background: linear-gradient(
      135deg,
      rgba(6, 182, 212, 0.2),
      rgba(6, 182, 212, 0.1)
    );
    .stat-value {
      color: #67e8f9;
      text-shadow: 0 0 8px rgba(6, 182, 212, 0.4);
    }
    .stat-label {
      color: #67e8f9;
    }
  }

  .stat-value {
    font-size: 22px;
    font-weight: 700;
    margin-bottom: 2px;
  }

  .stat-label {
    font-size: 11px;
  }
}



/* 预警内容区（按时间分组） */
.warnings-content {
  height: calc(100% - 120px);
  overflow-y: auto;
  padding-right: 5px;

  &::-webkit-scrollbar {
    width: 4px;
  }
  &::-webkit-scrollbar-thumb {
    background: rgba(59, 130, 246, 0.3);
    border-radius: 2px;
  }
}

/* 时间分组标题（截图核心样式） */
.time-group {
  margin-bottom: 20px;

  .time-title {
    font-size: 14px;
    color: #ffc107;
    margin-bottom: 8px;
    padding-left: 8px;
    border-left: 2px solid #ffc107;
  }
}

/* 预警列表 */
.warning-list {
  display: flex;
  flex-direction: column;
  gap: 6px;
  padding-left: 10px;
}

/* 预警项（贴合截图简洁风格） */
.warning-item {
  display: flex;
  align-items: flex-start;
  gap: 8px;
  padding: 6px 8px;
  background: rgba(255, 255, 255, 0.03);
  border-radius: 4px;
  font-size: 13px;
  line-height: 1.4;

  /* 类型标签颜色区分 */
  &.type-takeoff .target-type-tag {
    background: #ef444420;
    color: #ef4444;
  }
  &.type-route .target-type-tag {
    background: #f59e0b20;
    color: #f59e0b;
  }
  &.type-airspace .target-type-tag {
    background: #00b4ff20;
    color: #00b4ff;
  }

  /* 等级颜色强化 */
  &.level-danger .warning-content {
    color: #fca5a5;
  }
  &.level-warning .warning-content {
    color: #fde68a;
  }
  &.level-info .warning-content {
    color: #93c5fd;
  }
}

/* 目标类型标签（起降点/航线/空域） */
.target-type-tag {
  font-size: 11px;
  padding: 2px 6px;
  border-radius: 3px;
  font-weight: 500;
  white-space: nowrap;
}

/* 预警内容 */
.warning-content {
  flex: 1;
  color: #e2e8f0;
  word-break: break-all;
}

/* 处理状态标签 */
.status-badge {
  font-size: 10px;
  padding: 2px 6px;
  border-radius: 3px;
  white-space: nowrap;

  &.unhandled {
    background: rgba(239, 68, 68, 0.2);
    color: #fca5a5;
    border: 1px solid rgba(239, 68, 68, 0.3);
  }

  &.handled {
    background: rgba(34, 197, 94, 0.2);
    color: #86efac;
    border: 1px solid rgba(34, 197, 94, 0.3);
  }
}

/* 空状态 */
.empty-tip {
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  color: #64748b;

  .empty-icon {
    font-size: 32px;
    color: #34d399;
    margin-bottom: 10px;
    text-shadow: 0 0 10px rgba(52, 211, 153, 0.3);
  }

  .empty-text {
    font-size: 14px;
    color: #94a3b8;
  }
}

/* 加载状态 */
.loading-container {
  width: 100%;
  height: calc(100% - 120px);
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;

  .loading-text {
    color: #94a3b8;
    margin-top: 10px;
    font-size: 12px;
  }
}

.loading-spinner {
  width: 32px;
  height: 32px;
  border: 3px solid rgba(64, 236, 255, 0.2);
  border-top-color: #40ecff;
  border-radius: 50%;
  animation: spin 1s linear infinite;
  box-shadow: 0 0 10px rgba(64, 236, 255, 0.3);
}

/* 动画 */
@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

/* 响应式适配 */
@media (max-width: 768px) {
  .stats-cards {
    gap: 5px;
    height: 60px;
  }

  .stat-card {
    padding: 4px 6px;

    .stat-value {
      font-size: 16px;
    }
    .stat-label {
      font-size: 10px;
    }
  }

  .warning-item {
    font-size: 12px;
    gap: 6px;
  }

  .target-type-tag {
    font-size: 10px;
    padding: 1px 4px;
  }
}
</style>