<template>
  <div class="admin-page">
    <section class="admin-panel">
      <div class="admin-panel__header">
        <div>
          <h2 class="admin-panel__title">适飞规则集</h2>
          <p class="admin-panel__desc">管理 P1 适飞规则 JSON，发布后 Dashboard 适飞矩阵将引用最新已发布版本</p>
        </div>
        <div class="admin-toolbar">
          <el-button class="admin-secondary-button" :loading="loading" @click="loadList">
            <el-icon><Refresh /></el-icon>
            刷新
          </el-button>
          <el-button class="admin-primary-button" @click="openCreate">
            <el-icon><Plus /></el-icon>
            新建草稿
          </el-button>
        </div>
      </div>

      <div class="admin-table-shell">
        <el-table :data="ruleSets" v-loading="loading" class="admin-table" max-height="560">
          <el-table-column label="ID" prop="ruleSetId" min-width="108" />
          <el-table-column label="名称" prop="name" min-width="140" show-overflow-tooltip />
          <el-table-column label="版本" width="88" align="center">
            <template #default="{ row }">
              <span v-if="row.status === 'PUBLISHED'" class="admin-pill admin-pill--accent">
                v{{ row.versionNo ?? 1 }}
              </span>
              <span v-else class="admin-pill admin-pill--neutral">待发布</span>
            </template>
          </el-table-column>
          <el-table-column label="状态" width="100" align="center">
            <template #default="{ row }">
              <span :class="['admin-pill', statusPillClass(row.status)]">
                {{ statusLabel(row.status) }}
              </span>
            </template>
          </el-table-column>
          <el-table-column label="发布时间" min-width="160">
            <template #default="{ row }">
              <span class="flyability-publish-time">{{ formatPublishTime(row) }}</span>
            </template>
          </el-table-column>
          <el-table-column label="操作" min-width="300" fixed="right" align="center">
            <template #default="{ row }">
              <div class="admin-row-actions admin-row-actions--compact">
                <el-button class="admin-ghost-button" @click="openView(row)">
                  <el-icon><View /></el-icon>
                  查看
                </el-button>
                <el-button
                  v-if="row.status !== 'PUBLISHED'"
                  class="admin-ghost-button"
                  @click="openEdit(row)"
                >
                  <el-icon><EditPen /></el-icon>
                  编辑
                </el-button>
                <el-button
                  v-if="row.status !== 'PUBLISHED'"
                  class="admin-ghost-button flyability-action--publish"
                  @click="handlePublish(row)"
                >
                  <el-icon><Promotion /></el-icon>
                  发布
                </el-button>
                <el-button
                  v-if="row.status !== 'PUBLISHED'"
                  class="admin-ghost-button"
                  @click="handleDelete(row)"
                >
                  <el-icon><Delete /></el-icon>
                  删除
                </el-button>
              </div>
            </template>
          </el-table-column>
        </el-table>

        <div v-if="!ruleSets.length && !loading" class="admin-empty">
          暂无规则集，点击「新建草稿」创建第一条适飞规则。
        </div>
      </div>
    </section>

    <!-- 查看：抽屉 -->
    <el-drawer
      v-model="viewDrawerVisible"
      :with-header="false"
      size="840px"
      class="flyability-view-drawer"
      destroy-on-close
    >
      <template v-if="viewDetail">
        <header class="view-hero">
          <p class="view-hero__eyebrow">适飞规则集详情</p>
          <div class="view-hero__headline">
            <h3>{{ viewDetail.name }}</h3>
            <span :class="['admin-pill', statusPillClass(viewDetail.status)]">
              {{ statusLabel(viewDetail.status) }}
            </span>
          </div>
          <div class="view-meta-grid">
            <div class="view-meta-card">
              <span class="view-meta-card__label">规则 ID</span>
              <span class="view-meta-card__value">{{ viewDetail.ruleSetId }}</span>
            </div>
            <div class="view-meta-card">
              <span class="view-meta-card__label">版本</span>
              <span class="view-meta-card__value">
                {{ viewDetail.status === 'PUBLISHED' ? `v${viewDetail.versionNo ?? 1}` : '待发布' }}
              </span>
            </div>
            <div class="view-meta-card">
              <span class="view-meta-card__label">发布时间</span>
              <span class="view-meta-card__value">{{ formatPublishTime(viewDetail) }}</span>
            </div>
            <div class="view-meta-card">
              <span class="view-meta-card__label">线上生效</span>
              <span class="view-meta-card__value">
                {{ viewDetail.isActiveOnline ? '是（当前最新）' : viewDetail.status === 'PUBLISHED' ? '否（历史版本）' : '—' }}
              </span>
            </div>
          </div>
        </header>

        <section class="view-section">
          <h4 class="view-section__title">
            <el-icon><DataAnalysis /></el-icon>
            阈值一览
          </h4>
          <div class="threshold-grid">
            <article
              v-for="card in viewRuleCards"
              :key="card.key"
              class="threshold-card"
              :class="`threshold-card--${card.tone}`"
            >
              <div class="threshold-card__head">
                <span class="threshold-card__name">{{ card.label }}</span>
                <code class="threshold-card__key">{{ card.key }}</code>
              </div>
              <p class="threshold-card__unit">{{ card.unit }}</p>
              <div v-if="card.type === 'range'" class="threshold-card__levels">
                <div class="level-chip level-chip--yellow">
                  <span class="level-chip__tag">黄</span>
                  <span class="level-chip__val">≥ {{ card.yellow }}</span>
                </div>
                <div class="level-chip level-chip--red">
                  <span class="level-chip__tag">红</span>
                  <span class="level-chip__val">≥ {{ card.red }}</span>
                </div>
              </div>
              <div v-else class="threshold-card__levels threshold-card__levels--temp">
                <div class="level-chip level-chip--neutral">
                  <span class="level-chip__tag">下限</span>
                  <span class="level-chip__val">{{ card.min }} ℃</span>
                </div>
                <div class="level-chip level-chip--neutral">
                  <span class="level-chip__tag">上限</span>
                  <span class="level-chip__val">{{ card.max }} ℃</span>
                </div>
              </div>
            </article>
          </div>
        </section>

        <section class="view-section">
          <h4 class="view-section__title">
            <el-icon><Document /></el-icon>
            原始 JSON
          </h4>
          <pre class="view-json-block"><code>{{ viewDetail.rulesJsonPretty }}</code></pre>
        </section>

        <section class="view-section view-section--legend">
          <h4 class="view-section__title">
            <el-icon><InfoFilled /></el-icon>
            字段说明
          </h4>
          <div class="legend-grid">
            <div v-for="item in RULE_FIELD_DOCS" :key="item.key" class="legend-card">
              <div class="legend-card__top">
                <code>{{ item.key }}</code>
                <span>{{ item.label }}</span>
              </div>
              <p>{{ item.desc }}</p>
            </div>
          </div>
        </section>

        <footer class="view-drawer-footer">
          <el-button class="admin-secondary-button" @click="viewDrawerVisible = false">关闭</el-button>
        </footer>
      </template>
    </el-drawer>

    <!-- 新建 / 编辑：对话框 -->
    <el-dialog
      v-model="editDialogVisible"
      :title="editDialogTitle"
      width="760px"
      destroy-on-close
      class="admin-dialog flyability-edit-dialog"
    >
      <el-form label-width="96px" class="flyability-rule-form">
        <el-form-item label="名称">
          <el-input v-model="form.name" placeholder="如：默认适飞规则、夏季阈值" />
        </el-form-item>
        <el-form-item label="规则 JSON">
          <el-input
            v-model="form.rulesJson"
            type="textarea"
            :rows="12"
            placeholder='{"windSpeedMs":{"yellow":8,"red":12},...}'
          />
        </el-form-item>
      </el-form>

      <div class="flyability-rules-legend flyability-rules-legend--compact">
        <p class="flyability-rules-legend__title">规则 JSON 字段说明</p>
        <div class="legend-grid legend-grid--compact">
          <div v-for="item in RULE_FIELD_DOCS" :key="item.key" class="legend-card">
            <div class="legend-card__top">
              <code>{{ item.key }}</code>
              <span>{{ item.label }}</span>
            </div>
            <p>{{ item.desc }}</p>
          </div>
        </div>
        <p class="flyability-rules-legend__foot">保存为草稿不影响大屏；在列表点击「发布」后才会上线。</p>
      </div>

      <template #footer>
        <el-button @click="editDialogVisible = false">取消</el-button>
        <el-button type="primary" :loading="saving" @click="handleSave">保存</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { onMounted, ref, computed } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import {
  Plus,
  Refresh,
  View,
  EditPen,
  Promotion,
  Delete,
  DataAnalysis,
  Document,
  InfoFilled,
} from '@element-plus/icons-vue'
import { formatDate } from '@/utils/dateUtils'
import {
  fetchFlyabilityRuleSets,
  createFlyabilityRuleSet,
  updateFlyabilityRuleSet,
  publishFlyabilityRuleSet,
  deleteFlyabilityRuleSet,
} from '@/api'

const RULE_FIELD_DOCS = [
  {
    key: 'windSpeedMs',
    label: '风速 m/s',
    desc: 'yellow / red：实测 ≥ 阈值时该因子判黄或红。',
  },
  {
    key: 'precipMmH',
    label: '降水 mm/h',
    desc: '数值越大越不利，比较方式同上。',
  },
  {
    key: 'visibilityKm',
    label: '能见度 km',
    desc: '与后端 FlyabilityCalculator 一致，按 ≥ 比较。',
  },
  {
    key: 'cloudBaseM',
    label: '云底高度 m',
    desc: '按 ≥ 比较，参与综合适飞等级。',
  },
  {
    key: 'temperatureC',
    label: '气温 ℃',
    desc: 'min / max：实测低于 min 或高于 max 判红。',
  },
]

const DEFAULT_RULES = {
  windSpeedMs: { yellow: 8, red: 12 },
  visibilityKm: { yellow: 3, red: 1 },
  precipMmH: { yellow: 2, red: 5 },
  temperatureC: { min: -10, max: 40 },
  cloudBaseM: { yellow: 300, red: 150 },
}

const FIELD_META = {
  windSpeedMs: { label: '风速', unit: 'm/s', tone: 'wind' },
  precipMmH: { label: '降水', unit: 'mm/h', tone: 'rain' },
  visibilityKm: { label: '能见度', unit: 'km', tone: 'vis' },
  cloudBaseM: { label: '云底高度', unit: 'm', tone: 'cloud' },
  temperatureC: { label: '气温', unit: '℃', tone: 'temp' },
}

const loading = ref(false)
const saving = ref(false)
const ruleSets = ref([])
const viewDrawerVisible = ref(false)
const viewDetail = ref(null)
const editDialogVisible = ref(false)
const editDialogTitle = ref('')
const dialogMode = ref('create')
const editingId = ref(null)
const form = ref({ name: '', rulesJson: '' })

const nextPublishVersion = computed(() => {
  const max = ruleSets.value
    .filter((r) => r.status === 'PUBLISHED')
    .reduce((m, r) => Math.max(m, Number(r.versionNo) || 0), 0)
  return max + 1
})

const latestPublishedId = computed(() => {
  const published = ruleSets.value.filter((r) => r.status === 'PUBLISHED' && !r.effectiveTo)
  if (!published.length) {
    const all = ruleSets.value.filter((r) => r.status === 'PUBLISHED')
    if (!all.length) return null
    return all.sort((a, b) => (Number(b.versionNo) || 0) - (Number(a.versionNo) || 0))[0]?.ruleSetId
  }
  return published.sort(
    (a, b) => new Date(b.effectiveFrom || b.updatedAt) - new Date(a.effectiveFrom || a.updatedAt)
  )[0]?.ruleSetId
})

const viewRuleCards = computed(() => {
  const rules = viewDetail.value?.rules || {}
  return buildRuleCards(rules)
})

function buildRuleCards(rules) {
  const cards = []
  for (const [key, meta] of Object.entries(FIELD_META)) {
    const raw = rules[key]
    if (!raw || typeof raw !== 'object') continue
    if (key === 'temperatureC') {
      cards.push({
        key,
        label: meta.label,
        unit: meta.unit,
        tone: meta.tone,
        type: 'temp',
        min: raw.min ?? '—',
        max: raw.max ?? '—',
      })
    } else {
      cards.push({
        key,
        label: meta.label,
        unit: meta.unit,
        tone: meta.tone,
        type: 'range',
        yellow: raw.yellow ?? '—',
        red: raw.red ?? '—',
      })
    }
  }
  return cards
}

const formatPublishTime = (row) => {
  if (row?.status !== 'PUBLISHED') return '—'
  const raw = row.publishedAt || row.effectiveFrom || row.updatedAt
  const text = formatDate(raw, 'yyyy-MM-dd HH:mm')
  return text || '—'
}

const statusLabel = (status) => {
  if (status === 'PUBLISHED') return '已发布'
  if (status === 'DRAFT') return '草稿'
  return status || '—'
}

const statusPillClass = (status) => {
  if (status === 'PUBLISHED') return 'admin-pill--good'
  return 'admin-pill--neutral'
}

async function loadList() {
  loading.value = true
  try {
    ruleSets.value = await fetchFlyabilityRuleSets()
  } catch (e) {
    ElMessage.error(e?.message || '加载规则集失败')
  } finally {
    loading.value = false
  }
}

function openCreate() {
  dialogMode.value = 'create'
  editDialogTitle.value = '新建适飞规则集'
  editingId.value = null
  form.value = {
    name: '新适飞规则',
    rulesJson: JSON.stringify(DEFAULT_RULES, null, 2),
  }
  editDialogVisible.value = true
}

function openView(row) {
  const rules = row.rules || {}
  viewDetail.value = {
    ...row,
    rules,
    rulesJsonPretty: JSON.stringify(rules, null, 2),
    isActiveOnline: row.ruleSetId === latestPublishedId.value,
  }
  viewDrawerVisible.value = true
}

function openEdit(row) {
  dialogMode.value = 'edit'
  editDialogTitle.value = `编辑 · ${row.ruleSetId}`
  editingId.value = row.ruleSetId
  form.value = {
    name: row.name,
    rulesJson: JSON.stringify(row.rules || {}, null, 2),
  }
  editDialogVisible.value = true
}

async function handleSave() {
  let rules
  try {
    rules = JSON.parse(form.value.rulesJson)
  } catch {
    ElMessage.error('rules JSON 格式错误')
    return
  }
  saving.value = true
  try {
    const body = { name: form.value.name, rules }
    if (dialogMode.value === 'create') {
      await createFlyabilityRuleSet(body)
      ElMessage.success('已创建草稿')
    } else if (editingId.value) {
      await updateFlyabilityRuleSet(editingId.value, body)
      ElMessage.success('已更新')
    }
    editDialogVisible.value = false
    await loadList()
  } catch (e) {
    ElMessage.error(e?.message || '保存失败')
  } finally {
    saving.value = false
  }
}

async function handlePublish(row) {
  try {
    await ElMessageBox.confirm(
      `发布「${row.name}」（${row.ruleSetId}）后将分配版本 v${nextPublishVersion.value}，并替换当前线上规则。确认发布？`,
      '发布规则集',
      { type: 'warning', confirmButtonText: '发布', cancelButtonText: '取消' }
    )
    await publishFlyabilityRuleSet(row.ruleSetId)
    ElMessage.success({
      message: '发布成功。后台正在重算最近 4 个时间桶的适飞缓存，约 1～5 分钟后大屏矩阵将完全更新。',
      duration: 6000,
    })
    await loadList()
  } catch (e) {
    if (e !== 'cancel') ElMessage.error(e?.message || '发布失败')
  }
}

async function handleDelete(row) {
  try {
    await ElMessageBox.confirm(
      `将永久删除草稿「${row.name}」（${row.ruleSetId}），此操作不可恢复。`,
      '删除草稿',
      { type: 'warning', confirmButtonText: '删除', cancelButtonText: '取消' }
    )
    await deleteFlyabilityRuleSet(row.ruleSetId)
    ElMessage.success('已删除')
    await loadList()
  } catch (e) {
    if (e !== 'cancel') ElMessage.error(e?.message || '删除失败')
  }
}

onMounted(loadList)
</script>

<style scoped>
.admin-pill--neutral {
  color: #dfeaf2;
  background: rgba(255, 255, 255, 0.08);
  border: 1px solid rgba(255, 255, 255, 0.15);
}

.flyability-publish-time {
  font-variant-numeric: tabular-nums;
  color: #ecf7ff;
  font-size: 13px;
}

.flyability-action--publish :deep(.el-icon) {
  color: var(--el-color-warning);
}

.admin-row-actions--compact {
  flex-wrap: wrap;
  justify-content: center;
  gap: 6px;
}

.admin-row-actions--compact .admin-ghost-button {
  padding: 4px 10px;
  min-height: 28px;
}

/* ========== 查看抽屉 ========== */
.flyability-view-drawer :deep(.el-drawer__body) {
  padding: 0;
  background: linear-gradient(180deg, #0a1e2e 0%, #061018 100%);
  display: flex;
  flex-direction: column;
}

.view-hero {
  padding: 28px 28px 20px;
  border-bottom: 1px solid rgba(120, 200, 255, 0.12);
  background: linear-gradient(135deg, rgba(20, 60, 90, 0.5), rgba(8, 28, 44, 0.3));
}

.view-hero__eyebrow {
  margin: 0 0 8px;
  font-size: 12px;
  font-weight: 600;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: #56d8ff;
}

.view-hero__headline {
  display: flex;
  align-items: center;
  gap: 14px;
  flex-wrap: wrap;
}

.view-hero__headline h3 {
  margin: 0;
  font-size: 26px;
  font-weight: 700;
  color: #ffffff;
}

.view-meta-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 12px;
  margin-top: 20px;
}

.view-meta-card {
  padding: 14px 16px;
  border-radius: 12px;
  background: rgba(0, 0, 0, 0.22);
  border: 1px solid rgba(120, 200, 255, 0.15);
}

.view-meta-card__label {
  display: block;
  font-size: 12px;
  color: #8eb8d4;
  margin-bottom: 6px;
}

.view-meta-card__value {
  font-size: 15px;
  font-weight: 600;
  color: #f0f8ff;
  font-variant-numeric: tabular-nums;
}

.view-section {
  padding: 22px 28px;
  border-bottom: 1px solid rgba(120, 200, 255, 0.08);
}

.view-section__title {
  display: flex;
  align-items: center;
  gap: 8px;
  margin: 0 0 16px;
  font-size: 16px;
  font-weight: 700;
  color: #ffffff;
}

.view-section__title .el-icon {
  color: #56d8ff;
  font-size: 18px;
}

.threshold-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 14px;
}

.threshold-card {
  padding: 16px;
  border-radius: 14px;
  border: 1px solid rgba(120, 200, 255, 0.18);
  background: rgba(6, 24, 38, 0.75);
}

.threshold-card--wind {
  border-color: rgba(86, 216, 255, 0.35);
  background: linear-gradient(145deg, rgba(20, 70, 100, 0.4), rgba(6, 24, 38, 0.8));
}

.threshold-card--rain {
  border-color: rgba(100, 180, 255, 0.3);
}

.threshold-card--vis {
  border-color: rgba(180, 220, 255, 0.25);
}

.threshold-card--cloud {
  border-color: rgba(160, 200, 240, 0.28);
}

.threshold-card--temp {
  border-color: rgba(255, 200, 120, 0.35);
  background: linear-gradient(145deg, rgba(80, 50, 20, 0.25), rgba(6, 24, 38, 0.8));
}

.threshold-card__head {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 8px;
}

.threshold-card__name {
  font-size: 16px;
  font-weight: 700;
  color: #ffffff;
}

.threshold-card__key {
  font-size: 11px;
  color: #7ec8ff;
  background: rgba(0, 0, 0, 0.3);
  padding: 2px 6px;
  border-radius: 4px;
}

.threshold-card__unit {
  margin: 6px 0 12px;
  font-size: 12px;
  color: #9ec5de;
}

.threshold-card__levels {
  display: flex;
  gap: 10px;
}

.level-chip {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 4px;
  padding: 10px 12px;
  border-radius: 10px;
  text-align: center;
}

.level-chip--yellow {
  background: rgba(255, 214, 102, 0.12);
  border: 1px solid rgba(255, 214, 102, 0.35);
}

.level-chip--red {
  background: rgba(255, 124, 136, 0.12);
  border: 1px solid rgba(255, 124, 136, 0.35);
}

.level-chip--neutral {
  background: rgba(255, 255, 255, 0.06);
  border: 1px solid rgba(255, 255, 255, 0.12);
}

.level-chip__tag {
  font-size: 11px;
  font-weight: 700;
  color: #c5e3f7;
}

.level-chip--yellow .level-chip__tag {
  color: #ffd666;
}

.level-chip--red .level-chip__tag {
  color: #ff9aa8;
}

.level-chip__val {
  font-size: 15px;
  font-weight: 700;
  color: #ffffff;
}

.view-json-block {
  margin: 0;
  padding: 16px 18px;
  border-radius: 12px;
  background: #040c14;
  border: 1px solid rgba(120, 200, 255, 0.2);
  overflow: auto;
  max-height: 220px;
}

.view-json-block code {
  font-family: 'JetBrains Mono', Consolas, 'Courier New', monospace;
  font-size: 13px;
  line-height: 1.55;
  color: #b8e8ff;
  white-space: pre;
}

.legend-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 12px;
}

.legend-grid--compact {
  grid-template-columns: 1fr;
}

.legend-card {
  padding: 12px 14px;
  border-radius: 10px;
  background: rgba(0, 0, 0, 0.2);
  border: 1px solid rgba(120, 200, 255, 0.12);
}

.legend-card__top {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 6px;
}

.legend-card__top code {
  font-size: 12px;
  color: #7ec8ff;
  background: rgba(0, 0, 0, 0.35);
  padding: 2px 6px;
  border-radius: 4px;
}

.legend-card__top span {
  font-size: 13px;
  font-weight: 600;
  color: #ffffff;
}

.legend-card p {
  margin: 0;
  font-size: 12px;
  line-height: 1.55;
  color: #c5e3f7;
}

.view-section--legend {
  padding-bottom: 28px;
}

.view-drawer-footer {
  margin-top: auto;
  padding: 16px 28px 24px;
  border-top: 1px solid rgba(120, 200, 255, 0.12);
  display: flex;
  justify-content: flex-end;
}

/* ========== 编辑对话框 ========== */
.flyability-rules-legend--compact {
  margin: 0 4px 8px;
  padding: 14px 16px;
  border-radius: 8px;
  background: rgba(8, 32, 56, 0.85);
  border: 1px solid rgba(120, 200, 255, 0.25);
}

.flyability-rules-legend__title {
  margin: 0 0 12px;
  font-size: 14px;
  font-weight: 600;
  color: #ffffff;
}

.flyability-rules-legend__foot {
  margin: 12px 0 0;
  padding-top: 10px;
  border-top: 1px solid rgba(120, 200, 255, 0.15);
  font-size: 12px;
  color: #c5e3f7;
}

.flyability-edit-dialog :deep(.el-textarea__inner) {
  color: #ecf7ff;
  font-family: Consolas, 'Courier New', monospace;
}

@media (max-width: 720px) {
  .view-meta-grid,
  .threshold-grid,
  .legend-grid {
    grid-template-columns: 1fr;
  }
}
</style>
