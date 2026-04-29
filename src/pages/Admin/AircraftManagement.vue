<template>
  <div class="admin-page">
    


    <section class="admin-panel">
      <div class="admin-panel__header">
        <div>
          <h2 class="admin-panel__title">飞行器台账</h2>
      
        </div>
        <div class="admin-toolbar">
          
          <el-button class="admin-secondary-button" @click="toggleEnabledOnly">
            <el-icon><Opportunity /></el-icon>
            {{ showEnabledOnly ? '查看全部机型' : '仅看启用机型' }}
          </el-button>
          <el-button class="admin-primary-button" @click="openCreate">
            <el-icon><Plus /></el-icon>
            新增飞行器
          </el-button>
          <el-input
            v-model="searchKeyword"
            clearable
            placeholder="搜索型号、ID、制造商或类别"
            @clear="clearFilters"
            @keyup.enter="handleSearch"
          >
            <template #prefix>
              <el-icon><Search /></el-icon>
            </template>
          </el-input>
          <el-button class="admin-secondary-button" @click="handleSearch">查询</el-button>
          <el-button v-if="searchKeyword || showEnabledOnly" class="admin-ghost-button" @click="clearFilters">
            清空筛选
          </el-button>
        </div>
      </div>

      <div class="admin-table-shell">
        <el-table :data="visibleAircrafts" v-loading="loading" class="admin-table" max-height="700">
          <el-table-column label="型号名称" min-width="120">
            <template #default="{ row }">
              <div>{{ row.modelName }}</div>
            </template>
          </el-table-column>

      

          <el-table-column label="类别" min-width="100">
            <template #default="{ row }">
              <div>{{ row.category }}</div>
            </template>
          </el-table-column>

          <el-table-column label="制造商" min-width="120">
            <template #default="{ row }">
              <div>{{ row.manufacturer }}</div>
            </template>
          </el-table-column>

          <el-table-column label="巡航速度" min-width="100">
            <template #default="{ row }">
              <div>{{ row.cruiseSpeed }} km/h</div>
            </template>
          </el-table-column>

          <el-table-column label="最大速度" min-width="100">
            <template #default="{ row }">
              <div>{{ row.maxSpeed }} km/h</div>
            </template>
          </el-table-column>

          <el-table-column label="最大高度" min-width="100">
            <template #default="{ row }">
              <div>{{ row.maxAltitude }} m</div>
            </template>
          </el-table-column>

          <el-table-column label="最大航程" min-width="100">
            <template #default="{ row }">
              <div>{{ row.maxRange }} km</div>
            </template>
          </el-table-column>

          <el-table-column label="续航时间" min-width="100">
            <template #default="{ row }">
              <div>{{ row.maxEndurance }} 分钟</div>
            </template>
          </el-table-column>

          <el-table-column label="最大载重" min-width="100">
            <template #default="{ row }">
              <div>{{ row.maxPayload }} kg</div>
            </template>
          </el-table-column>

          <el-table-column label="运行状态" width="100">
            <template #default="{ row }">
              <span :class="['admin-pill', row.isActive ? 'admin-pill--good' : 'admin-pill--danger']">
                {{ row.isActive ? '启用中' : '已停用' }}
              </span>
            </template>
          </el-table-column>

          <el-table-column label="操作" width="200">
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

        <div v-if="!visibleAircrafts.length && !loading" class="admin-empty">
          当前没有匹配的机型记录，试试清空筛选或新增飞行器。
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
        <p class="admin-page__eyebrow">{{ isEditing ? 'Edit Aircraft' : 'Create Aircraft' }}</p>
        <h3>{{ isEditing ? '编辑飞行器' : '新增飞行器' }}</h3>
        <p>完善机型基础档案、性能参数和状态信息，便于后台统一调度与展示。</p>
      </div>

      <el-form ref="formRef" :model="formModel" :rules="formRules" label-position="top">
        <section class="admin-form-section">
          <h4 class="admin-section-title">基础信息</h4>
          <div class="admin-form-grid">
            <el-form-item label="型号名称" prop="modelName">
              <el-input v-model="formModel.modelName" placeholder="如：DJI Mavic 3" />
            </el-form-item>

            <el-form-item label="类别" prop="category">
              <el-select v-model="formModel.category" placeholder="选择类别">
                <el-option v-for="item in categoryOptions" :key="item" :label="item" :value="item" />
              </el-select>
            </el-form-item>

            <el-form-item label="制造商" prop="manufacturer">
              <el-input v-model="formModel.manufacturer" placeholder="如：DJI" />
            </el-form-item>

            <el-form-item label="运行状态">
              <el-switch
                v-model="formModel.isActive"
                inline-prompt
                active-text="启用"
                inactive-text="停用"
              />
              <div class="admin-form-hint">停用后的机型不会被默认纳入业务匹配。</div>
            </el-form-item>
          </div>
        </section>

        <section class="admin-form-section">
          <h4 class="admin-section-title">飞行性能</h4>
          <div class="admin-form-grid">
            <el-form-item label="最大飞行高度 (m)" prop="maxAltitude">
              <el-input-number v-model="formModel.maxAltitude" :min="0" :step="10" controls-position="right" />
            </el-form-item>

            <el-form-item label="最大速度 (km/h)" prop="maxSpeed">
              <el-input-number v-model="formModel.maxSpeed" :min="0" :step="5" controls-position="right" />
            </el-form-item>

            <el-form-item label="巡航速度 (km/h)" prop="cruiseSpeed">
              <el-input-number v-model="formModel.cruiseSpeed" :min="0" :step="5" controls-position="right" />
            </el-form-item>

            <el-form-item label="最大航程 (km)" prop="maxRange">
              <el-input-number v-model="formModel.maxRange" :min="0" :step="1" controls-position="right" />
            </el-form-item>

            <el-form-item label="最大续航时间 (分钟)" prop="maxEndurance">
              <el-input-number v-model="formModel.maxEndurance" :min="0" :step="5" controls-position="right" />
            </el-form-item>

            <el-form-item label="最大载重 (kg)" prop="maxPayload">
              <el-input-number v-model="formModel.maxPayload" :min="0" :step="0.1" controls-position="right" />
            </el-form-item>
          </div>
        </section>

        <section class="admin-form-section">
          <h4 class="admin-section-title">补充说明</h4>
          <div class="admin-form-grid admin-form-grid--single">
            <el-form-item label="机型说明">
              <el-input
                v-model="formModel.description"
                type="textarea"
                :rows="4"
                placeholder="记录机型用途、业务场景或其他补充说明"
              />
            </el-form-item>
          </div>
        </section>
      </el-form>

      <div class="admin-drawer__footer">
        <el-button class="admin-secondary-button" @click="handleReset">重置</el-button>
        <el-button class="admin-primary-button" :loading="saving" @click="handleSave">
          {{ saving ? '保存中...' : '保存机型' }}
        </el-button>
      </div>
    </el-drawer>
  </div>
</template>

<script setup>
import { computed, nextTick, onMounted, reactive, ref } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import {
  addAircraftModel,
  deleteAircraftModel,
  updateAircraftModel
} from '@/api'
import { useAircraftStore } from '@/store/modules/aircraft'
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
const showEnabledOnly = ref(false)
const formRef = ref(null)
const aircrafts = ref([])
const formSnapshot = ref(null)
const aircraftStore = useAircraftStore()

const categoryOptions = ['多旋翼', '固定翼', '直升机', '无人机', 'eVTOL']

const tableMaxHeight = computed(() => {
  // 计算表格最大高度，考虑页面其他元素的高度
  const windowHeight = window.innerHeight
  // 预留顶部栏、工具栏等高度
  const reservedHeight = 200
  return windowHeight - reservedHeight
})

const createAircraftForm = () => ({
  id: null,
  modelName: '',
  category: '',
  manufacturer: '',
  maxAltitude: 1000,
  maxSpeed: 80,
  cruiseSpeed: 60,
  maxRange: 10,
  maxEndurance: 30,
  maxPayload: 0.5,
  description: '',
  isActive: true
})

const formModel = reactive(createAircraftForm())

const formRules = {
  modelName: [{ required: true, message: '请输入型号名称', trigger: 'blur' }],
  category: [{ required: true, message: '请选择机型类别', trigger: 'change' }],
  manufacturer: [{ required: true, message: '请输入制造商', trigger: 'blur' }]
}

const normalizeAircraft = (item, index = 0) => ({
  id: item?.id ?? item?.modelId ?? item?.aircraftId ?? `AC-${String(index + 1).padStart(3, '0')}`,
  modelName: item?.modelName ?? item?.name ?? item?.model ?? `未命名机型-${index + 1}`,
  category: item?.category ?? item?.type ?? '无人机',
  manufacturer: item?.manufacturer ?? item?.brand ?? '未填写',
  maxAltitude: normalizeNumber(item?.maxAltitude ?? item?.maxFlightAltitude, 1000),
  maxSpeed: normalizeNumber(item?.maxSpeed ?? item?.topSpeed, 80),
  cruiseSpeed: normalizeNumber(item?.cruiseSpeed ?? item?.averageSpeed, 60),
  maxRange: normalizeNumber(item?.maxRange ?? item?.range, 10),
  maxEndurance: normalizeNumber(item?.maxEndurance ?? item?.endurance, 30),
  maxPayload: normalizeNumber(item?.maxPayload ?? item?.payload, 0.5),
  description: item?.description ?? item?.remark ?? '',
  isActive: normalizeBoolean(item?.isActive ?? item?.active ?? item?.status === 'active', true)
})

const serializeAircraft = (item) => {
  const payload = {
    ...item,
    modelName: item.modelName?.trim(),
    category: item.category?.trim(),
    manufacturer: item.manufacturer?.trim(),
    maxAltitude: normalizeNumber(item.maxAltitude, 1000),
    maxSpeed: normalizeNumber(item.maxSpeed, 80),
    cruiseSpeed: normalizeNumber(item.cruiseSpeed, 60),
    maxRange: normalizeNumber(item.maxRange, 10),
    maxEndurance: normalizeNumber(item.maxEndurance, 30),
    maxPayload: normalizeNumber(item.maxPayload, 0.5),
    isActive: Boolean(item.isActive),
    status: item.isActive ? 'active' : 'inactive'
  }

  if (!payload.id) {
    delete payload.id
  }

  return payload
}

const visibleAircrafts = computed(() => {
  const keyword = searchKeyword.value.trim().toLowerCase()

  return aircrafts.value.filter((item) => {
    const matchesKeyword =
      !keyword ||
      [item.id, item.modelName, item.manufacturer, item.category]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(keyword))

    const matchesStatus = !showEnabledOnly.value || item.isActive

    return matchesKeyword && matchesStatus
  })
})

const stats = computed(() => {
  const total = aircrafts.value.length
  const activeCount = aircrafts.value.filter((item) => item.isActive).length
  const averageCruiseSpeed = total
    ? (aircrafts.value.reduce((sum, item) => sum + item.cruiseSpeed, 0) / total).toFixed(1)
    : '0.0'
  const longestEndurance = total
    ? Math.max(...aircrafts.value.map((item) => item.maxEndurance))
    : 0

  return {
    total,
    activeCount,
    averageCruiseSpeed,
    longestEndurance
  }
})

const featuredAircraft = computed(() =>
  [...aircrafts.value].sort((a, b) => b.maxEndurance - a.maxEndurance)[0] || null
)

const loadAircrafts = async () => {
  loading.value = true

  try {
    const payload = await aircraftStore.fetchAllAircraftModels()
    const remoteList = extractList(payload).map((item, index) => normalizeAircraft(item, index))
    aircrafts.value = remoteList
  } catch (error) {
    aircrafts.value = []
    ElMessage.error(error.message || '加载飞行器列表失败，请稍后重试')
    console.error('加载飞行器列表失败:', error)
  } finally {
    loading.value = false
  }
}

const applyFormModel = (payload) => {
  Object.assign(formModel, createAircraftForm(), payload)
}

const openCreate = async () => {
  isEditing.value = false
  formSnapshot.value = createAircraftForm()
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
  applyFormModel(formSnapshot.value || createAircraftForm())
}

const handleSave = async () => {
  await formRef.value?.validate()
  saving.value = true

  const payload = serializeAircraft(formModel)

  try {
    if (isEditing.value) {
      await updateAircraftModel(payload)
    } else {
      await addAircraftModel(payload)
    }

    ElMessage.success(isEditing.value ? '飞行器已更新' : '飞行器已新增')
    drawerVisible.value = false
    await loadAircrafts()
  } catch (error) {
    console.error('保存飞行器失败:', error)
    ElMessage.error(error.message || '保存飞行器失败，请稍后重试')
  } finally {
    saving.value = false
  }
}

const handleDelete = async (row) => {
  try {
    await ElMessageBox.confirm(`确认删除机型「${row.modelName}」吗？`, '删除确认', {
      confirmButtonText: '确认删除',
      cancelButtonText: '取消',
      type: 'warning'
    })
  } catch {
    return
  }

  try {
    await deleteAircraftModel(row.id)
    ElMessage.success('飞行器已删除')
    await loadAircrafts()
  } catch (error) {
    console.error('删除飞行器失败:', error)
    ElMessage.error(error.message || '删除飞行器失败，请稍后重试')
  }
}

const handleSearch = () => {}

const toggleEnabledOnly = () => {
  searchKeyword.value = ''
  showEnabledOnly.value = !showEnabledOnly.value
}

const clearFilters = () => {
  searchKeyword.value = ''
  showEnabledOnly.value = false
}

onMounted(() => {
  loadAircrafts()
})
</script>
