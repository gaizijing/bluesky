<template>
  <div class="device-container">
    <!-- 标题栏 -->
    <!-- <div class="title-bar">
      <span class="title">气象设备溯源</span>
      <div class="operation">
        <span class="update-time">最后更新：{{ formattedUpdateTime }}</span>
        <select class="status-filter" v-model="selectedStatus" @change="filterDevices">
          <option value="all">全部</option>
          <option value="normal">正常</option>
          <option value="fault">故障</option>
          <option value="offline">离线</option>
        </select>
      </div>
    </div> -->

    <!-- 加载状态 -->
    <div v-if="isLoading" class="loading-container">
      <div class="loading-spinner"></div>
    </div>

    <!-- 设备列表 -->
    <div v-else class="device-list">
      <div class="list-header">
        <div class="header-item" style="width: 30%;">设备名称</div>
        <div class="header-item" style="width: 15%;">状态</div>
        <div class="header-item" style="width: 25%;">最后校准</div>
        <div class="header-item" style="width: 30%;">区块链哈希</div>
      </div>
      <div class="list-body">
        <div 
          v-for="device in filteredDevices" 
          :key="device.id" 
          class="device-item"
          @click="openDeviceDetail(device)"
        >
          <div class="item-field" style="width: 30%;">
            <span class="device-id">{{ device.id }}</span>
            <span class="device-name">{{ device.name }}</span>
          </div>
          <div class="item-field" style="width: 15%;">
            <span class="status-tag" :class="device.status">
              {{ statusTextMap[device.status] }}
            </span>
          </div>
          <div class="item-field" style="width: 25%; font-size: 12px;">
            {{ device.lastCalibration }}
          </div>
          <div class="item-field" style="width: 30%; font-size: 12px; color: #94a3b8;">
            {{ formatHash(device.blockchainHash) }}
          </div>
        </div>
        <div v-if="filteredDevices.length === 0" class="empty提示">
          暂无符合条件的设备数据
        </div>
      </div>
    </div>

    <!-- 设备详情弹窗 -->
    <div v-if="showDeviceDetail" class="dialog-mask">
      <div class="dialog-container">
        <div class="dialog-header">
          <span>{{ currentDevice.name }}（{{ currentDevice.id }}）详情</span>
          <button class="dialog-close" @click="closeDeviceDetail">×</button>
        </div>
        <div class="dialog-content">
          <p>状态：<span :class="`status-text ${currentDevice.status}`">{{ statusTextMap[currentDevice.status] }}</span></p>
          <p>最后校准时间：{{ currentDevice.lastCalibration }}</p>
          <p>区块链哈希：{{ currentDevice.blockchainHash }}</p>
          <div v-if="currentDevice.faultRecord" class="fault-record">
            <p class="fault-title">故障记录：</p>
            <p>故障时间：{{ currentDevice.faultRecord.time }}</p>
            <p>故障原因：{{ currentDevice.faultRecord.reason }}</p>
            <p>处理人：{{ currentDevice.faultRecord.handler }}</p>
            <p>处理状态：{{ currentDevice.faultRecord.repairStatus }}</p>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, computed } from 'vue'
import { getDeviceTrace } from '@/api/meteorology'
import { formatUpdateTime } from '@/utils/formatUtils'

// 响应式数据
const isLoading = ref(true)
const updateTime = ref('')
const formattedUpdateTime = ref('暂无数据')
const devices = ref([]) // 所有设备
const selectedStatus = ref('all') // 筛选状态
const showDeviceDetail = ref(false)
const currentDevice = ref(null)

// 状态文字映射
const statusTextMap = {
  normal: '正常',
  fault: '故障',
  offline: '离线'
}

// 初始化
onMounted(async() => {
  await fetchData()
})

// 获取数据
const fetchData = async () => {
  isLoading.value = true
  try {
    const result = await getDeviceTrace()
    if (result.code === 200) {
      updateTime.value = result.data.updateTime
      formattedUpdateTime.value = formatUpdateTime(updateTime.value)
      devices.value = result.data.devices
    }
  } catch (err) {
    console.error('获取设备数据失败：', err)
  } finally {
    isLoading.value = false
  }
}

// 筛选设备（根据选中的状态）
const filteredDevices = computed(() => {
  if (selectedStatus.value === 'all') return devices.value
  return devices.value.filter(device => device.status === selectedStatus.value)
})

// 格式化哈希值（只显示前4位和后4位）
const formatHash = (hash) => {
  if (!hash) return '无'
  return `${hash.slice(0, 6)}...${hash.slice(-4)}`
}

// 设备详情弹窗控制
const openDeviceDetail = (device) => {
  currentDevice.value = device
  showDeviceDetail.value = true
}

const closeDeviceDetail = () => {
  showDeviceDetail.value = false
}
</script>

<style scoped lang="scss">
.device-container {
  width: 100%;
  height: 300px;
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

  .operation {
    display: flex;
    align-items: center;
    gap: 10px;

    .update-time {
      font-size: 12px;
      color: #94a3b8;
    }

    .status-filter {
      background-color: #1e293b;
      border: 1px solid #334155;
      color: #e2e8f0;
      font-size: 12px;
      padding: 2px 5px;
      border-radius: 4px;
      cursor: pointer;

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
  width: 20px;
  height: 20px;
  border: 2px solid #3b82f6;
  border-top-color: transparent;
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

// 设备列表样式
.device-list {
  width: 100%;
  height: calc(100% - 30px);
  display: flex;
  flex-direction: column;
}

.list-header {
  display: flex;
  height: 25px;
  border-bottom: 1px solid #334155;
  margin-bottom: 5px;

  .header-item {
    color: #94a3b8;
    font-size: 12px;
    display: flex;
    align-items: center;
    font-weight: 600;
  }
}

.list-body {
  flex: 1;
  overflow-y: auto; // 垂直滚动

  // 滚动条样式优化
  &::-webkit-scrollbar {
    width: 4px;
  }
  &::-webkit-scrollbar-thumb {
    background-color: #334155;
    border-radius: 2px;
  }
}

.device-item {
  display: flex;
  height: 35px;
  align-items: center;
  border-bottom: 1px dashed #1e293b;
  cursor: pointer;
  transition: background-color 0.3s;

  &:hover {
    background-color: rgba(59, 130, 246, 0.1);
  }

  .item-field {
    color: #e2e8f0;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    padding: 0 5px;
  }

  .device-id {
    color: #94a3b8;
    font-size: 11px;
    margin-right: 5px;
  }

  .device-name {
    font-size: 12px;
  }

  .status-tag {
    display: inline-block;
    padding: 2px 8px;
    border-radius: 10px;
    font-size: 11px;
    font-weight: 600;

    &.normal {
      background-color: rgba(6, 182, 212, 0.2);
      color: #06b6d4;
    }

    &.fault {
      background-color: rgba(239, 68, 68, 0.2);
      color: #ef4444;
    }

    &.offline {
      background-color: rgba(245, 158, 11, 0.2);
      color: #f59e0b;
    }
  }
}

.empty提示 {
  width: 100%;
  height: 100%;
  display: flex;
  justify-content: center;
  align-items: center;
  color: #64748b;
  font-size: 12px;
}

// 弹窗样式
.dialog-mask {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: rgba(0, 0, 0, 0.5);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 1000;
}

.dialog-container {
  width: 350px;
  background-color: #0f1733;
  border: 1px solid #3b82f6;
  border-radius: 8px;
  padding: 15px;

  .dialog-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 15px;
    color: #ffffff;
    font-size: 16px;
    font-weight: 600;

    .dialog-close {
      background: none;
      border: none;
      color: #94a3b8;
      font-size: 20px;
      cursor: pointer;

      &:hover {
        color: #ffffff;
      }
    }
  }

  .dialog-content {
    color: #e2e8f0;
    font-size: 14px;
    line-height: 1.8;

    .status-text {
      padding: 2px 8px;
      border-radius: 10px;
      font-size: 12px;
      font-weight: 600;

      &.normal {
        background-color: rgba(6, 182, 212, 0.2);
        color: #06b6d4;
      }

      &.fault {
        background-color: rgba(239, 68, 68, 0.2);
        color: #ef4444;
      }

      &.offline {
        background-color: rgba(245, 158, 11, 0.2);
        color: #f59e0b;
      }
    }

    .fault-record {
      margin-top: 10px;
      padding-top: 10px;
      border-top: 1px solid #334155;

      .fault-title {
        font-weight: 600;
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