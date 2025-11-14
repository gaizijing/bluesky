<template>
  <div class="system-message-card">
    <!-- 卡片头部 -->
    <div class="card-header">
      <i class="card-icon">🔔</i>
    
      <div class="header-actions">
        <button class="action-btn" @click="toggleStatisticModal">
          <i>📊</i> 历史统计
        </button>
        <button class="action-btn" @click="markAllRead">
          <i>✓</i> 全部已读
        </button>
        <button class="action-btn" @click="clearAllMessages">
          <i>🗑️</i> 清空
        </button>
      </div>
    </div>

    <!-- 消息过滤标签 -->
    <div class="message-tabs">
      <button
        v-for="tab in messageTabs"
        :key="tab.value"
        :class="{ 'tab-btn': true, 'active': activeTab === tab.value }"
        @click="activeTab = tab.value"
      >
        <span class="tab-icon">{{ tab.icon }}</span>
        <span class="tab-text">{{ tab.label }}</span>
        <span v-if="tab.value !== 'all' && getUnreadCount(tab.value) > 0" class="tab-badge">
          {{ getUnreadCount(tab.value) }}
        </span>
      </button>
    </div>

    <!-- 消息列表 -->
    <div class="message-list">
      <div v-if="filteredMessages.length === 0" class="empty-message">
        <i>📭</i>
        <p>暂无相关消息</p>
      </div>
      <div
        v-for="(msg, index) in filteredMessages"
        :key="index"
        class="message-item"
:class="[{ 'unread': !msg.read }, 'type-' + msg.type]"
        @click="markAsRead(index)"
      >
        <!-- 消息类型标签 -->
        <div class="message-tag" :style="{ backgroundColor: getTagColor(msg.type) }">
          {{ getTypeName(msg.type) }}
        </div>
        <!-- 消息内容 -->
        <div class="message-content">
          <h4 class="message-title">{{ msg.title }}</h4>
          <p class="message-desc">{{ msg.content }}</p>
          <div class="message-meta">
            <span class="message-time">{{ msg.time }}</span>
            <span class="message-source">来源：{{ msg.source }}</span>
          </div>
        </div>
        <!-- 操作按钮 -->
        <div class="message-actions">
          <button class="btn-read" @click.stop="markAsRead(index)" :disabled="msg.read">
            {{ msg.read ? '已读' : '标记已读' }}
          </button>
          <button class="btn-delete" @click.stop="deleteMessage(index)">
            🗑️
          </button>
        </div>
      </div>
    </div>

    <!-- 新消息提示动画（仅未读时显示） -->
    <div v-if="hasUnreadMessages" class="new-message-indicator">
      <span>有新消息</span>
      <div class="pulse-animation"></div>
    </div>

    <!-- 历史消息统计弹窗 -->
    <div class="statistic-modal" v-if="showStatisticModal">
      <div class="modal-overlay" @click="toggleStatisticModal"></div>
      <div class="modal-content">
        <div class="modal-header">
          <h3>历史消息统计分析</h3>
          <button class="modal-close" @click="toggleStatisticModal">×</button>
        </div>
        <div class="modal-body">
          <!-- 统计概览 -->
          <div class="statistic-overview">
            <div class="statistic-card">
              <div class="statistic-icon">📊</div>
              <div class="statistic-info">
                <p class="statistic-label">总消息数</p>
                <p class="statistic-value">{{ totalMessagesCount }}</p>
              </div>
            </div>
            <div class="statistic-card">
              <div class="statistic-icon">🔴</div>
              <div class="statistic-info">
                <p class="statistic-label">未读消息</p>
                <p class="statistic-value">{{ unreadMessagesCount }}</p>
              </div>
            </div>
            <div class="statistic-card">
              <div class="statistic-icon">⚠️</div>
              <div class="statistic-info">
                <p class="statistic-label">风险预警</p>
                <p class="statistic-value">{{ typeCount.warning }}</p>
              </div>
            </div>
            <div class="statistic-card">
              <div class="statistic-icon">📈</div>
              <div class="statistic-info">
                <p class="statistic-label">阈值触发</p>
                <p class="statistic-value">{{ typeCount.threshold }}</p>
              </div>
            </div>
          </div>

          <!-- 统计图表 -->
          <div class="statistic-charts">
            <!-- 消息类型分布饼图 -->
            <div class="chart-item">
              <h4>消息类型分布</h4>
              <div ref="typePieChart" class="chart-container"></div>
            </div>
            <!-- 未读/已读占比饼图 -->
            <div class="chart-item">
              <h4>消息状态分布</h4>
              <div ref="statusPieChart" class="chart-container"></div>
            </div>
          </div>

          <!-- 详细统计表格 -->
          <div class="statistic-table">
            <h4>各类型消息详情</h4>
            <table>
              <thead>
                <tr>
                  <th>消息类型</th>
                  <th>总数</th>
                  <th>未读</th>
                  <th>已读</th>
                  <th>占比</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="(type, key) in messageTypes" :key="key">
                  <td>
                    <span class="table-tag" :style="{ backgroundColor: type.color }">{{ type.name }}</span>
                  </td>
                  <td>{{ typeCount[key] }}</td>
                  <td>{{ unreadTypeCount[key] }}</td>
                  <td>{{ typeCount[key] - unreadTypeCount[key] }}</td>
                  <td>{{ ((typeCount[key] / totalMessagesCount) * 100).toFixed(1) }}%</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
        <div class="modal-footer">
          <button class="modal-btn" @click="toggleStatisticModal">关闭</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, nextTick, watch,onUnmounted } from 'vue'
import * as echarts from 'echarts'

// 消息类型配置（颜色+名称映射）
const messageTypes = ref({
  warning: { name: '风险预警', color: '#ef4444' }, // 红色：风险预警
  threshold: { name: '阈值触发', color: '#f59e0b' }, // 黄色：阈值触发
  status: { name: '状态通知', color: '#3b82f6' }, // 蓝色：观测站状态
  system: { name: '系统通知', color: '#8b5cf6' } // 紫色：系统消息
})

// 消息过滤标签
const messageTabs = ref([
  { value: 'all', label: '全部消息', icon: '📋' },
  { value: 'warning', label: '风险预警', icon: '⚠️' },
  { value: 'threshold', label: '阈值触发', icon: '📈' },
  { value: 'status', label: '状态通知', icon: '🖥️' }
])

// 组件状态
const activeTab = ref('all')
const messages = ref([])
const showStatisticModal = ref(false) // 统计弹窗显示状态
const typePieChart = ref(null) // 类型分布图表实例
const statusPieChart = ref(null) // 状态分布图表实例

// 模拟初始消息数据
const generateMockMessages = () => {
  const now = new Date()
  const formatTime = (date) => date.toLocaleString('zh-CN', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  })

  // 生成过去24小时内的随机时间
  const getRandomTime = () => {
    const randomHour = Math.floor(Math.random() * 24)
    const randomMinute = Math.floor(Math.random() * 60)
    const randomSecond = Math.floor(Math.random() * 60)
    const time = new Date(now)
    time.setHours(now.getHours() - randomHour)
    time.setMinutes(randomMinute)
    time.setSeconds(randomSecond)
    return formatTime(time)
  }

  return [
    {
      type: 'warning',
      title: '高风险风切变预警',
      content: '机场A起降坪3号区域检测到强风切变（12.5m/s），建议暂停起降作业',
      time: getRandomTime(),
      source: '激光雷达观测站',
      read: false
    },
    {
      type: 'threshold',
      title: '风速阈值触发',
      content: '无人机作业区B风速达到8.7m/s，超过安全阈值（8m/s），请注意飞行安全',
      time: getRandomTime(),
      source: '地面气象站',
      read: false
    },
    {
      type: 'status',
      title: '观测站在线通知',
      content: '激光雷达观测站（ID: LD-003）已恢复在线，数据同步正常',
      time: getRandomTime(),
      source: '系统监控中心',
      read: true
    },
    {
      type: 'system',
      title: '系统更新提示',
      content: '气象数据处理系统已完成升级，新增湍流强度预测功能',
      time: getRandomTime(),
      source: '系统管理后台',
      read: true
    },
    {
      type: 'warning',
      title: '湍流风险预警',
      content: '航线C-2段检测到中度湍流，建议降低飞行速度至5m/s以下',
      time: getRandomTime(),
      source: '航线气象监测模块',
      read: false
    },
    {
      type: 'threshold',
      title: '温度阈值触发',
      content: '高空作业区温度低于-15℃，可能影响电池性能，建议做好保温措施',
      time: getRandomTime(),
      source: '高空气象站',
      read: true
    },
    {
      type: 'status',
      title: '观测站离线告警',
      content: '地面气象站（ID: GM-012）离线，数据暂无法获取，已通知维护人员',
      time: getRandomTime(),
      source: '系统监控中心',
      read: false
    },
    {
      type: 'warning',
      title: '能见度低风险预警',
      content: '机场B降落航道能见度降至3km，低于安全标准（5km），建议谨慎降落',
      time: getRandomTime(),
      source: '能见度监测仪',
      read: false
    }
  ]
}

// 计算属性：过滤后的消息
const filteredMessages = computed(() => {
  if (activeTab.value === 'all') {
    return messages.value
  }
  return messages.value.filter(msg => msg.type === activeTab.value)
})

// 计算属性：未读消息总数
const unreadMessagesCount = computed(() => {
  return messages.value.filter(msg => !msg.read).length
})

// 计算属性：是否有未读消息
const hasUnreadMessages = computed(() => {
  return unreadMessagesCount.value > 0
})

// 统计相关计算属性
const totalMessagesCount = computed(() => messages.value.length)

// 各类型消息数量统计
const typeCount = computed(() => {
  return Object.keys(messageTypes.value).reduce((count, key) => {
    count[key] = messages.value.filter(msg => msg.type === key).length
    return count
  }, {})
})

// 各类型未读消息数量统计
const unreadTypeCount = computed(() => {
  return Object.keys(messageTypes.value).reduce((count, key) => {
    count[key] = messages.value.filter(msg => msg.type === key && !msg.read).length
    return count
  }, {})
})

// 方法：获取消息类型名称
const getTypeName = (type) => {
  return messageTypes.value[type]?.name || '未知类型'
}

// 方法：获取消息类型颜色
const getTagColor = (type) => {
  return messageTypes.value[type]?.color || '#64748b'
}

// 方法：获取未读消息数
const getUnreadCount = (type) => {
  if (type === 'all') {
    return unreadMessagesCount.value
  }
  return messages.value.filter(msg => msg.type === type && !msg.read).length
}

// 方法：标记单条消息为已读
const markAsRead = (index) => {
  messages.value[index].read = true
}

// 方法：标记所有消息为已读
const markAllRead = () => {
  messages.value.forEach(msg => {
    msg.read = true
  })
}

// 方法：删除单条消息
const deleteMessage = (index) => {
  messages.value.splice(index, 1)
  // 重新渲染统计图表
  initStatisticCharts()
}

// 方法：清空所有消息
const clearAllMessages = () => {
  messages.value = []
  // 重新渲染统计图表
  initStatisticCharts()
}

// 方法：切换统计弹窗显示/隐藏
const toggleStatisticModal = () => {
  showStatisticModal.value = !showStatisticModal.value
  // 弹窗显示时初始化图表
  if (showStatisticModal.value) {
    nextTick(() => {
      initStatisticCharts()
    })
  }
}

// 方法：初始化统计图表
const initStatisticCharts = () => {
  // 消息类型分布饼图
  if (typePieChart.value) typePieChart.value.dispose()
  typePieChart.value = echarts.init(typePieChart.value)
  const typeChartOption = {
    tooltip: {
      trigger: 'item',
      formatter: '{b}: {c}条 ({d}%)'
    },
    series: [{
      type: 'pie',
      radius: ['40%', '70%'],
      avoidLabelOverlap: false,
      itemStyle: {
        borderRadius: 8,
        borderColor: '#1e293b',
        borderWidth: 2
      },
      label: {
        show: false,
        position: 'center'
      },
      emphasis: {
        label: {
          show: true,
          fontSize: 14,
          fontWeight: 600
        }
      },
      labelLine: {
        show: false
      },
      data: Object.keys(messageTypes.value).map(key => ({
        name: messageTypes.value[key].name,
        value: typeCount.value[key],
        itemStyle: { color: messageTypes.value[key].color }
      })).filter(item => item.value > 0)
    }]
  }
  typePieChart.value.setOption(typeChartOption)

  // 消息状态分布饼图
  if (statusPieChart.value) statusPieChart.value.dispose()
  statusPieChart.value = echarts.init(statusPieChart.value)
  const statusData = [
    { name: '未读', value: unreadMessagesCount.value, itemStyle: { color: '#ef4444' } },
    { name: '已读', value: totalMessagesCount.value - unreadMessagesCount.value, itemStyle: { color: '#10b981' } }
  ].filter(item => item.value > 0)

  const statusChartOption = {
    tooltip: {
      trigger: 'item',
      formatter: '{b}: {c}条 ({d}%)'
    },
    series: [{
      type: 'pie',
      radius: ['40%', '70%'],
      avoidLabelOverlap: false,
      itemStyle: {
        borderRadius: 8,
        borderColor: '#1e293b',
        borderWidth: 2
      },
      label: {
        show: false,
        position: 'center'
      },
      emphasis: {
        label: {
          show: true,
          fontSize: 14,
          fontWeight: 600
        }
      },
      labelLine: {
        show: false
      },
      data: statusData
    }]
  }
  statusPieChart.value.setOption(statusChartOption)
}

// 监听窗口大小变化，重新调整图表尺寸
const handleResize = () => {
  typePieChart.value?.resize()
  statusPieChart.value?.resize()
}

// 初始化
onMounted(() => {
  messages.value = generateMockMessages()
  window.addEventListener('resize', handleResize)
})

// 组件卸载时清理
onUnmounted(() => {
  typePieChart.value?.dispose()
  statusPieChart.value?.dispose()
  window.removeEventListener('resize', handleResize)
})

// 监听消息变化，更新统计图表
watch(messages, () => {
  if (showStatisticModal.value) {
    initStatisticCharts()
  }
}, { deep: true })
</script>

<style scoped lang="scss">
// 卡片基础样式
.system-message-card {
}

// 卡片头部
.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 15px;
  padding-bottom: 15px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);

  .card-icon {
    font-size: 24px;
    color: #3b82f6;
    margin-right: 10px;
  }

  h3 {
    margin: 0;
    font-size: 18px;
    font-weight: 600;
    color: #ffffff;
  }

  .header-actions {
    display: flex;
    gap: 10px;
  }

  .action-btn {
    background-color: rgba(255, 255, 255, 0.05);
    border: 1px solid rgba(59, 130, 246, 0.2);
    border-radius: 6px;
    color: #94a3b8;
    font-size: 13px;
    padding: 6px 12px;
    cursor: pointer;
    display: flex;
    align-items: center;
    gap: 6px;
    transition: all 0.2s;

    &:hover {
      background-color: rgba(59, 130, 246, 0.15);
      border-color: #3b82f6;
      color: #3b82f6;
    }
  }
}

// 消息标签栏
.message-tabs {
  display: flex;
  gap: 8px;
  margin-bottom: 15px;
  overflow-x: auto;
  padding-bottom: 5px;

  &::-webkit-scrollbar {
    height: 4px;
  }

  &::-webkit-scrollbar-thumb {
    background: #334155;
    border-radius: 2px;
  }

  .tab-btn {
    background-color: rgba(255, 255, 255, 0.05);
    border: 1px solid rgba(59, 130, 246, 0.2);
    border-radius: 6px;
    color: #94a3b8;
    font-size: 13px;
    padding: 6px 12px;
    cursor: pointer;
    display: flex;
    align-items: center;
    gap: 6px;
    flex-shrink: 0;
    transition: all 0.2s;

    .tab-badge {
      background-color: #ef4444;
      color: white;
      font-size: 11px;
      padding: 1px 6px;
      border-radius: 10px;
    }

    &.active {
      background-color: rgba(59, 130, 246, 0.15);
      border-color: #3b82f6;
      color: #3b82f6;
      box-shadow: 0 0 5px rgba(59, 130, 246, 0.3);
    }

    &:hover:not(.active) {
      border-color: rgba(59, 130, 246, 0.5);
      color: #bfdbfe;
    }
  }
}

// 消息列表
.message-list {
  flex: 1;
  overflow-y: auto;
  padding-right: 5px;
  gap: 10px;
  display: flex;
  flex-direction: column;

  &::-webkit-scrollbar {
    width: 6px;
  }

  &::-webkit-scrollbar-thumb {
    background: #334155;
    border-radius: 3px;
  }

  .empty-message {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    height: 100%;
    color: #64748b;
    gap: 8px;

    i {
      font-size: 32px;
    }

    p {
      font-size: 14px;
      margin: 0;
    }
  }

  .message-item {
    background-color: rgba(255, 255, 255, 0.03);
    border-radius: 8px;
    padding: 12px;
    display: flex;
    align-items: flex-start;
    gap: 12px;
    cursor: pointer;
    transition: all 0.2s;
    border: 1px solid transparent;

    &.unread {
      border-color: rgba(59, 130, 246, 0.3);
      background-color: rgba(59, 130, 246, 0.05);
    }

    &:hover {
      background-color: rgba(255, 255, 255, 0.05);
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
    }

    .message-tag {
      font-size: 11px;
      color: white;
      padding: 3px 8px;
      border-radius: 12px;
      font-weight: 600;
      white-space: nowrap;
      margin-top: 2px;
    }

    .message-content {
      flex: 1;
      min-width: 0;

      .message-title {
        font-size: 14px;
        color: #ffffff;
        margin: 0 0 6px 0;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }

      .message-desc {
        font-size: 12px;
        color: #94a3b8;
        margin: 0 0 8px 0;
        display: -webkit-box;
        -webkit-line-clamp: 2;
        -webkit-box-orient: vertical;
        overflow: hidden;
      }

      .message-meta {
        display: flex;
        gap: 15px;
        font-size: 11px;
        color: #64748b;
      }
    }

    .message-actions {
      display: flex;
      flex-direction: column;
      gap: 6px;

      .btn-read {
        background-color: rgba(255, 255, 255, 0.05);
        border: 1px solid #334155;
        border-radius: 4px;
        color: #94a3b8;
        font-size: 11px;
        padding: 3px 8px;
        cursor: pointer;

        &:disabled {
          color: #64748b;
          cursor: not-allowed;
          background-color: transparent;
        }

        &:not(:disabled):hover {
          border-color: #10b981;
          color: #10b981;
        }
      }

      .btn-delete {
        background-color: transparent;
        border: none;
        color: #94a3b8;
        font-size: 16px;
        cursor: pointer;
        padding: 3px;

        &:hover {
          color: #ef4444;
        }
      }
    }
  }
}

// 新消息提示
.new-message-indicator {
  position: fixed;
  bottom: 20px;
  right: 20px;
  background-color: rgba(239, 68, 68, 0.9);
  color: white;
  padding: 8px 16px;
  border-radius: 20px;
  font-size: 13px;
  display: flex;
  align-items: center;
  gap: 8px;
  box-shadow: 0 4px 12px rgba(239, 68, 68, 0.3);
  z-index: 100;

  .pulse-animation {
    width: 6px;
    height: 6px;
    border-radius: 50%;
    background-color: white;
    animation: pulse 1.5s infinite alternate;
  }
}

// 统计弹窗样式
.statistic-modal {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  z-index: 1000;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 20px;
  box-sizing: border-box;

  .modal-overlay {
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background-color: rgba(0, 0, 0, 0.7);
    backdrop-filter: blur(4px);
  }

  .modal-content {
    background: linear-gradient(135deg, #1e293b 0%, #0f1733 100%);
    border-radius: 12px;
    border: 1px solid rgba(59, 130, 246, 0.5);
    width: 100%;
    max-width: 1000px;
    max-height: 80vh;
    overflow-y: auto;
    position: relative;
    box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
  }

  .modal-header {
    padding: 15px 20px;
    border-bottom: 1px solid rgba(255, 255, 255, 0.1);
    display: flex;
    justify-content: space-between;
    align-items: center;

    h3 {
      margin: 0;
      font-size: 18px;
      color: #ffffff;
    }

    .modal-close {
      background: transparent;
      border: none;
      color: #94a3b8;
      font-size: 20px;
      cursor: pointer;
      padding: 5px;

      &:hover {
        color: #ef4444;
      }
    }
  }

  .modal-body {
    padding: 20px;
  }

  // 统计概览
  .statistic-overview {
    display: flex;
    gap: 15px;
    margin-bottom: 25px;
    flex-wrap: wrap;

    .statistic-card {
      flex: 1;
      min-width: 120px;
      background-color: rgba(255, 255, 255, 0.05);
      border-radius: 8px;
      padding: 15px;
      display: flex;
      align-items: center;
      gap: 12px;

      .statistic-icon {
        font-size: 24px;
        color: #3b82f6;
        width: 40px;
        height: 40px;
        display: flex;
        align-items: center;
        justify-content: center;
        background-color: rgba(59, 130, 246, 0.1);
        border-radius: 8px;
      }

      .statistic-info {
        flex: 1;

        .statistic-label {
          font-size: 12px;
          color: #94a3b8;
          margin: 0;
        }

        .statistic-value {
          font-size: 20px;
          color: #ffffff;
          font-weight: 600;
          margin: 4px 0 0 0;
        }
      }
    }
  }

  // 统计图表
  .statistic-charts {
    display: flex;
    gap: 20px;
    margin-bottom: 25px;
    flex-wrap: wrap;

    .chart-item {
      flex: 1;
      min-width: 250px;
      background-color: rgba(255, 255, 255, 0.03);
      border-radius: 8px;
      padding: 15px;

      h4 {
        margin: 0 0 15px 0;
        font-size: 14px;
        color: #ffffff;
      }

      .chart-container {
        width: 100%;
        height: 200px;
      }
    }
  }

  // 统计表格
  .statistic-table {
    background-color: rgba(255, 255, 255, 0.03);
    border-radius: 8px;
    padding: 15px;
    overflow-x: auto;

    h4 {
      margin: 0 0 15px 0;
      font-size: 14px;
      color: #ffffff;
    }

    table {
      width: 100%;
      border-collapse: collapse;
      min-width: 500px;

      thead {
        tr {
          border-bottom: 1px solid #334155;
        }

        th {
          padding: 10px;
          text-align: left;
          font-size: 12px;
          color: #94a3b8;
          font-weight: 600;
        }
      }

      tbody {
        tr {
          border-bottom: 1px solid rgba(51, 65, 85, 0.3);

          &:last-child {
            border-bottom: none;
          }

          &:hover {
            background-color: rgba(255, 255, 255, 0.05);
          }
        }

        td {
          padding: 12px 10px;
          font-size: 12px;
          color: #e2e8f0;

          .table-tag {
            font-size: 11px;
            color: white;
            padding: 2px 8px;
            border-radius: 10px;
          }
        }
      }
    }
  }

  .modal-footer {
    padding: 15px 20px;
    border-top: 1px solid rgba(255, 255, 255, 0.1);
    display: flex;
    justify-content: flex-end;

    .modal-btn {
      background-color: #3b82f6;
      border: none;
      color: white;
      border-radius: 6px;
      padding: 8px 16px;
      font-size: 14px;
      cursor: pointer;
      transition: all 0.2s;

      &:hover {
        background-color: #2563eb;
      }
    }
  }
}

// 动画定义
@keyframes pulse {
  from { opacity: 0.5; }
  to { opacity: 1; }
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

// 响应式适配
@media (max-width: 768px) {
  .system-message-card {
    min-width: auto;
    max-height: 500px;
  }

  .statistic-modal .modal-content {
    max-height: 90vh;
  }

  .statistic-overview {
    flex-direction: column;
  }

  .statistic-charts {
    flex-direction: column;
  }
}
</style>