<template>
  <div class="admin-page">

    <section class="admin-panel">
      <div class="admin-panel__header">
        <div>
        </div>
        <div class="admin-toolbar">
          <el-button class="admin-secondary-button" :loading="loading" @click="loadRegionConfigs">
            <el-icon>
              <Refresh />
            </el-icon>
            刷新列表
          </el-button>
          <el-button class="admin-primary-button" @click="openCreate">
            <el-icon>
              <Plus />
            </el-icon>
            新增地区配置
          </el-button>
          <el-input v-model="searchKeyword" clearable placeholder="搜索地区名称或ID" @clear="clearFilters"
            @keyup.enter="handleSearch">
            <template #prefix>
              <el-icon>
                <Search />
              </el-icon>
            </template>
          </el-input>
          <el-button class="admin-secondary-button" @click="handleSearch">查询</el-button>
          <el-button v-if="searchKeyword" class="admin-ghost-button" @click="clearFilters">
            清空筛选
          </el-button>
        </div>
      </div>

      <div class="admin-table-shell">
        <el-table :data="visibleRegionConfigs" v-loading="loading" class="admin-table" max-height="560"
          :row-class-name="rowClassName">
          <el-table-column label="ID" min-width="80">
            <template #default="{ row }">
              <div>{{ row.id }}</div>
            </template>
          </el-table-column>

          <el-table-column label="地区名称" min-width="120">
            <template #default="{ row }">
              <div>{{ row.name }}</div>
            </template>
          </el-table-column>

          <el-table-column label="中心点" min-width="160">
            <template #default="{ row }">
              <div>{{ formatCenter(row) }}</div>
            </template>
          </el-table-column>

          <el-table-column label="区划代码" min-width="100">
            <template #default="{ row }">
              <div>{{ row.adcode || '—' }}</div>
            </template>
          </el-table-column>

          <el-table-column label="边界 GeoJSON" min-width="200">
            <template #default="{ row }">
              <div class="admin-boundary-url">{{ row.boundaryUrl || '—' }}</div>
            </template>
          </el-table-column>

          <el-table-column label="建筑白膜" min-width="200">
            <template #default="{ row }">
              <div class="admin-boundary-url">{{ row.modelUrl || '—' }}</div>
            </template>
          </el-table-column>

          <el-table-column label="是否默认" min-width="100">
            <template #default="{ row }">
              <span :class="['admin-pill', row.isDefault ? 'admin-pill--good' : 'admin-pill--neutral']">
                {{ row.isDefault ? '是' : '否' }}
              </span>
            </template>
          </el-table-column>

          <el-table-column label="创建时间" min-width="160">
            <template #default="{ row }">
              <div>{{ formatDate(row.createdAt) }}</div>
            </template>
          </el-table-column>

          <el-table-column label="操作" min-width="280">
            <template #default="{ row }">
              <div class="admin-row-actions">
                <el-button class="admin-ghost-button" @click="setAsDefault(row)" :disabled="row.isDefault">
                  <el-icon>
                    <Star />
                  </el-icon>
                  {{ row.isDefault ? '已默认' : '设为默认' }}
                </el-button>
                <el-button class="admin-ghost-button" @click="openEdit(row)">
                  <el-icon>
                    <EditPen />
                  </el-icon>
                  编辑
                </el-button>
                <el-button class="admin-ghost-button" @click="handleDelete(row)" :disabled="row.isDefault">
                  <el-icon>
                    <Delete />
                  </el-icon>
                  删除
                </el-button>
              </div>
            </template>
          </el-table-column>
        </el-table>

        <div v-if="!visibleRegionConfigs.length && !loading" class="admin-empty">
          当前没有匹配的地区配置记录，试试清空筛选或新增一个配置。
        </div>
      </div>
    </section>

    <el-drawer v-model="drawerVisible" :with-header="false" size="760px" class="admin-editor-drawer" destroy-on-close>
      <div class="admin-drawer__header">
        <p class="admin-page__eyebrow">{{ isEditing ? '编辑区域' : '新增区域' }}</p>
        <h3>{{ isEditing ? '编辑地区配置' : '新增地区配置' }}</h3>
        <p>填写地区名称、相机中心点；通过省市区选择自动生成 adcode 并下载边界 GeoJSON。</p>
      </div>

      <el-form ref="formRef" :model="formModel" :rules="formRules" label-position="top">
        <section class="admin-form-section">
          <h4 class="admin-section-title">基础信息</h4>
          <div class="admin-form-grid">
            <el-form-item label="地区名称" prop="name">
              <el-input v-model="formModel.name" placeholder="如：天津宁河区" />
            </el-form-item>

            <el-form-item label="是否默认">
              <el-switch v-model="formModel.isDefault" inline-prompt active-text="是" inactive-text="否" />
              <div class="admin-form-hint">设置为默认后，系统会自动取消其他配置的默认状态。</div>
            </el-form-item>
          </div>
        </section>

        <section class="admin-form-section">
          <h4 class="admin-section-title">相机中心点</h4>
          <div class="admin-form-grid">
            <el-form-item label="中心经度" prop="centerLng">
              <el-input-number v-model="formModel.centerLng" :min="-180" :max="180" :step="0.0001"
                controls-position="right" />
            </el-form-item>

            <el-form-item label="中心纬度" prop="centerLat">
              <el-input-number v-model="formModel.centerLat" :min="-90" :max="90" :step="0.0001"
                controls-position="right" />
            </el-form-item>
          </div>
          <div class="admin-form-hint">地图默认视角将以该中心点为参考位置。</div>
        </section>

        <section class="admin-form-section">
          <h4 class="admin-section-title">默认视角（mapLift）</h4>
          <div class="admin-form-grid">
            <el-form-item label="相机高度 (m)" prop="mapLiftHeight">
              <el-input-number v-model="formModel.mapLiftHeight" :min="2500" :max="10000000" :step="500"
                controls-position="right" />
            </el-form-item>

            <el-form-item label="俯仰角 Pitch (°)" prop="mapLiftPitch">
              <el-input-number v-model="formModel.mapLiftPitch" :min="-89" :max="-5" :step="1"
                controls-position="right" />
            </el-form-item>

            <el-form-item label="航向角 Heading (°)" prop="mapLiftHeading">
              <el-input-number v-model="formModel.mapLiftHeading" :min="-180" :max="180" :step="1"
                controls-position="right" />
            </el-form-item>
          </div>
          <div class="admin-form-hint">
            高度越小视角越低；Pitch 越接近 0 越平视（如 -35 比 -55 更能看到地平线）。全国视角可用数百万米高度。保存后刷新 Dashboard 或点「首页」生效。
          </div>
        </section>

        <section class="admin-form-section">
          <h4 class="admin-section-title">行政区划边界</h4>
          <el-form-item label="省 / 市 / 区" prop="areaCascader">
            <el-cascader
              v-model="areaCascader"
              :props="cascaderProps"
              clearable
              placeholder="请选择省、市、区（可停在任意一级）"
              class="admin-area-cascader"
              @change="onAreaCascaderChange"
            />
          </el-form-item>
          <div v-if="formModel.adcode" class="admin-form-hint admin-adcode-preview">
            已生成区划代码：<strong>{{ formModel.adcode }}</strong>
            <span v-if="selectedAreaLabel">（{{ selectedAreaLabel }}）</span>
          </div>

          <el-form-item label="GeoJSON 下载地址（可选）" prop="boundarySourceUrl">
            <el-input v-model="formModel.boundarySourceUrl"
              placeholder="留空则按上方区划代码从 DataV 自动下载" />
          </el-form-item>

          <div v-if="isEditing && formModel.boundaryUrl" class="admin-form-hint">
            当前边界文件：{{ formModel.boundaryUrl }}。重新选择区划或填写新下载地址后保存，将更新边界。
          </div>
          <div v-else class="admin-form-hint">
            新增时请选择区划或填写 GeoJSON 地址；选择后会自动生成 adcode，并尝试填充中心点坐标。
          </div>
        </section>

        <section class="admin-form-section">
          <h4 class="admin-section-title">建筑白膜（3D Tileset）</h4>
          <el-form-item label="tileset 地址" prop="modelUrl">
            <el-input
              v-model="formModel.modelUrl"
              clearable
              placeholder="如：/cesium/model/tianjin/tileset.json"
            />
          </el-form-item>
          <div class="admin-form-hint">
            填写 Cesium 3D Tiles 的 <code>tileset.json</code> 路径（相对站点根或完整 URL）。留空则不加载白膜。
            历史 <code>modelinfo.json</code> 会在地图端自动替换为 <code>tileset.json</code>。
          </div>
        </section>
      </el-form>

      <div class="admin-drawer__footer">
        <el-button class="admin-secondary-button" @click="handleReset">重置</el-button>
        <el-button class="admin-primary-button" :loading="saving" @click="handleSave">
          {{ saving ? '保存中...' : '保存配置' }}
        </el-button>
      </div>
    </el-drawer>
  </div>
</template>

<script setup>
import { computed, nextTick, onMounted, reactive, ref } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import {
  Refresh,
  Plus,
  Star,
  EditPen,
  Delete,
  Search
} from '@element-plus/icons-vue'
import {
  getAllRegionConfigs,
  addRegionConfig,
  updateRegionConfig,
  deleteRegionConfig,
  setRegionDefault
} from '@/api'
import { useRegionStore } from '@/store/modules/region';
import { InitializationService } from '@/services/initialization';
import {
  areaCascaderProps,
  fetchAreaMeta,
  resolveAreaCascaderPath,
} from '@/utils/chinaAreaCascader';

const regionStore = useRegionStore();
const initializationService = new InitializationService();

const cascaderProps = areaCascaderProps
const areaCascader = ref([])
const selectedAreaLabel = ref('')

const loading = ref(false)
const saving = ref(false)
const drawerVisible = ref(false)
const isEditing = ref(false)
const formRef = ref(null)
const regionConfigs = ref([])
const formSnapshot = ref(null)
const searchKeyword = ref('')

const createRegionForm = () => ({
  regionId: null,
  id: null,
  name: '',
  centerLng: 120.5,
  centerLat: 36.5,
  adcode: '',
  boundarySourceUrl: '',
  boundaryUrl: '',
  modelUrl: '',
  isDefault: false,
  mapLiftHeight: 18000,
  mapLiftPitch: -35,
  mapLiftHeading: 0,
})

const formModel = reactive(createRegionForm())

const formRules = {
  name: [{ required: true, message: '请输入地区名称', trigger: 'blur' }],
  centerLng: [{ required: true, message: '请输入中心经度', trigger: 'blur' }],
  centerLat: [{ required: true, message: '请输入中心纬度', trigger: 'blur' }],
}

const formatCenter = (row) => {
  if (row.centerLng == null || row.centerLat == null) return '—'
  return `${Number(row.centerLng).toFixed(4)}, ${Number(row.centerLat).toFixed(4)}`
}

const formatDate = (dateString) => {
  if (!dateString) return ''
  const date = new Date(dateString)
  return date.toLocaleString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  })
}

const rowClassName = ({ row }) => {
  return row.isDefault ? 'admin-table-row-selected' : ''
}

const visibleRegionConfigs = computed(() => {
  const keyword = searchKeyword.value.trim().toLowerCase()

  return regionConfigs.value.filter((item) => {
    const matchesKeyword =
      !keyword ||
      [item.regionId, item.id, item.name, item.adcode, item.boundaryUrl, item.modelUrl]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(keyword))

    return matchesKeyword
  })
})

const handleSearch = () => { }

const clearFilters = () => {
  searchKeyword.value = ''
}

const loadRegionConfigs = async () => {
  loading.value = true

  try {
    const response = await getAllRegionConfigs()
    regionConfigs.value = (Array.isArray(response) ? response : []).map((item) => ({
      ...item,
      id: item.regionId || item.id,
      regionId: item.regionId || item.id,
    }))
  } catch (error) {
    console.error('加载地区配置列表失败:', error)
    ElMessage.error('获取地区配置列表失败，请稍后重试')
  } finally {
    loading.value = false
  }
}

const applyFormModel = async (payload) => {
  Object.assign(formModel, createRegionForm(), payload)
  formModel.adcode = payload?.adcode || ''
  formModel.boundarySourceUrl = ''
  formModel.mapLiftHeight = payload?.mapLift?.height ?? payload?.mapLiftHeight ?? 18000
  formModel.mapLiftPitch = payload?.mapLift?.pitch ?? payload?.mapLiftPitch ?? -35
  formModel.mapLiftHeading = payload?.mapLift?.heading ?? payload?.mapLiftHeading ?? 0
  selectedAreaLabel.value = ''
  await syncAreaCascaderFromAdcode(formModel.adcode)
}

const syncAreaCascaderFromAdcode = async (adcode) => {
  if (!adcode) {
    areaCascader.value = []
    return
  }
  try {
    areaCascader.value = await resolveAreaCascaderPath(adcode)
    const meta = await fetchAreaMeta(adcode)
    selectedAreaLabel.value = meta?.name || ''
  } catch (err) {
    console.warn('[RegionManagement] 区划路径还原失败', err)
    areaCascader.value = []
  }
}

const onAreaCascaderChange = async (values) => {
  if (!values?.length) {
    formModel.adcode = ''
    selectedAreaLabel.value = ''
    return
  }

  const adcode = String(values[values.length - 1])
  formModel.adcode = adcode

  try {
    const meta = await fetchAreaMeta(adcode)
    selectedAreaLabel.value = meta?.name || ''
    if (meta?.center?.length >= 2) {
      formModel.centerLng = Number(meta.center[0])
      formModel.centerLat = Number(meta.center[1])
    }
  } catch (err) {
    console.warn('[RegionManagement] 区划中心点获取失败', err)
  }
}

const openCreate = async () => {
  isEditing.value = false
  formSnapshot.value = createRegionForm()
  await applyFormModel(formSnapshot.value)
  drawerVisible.value = true
  await nextTick()
  formRef.value?.clearValidate()
}

const openEdit = async (row) => {
  isEditing.value = true
  formSnapshot.value = { ...row, boundarySourceUrl: '' }
  await applyFormModel(row)
  drawerVisible.value = true
  await nextTick()
  formRef.value?.clearValidate()
}

const handleReset = async () => {
  await applyFormModel(formSnapshot.value || createRegionForm())
}

const handleSave = async () => {
  await formRef.value?.validate()

  if (!isEditing.value && !formModel.adcode?.trim() && !formModel.boundarySourceUrl?.trim()) {
    ElMessage.error('新增区域请选择省 / 市 / 区，或填写 GeoJSON 下载地址')
    return
  }

  saving.value = true

  try {
    const payload = { ...formModel }

    if (isEditing.value) {
      await updateRegionConfig(payload)
    } else {
      await addRegionConfig(payload)
    }

    ElMessage.success(isEditing.value ? '地区配置已更新' : '地区配置已新增')
    drawerVisible.value = false
    await loadRegionConfigs()
    await regionStore.fetchRegionConfig();
    await initializationService.initialize();

  } catch (error) {
    console.error('保存地区配置失败:', error)
    ElMessage.error(error?.message || '保存地区配置失败，请稍后重试')
  } finally {
    saving.value = false
  }
}

const setAsDefault = async (row) => {
  try {
    await ElMessageBox.confirm(`确认将「${row.name}」设置为默认地区配置吗？`, '设置默认', {
      confirmButtonText: '确认',
      cancelButtonText: '取消',
      type: 'warning'
    })
  } catch {
    return
  }

  try {
    const regionId = row.regionId || row.id
    await setRegionDefault(regionId)
    ElMessage.success('默认地区配置已设置')
    await loadRegionConfigs()
    await regionStore.fetchRegionConfig();
    await initializationService.initialize();
  } catch (error) {
    console.error('设置默认地区配置失败:', error)
    ElMessage.error('设置默认地区配置失败，请稍后重试')
  }
}

const handleDelete = async (row) => {
  try {
    await ElMessageBox.confirm(`确认删除地区配置「${row.name}」吗？`, '删除确认', {
      confirmButtonText: '确认删除',
      cancelButtonText: '取消',
      type: 'warning'
    })
  } catch {
    return
  }

  try {
    await deleteRegionConfig(row.regionId || row.id)
    ElMessage.success('地区配置已删除')
    await loadRegionConfigs()
    await regionStore.fetchRegionConfig();
    await initializationService.initialize();
  } catch (error) {
    console.error('删除地区配置失败:', error)
    ElMessage.error('删除地区配置失败，请稍后重试')
  }
}

onMounted(async () => {
  await loadRegionConfigs()
})
</script>

<style scoped>
.admin-table-row-selected {
  background-color: #ffebe6 !important;
  border-left: 3px solid #1890ff !important;
}

.admin-pill--neutral {
  background-color: #f0f0f0;
  color: #666;
}

.admin-pill {
  display: inline-block;
  padding: 2px 12px;
  border-radius: 12px;
  font-size: 12px;
  font-weight: 500;
}

.admin-pill--good {
  background-color: #f6ffed;
  color: #52c41a;
  border: 1px solid #b7eb8f;
}

.admin-row-actions {
  display: flex;
  gap: 8px;
}

.admin-boundary-url {
  word-break: break-all;
  font-size: 12px;
  color: #666;
}

.admin-form-hint {
  margin-top: 4px;
  font-size: 12px;
  color: #888;
}

.admin-area-cascader {
  width: 100%;
}

.admin-adcode-preview {
  margin: -4px 0 12px;
}

.admin-adcode-preview strong {
  color: #1890ff;
  font-variant-numeric: tabular-nums;
}
</style>
