<template>
  <div class="admin-page">
    <section class="admin-panel">
      <div class="admin-panel__header">
        <div>
          <h2 class="admin-panel__title">航路导入</h2>
          <p class="admin-panel__desc">
            上传 GeoJSON LineString（或含 coordinates 的对象），导入后归属所选 Region，Dashboard 航路总览可见
          </p>
        </div>
      </div>

      <div class="route-import-body">
        <el-form label-width="100px" class="route-import-form">
          <el-form-item label="Region">
            <el-select v-model="regionId" placeholder="选择 Region" style="width: 280px">
              <el-option
                v-for="r in regions"
                :key="r.regionId || r.id"
                :label="r.name"
                :value="r.regionId || r.id"
              />
            </el-select>
          </el-form-item>
          <el-form-item label="航路名称">
            <el-input v-model="routeName" placeholder="可选，默认自动生成" style="width: 280px" />
          </el-form-item>
          <el-form-item label="GeoJSON 文件">
            <el-button class="admin-secondary-button" @click="triggerFile">
              <el-icon><Upload /></el-icon>
              选择文件
            </el-button>
            <span v-if="fileName" class="route-import-file">{{ fileName }}</span>
            <input ref="fileInputRef" type="file" accept=".json,.geojson,.kml,application/json" hidden @change="onFileChange" />
          </el-form-item>
          <el-form-item label="或粘贴 JSON">
            <el-input v-model="jsonText" type="textarea" :rows="10" placeholder='{"type":"LineString","coordinates":[[117.8,39.3],[117.9,39.28]]}' />
          </el-form-item>
          <el-form-item>
            <el-button class="admin-primary-button" :loading="importing" @click="handleImport">
              导入航路
            </el-button>
          </el-form-item>
        </el-form>

        <aside class="route-import-help">
          <h4>格式说明</h4>
          <ul>
            <li>支持 GeoJSON <code>LineString</code> 或带 <code>coordinates</code> 的对象</li>
            <li>首点为起点，末点为终点，中间点为途经点</li>
            <li>KML 请先转换为 GeoJSON 再导入</li>
          </ul>
          <div v-if="lastResult" class="route-import-result">
            <h4>最近导入结果</h4>
            <pre><code>{{ lastResult }}</code></pre>
          </div>
        </aside>
      </div>
    </section>
  </div>
</template>

<script setup>
import { onMounted, ref } from 'vue';
import { ElMessage } from 'element-plus';
import { Upload } from '@element-plus/icons-vue';
import { fetchRegions } from '@/api/v2/region';
import { importRoute } from '@/api/v2/route';
import { filterRegionsForAdmin } from '@/utils/roleUtils';

const regions = ref([]);
const regionId = ref('');
const routeName = ref('');
const jsonText = ref('');
const fileName = ref('');
const importing = ref(false);
const lastResult = ref('');
const fileInputRef = ref(null);

async function loadRegions() {
  const list = await fetchRegions();
  regions.value = filterRegionsForAdmin(list);
  if (regions.value.length) {
    regionId.value = regions.value[0].regionId || regions.value[0].id;
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
      };
    }
  }
  if (raw.type === 'Feature' && raw.geometry) {
    return {
      type: raw.geometry.type || 'LineString',
      coordinates: raw.geometry.coordinates,
      name: routeName.value || raw.properties?.name,
    };
  }
  if (Array.isArray(raw.coordinates)) {
    return {
      type: raw.type || 'LineString',
      coordinates: raw.coordinates,
      name: routeName.value || raw.name,
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
  } catch (e) {
    ElMessage.error(e?.message || '导入失败');
  } finally {
    importing.value = false;
  }
}

onMounted(loadRegions);
</script>

<style scoped lang="scss">
.route-import-body {
  display: grid;
  grid-template-columns: minmax(0, 1.2fr) minmax(260px, 0.8fr);
  gap: 24px;
  padding: 20px 24px 28px;
}

.route-import-form {
  max-width: 640px;
}

.route-import-file {
  margin-left: 12px;
  font-size: 13px;
  color: rgba(222, 242, 255, 0.72);
}

.route-import-help {
  padding: 16px 18px;
  border-radius: 16px;
  border: 1px solid rgba(135, 211, 255, 0.14);
  background: rgba(8, 24, 37, 0.65);
  font-size: 13px;
  line-height: 1.6;
  color: rgba(222, 242, 255, 0.78);

  h4 {
    margin: 0 0 8px;
    font-size: 14px;
  }

  ul {
    margin: 0 0 16px;
    padding-left: 18px;
  }

  code {
    font-size: 12px;
  }
}

.route-import-result pre {
  margin: 0;
  padding: 10px;
  border-radius: 8px;
  background: rgba(4, 20, 33, 0.86);
  font-size: 11px;
  max-height: 220px;
  overflow: auto;
}

@media (max-width: 960px) {
  .route-import-body {
    grid-template-columns: 1fr;
  }
}
</style>
