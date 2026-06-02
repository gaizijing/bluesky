<template>
  <div class="admin-page">

    <section class="admin-panel">
      <div class="admin-panel__header">
        <div>
         
       
        </div>
        <div class="admin-toolbar">
          <el-select v-model="selectedRegionId" placeholder="选择区域" style="width: 180px" @change="handleRegionChange">
            <el-option
              v-for="item in regionOptions"
              :key="item.regionId"
              :label="item.name"
              :value="item.regionId"
            />
          </el-select>
          <el-button class="admin-secondary-button" :loading="loading" @click="loadLandingPoints">
            <el-icon><Refresh /></el-icon>
            刷新列表
          </el-button>
          <el-button class="admin-secondary-button" @click="toggleActiveOnly">
            <el-icon><Location /></el-icon>
            {{ showActiveOnly ? '查看全部点位' : '仅看活跃点位' }}
          </el-button>
          <el-button class="admin-primary-button" @click="openCreate">
            <el-icon><Plus /></el-icon>
            新增起降点
          </el-button>
          <el-input
            v-model="searchKeyword"
            clearable
            placeholder="搜索名称、ID、类型或描述"
            @clear="clearFilters"
            @keyup.enter="handleSearch"
          >
            <template #prefix>
              <el-icon><Search /></el-icon>
            </template>
          </el-input>
          <el-button class="admin-secondary-button" @click="handleSearch">查询</el-button>
          <el-button v-if="searchKeyword || showActiveOnly" class="admin-ghost-button" @click="clearFilters">
            清空筛选
          </el-button>
        </div>
      </div>

      <div class="admin-table-shell">
        <el-table 
          :data="visiblePoints" 
          v-loading="loading" 
          class="admin-table" 
          max-height="700"
          :row-class-name="rowClassName"
        >
          <el-table-column label="名称" min-width="120">
            <template #default="{ row }">
              <div>{{ row.name }}</div>
            </template>
          </el-table-column>

          <el-table-column label="编码" min-width="100">
            <template #default="{ row }">
              <div>{{ row.code || '未配置编码' }}</div>
            </template>
          </el-table-column>

          <el-table-column label="点位ID" min-width="100">
            <template #default="{ row }">
              <div>{{ row.id }}</div>
            </template>
          </el-table-column>

          <el-table-column label="类型" min-width="100">
            <template #default="{ row }">
              <div>{{ row.type }}</div>
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

          <el-table-column label="状态" min-width="100">
            <template #default="{ row }">
              <span :class="['admin-pill', getStatusClass(row.status)]">
                {{ getStatusText(row.status) }}
              </span>
            </template>
          </el-table-column>

          <el-table-column label="描述" min-width="200">
            <template #default="{ row }">
              <div>{{ row.description || '暂无补充说明' }}</div>
            </template>
          </el-table-column>

          <el-table-column label="操作" min-width="280">
            <template #default="{ row }">
              <div class="admin-row-actions">
                <el-button 
                  :class="['admin-ghost-button', row.isSelected ? 'admin-button-selected' : '']"
                  @click="handleSelect(row)"
                >
                  <el-icon><Check /></el-icon>
                  {{ row.isSelected ? '已选中' : '选中' }}
                </el-button>
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

        <div v-if="!visiblePoints.length && !loading" class="admin-empty">
          当前没有匹配的监测点记录，试试清空筛选或新增一个点位。
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
        <p class="admin-page__eyebrow">{{ isEditing ? 'Edit Point' : 'Create Point' }}</p>
        <h3>{{ isEditing ? '编辑起降点' : '新增起降点' }}</h3>
        <p>维护起降点名称、坐标、海拔和运行状态，保证业务地图和后台数据一致。</p>
      </div>

      <el-form ref="formRef" :model="formModel" :rules="formRules" label-position="top">
        <section class="admin-form-section">
          <h4 class="admin-section-title">基础信息</h4>
          <div class="admin-form-grid">
            <el-form-item label="名称" prop="name">
              <el-input v-model="formModel.name" placeholder="如：青岛流亭机场" />
            </el-form-item>

            <el-form-item label="编码" prop="code">
              <el-input v-model="formModel.code" placeholder="如：NH-01（同区域内不可重复）" />
              <div class="admin-form-hint">编码为业务编号，可修改；系统唯一标识为「点位ID」。</div>
            </el-form-item>

            <el-form-item label="类型" prop="type">
              <el-select v-model="formModel.type" placeholder="选择点位类型">
                <el-option v-for="item in typeOptions" :key="item" :label="item" :value="item" />
              </el-select>
            </el-form-item>

            <el-form-item label="位置" prop="location">
              <el-input v-model="formModel.location" placeholder="如：流亭机场东侧观测区" />
            </el-form-item>

            <el-form-item label="运行状态">
              <el-switch
                v-model="isActiveSwitch"
                inline-prompt
                active-text="活跃"
                inactive-text="停用"
              />
              <div class="admin-form-hint">停用后该点位不会作为默认活跃监测站点使用。</div>
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

            <el-form-item label="海拔 (m)" prop="altitude">
              <el-input-number v-model="formModel.altitude" :min="0" :step="1" controls-position="right" />
            </el-form-item>
          </div>
        </section>

        <section class="admin-form-section">
          <h4 class="admin-section-title">边界范围</h4>
          <div class="admin-form-grid">
            <el-form-item label="最小经度" prop="bboxMinLng">
              <el-input-number
                v-model="formModel.bboxMinLng"
                :min="-180"
                :max="180"
                :step="0.0001"
                controls-position="right"
              />
            </el-form-item>

            <el-form-item label="最小纬度" prop="bboxMinLat">
              <el-input-number
                v-model="formModel.bboxMinLat"
                :min="-90"
                :max="90"
                :step="0.0001"
                controls-position="right"
              />
            </el-form-item>

            <el-form-item label="最大经度" prop="bboxMaxLng">
              <el-input-number
                v-model="formModel.bboxMaxLng"
                :min="-180"
                :max="180"
                :step="0.0001"
                controls-position="right"
              />
            </el-form-item>

            <el-form-item label="最大纬度" prop="bboxMaxLat">
              <el-input-number
                v-model="formModel.bboxMaxLat"
                :min="-90"
                :max="90"
                :step="0.0001"
                controls-position="right"
              />
            </el-form-item>
          </div>
        </section>

        <section class="admin-form-section">
          <h4 class="admin-section-title">补充说明</h4>
          <div class="admin-form-grid admin-form-grid--single">
            <el-form-item label="描述">
              <el-input
                v-model="formModel.description"
                type="textarea"
                :rows="4"
                placeholder="记录业务范围、站点职责或维护备注"
              />
            </el-form-item>
          </div>
        </section>
      </el-form>

      <div class="admin-drawer__footer">
        <el-button class="admin-secondary-button" @click="handleReset">重置</el-button>
        <el-button class="admin-primary-button" :loading="saving" @click="handleSave">
          {{ saving ? '保存中...' : '保存点位' }}
        </el-button>
      </div>
    </el-drawer>
  </div>
</template>

<script setup>
import { computed, nextTick, onMounted, reactive, ref } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import {
  createLandingPoint,
  deleteLandingPoint,
  fetchLandingPoints,
  fetchRegions,
  updateLandingPoint,
  updateSelectedArea,
} from '@/api'
import { useRegionStore } from '@/store/modules/region'
import { useRegionLandingStore } from '@/store/modules/regionLanding'
import { getStorage } from '@/utils/storageUtils'
import {
  extractList,
  normalizeBoolean,
  normalizeNumber
} from '@/utils/admin'

const loading = ref(false)
const saving = ref(false)
const drawerVisible = ref(false)
const isEditing = ref(false)
const searchKeyword = ref('')
const showActiveOnly = ref(false)
const formRef = ref(null)
const regionStore = useRegionStore()
const landingStore = useRegionLandingStore()

const readSelectedPointId = () => {
  return getStorage('selectedLandingPointId')
    || getStorage('v2_selectedLandingPointId')
    || ''
}

const applySelectionState = (list) => {
  let selectedId = readSelectedPointId()
  if (!selectedId && list.length) {
    selectedId = list[0].id
  }
  return list.map((item) => ({
    ...item,
    isSelected: item.id === selectedId,
  }))
}
const selectedRegionId = ref('')
const regionOptions = ref([])
const landingPoints = ref([])
const formSnapshot = ref(null)

// 监测点类型中英文映射关系
const pointTypeMap = {
  'takeoff': '起降点',
  'operation': '操作区'
}

const typeOptions = ['机场', '气象站', '雷达站', '自动站', '其他', '起降点', '操作区']

const createPointForm = () => ({
  id: null,
  name: '',
  code: '',
  type: '',
  location: '',
  longitude: 120.3895,
  latitude: 36.2747,
  bboxMinLng: 120.3395,
  bboxMinLat: 36.2247,
  bboxMaxLng: 120.4395,
  bboxMaxLat: 36.3247,
  altitude: 15,
  status: 'available',
  description: '',
  isSelected:false
})

const formModel = reactive(createPointForm())

const formRules = {
  name: [{ required: true, message: '请输入监测点名称', trigger: 'blur' }],
  code: [{ required: true, message: '请输入监测点编码', trigger: 'blur' }],
  type: [{ required: true, message: '请选择点位类型', trigger: 'change' }],
  location: [{ required: true, message: '请输入监测点位置', trigger: 'blur' }],
  longitude: [{ required: true, message: '请输入经度', trigger: 'blur' }],
  latitude: [{ required: true, message: '请输入纬度', trigger: 'blur' }]
}

const normalizeStatus = (value) => {
  const normalized = String(value || '').trim().toLowerCase()

  if (['available', 'active', '正常', '启用', '在线'].includes(normalized)) {
    return 'available'
  }

  if (['warning', 'maintenance', '维护中', '告警'].includes(normalized)) {
    return 'warning'
  }

  if (['unavailable', 'inactive', 'disabled', '故障', '停用', '离线'].includes(normalized)) {
    return 'unavailable'
  }

  return 'available'
}

const getStatusText = (status) => {
  const normalized = normalizeStatus(status)

  if (normalized === 'warning') {
    return '维护中'
  }

  if (normalized === 'unavailable') {
    return '停用'
  }

  return '活跃'
}

const getStatusClass = (status) => {
  const normalized = normalizeStatus(status)

  if (normalized === 'warning') {
    return 'admin-pill--warn'
  }

  if (normalized === 'unavailable') {
    return 'admin-pill--danger'
  }

  return 'admin-pill--good'
}

const isActiveSwitch = computed({
  get: () => formModel.status === 'available',
  set: (value) => {
    formModel.status = value ? 'available' : 'unavailable'
  }
})

const normalizePoint = (item, index = 0) => {

  const pointType = item?.type ?? item?.category ?? '其他'
  const mappedType = pointTypeMap[pointType] || pointType

  // 从bbox字段提取边界数据
  let bboxMinLng = item?.bboxMinLng
  let bboxMinLat = item?.bboxMinLat
  let bboxMaxLng = item?.bboxMaxLng
  let bboxMaxLat = item?.bboxMaxLat
  
  // 如果存在bbox字段且格式正确，则从中提取边界数据
  if (Array.isArray(item?.bbox) && item.bbox.length === 2) {
    const [minCoords, maxCoords] = item.bbox
    if (Array.isArray(minCoords) && minCoords.length === 2) {
      bboxMinLng = minCoords[0]
      bboxMinLat = minCoords[1]
    }
    if (Array.isArray(maxCoords) && maxCoords.length === 2) {
      bboxMaxLng = maxCoords[0]
      bboxMaxLat = maxCoords[1]
    }
  }

  return {
    id: item?.landingPointId ?? item?.id ?? item?.pointId ?? `LP-${String(index + 1).padStart(3, '0')}`,
    name: item?.name ?? item?.pointName ?? `监测点-${index + 1}`,
    longitude: normalizeNumber(item?.longitude ?? item?.lng, 120.3895),
    latitude: normalizeNumber(item?.latitude ?? item?.lat, 36.2747),
    altitude: normalizeNumber(item?.altitude, 15),
    bboxMinLng,
    bboxMinLat,
    bboxMaxLng,
    bboxMaxLat,
    type: mappedType,
    status: normalizeStatus(item?.status),
    description: item?.description ?? item?.remark ?? '',
    isSelected: normalizeBoolean(item?.isSelected, false),
    code: item?.code ?? '',
    location: item?.location ?? ''
  }
}

// 反转监测点类型映射，用于将中文类型映射回英文
const reversePointTypeMap = Object.fromEntries(
  Object.entries(pointTypeMap).map(([key, value]) => [value, key])
)

const serializePoint = (item) => {
  // 尝试将中文监测点类型映射回英文
  const pointType = item.type?.trim()
  const mappedType = reversePointTypeMap[pointType] || pointType

  const longitude = normalizeNumber(item.longitude, 120.3895)
  const latitude = item.latitude
  
  // 使用用户输入的边界框数据，如果没有则基于经纬度计算默认值
  const bboxMinLng = item.bboxMinLng
  const bboxMinLat = item.bboxMinLat
  const bboxMaxLng = item.bboxMaxLng
  const bboxMaxLat = item.bboxMaxLat

  const payload = {
    ...item,
    name: item.name?.trim(),
    code: item.code?.trim() || '',
    type: mappedType,
    location: item.location?.trim() || '',
    longitude,
    latitude: normalizeNumber(latitude, 36.2747),
    bboxMinLng: normalizeNumber(bboxMinLng, longitude - 0.05),
    bboxMinLat: normalizeNumber(bboxMinLat, latitude - 0.05),
    bboxMaxLng: normalizeNumber(bboxMaxLng, longitude + 0.05),
    bboxMaxLat: normalizeNumber(bboxMaxLat, latitude + 0.05),
    altitude: normalizeNumber(item.altitude, 15),
    status: normalizeStatus(item.status),
    isActive: normalizeStatus(item.status) === 'available'
  }
  
  if (!payload.id) {
    delete payload.id
  }

  // 删除不需要的字段
  delete payload.description
  delete payload.isSelected

  return payload
}


const visiblePoints = computed(() => {
  const keyword = searchKeyword.value.trim().toLowerCase()

  return landingPoints.value.filter((item) => {
    const matchesKeyword =
      !keyword ||
      [item.id, item.name, item.type, item.description]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(keyword))

    const matchesStatus = !showActiveOnly.value || normalizeStatus(item.status) === 'available'

    return matchesKeyword && matchesStatus
  })
})

const loadLandingPoints = async () => {
  loading.value = true

  try {
    if (!selectedRegionId.value) {
      await loadRegionOptions()
    }
    const payload = await fetchLandingPoints(selectedRegionId.value)
    const remoteList = extractList(payload).map((item, index) => normalizePoint(item, index))
    landingPoints.value = applySelectionState(remoteList)
  } catch (error) {
    landingPoints.value = []
    ElMessage.error(error.message || '加载起降点列表失败，请稍后重试')
    console.error('加载起降点列表失败:', error)
  } finally {
    loading.value = false
  }
}

const loadRegionOptions = async () => {
  const regions = await fetchRegions()
  regionOptions.value = regions
  if (!selectedRegionId.value && regions.length) {
    selectedRegionId.value = regionStore.regionId || regions.find((item) => item.isDefault)?.regionId || regions[0].regionId
  }
}

const handleRegionChange = async () => {
  regionStore.setRegionId(selectedRegionId.value)
  await loadLandingPoints()
}

const applyFormModel = (payload) => {
  Object.assign(formModel, createPointForm(), payload)
}

const openCreate = async () => {
  isEditing.value = false
  formSnapshot.value = createPointForm()
  applyFormModel(formSnapshot.value)
  drawerVisible.value = true
  await nextTick()
  formRef.value?.clearValidate()
}

const openEdit = async (row) => {
  isEditing.value = true
  formSnapshot.value = { ...row }
  applyFormModel(row)
  drawerVisible.value = true
  await nextTick()
  formRef.value?.clearValidate()
}

const handleReset = () => {
  applyFormModel(formSnapshot.value || createPointForm())
}

const handleSave = async () => {
  await formRef.value?.validate()
  saving.value = true

  const payload = serializePoint(formModel)
  payload.regionId = selectedRegionId.value

  try {
    if (isEditing.value) {
      await updateLandingPoint(payload.id, payload)
    } else {
      await createLandingPoint(payload)
    }

    ElMessage.success(isEditing.value ? '起降点已更新' : '起降点已新增')
    drawerVisible.value = false
    await loadLandingPoints()
  } catch (error) {
    console.error('保存监测点失败:', error)
    ElMessage.error(error.message || '保存监测点失败，请稍后重试')
    // 不关闭抽屉，让用户可以重试
  } finally {
    saving.value = false
  }
}

const handleSelect = async (row) => {
  regionStore.setRegionId(selectedRegionId.value)
  await updateSelectedArea(row)
  landingStore.selectLandingPoint(row)
  landingPoints.value = landingPoints.value.map((item) => ({
    ...item,
    isSelected: item.id === row.id,
  }))
  ElMessage.success(`已设为默认起降点：${row.name}`)
}

const handleDelete = async (row) => {
  try {
    await ElMessageBox.confirm(`确认删除起降点「${row.name}」吗？`, '删除确认', {
      confirmButtonText: '确认删除',
      cancelButtonText: '取消',
      type: 'warning'
    })
  } catch {
    return
  }

  try {
    await deleteLandingPoint(row.id)
    ElMessage.success('起降点已删除')
    await loadLandingPoints()
  } catch (error) {
    console.error('删除监测点失败:', error)
    ElMessage.error(error.message || '删除监测点失败，请稍后重试')
  }
}

const rowClassName = ({ row }) => {  
  return row.isSelected ? 'admin-table-row-selected' : ''
}

const handleSearch = () => {}

const toggleActiveOnly = () => {
  searchKeyword.value = ''
  showActiveOnly.value = !showActiveOnly.value
}

const clearFilters = () => {
  searchKeyword.value = ''
  showActiveOnly.value = false
}

onMounted(async () => {
  await loadRegionOptions()
  await loadLandingPoints()
})
</script>

<style scoped>
.admin-table-row-selected {
  background-color: #ffebe6 !important;
  border-left: 3px solid #1890ff !important;
}

.admin-button-selected {
  background-color: #e6f7ff !important;
  border-color: #1890ff !important;
  color: #1890ff !important;
}

.admin-button-selected:hover {
  background-color: #edeff0 !important;
  border-color: #40a9ff !important;
  color: #40a9ff !important;
}
</style>
