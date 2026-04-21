<template>
  <div class="admin-page">

    <section class="admin-panel">
      <div class="admin-panel__header">
        <div>
          <h2 class="admin-panel__title">地区配置管理</h2>
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

          <el-table-column label="西边界" min-width="100">
            <template #default="{ row }">
              <div>{{ row.west }}</div>
            </template>
          </el-table-column>

          <el-table-column label="东边界" min-width="100">
            <template #default="{ row }">
              <div>{{ row.east }}</div>
            </template>
          </el-table-column>

          <el-table-column label="南边界" min-width="100">
            <template #default="{ row }">
              <div>{{ row.south }}</div>
            </template>
          </el-table-column>

          <el-table-column label="北边界" min-width="100">
            <template #default="{ row }">
              <div>{{ row.north }}</div>
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

          <el-table-column label="更新时间" min-width="160">
            <template #default="{ row }">
              <div>{{ formatDate(row.updatedAt) }}</div>
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
        <p class="admin-page__eyebrow">{{ isEditing ? 'Edit Region' : 'Create Region' }}</p>
        <h3>{{ isEditing ? '编辑地区配置' : '新增地区配置' }}</h3>
        <p>维护地区名称和边界坐标，确保系统正常运行。</p>
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
          <h4 class="admin-section-title">边界坐标</h4>
          <div class="admin-form-grid">
            <el-form-item label="西边界" prop="west">
              <el-input-number v-model="formModel.west" :min="-180" :max="180" :step="0.1" controls-position="right" />
            </el-form-item>

            <el-form-item label="东边界" prop="east">
              <el-input-number v-model="formModel.east" :min="-180" :max="180" :step="0.1" controls-position="right" />
            </el-form-item>

            <el-form-item label="南边界" prop="south">
              <el-input-number v-model="formModel.south" :min="-90" :max="90" :step="0.1" controls-position="right" />
            </el-form-item>

            <el-form-item label="北边界" prop="north">
              <el-input-number v-model="formModel.north" :min="-90" :max="90" :step="0.1" controls-position="right" />
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
import { computed, nextTick, onMounted, reactive, ref } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import {
  Refresh,
  Plus,
  Star,
  EditPen,
  Delete
} from '@element-plus/icons-vue'
import {
  getAllRegionConfigs,
  addRegionConfig,
  updateRegionConfig,
  deleteRegionConfig
} from '@/api'
import { useRegionStore } from '@/store/modules/region';
import { InitializationService } from '@/services/initialization';

const regionStore = useRegionStore();
const initializationService = new InitializationService();

const loading = ref(false)
const saving = ref(false)
const drawerVisible = ref(false)
const isEditing = ref(false)
const formRef = ref(null)
const regionConfigs = ref([])
const formSnapshot = ref(null)
const searchKeyword = ref('')

const createRegionForm = () => ({
  id: null,
  name: '',
  west: 120.0,
  east: 121.0,
  south: 36.0,
  north: 37.0,
  isDefault: false
})

const formModel = reactive(createRegionForm())

const formRules = {
  name: [{ required: true, message: '请输入地区名称', trigger: 'blur' }],
  west: [{ required: true, message: '请输入西边界', trigger: 'blur' }],
  east: [{ required: true, message: '请输入东边界', trigger: 'blur' }],
  south: [{ required: true, message: '请输入南边界', trigger: 'blur' }],
  north: [{ required: true, message: '请输入北边界', trigger: 'blur' }]
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
      [item.id, item.name]
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

    console.log('获取地区配置列表:', response)


    regionConfigs.value = response

  } catch (error) {
    console.error('加载地区配置列表失败:', error)
    ElMessage.error('获取地区配置列表失败，请稍后重试')
  } finally {
    loading.value = false
  }
}

const applyFormModel = (payload) => {
  Object.assign(formModel, createRegionForm(), payload)
}

const openCreate = async () => {
  isEditing.value = false
  formSnapshot.value = createRegionForm()
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
  applyFormModel(formSnapshot.value || createRegionForm())
}

const handleSave = async () => {
  await formRef.value?.validate()

  // 验证边界条件
  if (formModel.west >= formModel.east) {
    ElMessage.error('西边界必须小于东边界')
    return
  }
  if (formModel.south >= formModel.north) {
    ElMessage.error('南边界必须小于北边界')
    return
  }

  saving.value = true

  try {
    const payload = { ...formModel }

    let response
    if (isEditing.value) {
      response = await updateRegionConfig(payload)
    } else {
      response = await addRegionConfig(payload)
    }


    ElMessage.success(isEditing.value ? '地区配置已更新' : '地区配置已新增')
    drawerVisible.value = false
    await loadRegionConfigs()
    // 重新获取地区配置并更新到 store
    await regionStore.fetchRegionConfig();
    // 重新初始化项目
    await initializationService.initialize();

  } catch (error) {
    console.error('保存地区配置失败:', error)
    ElMessage.error('保存地区配置失败，请稍后重试')
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
    const payload = { ...row, isDefault: true }
    const response = await updateRegionConfig(payload)

  
    ElMessage.success('默认地区配置已设置')
    await loadRegionConfigs()
    // 重新获取地区配置并更新到 store
    await regionStore.fetchRegionConfig();
    // 重新初始化项目
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
    const response = await deleteRegionConfig(row.id)


    ElMessage.success('地区配置已删除')
    await loadRegionConfigs()
    // 重新获取地区配置并更新到 store
    await regionStore.fetchRegionConfig();
    // 重新初始化项目
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

.admin-pill--danger {
  background-color: #fff2f0;
  color: #ff4d4f;
  border: 1px solid #ffccc7;
}

.admin-row-actions {
  display: flex;
  gap: 8px;
}
</style>