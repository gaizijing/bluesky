<template>
  <div class="admin-panel scheduler-panel">
    <header class="admin-panel__header">
      <div>
        <h2 class="admin-panel__title">调度与缓存运维</h2>
        <p class="admin-panel__desc">
          P2 格点/适飞/风险缓存的手动触发与清理（需超级管理员）。日常由定时任务自动执行。
        </p>
      </div>
    </header>

    <el-card class="scheduler-card" shadow="never">
      <template #header>手动操作</template>
      <div class="scheduler-actions">
        <el-button type="primary" :loading="loading.recompute" @click="onRecompute">
          重算当前桶（全流水线）
        </el-button>
        <el-button :loading="loading.flyability" @click="onRecomputeFlyability">
          仅重算适飞缓存
        </el-button>
        <el-button :loading="loading.risk" @click="onRecomputeRisk">
          仅重算风险场
        </el-button>
        <el-button type="warning" :loading="loading.cleanup" @click="onCleanup">
          清理过期缓存
        </el-button>
        <el-button :loading="loading.health" @click="onHealth">
          刷新健康状态
        </el-button>
      </div>
      <el-input
        v-model="regionId"
        class="region-input"
        placeholder="Region ID（留空=全部 enabled，如 R1）"
        clearable
      />
    </el-card>

    <el-card v-if="cleanupResult" class="scheduler-card" shadow="never">
      <template #header>上次清理删除行数</template>
      <el-descriptions :column="2" border size="small">
        <el-descriptions-item
          v-for="(count, table) in cleanupResult"
          :key="table"
          :label="table"
        >
          {{ count }}
        </el-descriptions-item>
      </el-descriptions>
    </el-card>

    <el-card v-if="healthData" class="scheduler-card" shadow="never">
      <template #header>缓存健康快照</template>
      <pre class="health-json">{{ JSON.stringify(healthData, null, 2) }}</pre>
    </el-card>

    <el-card class="scheduler-card" shadow="never">
      <template #header>SQL 验收（PostgreSQL）</template>
      <p class="sql-hint">查看适飞缓存是否已写入新版本（发布规则后对比 <code>rule_version</code>）：</p>
      <pre class="sql-block">{{ sqlCheckRuleVersion }}</pre>
      <p class="sql-hint">查看各表最近缓存时间桶：</p>
      <pre class="sql-block">{{ sqlCheckBuckets }}</pre>
    </el-card>
  </div>
</template>

<script setup>
import { reactive, ref } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import {
  triggerSchedulerRecompute,
  triggerRecomputeByRule,
  triggerSchedulerCleanup,
  fetchSchedulerHealth,
} from '@/api/scheduler'

const regionId = ref('R1')
const loading = reactive({
  recompute: false,
  flyability: false,
  risk: false,
  cleanup: false,
  health: false,
})
const cleanupResult = ref(null)
const healthData = ref(null)

const sqlCheckRuleVersion = `SELECT landing_point_id, bucket_time, rule_version, computed_at
FROM osi_landing_cache
ORDER BY computed_at DESC
LIMIT 20;`

const sqlCheckBuckets = `SELECT region_id, MAX(bucket_time) AS last_bucket, MAX(computed_at) AS last_computed
FROM weather_grid_cache
GROUP BY region_id;`

async function onRecompute() {
  loading.recompute = true
  try {
    const res = await triggerSchedulerRecompute(regionId.value || undefined)
    ElMessage.success(`已排队：${res?.status || 'queued'}，bucket=${res?.bucketTime || '—'}`)
  } catch (e) {
    ElMessage.error(e?.message || '触发失败（需超级管理员）')
  } finally {
    loading.recompute = false
  }
}

async function onRecomputeFlyability() {
  loading.flyability = true
  try {
    await triggerRecomputeByRule('FLYABILITY', regionId.value || undefined)
    ElMessage.success('适飞缓存重算已排队')
  } catch (e) {
    ElMessage.error(e?.message || '触发失败')
  } finally {
    loading.flyability = false
  }
}

async function onRecomputeRisk() {
  loading.risk = true
  try {
    await triggerRecomputeByRule('RISK', regionId.value || undefined)
    ElMessage.success('风险场缓存重算已排队')
  } catch (e) {
    ElMessage.error(e?.message || '触发失败')
  } finally {
    loading.risk = false
  }
}

async function onCleanup() {
  try {
    await ElMessageBox.confirm(
      '将按保留策略删除过期 weather/osi/risk/warning/ai 缓存行，不可恢复。确认执行？',
      '清理过期缓存',
      { type: 'warning' }
    )
  } catch {
    return
  }
  loading.cleanup = true
  try {
    cleanupResult.value = await triggerSchedulerCleanup()
    ElMessage.success('清理完成')
  } catch (e) {
    ElMessage.error(e?.message || '清理失败（需超级管理员）')
  } finally {
    loading.cleanup = false
  }
}

async function onHealth() {
  loading.health = true
  try {
    healthData.value = await fetchSchedulerHealth()
  } catch (e) {
    ElMessage.error(e?.message || '获取健康状态失败')
  } finally {
    loading.health = false
  }
}
</script>

<style scoped>
.scheduler-panel .scheduler-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  margin-bottom: 12px;
}

.region-input {
  max-width: 320px;
}

.scheduler-card {
  margin-bottom: 16px;
}

.sql-hint {
  margin: 0 0 8px;
  color: var(--el-text-color-secondary);
  font-size: 13px;
}

.sql-block,
.health-json {
  margin: 0 0 16px;
  padding: 12px;
  background: #0f172a;
  color: #e2e8f0;
  border-radius: 8px;
  font-size: 12px;
  line-height: 1.5;
  overflow-x: auto;
}
</style>
