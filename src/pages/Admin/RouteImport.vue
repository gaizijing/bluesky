<template>
  <div class="admin-page route-mgmt">
    <section class="admin-panel">
      <div class="admin-panel__header">
        <div class="route-mgmt__intro">
          <h2 class="admin-panel__title">航路管理</h2>
          <p class="admin-panel__desc">
            管理各 Region 航路数据，供大屏总览与航路下钻使用
            <span v-if="regionId" class="route-mgmt__count">· 当前 {{ routes.length }} 条</span>
          </p>
        </div>
        <div class="admin-toolbar route-mgmt__toolbar">
          <el-select
            v-model="regionId"
            placeholder="选择 Region"
            class="route-mgmt__region-select"
          >
            <el-option
              v-for="r in regions"
              :key="r.regionId || r.id"
              :label="r.name"
              :value="r.regionId || r.id"
            />
          </el-select>
          <el-button class="admin-secondary-button" :loading="listLoading" @click="loadRoutes">
            <el-icon><Refresh /></el-icon>
            刷新
          </el-button>
          <el-button class="admin-primary-button" @click="openImportDrawer">
            <el-icon><Upload /></el-icon>
            导入 GeoJSON
          </el-button>
          <el-button
            class="admin-ghost-button"
            :disabled="!routes.length"
            :loading="clearing"
            @click="handleClearRegion"
          >
            清空本 Region
          </el-button>
        </div>
      </div>

      <div class="admin-table-shell route-mgmt__table-shell">
        <el-table
          :data="routes"
          v-loading="listLoading"
          class="admin-table route-mgmt__table"
          max-height="620"
          :row-class-name="() => 'route-mgmt__row'"
        >
          <el-table-column label="航路名称" min-width="160">
            <template #default="{ row }">
              <div class="route-mgmt__name">{{ row.name }}</div>
              <div class="route-mgmt__id">{{ row.routeId }}</div>
            </template>
          </el-table-column>
          <el-table-column label="起终点" min-width="140">
            <template #default="{ row }">
              <span class="route-mgmt__endpoint">{{ row.startName }}</span>
              <span class="route-mgmt__arrow">→</span>
              <span class="route-mgmt__endpoint">{{ row.endName }}</span>
            </template>
          </el-table-column>
          <el-table-column label="航程" width="100" align="center">
            <template #default="{ row }">
              <span class="route-mgmt__distance">
                {{ row.distance != null ? `${Number(row.distance).toFixed(1)}` : '—' }}
                <small v-if="row.distance != null">km</small>
              </span>
            </template>
          </el-table-column>
          <el-table-column label="状态" width="100" align="center">
            <template #default="{ row }">
              <span :class="['admin-pill', statusPillClass(row.status)]">
                {{ statusLabel(row.status) }}
              </span>
            </template>
          </el-table-column>
          <el-table-column label="操作" width="120" align="center" fixed="right">
            <template #default="{ row }">
              <div class="admin-row-actions">
                <el-button class="admin-ghost-button route-mgmt__delete-btn" @click="handleDelete(row)">
                  删除
                </el-button>
              </div>
            </template>
          </el-table-column>
        </el-table>

        <div v-if="!routes.length && !listLoading" class="route-mgmt__empty">
          <div class="route-mgmt__empty-icon" aria-hidden="true">
            <svg viewBox="0 0 48 48" fill="none">
              <path
                d="M8 32 L18 22 L28 26 L40 12"
                stroke="currentColor"
                stroke-width="2.5"
                stroke-linecap="round"
                stroke-linejoin="round"
              />
              <circle cx="8" cy="32" r="3" fill="currentColor" opacity="0.5" />
              <circle cx="40" cy="12" r="3" fill="currentColor" />
            </svg>
          </div>
          <p class="route-mgmt__empty-title">当前 Region 暂无航路</p>
          <p class="route-mgmt__empty-desc">导入 GeoJSON LineString，首点起点、末点终点，中间为途经点</p>
          <el-button class="admin-primary-button" @click="openImportDrawer">
            <el-icon><Upload /></el-icon>
            导入第一条航路
          </el-button>
        </div>
      </div>
    </section>

    <el-drawer
      v-model="importDrawerVisible"
      :with-header="false"
      size="720px"
      destroy-on-close
      class="route-import-drawer"
      @closed="resetImportForm"
    >
      <div class="route-drawer">
        <header class="route-drawer__hero">
          <div>
            <p class="route-drawer__eyebrow">GeoJSON 导入</p>
            <h3>导入航路至 {{ currentRegionName }}</h3>
          </div>
          <button type="button" class="route-drawer__close" aria-label="关闭" @click="importDrawerVisible = false">
            ×
          </button>
        </header>

        <div class="route-drawer__body">
          <el-form label-position="top" class="route-drawer__form">
            <el-form-item label="航路名称（可选）">
              <el-input v-model="routeName" placeholder="留空则使用 GeoJSON 中的 name" clearable />
            </el-form-item>

            <el-form-item label="GeoJSON 文件">
              <div class="route-drawer__file-row">
                <el-button class="admin-secondary-button" @click="triggerFile">
                  <el-icon><Upload /></el-icon>
                  选择文件
                </el-button>
                <span v-if="fileName" class="route-drawer__file-name">{{ fileName }}</span>
                <span v-else class="route-drawer__file-hint">支持 .json / .geojson</span>
              </div>
              <input
                ref="fileInputRef"
                type="file"
                accept=".json,.geojson,.kml,application/json"
                hidden
                @change="onFileChange"
              />
            </el-form-item>

            <el-form-item label="或粘贴 JSON">
              <el-input
                v-model="jsonText"
                type="textarea"
                :rows="12"
                placeholder='{"type":"LineString","properties":{"altitudes":[120,280,480,200]},"coordinates":[[120.22,36.04],...]}'
                class="route-drawer__textarea"
              />
            </el-form-item>
          </el-form>

          <aside class="route-drawer__help">
            <h4>格式说明</h4>
            <ul>
              <li>支持 <code>LineString</code>、<code>Feature</code>、<code>FeatureCollection</code></li>
              <li>首点为起点，末点为终点，中间点为途经点</li>
              <li><code>properties.altitudes</code> 指定各点高度（米），长度须与坐标点数一致</li>
              <li><code>properties.flightHeight</code> 为缺省巡航高度（未写 altitudes 时）</li>
            </ul>
            <div v-if="lastResult" class="route-drawer__result">
              <h4>最近导入</h4>
              <pre><code>{{ lastResult }}</code></pre>
            </div>
          </aside>
        </div>

        <footer class="route-drawer__footer">
          <el-button class="admin-ghost-button" @click="importDrawerVisible = false">取消</el-button>
          <el-button class="admin-primary-button" :loading="importing" @click="handleImport">
            确认导入
          </el-button>
        </footer>
      </div>
    </el-drawer>
  </div>
</template>

<script setup>
import { computed, onMounted, ref, watch } from 'vue';
import { ElMessage, ElMessageBox } from 'element-plus';
import { Refresh, Upload } from '@element-plus/icons-vue';
import { fetchRegions } from '@/api/v2/region';
import { importRoute, fetchRoutes, deleteRoute, clearRoutes } from '@/api/v2/route';
import { filterRegionsForAdmin } from '@/utils/roleUtils';

const regions = ref([]);
const regionId = ref('');
const routeName = ref('');
const jsonText = ref('');
const fileName = ref('');
const importing = ref(false);
const listLoading = ref(false);
const clearing = ref(false);
const importDrawerVisible = ref(false);
const routes = ref([]);
const lastResult = ref('');
const fileInputRef = ref(null);

const currentRegionName = computed(() => {
  const hit = regions.value.find((r) => (r.regionId || r.id) === regionId.value);
  return hit?.name || regionId.value || '—';
});

function statusLabel(status) {
  if (status === 'available') return '可用';
  if (status === 'blocked') return '不可用';
  return status || '—';
}

function statusPillClass(status) {
  if (status === 'available') return 'admin-pill--good';
  if (status === 'blocked') return 'admin-pill--danger';
  return 'admin-pill--warn';
}

function openImportDrawer() {
  if (!regionId.value) {
    ElMessage.warning('请先选择 Region');
    return;
  }
  importDrawerVisible.value = true;
}

function resetImportForm() {
  routeName.value = '';
  jsonText.value = '';
  fileName.value = '';
}

async function loadRegions() {
  const list = await fetchRegions();
  regions.value = filterRegionsForAdmin(list);
  if (regions.value.length) {
    regionId.value = regions.value[0].regionId || regions.value[0].id;
  }
}

async function loadRoutes() {
  if (!regionId.value) {
    routes.value = [];
    return;
  }
  listLoading.value = true;
  try {
    const res = await fetchRoutes(regionId.value, 1, 100);
    routes.value = res?.records || [];
  } catch (e) {
    ElMessage.error(e?.message || '加载航路列表失败');
    routes.value = [];
  } finally {
    listLoading.value = false;
  }
}

async function handleDelete(row) {
  try {
    await ElMessageBox.confirm(
      `确认删除航路「${row.name}」吗？删除后大屏总览将不再显示该航路。`,
      '删除确认',
      { confirmButtonText: '删除', cancelButtonText: '取消', type: 'warning' },
    );
  } catch {
    return;
  }
  try {
    await deleteRoute(row.routeId);
    ElMessage.success('已删除');
    await loadRoutes();
  } catch (e) {
    ElMessage.error(e?.message || '删除失败');
  }
}

async function handleClearRegion() {
  if (!regionId.value || !routes.value.length) return;
  try {
    await ElMessageBox.confirm(
      `确认清空「${currentRegionName.value}」下的全部 ${routes.value.length} 条航路吗？此操作不可恢复。`,
      '清空确认',
      { confirmButtonText: '全部删除', cancelButtonText: '取消', type: 'warning' },
    );
  } catch {
    return;
  }
  clearing.value = true;
  try {
    await clearRoutes(regionId.value);
    ElMessage.success('已清空');
    await loadRoutes();
  } catch (e) {
    ElMessage.error(e?.message || '清空失败');
  } finally {
    clearing.value = false;
  }
}

function triggerFile() {
  fileInputRef.value?.click();
}

async function onFileChange(event) {
  const file = event.target.files?.[0];
  event.target.value = '';
  if (!file) return;
  fileName.value = file.name;
  try {
    jsonText.value = await file.text();
  } catch {
    ElMessage.error('读取文件失败');
  }
}

function buildGeoJsonPayload(raw) {
  if (raw.type === 'FeatureCollection' && Array.isArray(raw.features)) {
    const feature = raw.features.find((f) => f.geometry?.coordinates);
    if (feature?.geometry) {
      return {
        type: feature.geometry.type || 'LineString',
        coordinates: feature.geometry.coordinates,
        name: routeName.value || raw.name || feature.properties?.name,
        properties: feature.properties,
      };
    }
  }
  if (raw.type === 'Feature' && raw.geometry) {
    return {
      type: raw.geometry.type || 'LineString',
      coordinates: raw.geometry.coordinates,
      name: routeName.value || raw.properties?.name,
      properties: raw.properties,
    };
  }
  if (Array.isArray(raw.coordinates)) {
    return {
      type: raw.type || 'LineString',
      coordinates: raw.coordinates,
      name: routeName.value || raw.name,
      properties: raw.properties,
    };
  }
  throw new Error('无法识别 GeoJSON 结构，需包含 coordinates');
}

async function handleImport() {
  if (!regionId.value) {
    ElMessage.warning('请选择 Region');
    return;
  }
  if (!jsonText.value.trim()) {
    ElMessage.warning('请上传或粘贴 GeoJSON');
    return;
  }
  importing.value = true;
  try {
    const raw = JSON.parse(jsonText.value);
    const payload = buildGeoJsonPayload(raw);
    if (routeName.value) payload.name = routeName.value;
    const result = await importRoute(regionId.value, payload);
    lastResult.value = JSON.stringify(result, null, 2);
    ElMessage.success('航路导入成功');
    importDrawerVisible.value = false;
    await loadRoutes();
  } catch (e) {
    ElMessage.error(e?.message || '导入失败');
  } finally {
    importing.value = false;
  }
}

onMounted(async () => {
  await loadRegions();
  await loadRoutes();
});

watch(regionId, () => {
  loadRoutes();
});
</script>

<style scoped lang="scss">
.route-mgmt__intro {
  min-width: 0;
}

.route-mgmt__count {
  color: rgba(125, 211, 252, 0.85);
  font-weight: 500;
}

.route-mgmt__toolbar {
  flex-shrink: 0;
}

.route-mgmt__region-select {
  width: 180px;
}

.route-mgmt__table-shell {
  position: relative;
  min-height: 320px;
}

.route-mgmt__name {
  font-weight: 600;
  color: #f1f5f9;
  line-height: 1.35;
}

.route-mgmt__id {
  margin-top: 4px;
  font-size: 11px;
  font-family: ui-monospace, 'Cascadia Code', monospace;
  color: rgba(148, 163, 184, 0.85);
  word-break: break-all;
}

.route-mgmt__endpoint {
  color: rgba(226, 232, 240, 0.92);
}

.route-mgmt__arrow {
  margin: 0 6px;
  color: rgba(56, 189, 248, 0.75);
}

.route-mgmt__distance {
  font-weight: 600;
  color: #e2e8f0;

  small {
    margin-left: 2px;
    font-size: 11px;
    font-weight: 400;
    color: rgba(148, 163, 184, 0.9);
  }
}

.route-mgmt__delete-btn {
  color: rgba(252, 165, 165, 0.95) !important;

  &:hover {
    color: #fca5a5 !important;
    border-color: rgba(248, 113, 113, 0.35) !important;
  }
}

.route-mgmt__empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 56px 24px 64px;
  text-align: center;
}

.route-mgmt__empty-icon {
  width: 72px;
  height: 72px;
  margin-bottom: 16px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 20px;
  background: linear-gradient(145deg, rgba(14, 116, 144, 0.22), rgba(30, 64, 175, 0.12));
  border: 1px solid rgba(56, 189, 248, 0.18);
  color: rgba(125, 211, 252, 0.9);

  svg {
    width: 44px;
    height: 44px;
  }
}

.route-mgmt__empty-title {
  margin: 0 0 8px;
  font-size: 16px;
  font-weight: 600;
  color: #f1f5f9;
}

.route-mgmt__empty-desc {
  margin: 0 0 20px;
  max-width: 360px;
  font-size: 13px;
  line-height: 1.6;
  color: rgba(148, 163, 184, 0.95);
}

.route-drawer {
  display: flex;
  flex-direction: column;
  height: 100%;
  background: linear-gradient(180deg, #0b1f33 0%, #071525 100%);
  color: #e2e8f0;
}

.route-drawer__hero {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
  padding: 22px 24px 18px;
  border-bottom: 1px solid rgba(56, 189, 248, 0.12);
  background: rgba(8, 24, 40, 0.65);

  h3 {
    margin: 4px 0 0;
    font-size: 18px;
    font-weight: 600;
    color: #f8fafc;
  }
}

.route-drawer__eyebrow {
  margin: 0;
  font-size: 11px;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: rgba(125, 211, 252, 0.75);
}

.route-drawer__close {
  flex-shrink: 0;
  width: 32px;
  height: 32px;
  border: 1px solid rgba(148, 163, 184, 0.2);
  border-radius: 8px;
  background: rgba(15, 23, 42, 0.5);
  color: #94a3b8;
  font-size: 22px;
  line-height: 1;
  cursor: pointer;
  transition: border-color 0.15s, color 0.15s;

  &:hover {
    border-color: rgba(56, 189, 248, 0.35);
    color: #e2e8f0;
  }
}

.route-drawer__body {
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(220px, 280px);
  gap: 20px;
  padding: 20px 24px;
}

.route-drawer__form {
  min-width: 0;
}

.route-drawer__file-row {
  display: flex;
  align-items: center;
  gap: 12px;
  flex-wrap: wrap;
}

.route-drawer__file-name {
  font-size: 13px;
  color: rgba(125, 211, 252, 0.9);
}

.route-drawer__file-hint {
  font-size: 12px;
  color: rgba(148, 163, 184, 0.8);
}

.route-drawer__help {
  padding: 16px 18px;
  border-radius: 14px;
  border: 1px solid rgba(56, 189, 248, 0.14);
  background: rgba(4, 20, 33, 0.72);
  font-size: 13px;
  line-height: 1.65;
  color: rgba(203, 213, 225, 0.88);
  align-self: start;

  h4 {
    margin: 0 0 10px;
    font-size: 13px;
    font-weight: 600;
    color: #bae6fd;
  }

  ul {
    margin: 0;
    padding-left: 18px;
  }

  code {
    font-size: 11px;
    color: #7dd3fc;
  }
}

.route-drawer__result {
  margin-top: 18px;
  padding-top: 14px;
  border-top: 1px solid rgba(255, 255, 255, 0.06);

  pre {
    margin: 8px 0 0;
    padding: 10px;
    border-radius: 8px;
    background: rgba(2, 12, 22, 0.9);
    font-size: 10px;
    max-height: 140px;
    overflow: auto;
  }
}

.route-drawer__footer {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
  padding: 16px 24px 20px;
  border-top: 1px solid rgba(56, 189, 248, 0.1);
  background: rgba(6, 18, 32, 0.85);
}

:deep(.route-import-drawer .el-drawer__body) {
  padding: 0;
}

:deep(.route-drawer__form .el-form-item__label) {
  color: rgba(203, 213, 225, 0.88);
  font-weight: 500;
}

:deep(.route-drawer__textarea textarea) {
  font-family: ui-monospace, 'Cascadia Code', monospace;
  font-size: 12px;
}

@media (max-width: 960px) {
  .route-mgmt__toolbar {
    width: 100%;
    justify-content: flex-start;
  }

  .route-drawer__body {
    grid-template-columns: 1fr;
  }
}
</style>
