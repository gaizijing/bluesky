<template>
  <div class="aircraft-adapt-container">
    <!-- 标题栏 -->
    <div class="title-bar">
      <div class="search-box">
        <input 
          type="text" 
          placeholder="搜索机型..." 
          v-model="searchKeyword"
          @input="filterAircrafts"
        >
      </div>
    </div>

    <!-- 加载状态 -->
    <div v-if="isLoading" class="loading-container">
      <div class="loading-spinner"></div>
    </div>

    <!-- 适配表格 -->
    <div v-else class="adapt-table">
      <!-- 表头（可点击排序） -->
      <div class="table-header">
        <div class="header-cell" style="width: 20%;" @click="sortBy('type')">
          机型 <span v-if="sortKey === 'type'">{{ sortOrder === 'asc' ? '↑' : '↓' }}</span>
        </div>
        <div class="header-cell" style="width: 15%;" @click="sortBy('limits.maxWindSpeed')">
          最大风速限制 <span v-if="sortKey === 'limits.maxWindSpeed'">{{ sortOrder === 'asc' ? '↑' : '↓' }}</span>
        </div>
        <div class="header-cell" style="width: 15%;">当前风速</div>
        <div class="header-cell" style="width: 20%;" @click="sortBy('limits.minVisibility')">
          最低能见度限制 <span v-if="sortKey === 'limits.minVisibility'">{{ sortOrder === 'asc' ? '↑' : '↓' }}</span>
        </div>
        <div class="header-cell" style="width: 15%;">当前能见度</div>
        <div class="header-cell" style="width: 15%;" @click="sortBy('adaptResult')">
          适配状态 <span v-if="sortKey === 'adaptResult'">{{ sortOrder === 'asc' ? '↑' : '↓' }}</span>
        </div>
      </div>

      <!-- 表格内容 -->
      <div class="table-body">
        <div 
          v-for="aircraft in sortedAircrafts" 
          :key="aircraft.id" 
          class="table-row"
          :class="{ odd: $index % 2 === 0 }"
          @mouseenter="showReason(aircraft.id)"
          @mouseleave="hideReason()"
        >
          <div class="row-cell" style="width: 20%;">{{ aircraft.type }}</div>
          <div class="row-cell" style="width: 15%;">{{ aircraft.limits.maxWindSpeed }}m/s</div>
          <div class="row-cell" style="width: 15%;">{{ currentMeteorology.windSpeed }}m/s</div>
          <div class="row-cell" style="width: 20%;">{{ aircraft.limits.minVisibility }}km</div>
          <div class="row-cell" style="width: 15%;">{{ currentMeteorology.visibility }}km</div>
          <div class="row-cell" style="width: 15%;">
            <span class="adapt-status" :class="aircraft.adaptResult === '适配' ? 'normal' : 'danger'">
              {{ aircraft.adaptResult }}
            </span>
            <!-- 适配理由提示框 -->
            <div 
              v-if="showReasonId === aircraft.id" 
              class="reason-tooltip"
            >
              {{ aircraft.adaptReason }}
            </div>
          </div>
        </div>
        <div v-if="sortedAircrafts.length === 0" class="empty-tip">
          没有找到匹配的机型
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, computed, reactive } from 'vue'
import { getAircraftAdapt } from '@/api/meteorology'

// 响应式数据
const isLoading = ref(true)
const currentMeteorology = ref({}) // 当前气象条件
const aircrafts = ref([]) // 所有机型
const filteredAircrafts = ref([]) // 筛选后的机型

// 搜索和排序
const searchKeyword = ref('')
const sortKey = ref('type') // 排序字段
const sortOrder = ref('asc') // 排序方向：asc/desc

// 适配理由提示
const showReasonId = ref('')

// 初始化
onMounted(() => {
  fetchData()
  setInterval(fetchData, 60000) // 1分钟刷新一次
})

// 获取数据
const fetchData = async () => {
  isLoading.value = true
  try {
    const result = await getAircraftAdapt()
    if (result.code === 200) {
      currentMeteorology.value = result.data.currentMeteorology
      aircrafts.value = result.data.aircrafts
      filterAircrafts() // 初始筛选
    }
  } catch (err) {
    console.error('获取飞行器适配数据失败：', err)
  } finally {
    isLoading.value = false
  }
}

// 筛选机型（根据搜索关键词）
const filterAircrafts = () => {
  if (!searchKeyword.value) {
    filteredAircrafts.value = [...aircrafts.value]
  } else {
    const keyword = searchKeyword.value.toLowerCase()
    filteredAircrafts.value = aircrafts.value.filter(aircraft => 
      aircraft.type.toLowerCase().includes(keyword)
    )
  }
}

// 排序处理
const sortedAircrafts = computed(() => {
  // 复制数组避免修改原数据
  const sorted = [...filteredAircrafts.value]
  // 根据sortKey和sortOrder排序
  sorted.sort((a, b) => {
    // 处理嵌套字段（如limits.maxWindSpeed）
    const getValue = (obj, key) => {
      return key.split('.').reduce((o, k) => o && o[k], obj)
    }
    const valueA = getValue(a, sortKey.value)
    const valueB = getValue(b, sortKey.value)

    // 字符串比较
    if (typeof valueA === 'string' && typeof valueB === 'string') {
      return sortOrder.value === 'asc' 
        ? valueA.localeCompare(valueB) 
        : valueB.localeCompare(valueA)
    }
    // 数字比较
    return sortOrder.value === 'asc' 
      ? valueA - valueB 
      : valueB - valueA
  })
  return sorted
})

// 切换排序方式
const sortBy = (key) => {
  if (sortKey.value === key) {
    // 同一字段再次点击切换排序方向
    sortOrder.value = sortOrder.value === 'asc' ? 'desc' : 'asc'
  } else {
    // 不同字段默认升序
    sortKey.value = key
    sortOrder.value = 'asc'
  }
}

// 显示/隐藏适配理由
const showReason = (id) => {
  showReasonId.value = id
}

const hideReason = () => {
  showReasonId.value = ''
}
</script>

<style scoped lang="scss">
.aircraft-adapt-container {
  width: 100%;
  height: 200px;
 
  box-sizing: border-box;
}

.title-bar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  height: 30px;
  margin-bottom: 10px;

  .title {
    font-size: 16px;
    font-weight: 600;
    color: #ffffff;
  }

  .search-box {
    width: 180px;

    input {
      width: 100%;
      background-color: #1e293b;
      border: 1px solid #334155;
      border-radius: 4px;
      color: #e2e8f0;
      font-size: 12px;
      padding: 5px 10px;
      box-sizing: border-box;

      &::placeholder {
        color: #64748b;
      }

      &:focus {
        outline: none;
        border-color: #3b82f6;
      }
    }
  }
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

// 表格样式
.adapt-table {
  width: 100%;
  display: flex;
  flex-direction: column;
}

.table-header {
  display: flex;
  height: 30px;
  font-weight: 600;
}

.header-cell {
  display: flex;
  align-items: center;
  color: #e2e8f0;
  font-size: 12px;
  padding: 0 8px;
  cursor: pointer;
  white-space: nowrap;

  span {
    margin-left: 5px;
    font-size: 10px;
  }

  &:hover {
    color: #3b82f6;
  }
}

.table-body {
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

.table-row {
  display: flex;
  height: 35px;
  align-items: center;
  font-size: 12px;
  color: #e2e8f0;

  &.odd {
    background-color: rgba(30, 41, 59, 0.5);
  }

  &:hover {
    background-color: rgba(59, 130, 246, 0.1);
  }
}

.row-cell {
  padding: 0 8px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;

  .adapt-status {
    display: inline-block;
    padding: 2px 8px;
    border-radius: 10px;
    font-size: 11px;
    font-weight: 600;

    &.normal {
      background-color: rgba(6, 182, 212, 0.2);
      color: #06b6d4;
    }

    &.danger {
      background-color: rgba(239, 68, 68, 0.2);
      color: #ef4444;
    }
  }

  .reason-tooltip {
    position: absolute;
    z-index: 10;
    background-color: rgba(15, 23, 51, 0.9);
    border: 1px solid #3b82f6;
    border-radius: 4px;
    padding: 5px 8px;
    font-size: 11px;
    color: #e2e8f0;
    max-width: 200px;
    margin-top: 25px;
    box-shadow: 0 2px 5px rgba(0, 0, 0, 0.3);
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

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}
</style>