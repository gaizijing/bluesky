<template>
  <div class="flight-tasks-container">
    <!-- 标题栏 -->
    <div class="title-bar">
      <select
        class="status-filter"
        v-model="selectedStatus"
        @change="filterTasks"
      >
        <option value="all">全部任务</option>
        <option value="ongoing">进行中</option>
        <option value="waiting">待执行</option>
        <option value="completed">已完成</option>
      </select>
    </div>

    <!-- 加载状态 -->
    <div v-if="isLoading" class="loading-container">
      <div class="loading-spinner"></div>
    </div>

    <!-- 任务列表 -->
    <div v-else class="tasks-list">
      <div class="list-header">
        <div class="header-item" style="width: 25%">任务信息</div>
        <div class="header-item" style="width: 35%">起降信息</div>
        <div class="header-item" style="width: 25%">状态</div>
        <div class="header-item" style="width: 15%">操作</div>
      </div>
      <div class="list-body">
        <div
          v-for="task in filteredTasks"
          :key="task.taskId"
          class="task-item"
          :class="{ active: selectedTaskId === task.taskId }"
          @click="selectTask(task.taskId)"
        >
          <!-- 任务信息 -->
          <div class="item-field" style="width: 25%">
            <div class="task-id">{{ task.taskId }}</div>
            <div
              class="task-type"
              :style="{
                backgroundColor: task.typeColor + '33',
                color: task.typeColor,
              }"
            >
              {{ task.type }}
            </div>
          </div>

          <!-- 起降信息 -->
          <div class="item-field" style="width: 35%">
            <div class="aircraft-type">{{ task.aircraftType }}</div>
            <div class="takeoff-landing">
              {{ task.takeoff }} → {{ task.landing }}
            </div>
          </div>

          <!-- 状态信息 -->
          <div class="item-field" style="width: 25%">
            <div class="task-status" :class="task.status">
              {{ statusTextMap[task.status] }}
            </div>
            <div
              class="adapt-status"
              :class="task.meteorologyAdapt === '适配' ? 'normal' : 'danger'"
            >
              {{ task.meteorologyAdapt }}：{{ task.adaptReason }}
            </div>
          </div>

          <!-- 操作按钮 -->
          <div class="item-field" style="width: 15%">
            <button class="detail-btn" @click.stop="openTaskDetail(task)">
              详情
            </button>
          </div>
        </div>
        <div v-if="filteredTasks.length === 0" class="empty-tip">
          暂无符合条件的任务
        </div>
      </div>
    </div>

    <!-- 任务详情弹窗 -->
    <div v-if="showTaskDetail" class="dialog-mask">
      <div class="dialog-container">
        <div class="dialog-header">
          <span>任务详情：{{ currentTask.taskId }}</span>
          <button class="dialog-close" @click="closeTaskDetail">×</button>
        </div>
        <div class="dialog-content">
          <div class="detail-row">
            <span class="label">任务类型：</span>
            <span :style="{ color: currentTask.typeColor }">{{
              currentTask.type
            }}</span>
          </div>
          <div class="detail-row">
            <span class="label">机型：</span>
            <span>{{ currentTask.aircraftType }}</span>
          </div>
          <div class="detail-row">
            <span class="label">起降点：</span>
            <span>{{ currentTask.takeoff }} → {{ currentTask.landing }}</span>
          </div>
          <div class="detail-row">
            <span class="label">计划高度：</span>
            <span>{{ currentTask.planHeight }}m</span>
          </div>
          <div class="detail-row">
            <span class="label">时间：</span>
            <span>{{ currentTask.startTime }} - {{ currentTask.endTime }}</span>
          </div>
          <div v-if="currentTask.status === 'ongoing'" class="detail-row">
            <span class="label">当前位置：</span>
            <span>{{ currentTask.currentPos }}</span>
          </div>
          <div class="detail-row">
            <span class="label">气象适配：</span>
            <span
              :class="
                currentTask.meteorologyAdapt === '适配' ? 'normal' : 'danger'
              "
            >
              {{ currentTask.meteorologyAdapt }}（{{
                currentTask.adaptReason
              }}）
            </span>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, computed } from "vue";
import { getFlightTasks } from "@/api/meteorology";
import { formatUpdateTime } from "@/utils/formatUtils";

// 响应式数据
const isLoading = ref(true);
const updateTime = ref("");
const formattedUpdateTime = ref("暂无数据");
const tasks = ref([]); // 所有任务
const selectedStatus = ref("all"); // 筛选状态
const selectedTaskId = ref(""); // 当前选中的任务ID

// 详情弹窗
const showTaskDetail = ref(false);
const currentTask = ref(null);

// 状态文字映射
const statusTextMap = {
  ongoing: "进行中",
  waiting: "待执行",
  completed: "已完成",
};

// 初始化
onMounted(() => {
  fetchData();
});

// 获取数据
const fetchData = async () => {
  isLoading.value = true;
  try {
    const result = await getFlightTasks();
    if (result.code === 200) {
      updateTime.value = result.data.updateTime;
      formattedUpdateTime.value = formatUpdateTime(updateTime.value);
      tasks.value = result.data.tasks;
    }
  } catch (err) {
    console.error("获取飞行任务失败：", err);
  } finally {
    isLoading.value = false;
  }
};

// 筛选任务
const filteredTasks = computed(() => {
  if (selectedStatus.value === "all") return tasks.value;
  return tasks.value.filter((task) => task.status === selectedStatus.value);
});

// 选中任务（高亮）
const selectTask = (taskId) => {
  selectedTaskId.value = taskId;
};

// 详情弹窗控制
const openTaskDetail = (task) => {
  currentTask.value = task;
  showTaskDetail.value = true;
};

const closeTaskDetail = () => {
  showTaskDetail.value = false;
};
</script>

<style scoped lang="scss">
.flight-tasks-container {
  width: 100%;
  height: 220px;
  box-sizing: border-box;
}

.loading-container {
  width: 100%;
  height: calc(100% - 30px);
  display: flex;
  justify-content: center;
  align-items: center;
}

.loading-spinner {
  width: 24px;
  height: 24px;
  border: 2px solid #3b82f6;
  border-top-color: transparent;
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

// 任务列表样式
.tasks-list {
  width: 100%;
  display: flex;
  flex-direction: column;
}

.list-header {
  display: flex;
  height: 25px;
  border-bottom: 1px solid #334155;
  margin-bottom: 5px;

  .header-item {
    color: $text-light;
    font-size: 12px;
    display: flex;
    align-items: center;
    font-weight: 600;
    padding: 0 5px;
  }
}

.list-body {
  flex: 1;
  overflow-y: auto;

  &::-webkit-scrollbar {
    width: 4px;
  }
  &::-webkit-scrollbar-thumb {
    background-color: #334155;
    border-radius: 2px;
  }
}

.task-item {
  display: flex;
  height: 65px;
  align-items: center;
  border-bottom: 1px dashed #1e293b;
  cursor: pointer;
  transition: background-color 0.3s;
  padding: 0 5px;

  &.active {
    background-color: rgba(59, 130, 246, 0.1);
    border-left: 3px solid #3b82f6;
  }

  &:hover {
    background-color: rgba(59, 130, 246, 0.05);
  }

  .item-field {
    display: flex;
    flex-direction: column;
    justify-content: center;
    height: 100%;
    overflow: hidden;

    .task-id {
      font-size: 11px;
      color: $text-light;
      margin-bottom: 3px;
    }

    .task-type {
      font-size: 12px;
      padding: 1px 6px;
      border-radius: 4px;
      display: inline-block;
      width: fit-content;
    }

    .aircraft-type {
      font-size: 13px;
      color: #e2e8f0;
      margin-bottom: 3px;
      font-weight: 500;
    }

    .takeoff-landing {
      font-size: 11px;
      color: #94a3b8;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .task-status {
      font-size: 13px;
      font-weight: 500;
      margin-bottom: 3px;

      &.ongoing {
        color: #06b6d4;
      }
      &.waiting {
        color: #f59e0b;
      }
      &.completed {
        color: #64748b;
      }
    }

    .adapt-status {
      font-size: 11px;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;

      &.normal {
        color: #06b6d4;
      }
      &.danger {
        color: #ef4444;
      }
    }

    .detail-btn {
      background-image: url("@/assets/images/bg_panel_subtitle2.png");
      background-size: cover;
      background-repeat: no-repeat;
      background-position: center;
      background-color: transparent;
      color: white;
      border: none;
      border-radius: 4px;
      padding: 3px 8px;
      font-size: 12px;
      cursor: pointer;
      transition: background-color 0.3s;

      &:hover {
        background-color: #20537a;
      }
    }
  }
}

.empty-tip {
  width: 100%;
  height: 100%;
  display: flex;
  justify-content: center;
  align-items: center;
  color: #64748b;
  font-size: 12px;
}


.dialog-container {
  .dialog-content {
    .detail-row {
      display: flex;
      margin-bottom: 10px;
      line-height: 1.5;

      .label {
        width: 80px;
        color: #94a3b8;
        flex-shrink: 0;
      }

      .normal {
        color: #06b6d4;
      }

      .danger {
        color: #ef4444;
      }
    }
  }
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}
</style>