<template>
  <div class="admin-page">

    <section class="admin-panel">
      <div class="admin-panel__header">
        <div class="admin-panel__header-left">
         
        </div>
        <div class="admin-panel__header-right">
          <div class="admin-toolbar">
            <el-button class="admin-secondary-button" :loading="loading" @click="loadDevices">
              <el-icon><Refresh /></el-icon>
              刷新列表
            </el-button>
            <el-button class="admin-secondary-button" @click="toggleOnlineOnly">
              <el-icon><Connection /></el-icon>
              {{ showOnlineOnly ? '查看全部设备' : '仅看在线设备' }}
            </el-button>
            <el-button class="admin-primary-button" @click="openCreate">
              <el-icon><Plus /></el-icon>
              新增设备
            </el-button>
       
            <el-select
              v-model="selectedType"
              clearable
              placeholder="按设备类型筛选"
              @change="loadDevices"
              @clear="loadDevices"
              style="width: 180px; margin-right: 10px"
            >
              <el-option v-for="item in deviceTypeOptions" :key="item" :label="item" :value="item" />
            </el-select>
            <el-input
              v-model="searchKeyword"
              clearable
              placeholder="搜索名称、编码、ID、位置或监测点"
              @clear="clearFilters"
              @keyup.enter="handleSearch"
              style="width: 300px; margin-right: 10px"
            >
              <template #prefix>
                <el-icon><Search /></el-icon>
              </template>
            </el-input>
            <el-button class="admin-secondary-button" @click="handleSearch">查询</el-button>
            <el-button
              v-if="searchKeyword || selectedType || showOnlineOnly"
              class="admin-ghost-button"
              @click="clearFilters"
              style="margin-left: 10px"
            >
              清空筛选
            </el-button>
          </div>
        </div>
      </div>

      <div class="admin-table-shell">
        <el-table :data="visibleDevices" v-loading="loading" class="admin-table" max-height="700">
          <el-table-column label="设备名称" min-width="120">
            <template #default="{ row }">
              <div>{{ row.name }}</div>
            </template>
          </el-table-column>

          <el-table-column label="设备编码" min-width="100">
            <template #default="{ row }">
              <div>{{ row.code || '未配置编码' }}</div>
            </template>
          </el-table-column>


          <el-table-column label="设备类型" min-width="100">
            <template #default="{ row }">
              <div>{{ row.type }}</div>
            </template>
          </el-table-column>

          <el-table-column label="关联监测点" min-width="100">
            <template #default="{ row }">
              <div>{{ row.pointId || '未绑定' }}</div>
            </template>
          </el-table-column>

          <el-table-column label="位置" min-width="120">
            <template #default="{ row }">
              <div>{{ row.location || '未填写位置' }}</div>
            </template>
          </el-table-column>

          <el-table-column label="经度" min-width="100">
            <template #default="{ row }">
              <div>{{ row.longitude }}</div>
            </template>
          </el-table-column>

          <el-table-column label="纬度" min-width="100">
            <template #default="{ row }">
              <div>{{ row.latitude }}</div>
            </template>
          </el-table-column>

          <el-table-column label="海拔" min-width="100">
            <template #default="{ row }">
              <div>{{ row.altitude }} m</div>
            </template>
          </el-table-column>

          <el-table-column label="在线情况" min-width="100">
            <template #default="{ row }">
              <div>{{ row.onlineCount }}/{{ row.totalCount }}</div>
            </template>
          </el-table-column>

          <el-table-column label="运行状态" min-width="100">
            <template #default="{ row }">
              <span :class="['admin-pill', getStatusClass(row.status)]">
                {{ getStatusText(row.status) }}
              </span>
            </template>
          </el-table-column>

          <el-table-column label="最后心跳" min-width="120">
            <template #default="{ row }">
              <div>{{ formatHeartbeat(row.lastHeartbeat) }}</div>
            </template>
          </el-table-column>

          <el-table-column label="激活状态" min-width="100">
            <template #default="{ row }">
              <div>{{ row.isActive ? '已激活' : '未激活' }}</div>
            </template>
          </el-table-column>

          <el-table-column label="操作" min-width="180">
            <template #default="{ row }">
              <div class="admin-row-actions">
                <el-button class="admin-ghost-button" @click="openEdit(row)">
                  <el-icon><EditPen /></el-icon>
                  编辑
                </el-button>
                <el-button class="admin-ghost-button" @click="handleDelete(row)">
                  <el-icon><Delete /></el-icon>
                  删除
                </el-button>
              </div>
            </template>
          </el-table-column>
        </el-table>

        <div v-if="!visibleDevices.length && !loading" class="admin-empty">
          当前没有匹配的设备记录，试试切换筛选条件或新增一台设备。
        </div>
      </div>
    </section>

    <el-drawer
      v-model="drawerVisible"
      :with-header="false"
      size="780px"
      class="admin-editor-drawer"
      destroy-on-close
    >
      <div class="admin-drawer__header">
        <p class="admin-page__eyebrow">{{ isEditing ? 'Edit Device' : 'Create Device' }}</p>
        <h3>{{ isEditing ? '编辑设备' : '新增设备' }}</h3>
        <p>维护设备基础档案、点位绑定关系和运行状态，确保后台感知资源始终有序可管。</p>
      </div>

      <el-form ref="formRef" :model="formModel" :rules="formRules" label-position="top">
        <section class="admin-form-section">
          <h4 class="admin-section-title">基础信息</h4>
          <div class="admin-form-grid">
            <el-form-item label="设备名称" prop="name">
              <el-input v-model="formModel.name" placeholder="如：青岛流亭机场风廓线雷达" />
            </el-form-item>

            <el-form-item label="设备编码" prop="code">
              <el-input v-model="formModel.code" placeholder="如：DEV-QD-001" />
            </el-form-item>

            <el-form-item label="设备类型" prop="type">
              <el-select v-model="formModel.type" placeholder="选择设备类型">
                <el-option v-for="item in deviceTypeOptions" :key="item" :label="item" :value="item" />
              </el-select>
            </el-form-item>

            <el-form-item label="关联监测点 ID">
              <el-input v-model="formModel.pointId" placeholder="如：MP-QD-Airport" />
            </el-form-item>

            <el-form-item label="设备位置">
              <el-input v-model="formModel.location" placeholder="如：航站楼东侧观测区" />
            </el-form-item>
          </div>
        </section>

        <section class="admin-form-section">
          <h4 class="admin-section-title">坐标与海拔</h4>
          <div class="admin-form-grid">
            <el-form-item label="经度" prop="longitude">
              <el-input-number
                v-model="formModel.longitude"
                :min="-180"
                :max="180"
                :step="0.0001"
                controls-position="right"
              />
            </el-form-item>

            <el-form-item label="纬度" prop="latitude">
              <el-input-number
                v-model="formModel.latitude"
                :min="-90"
                :max="90"
                :step="0.0001"
                controls-position="right"
              />
            </el-form-item>

            <el-form-item label="高度 (m)">
              <el-input-number v-model="formModel.altitude" :min="0" :step="1" controls-position="right" />
            </el-form-item>
          </div>
        </section>

        <section class="admin-form-section">
          <h4 class="admin-section-title">运行状态</h4>
          <div class="admin-form-grid">
            <el-form-item label="设备状态" prop="status">
              <el-select v-model="formModel.status" placeholder="选择状态">
                <el-option v-for="item in statusOptions" :key="item.value" :label="item.label" :value="item.value" />
              </el-select>
            </el-form-item>

            <el-form-item label="在线数量">
              <el-input-number v-model="formModel.onlineCount" :min="0" :step="1" controls-position="right" />
            </el-form-item>

            <el-form-item label="总数量">
              <el-input-number v-model="formModel.totalCount" :min="1" :step="1" controls-position="right" />
            </el-form-item>

            <el-form-item label="最后心跳">
              <el-date-picker
                v-model="formModel.lastHeartbeat"
                type="datetime"
                placeholder="选择最后心跳时间"
                value-format="x"
                format="YYYY-MM-DD HH:mm:ss"
              />
            </el-form-item>

            <el-form-item label="激活状态">
              <el-switch
                v-model="formModel.isActive"
                inline-prompt
                active-text="激活"
                inactive-text="停用"
              />
              <div class="admin-form-hint">停用后设备不会被视作默认可用资源。</div>
            </el-form-item>
          </div>
        </section>
      </el-form>

      <div class="admin-drawer__footer">
        <el-button class="admin-secondary-button" @click="handleReset">重置</el-button>
        <el-button class="admin-primary-button" :loading="saving" @click="handleSave">
          {{ saving ? '保存中...' : '保存设备' }}
        </el-button>
      </div>
    </el-drawer>
  </div>
</template>

<script setup>
import { computed, nextTick, onMounted, reactive, ref } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import {
  createDevice,
  deleteDevice,
  getDeviceById,
  getDeviceList,
  getDevicesByType,
  getOnlineDevices,
  updateDevice
} from '@/api'
import {
  extractList,
  extractRecord,
  normalizeBoolean,
  normalizeNumber
} from '@/utils/admin'

const loading = ref(false)
const saving = ref(false)
const drawerVisible = ref(false)
const isEditing = ref(false)
const searchKeyword = ref('')
const selectedType = ref('')
const showOnlineOnly = ref(false)
const formRef = ref(null)
const devices = ref([])
const formSnapshot = ref(null)

// 设备类型中英文映射关系
const deviceTypeMap = {
  'weatherStation': '自动气象站',
  'windLidarSmall': '激光测风雷达',
  'windLidar3D': '三维激光测风雷达',
  'weatherRadar': '小型天气雷达'
}

const baseTypeOptions = ['气象站', '雷达', '摄像头', '风廓线雷达', '微波辐射计', '自动站', '其他']
const statusOptions = [
  { label: '在线', value: 'online' },
  { label: '离线', value: 'offline' },
  { label: '维护中', value: 'maintenance' }
]

const createDeviceForm = () => ({
  id: null,
  name: '',
  code: '',
  type: '',
  pointId: '',
  location: '',
  longitude: 120.3895,
  latitude: 36.2747,
  altitude: 15,
  status: 'online',
  onlineCount: 1,
  totalCount: 1,
  lastHeartbeat: String(Date.now()),
  isActive: true
})

const formModel = reactive(createDeviceForm())

const formRules = {
  name: [{ required: true, message: '请输入设备名称', trigger: 'blur' }],
  code: [{ required: true, message: '请输入设备编码', trigger: 'blur' }],
  type: [{ required: true, message: '请选择设备类型', trigger: 'change' }],
  longitude: [{ required: true, message: '请输入经度', trigger: 'blur' }],
  latitude: [{ required: true, message: '请输入纬度', trigger: 'blur' }],
  status: [{ required: true, message: '请选择设备状态', trigger: 'change' }]
}

const normalizeStatus = (value, fallback = 'online') => {
  const normalized = String(value || '').trim().toLowerCase()

  if (['online', 'active', 'running', 'enabled', '启用', '在线'].includes(normalized)) {
    return 'online'
  }

  if (['maintenance', 'repair', 'maintain', '维护', '维护中'].includes(normalized)) {
    return 'maintenance'
  }

  if (['offline', 'inactive', 'disabled', '停用', '离线'].includes(normalized)) {
    return 'offline'
  }

  return fallback
}

const normalizeTimestamp = (value, fallback = Date.now()) => {
  if (value == null || value === '') {
    return fallback
  }

  if (typeof value === 'number') {
    return Number.isFinite(value) ? value : fallback
  }

  if (typeof value === 'string') {
    if (/^\d+$/.test(value)) {
      return Number(value)
    }

    const dateValue = new Date(value).getTime()
    return Number.isFinite(dateValue) ? dateValue : fallback
  }

  const dateValue = new Date(value).getTime()
  return Number.isFinite(dateValue) ? dateValue : fallback
}

const normalizeDevice = (item, index = 0) => {
  const status = normalizeStatus(
    item?.status,
    normalizeBoolean(item?.isActive ?? item?.active, true) ? 'online' : 'offline'
  )

  const onlineCount = normalizeNumber(item?.onlineCount, status === 'online' ? 1 : 0)
  const totalCount = Math.max(normalizeNumber(item?.totalCount, 1), onlineCount, 1)

  const deviceType = item?.type ?? item?.deviceType ?? '其他'
  const mappedType = deviceTypeMap[deviceType] || deviceType

  return {
    id: item?.id ?? item?.deviceId ?? `DEV-${String(index + 1).padStart(3, '0')}`,
    name: item?.name ?? item?.deviceName ?? `设备-${index + 1}`,
    code: item?.code ?? item?.deviceCode ?? '',
    type: mappedType,
    pointId: item?.pointId ?? item?.monitoringPointId ?? '',
    location: item?.location ?? item?.address ?? '',
    longitude: normalizeNumber(item?.longitude ?? item?.lng, 120),
    latitude: normalizeNumber(item?.latitude ?? item?.lat, 36),
    altitude: normalizeNumber(item?.altitude ?? item?.height, 0),
    status,
    onlineCount,
    totalCount,
    lastHeartbeat: normalizeTimestamp(item?.lastHeartbeat),
    isActive: normalizeBoolean(item?.isActive ?? item?.active, status !== 'offline')
  }
}

// 反转设备类型映射，用于将中文类型映射回英文
const reverseDeviceTypeMap = Object.fromEntries(
  Object.entries(deviceTypeMap).map(([key, value]) => [value, key])
)

const serializeDevice = (item) => {
  // 尝试将中文设备类型映射回英文
  const deviceType = item.type?.trim()
  const mappedType = reverseDeviceTypeMap[deviceType] || deviceType

  const payload = {
    ...item,
    name: item.name?.trim(),
    code: item.code?.trim(),
    type: mappedType,
    pointId: item.pointId?.trim() || '',
    location: item.location?.trim() || '',
    longitude: normalizeNumber(item.longitude, 120),
    latitude: normalizeNumber(item.latitude, 36),
    altitude: normalizeNumber(item.altitude, 0),
    status: normalizeStatus(item.status, item.isActive ? 'online' : 'offline'),
    onlineCount: normalizeNumber(item.onlineCount, 0),
    totalCount: Math.max(normalizeNumber(item.totalCount, 1), normalizeNumber(item.onlineCount, 0), 1),
    lastHeartbeat: normalizeTimestamp(item.lastHeartbeat),
    isActive: Boolean(item.isActive)
  }

  if (!payload.id) {
    delete payload.id
  }

  return payload
}

const deviceTypeOptions = computed(() =>
  [...new Set([...baseTypeOptions, ...devices.value.map((item) => item.type), selectedType.value].filter(Boolean))]
)

const visibleDevices = computed(() => {
  const keyword = searchKeyword.value.trim().toLowerCase()

  return devices.value.filter((item) => {
    const matchesKeyword =
      !keyword ||
      [item.id, item.name, item.code, item.type, item.pointId, item.location, item.status]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(keyword))

    const matchesType = !selectedType.value || item.type === selectedType.value
    const matchesOnline = !showOnlineOnly.value || item.status === 'online'

    return matchesKeyword && matchesType && matchesOnline
  })
})

const stats = computed(() => ({
  total: devices.value.length,
  activeCount: devices.value.filter((item) => item.isActive).length,
  onlineCount: devices.value.filter((item) => item.status === 'online').length,
  coveredPoints: new Set(devices.value.map((item) => item.pointId).filter(Boolean)).size
}))

const featuredDevice = computed(() =>
  [...devices.value]
    .filter((item) => item.status === 'online')
    .sort((a, b) => b.lastHeartbeat - a.lastHeartbeat)[0] || devices.value[0] || null
)

const formatHeartbeat = (value) => {
  const timestamp = normalizeTimestamp(value, 0)
  if (!timestamp) {
    return '暂无心跳'
  }

  return new Intl.DateTimeFormat('zh-CN', {
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false
  }).format(new Date(timestamp))
}

const getStatusText = (status) => {
  const normalized = normalizeStatus(status)

  if (normalized === 'online') {
    return '在线'
  }

  if (normalized === 'maintenance') {
    return '维护中'
  }

  return '离线'
}

const getStatusClass = (status) => {
  const normalized = normalizeStatus(status)

  if (normalized === 'online') {
    return 'admin-pill--good'
  }

  if (normalized === 'maintenance') {
    return 'admin-pill--warn'
  }

  return 'admin-pill--danger'
}

const fetchDeviceCollection = async () => {
  if (showOnlineOnly.value) {
    return getOnlineDevices()
  }

  if (selectedType.value) {
    return getDevicesByType(selectedType.value)
  }

  return getDeviceList()
}

const loadDevices = async () => {
  loading.value = true

  try {
    const payload = await fetchDeviceCollection()
    let remoteList = extractList(payload).map((item, index) => normalizeDevice(item, index))

    if (showOnlineOnly.value && selectedType.value) {
      remoteList = remoteList.filter((item) => item.type === selectedType.value)
    }

    devices.value = remoteList
  } catch (error) {
    devices.value = []
    ElMessage.error(error.message || '加载设备列表失败，请稍后重试')
    console.error('加载设备列表失败:', error)
  } finally {
    loading.value = false
  }
}

const applyFormModel = (payload) => {
  Object.assign(formModel, createDeviceForm(), payload)
}

const openCreate = async () => {
  isEditing.value = false
  formSnapshot.value = createDeviceForm()
  applyFormModel(formSnapshot.value)
  drawerVisible.value = true
  await nextTick()
  formRef.value?.clearValidate()
}

const openEdit = async (row) => {
  isEditing.value = true

  let detail = row
  if (row?.id) {
    try {
      const payload = await getDeviceById(row.id)
      detail = normalizeDevice(extractRecord(payload) || row)
    } catch (error) {
      console.warn('获取设备详情失败，使用列表数据继续编辑。', error)
    }
  }

  formSnapshot.value = { ...detail }
  applyFormModel(detail)
  drawerVisible.value = true
  await nextTick()
  formRef.value?.clearValidate()
}

const handleReset = () => {
  applyFormModel(formSnapshot.value || createDeviceForm())
}

const handleSave = async () => {
  await formRef.value?.validate()
  saving.value = true

  const payload = serializeDevice(formModel)

  try {
    if (isEditing.value) {
      await updateDevice(payload.id, payload)
    } else {
      await createDevice(payload)
    }

    ElMessage.success(isEditing.value ? '设备已更新' : '设备已新增')
    drawerVisible.value = false
    await loadDevices()
  } catch (error) {
    console.error('保存设备失败:', error)
    ElMessage.error(error.message || '保存设备失败，请稍后重试')
  } finally {
    saving.value = false
  }
}

const handleDelete = async (row) => {
  try {
    await ElMessageBox.confirm(`确认删除设备「${row.name}」吗？`, '删除确认', {
      confirmButtonText: '确认删除',
      cancelButtonText: '取消',
      type: 'warning'
    })
  } catch {
    return
  }

  try {
    await deleteDevice(row.id)
    ElMessage.success('设备已删除')
    await loadDevices()
  } catch (error) {
    console.error('删除设备失败:', error)
    ElMessage.error(error.message || '删除设备失败，请稍后重试')
  }
}

const toggleOnlineOnly = async () => {
  showOnlineOnly.value = !showOnlineOnly.value
  await loadDevices()
}

const handleSearch = () => {}

const clearFilters = async () => {
  searchKeyword.value = ''
  selectedType.value = ''
  showOnlineOnly.value = false
  await loadDevices()
}

onMounted(() => {
  loadDevices()
})
</script>

<style scoped>
.admin-panel__header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 20px;
}

.admin-panel__header-left {
  flex: 1;
}

.admin-panel__header-right {
  flex: 2;
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.admin-toolbar {
  display: flex;
  gap: 10px;
  justify-content: flex-end;
}

.admin-filter-bar {
  display: flex;
  align-items: center;
  gap: 10px;
  justify-content: flex-end;
}

@media (max-width: 768px) {
  .admin-panel__header {
    flex-direction: column;
    align-items: stretch;
  }
  
  .admin-panel__header-right {
    margin-top: 10px;
  }
  
  .admin-toolbar,
  .admin-filter-bar {
    flex-wrap: wrap;
  }
}
</style>
