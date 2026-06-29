<template>
  <div :class="embedded ? 'rule-set-panel-embedded' : 'admin-page'">
    <section class="admin-panel">
      <div class="admin-panel__header" :class="{ 'admin-panel__header--embedded': embedded }">
        <div v-if="!embedded">
          <h2 class="admin-panel__title">{{ title }}</h2>
          <p class="admin-panel__desc">{{ description }}</p>
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
              <span v-else class="admin-pill admin-pill--warn">草稿</span>
            </template>
          </el-table-column>
          <el-table-column label="状态" width="100" align="center">
            <template #default="{ row }">
              <span :class="['admin-pill', statusPillClass(row.status)]">
                {{ statusLabel(row.status) }}
              </span>
            </template>
          </el-table-column>
          <el-table-column v-if="showLlmColumn" label="LLM" width="88" align="center">
            <template #default="{ row }">
              <el-switch
                :model-value="Boolean(row.enableLlm)"
                :disabled="row.status !== 'PUBLISHED' || llmTogglingId === row.ruleSetId"
                @change="(val) => toggleLlm(row, val)"
              />
            </template>
          </el-table-column>
          <el-table-column label="发布时间" min-width="160">
            <template #default="{ row }">{{ formatPublishTime(row) }}</template>
          </el-table-column>
          <el-table-column label="操作" min-width="280" fixed="right" align="center">
            <template #default="{ row }">
              <div class="admin-row-actions">
                <el-button class="admin-ghost-button" @click="openView(row)">查看</el-button>
                <el-button
                  v-if="row.status !== 'PUBLISHED'"
                  class="admin-ghost-button"
                  @click="openEdit(row)"
                >
                  编辑
                </el-button>
                <el-button
                  v-if="row.status !== 'PUBLISHED'"
                  class="admin-ghost-button"
                  @click="handlePublish(row)"
                >
                  发布
                </el-button>
                <el-button
                  v-if="row.status !== 'PUBLISHED'"
                  class="admin-ghost-button"
                  @click="handleDelete(row)"
                >
                  删除
                </el-button>
              </div>
            </template>
          </el-table-column>
        </el-table>

        <div v-if="!ruleSets.length && !loading" class="admin-empty">
          暂无规则集，点击「新建草稿」开始配置。
        </div>
      </div>
    </section>

    <el-drawer v-model="viewDrawerVisible" :with-header="false" size="720px" destroy-on-close>
      <template v-if="viewDetail">
        <header class="rule-view-hero">
          <p class="admin-page__eyebrow">{{ title }}详情</p>
          <h3>{{ viewDetail.name }}</h3>
          <p class="rule-view-meta">
            ID {{ viewDetail.ruleSetId }} · {{ statusLabel(viewDetail.status) }} ·
            {{ formatPublishTime(viewDetail) }}
          </p>
        </header>
        <section class="rule-view-body">
          <h4>规则 JSON</h4>
          <pre class="rule-json-block"><code>{{ viewDetail.rulesJsonPretty }}</code></pre>
          <div v-if="fieldDocs.length" class="rule-field-docs">
            <h4>字段说明</h4>
            <ul>
              <li v-for="doc in fieldDocs" :key="doc.key">
                <code>{{ doc.key }}</code> — {{ doc.desc }}
              </li>
            </ul>
          </div>
        </section>
        <footer class="rule-view-footer">
          <el-button class="admin-secondary-button" @click="viewDrawerVisible = false">关闭</el-button>
        </footer>
      </template>
    </el-drawer>

    <el-dialog v-model="editDialogVisible" :title="editDialogTitle" width="760px" destroy-on-close>
      <el-form label-width="96px">
        <el-form-item label="名称">
          <el-input v-model="form.name" placeholder="规则集名称" />
        </el-form-item>
        <el-form-item v-if="showLlmColumn" label="启用 LLM">
          <el-switch v-model="form.enableLlm" />
        </el-form-item>
        <el-form-item label="规则 JSON">
          <el-input v-model="form.rulesJson" type="textarea" :rows="14" />
        </el-form-item>
      </el-form>
      <p class="rule-edit-hint">{{ publishHint }}</p>
      <template #footer>
        <el-button @click="editDialogVisible = false">取消</el-button>
        <el-button type="primary" :loading="saving" @click="handleSave">保存草稿</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { onMounted, ref } from 'vue';
import { ElMessage, ElMessageBox } from 'element-plus';
import { Plus, Refresh } from '@element-plus/icons-vue';
import { formatDate } from '@/utils/dateUtils';

const props = defineProps({
  embedded: { type: Boolean, default: false },
  title: { type: String, required: true },
  description: { type: String, default: '' },
  publishHint: {
    type: String,
    default: '发布后将在下一时间桶生效，大屏矩阵/热力图将引用最新版本。',
  },
  defaultRules: { type: Object, required: true },
  fieldDocs: { type: Array, default: () => [] },
  formatRules: { type: Function, default: null },
  showLlmColumn: { type: Boolean, default: false },
  api: { type: Object, required: true },
});

const loading = ref(false);
const saving = ref(false);
const ruleSets = ref([]);
const viewDrawerVisible = ref(false);
const viewDetail = ref(null);
const editDialogVisible = ref(false);
const editDialogTitle = ref('');
const dialogMode = ref('create');
const editingId = ref(null);
const llmTogglingId = ref(null);
const form = ref({ name: '', rulesJson: '', enableLlm: false });

function statusLabel(status) {
  if (status === 'PUBLISHED') return '已发布';
  if (status === 'DRAFT') return '草稿';
  return status || '—';
}

function statusPillClass(status) {
  return status === 'PUBLISHED' ? 'admin-pill--good' : 'admin-pill--warn';
}

function formatPublishTime(row) {
  if (row?.status !== 'PUBLISHED') return '—';
  return formatDate(row.effectiveFrom || row.updatedAt, 'yyyy-MM-dd HH:mm') || '—';
}

async function loadList() {
  loading.value = true;
  try {
    ruleSets.value = await props.api.list();
  } catch (e) {
    ElMessage.error(e?.message || '加载失败');
  } finally {
    loading.value = false;
  }
}

function openCreate() {
  dialogMode.value = 'create';
  editDialogTitle.value = `新建 · ${props.title}`;
  editingId.value = null;
  form.value = {
    name: `新${props.title}`,
    rulesJson: JSON.stringify(props.defaultRules, null, 2),
    enableLlm: false,
  };
  editDialogVisible.value = true;
}

function displayRules(rules) {
  const raw = rules && typeof rules === 'object' ? rules : {};
  return props.formatRules ? props.formatRules(raw) : raw;
}

function openView(row) {
  const rules = displayRules(row.rules);
  viewDetail.value = {
    ...row,
    rulesJsonPretty: JSON.stringify(rules, null, 2),
  };
  viewDrawerVisible.value = true;
}

function openEdit(row) {
  dialogMode.value = 'edit';
  editDialogTitle.value = `编辑 · ${row.ruleSetId}`;
  editingId.value = row.ruleSetId;
  form.value = {
    name: row.name,
    rulesJson: JSON.stringify(displayRules(row.rules), null, 2),
    enableLlm: Boolean(row.enableLlm),
  };
  editDialogVisible.value = true;
}

function parseRulesJson() {
  try {
    const rules = JSON.parse(form.value.rulesJson);
    if (!rules || typeof rules !== 'object') throw new Error('须为 JSON 对象');
    return rules;
  } catch {
    ElMessage.error('规则 JSON 格式不正确');
    return null;
  }
}

async function handleSave() {
  const rules = parseRulesJson();
  if (!rules) return;
  if (!form.value.name?.trim()) {
    ElMessage.warning('请填写名称');
    return;
  }
  saving.value = true;
  try {
    const body = { name: form.value.name.trim(), rules };
    if (props.showLlmColumn) body.enableLlm = form.value.enableLlm;
    if (dialogMode.value === 'create') {
      await props.api.create(body);
      ElMessage.success('草稿已创建');
    } else {
      await props.api.update(editingId.value, body);
      ElMessage.success('草稿已更新');
    }
    editDialogVisible.value = false;
    await loadList();
  } catch (e) {
    ElMessage.error(e?.message || '保存失败');
  } finally {
    saving.value = false;
  }
}

async function handlePublish(row) {
  try {
    await ElMessageBox.confirm(
      `确认发布「${row.name}」？${props.publishHint}`,
      '发布确认',
      { type: 'warning', confirmButtonText: '发布', cancelButtonText: '取消' }
    );
  } catch {
    return;
  }
  try {
    await props.api.publish(row.ruleSetId);
    ElMessage.success('发布成功，将在下一时间桶生效');
    await loadList();
  } catch (e) {
    ElMessage.error(e?.message || '发布失败');
  }
}

async function handleDelete(row) {
  try {
    await ElMessageBox.confirm(`确认删除草稿「${row.name}」？`, '删除确认', { type: 'warning' });
  } catch {
    return;
  }
  try {
    await props.api.delete(row.ruleSetId);
    ElMessage.success('已删除');
    await loadList();
  } catch (e) {
    ElMessage.error(e?.message || '删除失败');
  }
}

async function toggleLlm(row, enabled) {
  if (!props.api.enableLlm) return;
  llmTogglingId.value = row.ruleSetId;
  try {
    await props.api.enableLlm(row.ruleSetId, enabled);
    ElMessage.success(enabled ? '已启用 LLM 解读' : '已关闭 LLM 解读');
    await loadList();
  } catch (e) {
    ElMessage.error(e?.message || '操作失败');
  } finally {
    llmTogglingId.value = null;
  }
}

onMounted(loadList);
</script>

<style scoped lang="scss">
.rule-set-panel-embedded {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.admin-panel__header--embedded {
  justify-content: flex-end;
}

.rule-view-hero {
  padding: 24px 28px;
  border-bottom: 1px solid rgba(135, 211, 255, 0.14);

  h3 {
    margin: 0 0 8px;
    font-size: 22px;
  }
}

.rule-view-meta {
  margin: 0;
  color: rgba(222, 242, 255, 0.72);
  font-size: 13px;
}

.rule-view-body {
  padding: 20px 28px;

  h4 {
    margin: 0 0 10px;
    font-size: 14px;
  }
}

.rule-json-block {
  margin: 0;
  padding: 14px;
  border-radius: 12px;
  background: rgba(4, 20, 33, 0.86);
  border: 1px solid rgba(135, 211, 255, 0.14);
  font-size: 12px;
  line-height: 1.5;
  overflow: auto;
  max-height: 360px;
  color: #dff8ff;
}

.rule-field-docs ul {
  margin: 0;
  padding-left: 18px;
  font-size: 12px;
  color: rgba(222, 242, 255, 0.72);
  line-height: 1.6;
}

.rule-view-footer {
  padding: 16px 28px 24px;
  border-top: 1px solid rgba(135, 211, 255, 0.14);
}

.rule-edit-hint {
  margin: 0 0 8px;
  padding: 0 4px;
  font-size: 12px;
  color: rgba(194, 225, 242, 0.65);
  line-height: 1.5;
}
</style>
