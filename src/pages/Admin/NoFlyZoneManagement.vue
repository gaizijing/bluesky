<template>
  <div class="admin-page">
    <section class="admin-panel">
      <div class="admin-panel__header">
        <div>
         </div>
        <div class="admin-toolbar">
          <el-select v-model="regionId" placeholder="选择 Region" style="width: 180px" @change="loadZones">
            <el-option
              v-for="r in regions"
              :key="r.regionId || r.id"
              :label="r.name"
              :value="r.regionId || r.id"
            />
          </el-select>
          <el-button class="admin-secondary-button" :loading="loading" @click="loadZones">
            <el-icon><Refresh /></el-icon>
            刷新
          </el-button>
          <el-button class="admin-primary-button" @click="triggerImport">
            <el-icon><Upload /></el-icon>
            导入 GeoJSON
          </el-button>
          <input ref="fileInputRef" type="file" accept=".json,.geojson,application/json" hidden @change="onFileChange" />
        </div>
      </div>

      <div class="admin-table-shell">
        <el-table :data="zones" v-loading="loading" class="admin-table" max-height="520">
          <el-table-column label="ID" prop="zoneId" min-width="110" />
          <el-table-column label="名称" prop="name" min-width="140" />
          <el-table-column label="类型" prop="zoneType" width="110" />
          <el-table-column label="状态" width="90" align="center">
            <template #default="{ row }">
              <span :class="['admin-pill', row.enabled ? 'admin-pill--good' : 'admin-pill--danger']">
                {{ row.enabled ? '启用' : '停用' }}
              </span>
            </template>
          </el-table-column>
          <el-table-column label="操作" width="200" align="center">
            <template #default="{ row }">
              <div class="admin-row-actions">
                <el-button class="admin-ghost-button" @click="openPreview(row)">预览</el-button>
                <el-button class="admin-ghost-button" @click="handleDelete(row)">删除</el-button>
              </div>
            </template>
          </el-table-column>
        </el-table>
        <div v-if="!zones.length && !loading" class="admin-empty">当前 Region 暂无禁飞区，可导入 GeoJSON。</div>
      </div>
    </section>

    <el-drawer v-model="previewVisible" :with-header="false" size="640px" destroy-on-close>
      <template v-if="previewZone">
        <header class="nfz-preview__hero">
          <h3>{{ previewZone.name }}</h3>
          <p>{{ previewZone.zoneId }} · {{ previewZone.zoneType }}</p>
        </header>
        <div class="nfz-preview__map-wrap">
          <canvas ref="mapCanvasRef" class="nfz-preview__canvas" width="560" height="280" />
        </div>
        <pre class="nfz-preview__json"><code>{{ previewJson }}</code></pre>
        <footer class="nfz-preview__footer">
          <el-button class="admin-secondary-button" @click="previewVisible = false">关闭</el-button>
        </footer>
      </template>
    </el-drawer>
  </div>
</template>

<script setup>
import { computed, nextTick, onMounted, ref, watch } from 'vue';
import { ElMessage, ElMessageBox } from 'element-plus';
import { Refresh, Upload } from '@element-plus/icons-vue';
import { fetchRegions } from '@/api/v2/region';
import { fetchNoFlyZones, importNoFlyZones, deleteNoFlyZone } from '@/api/v2/noFlyZone';
import { filterRegionsForAdmin } from '@/utils/roleUtils';

const loading = ref(false);
const regions = ref([]);
const regionId = ref('');
const zones = ref([]);
const fileInputRef = ref(null);
const previewVisible = ref(false);
const previewZone = ref(null);
const mapCanvasRef = ref(null);

const previewJson = computed(() =>
  previewZone.value?.geometry ? JSON.stringify(previewZone.value.geometry, null, 2) : ''
);

async function loadRegions() {
  const list = await fetchRegions();
  regions.value = filterRegionsForAdmin(list);
  if (!regionId.value && regions.value.length) {
    regionId.value = regions.value[0].regionId || regions.value[0].id;
  }
}

async function loadZones() {
  if (!regionId.value) {
    zones.value = [];
    return;
  }
  loading.value = true;
  try {
    zones.value = await fetchNoFlyZones(regionId.value);
  } catch (e) {
    ElMessage.error(e?.message || '加载禁飞区失败');
  } finally {
    loading.value = false;
  }
}

function triggerImport() {
  if (!regionId.value) {
    ElMessage.warning('请先选择 Region');
    return;
  }
  fileInputRef.value?.click();
}

async function onFileChange(event) {
  const file = event.target.files?.[0];
  event.target.value = '';
  if (!file) return;
  try {
    const text = await file.text();
    const geoJson = JSON.parse(text);
    const created = await importNoFlyZones(regionId.value, geoJson);
    ElMessage.success(`已导入 ${Array.isArray(created) ? created.length : 0} 个禁飞区`);
    await loadZones();
  } catch (e) {
    ElMessage.error(e?.message || '导入失败，请确认 GeoJSON 为 FeatureCollection');
  }
}

async function handleDelete(row) {
  try {
    await ElMessageBox.confirm(`确认删除禁飞区「${row.name}」？`, '删除确认', { type: 'warning' });
  } catch {
    return;
  }
  try {
    await deleteNoFlyZone(row.zoneId);
    ElMessage.success('已删除');
    await loadZones();
  } catch (e) {
    ElMessage.error(e?.message || '删除失败');
  }
}

function extractRing(geometry) {
  if (!geometry) return [];
  const coords = geometry.coordinates;
  if (geometry.type === 'Polygon' && Array.isArray(coords?.[0])) return coords[0];
  if (geometry.type === 'MultiPolygon' && Array.isArray(coords?.[0]?.[0])) return coords[0][0];
  return [];
}

function drawPreview(geometry) {
  const canvas = mapCanvasRef.value;
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  const ring = extractRing(geometry);
  if (!ring.length) return;

  const lngs = ring.map((p) => p[0]);
  const lats = ring.map((p) => p[1]);
  const minLng = Math.min(...lngs);
  const maxLng = Math.max(...lngs);
  const minLat = Math.min(...lats);
  const maxLat = Math.max(...lats);
  const pad = 20;
  const w = canvas.width - pad * 2;
  const h = canvas.height - pad * 2;

  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = 'rgba(4, 20, 33, 0.95)';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  const toX = (lng) => pad + ((lng - minLng) / (maxLng - minLng || 1)) * w;
  const toY = (lat) => pad + (1 - (lat - minLat) / (maxLat - minLat || 1)) * h;

  ctx.beginPath();
  ring.forEach(([lng, lat], i) => {
    const x = toX(lng);
    const y = toY(lat);
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  });
  ctx.closePath();
  ctx.fillStyle = 'rgba(239, 68, 68, 0.35)';
  ctx.strokeStyle = '#ef4444';
  ctx.lineWidth = 2;
  ctx.fill();
  ctx.stroke();
}

function openPreview(row) {
  previewZone.value = row;
  previewVisible.value = true;
  nextTick(() => drawPreview(row.geometry));
}

watch(previewVisible, (open) => {
  if (open) nextTick(() => drawPreview(previewZone.value?.geometry));
});

onMounted(async () => {
  await loadRegions();
  await loadZones();
});
</script>

<style scoped lang="scss">
.nfz-preview__hero {
  padding: 24px 28px 12px;

  h3 {
    margin: 0 0 6px;
  }

  p {
    margin: 0;
    color: rgba(222, 242, 255, 0.72);
    font-size: 13px;
  }
}

.nfz-preview__map-wrap {
  padding: 0 28px;
}

.nfz-preview__canvas {
  width: 100%;
  border-radius: 12px;
  border: 1px solid rgba(135, 211, 255, 0.14);
}

.nfz-preview__json {
  margin: 16px 28px;
  padding: 12px;
  border-radius: 12px;
  background: rgba(4, 20, 33, 0.86);
  font-size: 11px;
  max-height: 200px;
  overflow: auto;
  color: #dff8ff;
}

.nfz-preview__footer {
  padding: 12px 28px 24px;
}
</style>
