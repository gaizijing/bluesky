<template>
  <div class="admin-page">


    <section v-if="defaultConfig" class="admin-callout">
      <div class="admin-callout__copy">
        <p class="admin-callout__eyebrow">Default Policy</p>
        <h3>默认适飞配置已启用</h3>
        <p>当前默认规则会作用于未单独绑定机型的适飞分析任务。</p>
      </div>
      <div class="admin-chip-list">
        <span class="admin-chip">风速上限 {{ defaultConfig.maxWindSpeed }} m/s</span>
        <span class="admin-chip">最小能见度 {{ defaultConfig.minVisibility }} km</span>
        <span class="admin-chip">湿度上限 {{ defaultConfig.maxHumidity }}%</span>
        <span class="admin-chip">湍流等级 {{ defaultConfig.maxTurbulenceLevel }}</span>
      </div>
      <div class="admin-callout__action">
        <el-button class="admin-secondary-button" @click="openEdit(defaultConfig)">
          调整默认配置
        </el-button>
      </div>
    </section>

    <section class="admin-panel">
      <div class="admin-panel__header">
        <div>
          <h2 class="admin-panel__title">阈值配置清单</h2>
          <p class="admin-panel__desc">
            当前显示 {{ visibleThresholds.length }} / {{ thresholds.length }} 条记录，数据源：
            {{ dataSourceLabel }}
          </p>
        </div>
        <div class="admin-toolbar">

          <el-button class="admin-primary-button" @click="openCreate">
            <el-icon><Plus /></el-icon>
            新增阈值
          </el-button>
          <el-input
            v-model="searchAircraftId"
            clearable
            placeholder="按飞行器 ID 或配置 ID 筛选"
            @keyup.enter="handleSearchByAircraftId"
            @clear="clearFilters"
          >
            <template #prefix>
              <el-icon><Search /></el-icon>
            </template>
          </el-input>
          <el-button class="admin-secondary-button" @click="handleSearchByAircraftId">
            查询
          </el-button>
          <el-button v-if="searchAircraftId || showDefaultOnly" class="admin-ghost-button" @click="clearFilters">
            清空筛选
          </el-button>
        </div>
      </div>

      <div class="admin-table-shell">
        <el-table :data="visibleThresholds" v-loading="loading" class="admin-table" max-height="700">
          <el-table-column label="配置对象" min-width="120">
            <template #default="{ row }">
              <div>
                <div>{{ row.aircraftId || '默认适飞配置' }}</div>
              </div>
            </template>
          </el-table-column>

          <el-table-column label="最大风速" min-width="100">
            <template #default="{ row }">
              <div>{{ row.maxWindSpeed }} m/s</div>
            </template>
          </el-table-column>

          <el-table-column label="最大风切变" min-width="100">
            <template #default="{ row }">
              <div>{{ row.maxWindShear }} m/s</div>
            </template>
          </el-table-column>

          <el-table-column label="最小能见度" min-width="100">
            <template #default="{ row }">
              <div>{{ row.minVisibility }} km</div>
            </template>
          </el-table-column>

          <el-table-column label="最小云底高度" min-width="100">
            <template #default="{ row }">
              <div>{{ row.minCloudBase }} m</div>
            </template>
          </el-table-column>

          <el-table-column label="温度范围" min-width="130">
            <template #default="{ row }">
              <div>{{ row.tempMin }}℃ 至 {{ row.tempMax }}℃</div>
            </template>
          </el-table-column>

          <el-table-column label="最大湿度" min-width="100">
            <template #default="{ row }">
              <div>{{ row.maxHumidity }}%</div>
            </template>
          </el-table-column>

          <el-table-column label="最大降水量" min-width="100">
            <template #default="{ row }">
              <div>{{ row.maxPrecipitation }} mm</div>
            </template>
          </el-table-column>

          <el-table-column label="最大湍流等级" min-width="100">
            <template #default="{ row }">
              <div>{{ row.maxTurbulenceLevel }}</div>
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

        <div v-if="!visibleThresholds.length && !loading" class="admin-empty">
          当前没有匹配的阈值配置，试试清空筛选或新增一条规则。
        </div>
      </div>
    </section>

    <el-drawer
      v-model="drawerVisible"
      :with-header="false"
      size="720px"
      class="admin-editor-drawer"
      destroy-on-close
    >
      <div class="admin-drawer__header">
        <p class="admin-page__eyebrow">{{ isEditing ? 'Edit Rule' : 'Create Rule' }}</p>
        <h3>{{ isEditing ? '编辑阈值配置' : '新增阈值配置' }}</h3>
        <p>填写风场、视程和温湿限制，提交后将同步到后台阈值规则集。</p>
      </div>

      <el-form ref="formRef" :model="formModel" :rules="formRules" label-position="top">
        <section class="admin-form-section">
          <h4 class="admin-section-title">基础信息</h4>
          <div class="admin-form-grid">
            <el-form-item label="飞行器 ID" prop="aircraftId">
              <el-select v-model="formModel.aircraftId" placeholder="选择飞行器" :disabled="isEditing" clearable>
                <el-option v-for="aircraft in aircraftList" :key="aircraft.id" :label="aircraft.name || aircraft.id" :value="aircraft.id" />
              </el-select>
            </el-form-item>

            <el-form-item label="最大湍流等级" prop="maxTurbulenceLevel">
              <el-select v-model="formModel.maxTurbulenceLevel" placeholder="选择湍流等级">
                <el-option v-for="item in turbulenceOptions" :key="item" :label="item" :value="item" />
              </el-select>
              <div class="admin-form-hint">建议按气象评估标准维护轻度、中度、重度三级。</div>
            </el-form-item>
          </div>
        </section>

        <section class="admin-form-section">
          <h4 class="admin-section-title">风场与视程阈值</h4>
          <div class="admin-form-grid">
            <el-form-item label="最大风速 (m/s)" prop="maxWindSpeed">
              <el-input-number v-model="formModel.maxWindSpeed" :min="0" :step="0.5" controls-position="right" />
            </el-form-item>

            <el-form-item label="最大风切变 (m/s)" prop="maxWindShear">
              <el-input-number v-model="formModel.maxWindShear" :min="0" :step="0.5" controls-position="right" />
            </el-form-item>

            <el-form-item label="最小能见度 (km)" prop="minVisibility">
              <el-input-number v-model="formModel.minVisibility" :min="0" :step="0.5" controls-position="right" />
            </el-form-item>

            <el-form-item label="最小云底高度 (m)" prop="minCloudBase">
              <el-input-number v-model="formModel.minCloudBase" :min="0" :step="10" controls-position="right" />
            </el-form-item>
          </div>
        </section>

        <section class="admin-form-section">
          <h4 class="admin-section-title">温湿与降水阈值</h4>
          <div class="admin-form-grid">
            <el-form-item label="最高温度 (℃)" prop="tempMax">
              <el-input-number v-model="formModel.tempMax" :step="1" controls-position="right" />
            </el-form-item>

            <el-form-item label="最低温度 (℃)" prop="tempMin">
              <el-input-number v-model="formModel.tempMin" :step="1" controls-position="right" />
            </el-form-item>

            <el-form-item label="最大湿度 (%)" prop="maxHumidity">
              <el-input-number
                v-model="formModel.maxHumidity"
                :min="0"
                :max="100"
                :step="1"
                controls-position="right"
              />
            </el-form-item>

            <el-form-item label="最大降水量 (mm)" prop="maxPrecipitation">
              <el-input-number
                v-model="formModel.maxPrecipitation"
                :min="0"
                :step="0.5"
                controls-position="right"
              />
            </el-form-item>
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
import { computed, nextTick, onMounted, reactive, ref, watch } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import {
  addThreshold,
  deleteThreshold,
  getAllThresholds,
  getDefaultThreshold,
  updateThreshold,
  updateDefaultThreshold,
  getAllAircraftModels
} from '@/api'
import { useThresholdsStore } from '@/store/modules/thresholds'
import {
  extractList,
  extractRecord,
  normalizeBoolean,
  normalizeNumber
} from '@/utils/admin'
const thresholdsStore = useThresholdsStore()

const searchAircraftId = ref('')
const showDefaultOnly = ref(false)
const drawerVisible = ref(false)
const isEditing = ref(false)
const loading = ref(false)
const saving = ref(false)
const dataSource = ref('remote')
const formRef = ref(null)

const thresholds = ref([])
const defaultConfig = ref(null)
const formSnapshot = ref(null)

// 湍流等级映射
const turbulenceMap = {
  low: '轻度',
  medium: '中度',
  high: '重度',
  '轻度': 'low',
  '中度': 'medium',
  '重度': 'high'
}

const turbulenceOptions = ['轻度', '中度', '重度']

const aircraftList = ref([])

const loadAircrafts = async () => {
  
    const response = await getAllAircraftModels()
    const aircrafts = extractList(response)
    aircraftList.value = aircrafts
      .filter(item => (item.id || item.aircraftId || item.modelId) !== 'default')
      .map(item => ({
        id: item.id || item.aircraftId || item.modelId,
        name: item.name || item.model || item.aircraftId
      }))
 
}

const tableMaxHeight = computed(() => {
  // 计算表格最大高度，考虑页面其他元素的高度
  const windowHeight = window.innerHeight
  // 预留顶部栏、工具栏等高度
  const reservedHeight = 200
  return windowHeight - reservedHeight
})

const createThresholdForm = () => ({
  id: null,
  aircraftId: '',
  maxWindSpeed: 8,
  maxWindShear: 5,
  minVisibility: 4,
  maxPrecipitation: 5,
  minCloudBase: 100,
  tempMin: -15,
  tempMax: 50,
  maxHumidity: 90,
  maxTurbulenceLevel: '中度'
})

const formModel = reactive(createThresholdForm())

const formRules = {
  maxWindSpeed: [{ required: true, message: '请输入最大风速', trigger: 'blur' }],
  maxWindShear: [{ required: true, message: '请输入最大风切变', trigger: 'blur' }],
  minVisibility: [{ required: true, message: '请输入最小能见度', trigger: 'blur' }],
  maxPrecipitation: [{ required: true, message: '请输入最大降水量', trigger: 'blur' }],
  minCloudBase: [{ required: true, message: '请输入最小云底高度', trigger: 'blur' }],
  tempMin: [{ required: true, message: '请输入最低温度', trigger: 'blur' }],
  tempMax: [{ required: true, message: '请输入最高温度', trigger: 'blur' }],
  maxHumidity: [{ required: true, message: '请输入最大湿度', trigger: 'blur' }],
  maxTurbulenceLevel: [{ required: true, message: '请选择最大湍流等级', trigger: 'change' }]
}

const normalizeThreshold = (item, index = 0) => ({
  id: item?.id ?? item?.limitId ?? `LIMIT-${String(index + 1).padStart(3, '0')}`,
  aircraftId: (item?.aircraftId === 'default' ? '' : item?.aircraftId) ?? item?.modelId ?? item?.aircraftModelId ?? '',
  maxWindSpeed: normalizeNumber(item?.maxWindSpeed ?? item?.windSpeed, 8),
  maxWindShear: normalizeNumber(item?.maxWindShear ?? item?.windShear, 5),
  minVisibility: normalizeNumber(item?.minVisibility ?? item?.visibility, 4),
  maxPrecipitation: normalizeNumber(item?.maxPrecipitation ?? item?.precipitation, 5),
  minCloudBase: normalizeNumber(item?.minCloudBase ?? item?.cloudBase, 100),
  tempMin: normalizeNumber(item?.tempMin ?? item?.temperatureMin, -15),
  tempMax: normalizeNumber(item?.tempMax ?? item?.temperatureMax, 50),
  maxHumidity: normalizeNumber(item?.maxHumidity ?? item?.humidity, 90),
  maxTurbulenceLevel: turbulenceMap[item?.maxTurbulenceLevel] ?? turbulenceMap[item?.turbulenceLevel] ?? '中度'
})

const serializeThreshold = (item) => {
  const payload = {
    ...item,
    aircraftId: item.aircraftId?.trim() || 'default',
    maxWindSpeed: normalizeNumber(item.maxWindSpeed, 8),
    maxWindShear: normalizeNumber(item.maxWindShear, 5),
    minVisibility: normalizeNumber(item.minVisibility, 4),
    maxPrecipitation: normalizeNumber(item.maxPrecipitation, 5),
    minCloudBase: normalizeNumber(item.minCloudBase, 100),
    tempMin: normalizeNumber(item.tempMin, -15),
    tempMax: normalizeNumber(item.tempMax, 50),
    maxHumidity: normalizeNumber(item.maxHumidity, 90),
    maxTurbulenceLevel: turbulenceMap[item.maxTurbulenceLevel] || item.maxTurbulenceLevel
  }

  if (!payload.id) {
    delete payload.id
  }

  return payload
}



const dataSourceLabel = computed(() => '接口数据')

const visibleThresholds = computed(() => {
  let list = [...thresholds.value]

  // 过滤掉默认配置（aircraftId 为空或 'default'）
  list = list.filter((item) => item.aircraftId && item.aircraftId !== 'default')

  if (showDefaultOnly.value) {
    list = defaultConfig.value ? [defaultConfig.value] : list.filter((item) => !item.aircraftId)
  }

  const keyword = searchAircraftId.value.trim().toLowerCase()
  if (!keyword) {
    return list
  }

  return list.filter((item) => {
    const aircraftId = String(item.aircraftId || '默认').toLowerCase()
    const configId = String(item.id || '').toLowerCase()
    return aircraftId.includes(keyword) || configId.includes(keyword)
  })
})

const stats = computed(() => {
  const total = thresholds.value.length
  const defaultIds = new Set(thresholds.value.filter((item) => !item.aircraftId).map((item) => item.id))
  if (defaultConfig.value?.id) {
    defaultIds.add(defaultConfig.value.id)
  }

  const averageWindSpeed = total
    ? (thresholds.value.reduce((sum, item) => sum + item.maxWindSpeed, 0) / total).toFixed(1)
    : '0.0'

  const strictCount = thresholds.value.filter((item) => getThresholdProfile(item) === '严格').length

  return {
    total,
    defaultCount: defaultIds.size,
    averageWindSpeed,
    strictCount
  }
})

const syncStore = (list, defaultItem) => {
  thresholdsStore.$patch({
    thresholdList: list,
    defaultThreshold: defaultItem,
    currentThreshold: thresholdsStore.currentThreshold
      ? list.find((item) => item.id === thresholdsStore.currentThreshold.id) || defaultItem || list[0] || null
      : defaultItem || list[0] || null,
    error: null
  })
}

const loadThresholds = async () => {
  loading.value = true

  try {
    const [listPayload, defaultPayload] = await Promise.all([
      getAllThresholds(),
      getDefaultThreshold().catch(() => null)
    ])

    const remoteList = extractList(listPayload).map((item, index) => normalizeThreshold(item, index))
    const defaultItem = normalizeThreshold(
      extractRecord(defaultPayload) || remoteList.find((item) => !item.aircraftId) || {}
    )

    thresholds.value = remoteList
    defaultConfig.value = defaultItem
    dataSource.value = 'remote'

    if (remoteList.length) {
      syncStore(remoteList, defaultItem)
    }

    if (!remoteList.length) {
      ElMessage.warning('当前没有阈值配置数据。')
    }
  } catch (error) {
    thresholds.value = []
    defaultConfig.value = null
    dataSource.value = 'remote'
    ElMessage.error('加载阈值配置失败，请稍后重试。')
    console.error('加载阈值配置失败:', error)
  } finally {
    loading.value = false
  }
}

const applyFormModel = (payload) => {
  Object.assign(formModel, createThresholdForm(), payload)
}

const openCreate = async () => {
  isEditing.value = false
  isDefaultConfig.value=true
  formSnapshot.value = createThresholdForm()
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
  applyFormModel(formSnapshot.value || createThresholdForm())
}

const upsertLocalThreshold = (payload) => {
  const normalized = normalizeThreshold({
    ...payload,
    id: payload.id || `LIMIT-${Date.now()}`
  })

  if (isEditing.value) {
    thresholds.value = thresholds.value.map((item) => (item.id === normalized.id ? normalized : item))
  } else {
    thresholds.value = [normalized, ...thresholds.value]
  }

  if (!normalized.aircraftId) {
    defaultConfig.value = normalized
  }
}

const handleSave = async () => {
  await formRef.value?.validate()
  saving.value = true

  const payload = serializeThreshold(formModel)

  try {
    let response
    if (isEditing.value && !payload.aircraftId) {
      // 更新默认阈值配置
      response = await updateDefaultThreshold(payload)
    } else {
      // 更新或新增普通阈值配置
      response = isEditing.value ? await updateThreshold(payload) : await addThreshold(payload)
    }



    ElMessage.success(isEditing.value ? '阈值配置已更新' : '阈值配置已新增')
    drawerVisible.value = false
    await loadThresholds()
  } catch (error) {
    console.error('保存阈值配置失败:', error)
    ElMessage.error(error.message || '保存阈值配置失败，请稍后重试')
  } finally {
    saving.value = false
  }
}

const handleDelete = async (row) => {
  try {
    await ElMessageBox.confirm(`确认删除配置「${row.aircraftId || '默认适飞配置'}」吗？`, '删除确认', {
      confirmButtonText: '确认删除',
      cancelButtonText: '取消',
      type: 'warning'
    })
  } catch {
    return
  }

  try {
    await deleteThreshold(row.id)
    ElMessage.success('阈值配置已删除')
    await loadThresholds()
  } catch (error) {
    console.error('删除阈值配置失败:', error)
    ElMessage.error(error.message || '删除阈值配置失败，请稍后重试')
  }
}

const handleSearchByAircraftId = () => {
  showDefaultOnly.value = false
}

const toggleDefaultOnly = () => {
  searchAircraftId.value = ''
  showDefaultOnly.value = !showDefaultOnly.value
}

const clearFilters = () => {
  searchAircraftId.value = ''
  showDefaultOnly.value = false
}

const getThresholdProfile = (row) => {
  if (!row.aircraftId) {
    return '默认策略'
  }

  const strictSignals = [
    row.maxWindSpeed <= 6,
    row.minVisibility >= 8,
    row.maxHumidity <= 85,
    row.maxPrecipitation <= 4
  ].filter(Boolean).length

  if (strictSignals >= 2) {
    return '严格'
  }

  if (strictSignals === 1) {
    return '平衡'
  }

  return '宽松'
}

const getThresholdProfileClass = (row) => {
  const profile = getThresholdProfile(row)

  if (profile === '默认策略') {
    return 'admin-pill--accent'
  }

  if (profile === '严格') {
    return 'admin-pill--good'
  }

  if (profile === '平衡') {
    return 'admin-pill--warn'
  }

  return 'admin-pill--danger'
}

onMounted(() => {
  loadThresholds()
  loadAircrafts()
})
</script>
