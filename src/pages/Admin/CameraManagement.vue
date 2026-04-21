<template>
  <div class="admin-page">
  

    <section class="admin-panel">
      <div class="admin-panel__header">
        <div>
         
        </div>

        <div class="admin-toolbar admin-toolbar--camera">
          <el-button class="admin-secondary-button" :loading="loading" @click="loadCameras">
            <el-icon><Refresh /></el-icon>
            刷新列表
          </el-button>

          <el-button class="admin-primary-button" @click="openCreate">
            <el-icon><Plus /></el-icon>
            新增摄像头
          </el-button>

          <el-select
            v-model="selectedStatus"
            clearable
            placeholder="状态筛选"
            @change="loadCameras"
          >
            <el-option
              v-for="item in statusOptions"
              :key="item.value"
              :label="item.label"
              :value="item.value"
            />
          </el-select>

          <el-select
            v-model="selectedPointFilter"
            clearable
            filterable
            placeholder="监测点筛选"
            :loading="pointLoading"
            @change="loadCameras"
          >
            <el-option
              v-for="item in monitoringPoints"
              :key="item.id"
              :label="buildPointLabel(item)"
              :value="item.id"
            />
          </el-select>

          <el-input
            v-model="searchKeyword"
            clearable
            placeholder="搜索名称、ID、位置、监测点"
            @keyup.enter="handleSearch"
            @clear="clearFilters"
          >
            <template #prefix>
              <el-icon><Search /></el-icon>
            </template>
          </el-input>

          <el-button class="admin-secondary-button" @click="handleSearch">查询</el-button>

          <el-button
            v-if="searchKeyword || selectedStatus || selectedPointFilter"
            class="admin-ghost-button"
            @click="clearFilters"
          >
            清空筛选
          </el-button>
        </div>
      </div>

      <div class="admin-table-shell">
        <el-table :data="visibleCameras" v-loading="loading" class="admin-table" max-height="700">
          <el-table-column label="摄像头信息" min-width="220">
            <template #default="{ row }">
              <div class="admin-stack">
                <span class="admin-stack__title">{{ row.name || '--' }}</span>
                <span class="admin-stack__meta">ID: {{ row.id || '--' }}</span>
              </div>
            </template>
          </el-table-column>

          <el-table-column label="关联监测点" min-width="240">
            <template #default="{ row }">
              <div class="admin-stack">
                <span class="admin-stack__title">{{ getPointDisplayName(row.pointId) }}</span>
                <span class="admin-stack__meta">
                  {{ row.pointId ? `点位ID: ${row.pointId}` : '未关联监测点' }}
                </span>
              </div>
            </template>
          </el-table-column>

          <el-table-column label="部署位置" min-width="200">
            <template #default="{ row }">
              <div class="admin-stack">
                <span class="admin-stack__title">{{ row.location || '未配置位置' }}</span>
                <span class="admin-stack__meta">{{ buildCoordinateText(row) }}</span>
              </div>
            </template>
          </el-table-column>

          <el-table-column label="状态" width="100">
            <template #default="{ row }">
              <span :class="['admin-pill', getStatusClass(row.status)]">
                {{ getStatusText(row.status) }}
              </span>
            </template>
          </el-table-column>

          <el-table-column label="启用状态" width="150">
            <template #default="{ row }">
              <span :class="['admin-pill', getActiveClass(row.isActive)]">
                {{ getActiveText(row.isActive) }}
              </span>
            </template>
          </el-table-column>

          <el-table-column label="分辨率" width="180">
            <template #default="{ row }">
              <span :class="['admin-pill', 'admin-pill--accent']">{{ row.resolution || '--' }}</span>
            </template>
          </el-table-column>

          <el-table-column label="更新时间" min-width="160">
            <template #default="{ row }">
              <div>{{ formatDateTime(row.updatedAt) }}</div>
            </template>
          </el-table-column>

          <el-table-column label="操作" min-width="280" fixed="right">
            <template #default="{ row }">
              <div class="admin-row-actions">
                <el-button class="admin-ghost-button" @click="openEdit(row)">
                  <el-icon><EditPen /></el-icon>
                  编辑
                </el-button>
                <el-button
                  class="admin-ghost-button"
                  :loading="toggleLoadingId === row.id"
                  @click="handleToggleActive(row)"
                >
                  <el-icon><SwitchButton /></el-icon>
                  {{ row.isActive ? '禁用' : '启用' }}
                </el-button>
                <el-button class="admin-ghost-button" @click="handleDelete(row)">
                  <el-icon><Delete /></el-icon>
                  删除
                </el-button>
              </div>
            </template>
          </el-table-column>
        </el-table>

        <div v-if="!visibleCameras.length && !loading" class="admin-empty">
          当前没有匹配的摄像头记录，试试调整筛选条件或新增摄像头。
        </div>
      </div>
    </section>

    <el-drawer
      v-model="drawerVisible"
      :with-header="false"
      size="760px"
      class="admin-editor-drawer"
      destroy-on-close
    >
      <div class="admin-drawer__header">
        <p class="admin-page__eyebrow">{{ isEditing ? 'Edit Camera' : 'Create Camera' }}</p>
        <h3>{{ isEditing ? '编辑摄像头' : '新增摄像头' }}</h3>
        <p>监测点字段改为从真实监测点列表下拉选择，保存后直接写入真实接口。</p>
      </div>

      <el-form ref="formRef" :model="formModel" :rules="formRules" label-position="top">
        <section class="admin-form-section">
          <h4 class="admin-section-title">基础信息</h4>
          <div class="admin-form-grid">
            <el-form-item label="摄像头 ID" prop="id">
              <el-input v-model="formModel.id" :disabled="isEditing" placeholder="例如：CAM-001" />
            </el-form-item>

            <el-form-item label="摄像头名称" prop="name">
              <el-input v-model="formModel.name" placeholder="例如：前门摄像头" />
            </el-form-item>

            <el-form-item label="关联监测点" prop="pointId">
              <el-select
                v-model="formModel.pointId"
                filterable
                placeholder="请选择已有监测点"
                :loading="pointLoading"
              >
                <el-option
                  v-for="item in monitoringPoints"
                  :key="item.id"
                  :label="buildPointLabel(item)"
                  :value="item.id"
                />
              </el-select>
            </el-form-item>

            <el-form-item label="部署位置">
              <el-input v-model="formModel.location" placeholder="例如：办公楼前门" />
            </el-form-item>
          </div>
        </section>

        <section class="admin-form-section">
          <h4 class="admin-section-title">坐标与状态</h4>
          <div class="admin-form-grid">
            <el-form-item label="经度">
              <el-input-number
                v-model="formModel.longitude"
                :min="-180"
                :max="180"
                :step="0.000001"
                :precision="6"
                controls-position="right"
              />
            </el-form-item>

            <el-form-item label="纬度">
              <el-input-number
                v-model="formModel.latitude"
                :min="-90"
                :max="90"
                :step="0.000001"
                :precision="6"
                controls-position="right"
              />
            </el-form-item>

            <el-form-item label="在线状态" prop="status">
              <el-select v-model="formModel.status" placeholder="请选择状态">
                <el-option
                  v-for="item in statusOptions"
                  :key="item.value"
                  :label="item.label"
                  :value="item.value"
                />
              </el-select>
            </el-form-item>

            <el-form-item label="是否启用">
              <el-switch
                v-model="formModel.isActive"
                inline-prompt
                active-text="启用"
                inactive-text="禁用"
              />
            </el-form-item>
          </div>
        </section>

        <section class="admin-form-section">
          <h4 class="admin-section-title">视频参数</h4>
          <div class="admin-form-grid">
            <el-form-item label="分辨率">
              <el-input v-model="formModel.resolution" placeholder="例如：1920x1080" />
            </el-form-item>

            <el-form-item label="最后心跳时间戳">
              <el-input-number
                v-model="formModel.lastHeartbeat"
                :min="0"
                :step="1000"
                controls-position="right"
              />
            </el-form-item>

            <el-form-item label="预览图地址" class="camera-form-item--wide">
              <el-input v-model="formModel.previewUrl" placeholder="http://camera-server/preview/1" />
            </el-form-item>

            <el-form-item label="直播流地址" class="camera-form-item--wide">
              <el-input v-model="formModel.streamUrl" placeholder="rtsp://camera-server/stream/1" />
            </el-form-item>
          </div>
        </section>
      </el-form>

      <div class="admin-drawer__footer">
        <el-button class="admin-secondary-button" @click="handleReset">重置</el-button>
        <el-button class="admin-primary-button" :loading="saving" @click="handleSave">
          {{ saving ? '保存中...' : '保存摄像头' }}
        </el-button>
      </div>
    </el-drawer>
  </div>
</template>

<script setup>
import { computed, nextTick, onMounted, reactive, ref } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Delete, EditPen, Plus, Refresh, Search, SwitchButton } from '@element-plus/icons-vue'
import {
  createCamera,
  deleteCamera,
  fetchAreaList,
  getCameraById,
  getCameras,
  updateCamera,
  updateCameraActive
} from '@/api'
import { extractList, extractRecord, normalizeBoolean } from '@/utils/admin'

const loading = ref(false)
const pointLoading = ref(false)
const saving = ref(false)
const drawerVisible = ref(false)
const isEditing = ref(false)
const searchKeyword = ref('')
const selectedStatus = ref('')
const selectedPointFilter = ref('')
const cameras = ref([])
const monitoringPoints = ref([])
const formRef = ref(null)
const formSnapshot = ref(null)
const toggleLoadingId = ref('')

const statusOptions = [
  { label: '在线', value: 'online' },
  { label: '离线', value: 'offline' }
]

const createCameraForm = () => ({
  id: '',
  name: '',
  location: '',
  pointId: '',
  longitude: null,
  latitude: null,
  status: 'online',
  resolution: '1920x1080',
  previewUrl: '',
  streamUrl: '',
  lastHeartbeat: null,
  isActive: true
})

const formModel = reactive(createCameraForm())

const asText = (value) => (value == null ? '' : String(value).trim())
const toNullableString = (value) => {
  const text = asText(value)
  return text || null
}

const toNullableNumber = (value) => {
  if (value == null || value === '') return null
  const numeric = Number(value)
  return Number.isFinite(numeric) ? numeric : null
}

const normalizeCameraStatus = (value) =>
  asText(value).toLowerCase() === 'offline' ? 'offline' : 'online'

const normalizePoint = (item) => ({
  id: asText(item?.id || item?.pointId),
  name: asText(item?.name) || asText(item?.id || item?.pointId),
  code: asText(item?.code),
  location: asText(item?.location)
})

const normalizeCamera = (item) => ({
  id: asText(item?.id),
  name: asText(item?.name),
  location: asText(item?.location),
  pointId: asText(item?.pointId),
  longitude: toNullableNumber(item?.longitude),
  latitude: toNullableNumber(item?.latitude),
  status: normalizeCameraStatus(item?.status),
  resolution: asText(item?.resolution) || '1920x1080',
  previewUrl: asText(item?.previewUrl),
  streamUrl: asText(item?.streamUrl),
  lastHeartbeat: toNullableNumber(item?.lastHeartbeat),
  isActive:
    item?.isActive == null || item?.isActive === ''
      ? null
      : normalizeBoolean(item?.isActive, false),
  updatedAt: item?.updatedAt || null
})

const serializeCameraPayload = (item) => ({
  id: asText(item.id),
  name: asText(item.name),
  location: toNullableString(item.location),
  pointId: toNullableString(item.pointId),
  longitude: toNullableNumber(item.longitude),
  latitude: toNullableNumber(item.latitude),
  status: normalizeCameraStatus(item.status),
  resolution: toNullableString(item.resolution),
  previewUrl: toNullableString(item.previewUrl),
  streamUrl: toNullableString(item.streamUrl),
  lastHeartbeat: toNullableNumber(item.lastHeartbeat),
  isActive: Boolean(item.isActive)
})

const pointMap = computed(() => {
  const map = new Map()
  monitoringPoints.value.forEach((item) => {
    if (item.id) map.set(item.id, item)
  })
  return map
})

const visibleCameras = computed(() => {
  const keyword = asText(searchKeyword.value).toLowerCase()
  return cameras.value.filter((item) => {
    if (!keyword) return true
    const point = pointMap.value.get(item.pointId)
    return [item.id, item.name, item.location, item.pointId, point?.name, point?.location]
      .filter(Boolean)
      .some((value) => String(value).toLowerCase().includes(keyword))
  })
})

const stats = computed(() => ({
  total: visibleCameras.value.length,
  onlineCount: visibleCameras.value.filter((item) => item.status === 'online').length,
  activeCount: visibleCameras.value.filter((item) => item.isActive === true).length,
  pointCount: new Set(visibleCameras.value.map((item) => item.pointId).filter(Boolean)).size
}))

const formRules = {
  id: [{ required: true, message: '请输入摄像头 ID', trigger: 'blur' }],
  name: [{ required: true, message: '请输入摄像头名称', trigger: 'blur' }],
  pointId: [{ required: true, message: '请选择关联监测点', trigger: 'change' }],
  status: [{ required: true, message: '请选择在线状态', trigger: 'change' }]
}

const buildPointLabel = (point) => {
  const parts = [point.name]
  if (point.code) parts.push(`(${point.code})`)
  if (point.location) parts.push(`- ${point.location}`)
  return parts.join(' ')
}

const getPointDisplayName = (pointId) => {
  const id = asText(pointId)
  if (!id) return '未关联监测点'
  return pointMap.value.get(id)?.name || id
}

const buildCoordinateText = (row) => {
  if (row.longitude == null || row.latitude == null) return '未配置坐标'
  return `${Number(row.longitude).toFixed(6)}, ${Number(row.latitude).toFixed(6)}`
}

const getStatusText = (status) => (normalizeCameraStatus(status) === 'online' ? '在线' : '离线')
const getStatusClass = (status) =>
  normalizeCameraStatus(status) === 'online' ? 'admin-pill--good' : 'admin-pill--danger'
const getActiveText = (isActive) => (isActive ? '已启用' : '已禁用')
const getActiveClass = (isActive) => (isActive ? 'admin-pill--good' : 'admin-pill--warn')

const formatDateTime = (value) => {
  if (!value) return '--'
  const date = new Date(value)
  if (!Number.isFinite(date.getTime())) return '--'
  return new Intl.DateTimeFormat('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false
  }).format(date)
}

const buildQuery = () => {
  const query = {}
  if (selectedStatus.value) query.status = selectedStatus.value
  if (selectedPointFilter.value) query.pointId = selectedPointFilter.value
  return query
}

const loadMonitoringPoints = async () => {
  pointLoading.value = true
  try {
    const payload = await fetchAreaList()
    monitoringPoints.value = extractList(payload).map(normalizePoint).filter((item) => item.id)
  } catch (error) {
    monitoringPoints.value = []
    ElMessage.error(error.message || '加载监测点列表失败')
    console.error('加载监测点列表失败:', error)
  } finally {
    pointLoading.value = false
  }
}

const loadCameras = async () => {
  loading.value = true
  try {
    const payload = await getCameras(buildQuery())
    cameras.value = extractList(payload).map(normalizeCamera)
  } catch (error) {
    cameras.value = []
    ElMessage.error(error.message || '加载摄像头列表失败')
    console.error('加载摄像头列表失败:', error)
  } finally {
    loading.value = false
  }
}

const applyFormModel = (payload) => {
  Object.assign(formModel, createCameraForm(), payload)
}

const openCreate = async () => {
  if (!monitoringPoints.value.length) {
    await loadMonitoringPoints()
  }
  isEditing.value = false
  formSnapshot.value = createCameraForm()
  applyFormModel(formSnapshot.value)
  drawerVisible.value = true
  await nextTick()
  formRef.value?.clearValidate()
}

const openEdit = async (row) => {
  if (!monitoringPoints.value.length) {
    await loadMonitoringPoints()
  }
  isEditing.value = true
  try {
    const payload = await getCameraById(row.id)
    const detail = normalizeCamera(extractRecord(payload) || row)
    formSnapshot.value = { ...detail }
    applyFormModel(detail)
    drawerVisible.value = true
    await nextTick()
    formRef.value?.clearValidate()
  } catch (error) {
    ElMessage.error(error.message || '获取摄像头详情失败')
    console.error('获取摄像头详情失败:', error)
  }
}

const handleReset = () => {
  applyFormModel(formSnapshot.value || createCameraForm())
}

const handleSave = async () => {
  await formRef.value?.validate()
  saving.value = true
  try {
    const payload = serializeCameraPayload(formModel)
    if (isEditing.value) {
      await updateCamera(formModel.id, payload)
    } else {
      await createCamera(payload)
    }
    ElMessage.success(isEditing.value ? '摄像头已更新' : '摄像头已新增')
    drawerVisible.value = false
    await loadCameras()
  } catch (error) {
    ElMessage.error(error.message || '保存摄像头失败')
    console.error('保存摄像头失败:', error)
  } finally {
    saving.value = false
  }
}

const handleDelete = async (row) => {
  try {
    await ElMessageBox.confirm(`确认删除摄像头“${row.name || row.id}”吗？`, '删除确认', {
      confirmButtonText: '确认删除',
      cancelButtonText: '取消',
      type: 'warning'
    })
  } catch {
    return
  }

  try {
    await deleteCamera(row.id)
    ElMessage.success('摄像头已删除')
    await loadCameras()
  } catch (error) {
    ElMessage.error(error.message || '删除摄像头失败')
    console.error('删除摄像头失败:', error)
  }
}

const handleToggleActive = async (row) => {
  const targetActive = !row.isActive
  toggleLoadingId.value = row.id
  try {
    await updateCameraActive(row.id, targetActive)
    ElMessage.success(targetActive ? '摄像头已启用' : '摄像头已禁用')
    await loadCameras()
  } catch (error) {
    ElMessage.error(error.message || '更新启用状态失败')
    console.error('更新启用状态失败:', error)
  } finally {
    toggleLoadingId.value = ''
  }
}

const handleSearch = () => {
  searchKeyword.value = asText(searchKeyword.value)
}

const clearFilters = async () => {
  searchKeyword.value = ''
  selectedStatus.value = ''
  selectedPointFilter.value = ''
  await loadCameras()
}

onMounted(async () => {
  await loadMonitoringPoints()
  await loadCameras()
})
</script>

<style scoped>
.admin-toolbar--camera .el-input {
  width: 280px;
}

.admin-toolbar--camera .el-select {
  width: 200px;
}

.camera-form-item--wide {
  grid-column: 1 / -1;
}

@media (max-width: 768px) {
  .admin-toolbar--camera .el-input,
  .admin-toolbar--camera .el-select {
    width: 100%;
  }

  .camera-form-item--wide {
    grid-column: auto;
  }
}
</style>
