<template>
  <div class="admin-page">
   

    <section class="admin-panel">
      <div class="admin-panel__header">
        <div>
        
        </div>

        <div class="admin-toolbar admin-toolbar--users">
          <el-button class="admin-secondary-button" :loading="loading" @click="loadUsers">
            <el-icon><Refresh /></el-icon>
            刷新列表
          </el-button>

          <el-button class="admin-primary-button" @click="openCreate">
            <el-icon><Plus /></el-icon>
            新增用户
          </el-button>

          <el-select v-model="selectedRole" clearable placeholder="角色筛选">
            <el-option v-for="item in roleOptions" :key="item.value" :label="item.label" :value="item.value" />
          </el-select>

          <el-select v-model="selectedStatus" clearable placeholder="状态筛选">
            <el-option v-for="item in statusOptions" :key="item.value" :label="item.label" :value="item.value" />
          </el-select>

          <el-input
            v-model="searchKeyword"
            clearable
            placeholder="搜索用户名、姓名、邮箱或手机号"
            @keyup.enter="handleSearch"
            @clear="clearFilters"
          >
            <template #prefix>
              <el-icon><Search /></el-icon>
            </template>
          </el-input>

          <el-button class="admin-secondary-button" @click="handleSearch">
            查询
          </el-button>

          <el-button
            v-if="searchKeyword || selectedRole || selectedStatus"
            class="admin-ghost-button"
            @click="clearFilters"
          >
            清空筛选
          </el-button>
        </div>
      </div>

      <div class="admin-table-shell">
        <el-table :data="visibleUsers" v-loading="loading" class="admin-table" max-height="700">
          <el-table-column label="用户信息" min-width="180">
            <template #default="{ row }">
              <div class="admin-stack">
                <span class="admin-stack__title">{{ row.name || row.username }}</span>
                <span class="admin-stack__meta">{{ row.username }}</span>
              </div>
            </template>
          </el-table-column>

          <el-table-column label="联系方式" min-width="220">
            <template #default="{ row }">
              <div class="admin-stack">
                <span class="admin-stack__title">{{ row.email || '未填写邮箱' }}</span>
                <span class="admin-stack__meta">{{ row.phone || '未填写手机号' }}</span>
              </div>
            </template>
          </el-table-column>

          <el-table-column label="角色" width="180">
            <template #default="{ row }">
              <span :class="['admin-pill', getRoleClass(row.role)]">
                {{ getRoleText(row.role) }}
              </span>
            </template>
          </el-table-column>

          <el-table-column label="状态" width="110">
            <template #default="{ row }">
              <span :class="['admin-pill', getStatusClass(row.status)]">
                {{ getStatusText(row.status) }}
              </span>
            </template>
          </el-table-column>

          <el-table-column label="登录情况" min-width="180">
            <template #default="{ row }">
              <div class="admin-stack">
                <span class="admin-stack__title">
                  {{ row.lastLoginTime ? formatDateTime(row.lastLoginTime) : '从未登录' }}
                </span>
                <span class="admin-stack__meta">累计登录 {{ row.loginCount }} 次</span>
              </div>
            </template>
          </el-table-column>

          <el-table-column label="创建时间" min-width="160">
            <template #default="{ row }">
              <div>{{ formatDateTime(row.createdAt) }}</div>
            </template>
          </el-table-column>

          <el-table-column label="操作" min-width="260" fixed="right">
            <template #default="{ row }">
              <div class="admin-row-actions">
                <el-button class="admin-ghost-button" @click="openEdit(row)">
                  <el-icon><EditPen /></el-icon>
                  编辑
                </el-button>

                <el-dropdown trigger="click" @command="(status) => handleStatusCommand(row, status)">
                  <el-button class="admin-ghost-button">
                    <el-icon><MoreFilled /></el-icon>
                    状态
                  </el-button>

                  <template #dropdown>
                    <el-dropdown-menu>
                      <el-dropdown-item
                        v-for="item in statusOptions"
                        :key="item.value"
                        :command="item.value"
                        :disabled="item.value === row.status"
                      >
                        设为{{ item.label }}
                      </el-dropdown-item>
                    </el-dropdown-menu>
                  </template>
                </el-dropdown>

                <el-button class="admin-ghost-button" @click="handleDelete(row)">
                  <el-icon><Delete /></el-icon>
                  删除
                </el-button>
              </div>
            </template>
          </el-table-column>
        </el-table>

        <div v-if="!visibleUsers.length && !loading" class="admin-empty">
          当前没有匹配的用户记录，试试调整筛选条件或新增用户。
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
        <p class="admin-page__eyebrow">{{ isEditing ? 'Edit User' : 'Create User' }}</p>
        <h3>{{ isEditing ? '编辑用户' : '新增用户' }}</h3>
        <p>维护账号身份、联系方式和角色信息，密码修改与状态调整可以在这里和列表页完成。</p>
      </div>

      <el-form ref="formRef" :model="formModel" :rules="formRules" label-position="top">
        <section class="admin-form-section">
          <h4 class="admin-section-title">基础信息</h4>
          <div class="admin-form-grid">
            <el-form-item label="用户名" prop="username">
              <el-input v-model="formModel.username" placeholder="请输入 3-50 位用户名" />
            </el-form-item>

            <el-form-item label="登录密码" prop="password">
              <el-input
                v-model="formModel.password"
                type="password"
                show-password
                :placeholder="isEditing ? '不填写则保持原密码' : '请输入不少于 6 位的登录密码'"
              />
              <div class="admin-form-hint">
                {{ isEditing ? '留空表示不修改当前密码。' : '密码长度至少为 6 位。' }}
              </div>
            </el-form-item>

            <el-form-item label="真实姓名" prop="name">
              <el-input v-model="formModel.name" placeholder="请输入真实姓名" />
            </el-form-item>

            <el-form-item label="角色" prop="role">
              <el-select v-model="formModel.role" placeholder="请选择角色">
                <el-option v-for="item in roleOptions" :key="item.value" :label="item.label" :value="item.value" />
              </el-select>
            </el-form-item>
          </div>
        </section>

        <section class="admin-form-section">
          <h4 class="admin-section-title">联系方式</h4>
          <div class="admin-form-grid">
            <el-form-item label="邮箱" prop="email">
              <el-input v-model="formModel.email" placeholder="如：user@example.com" />
            </el-form-item>

            <el-form-item label="手机号" prop="phone">
              <el-input v-model="formModel.phone" placeholder="请输入手机号" />
            </el-form-item>
          </div>
        </section>
      </el-form>

      <div class="admin-drawer__footer">
        <el-button class="admin-secondary-button" @click="handleReset">重置</el-button>
        <el-button class="admin-primary-button" :loading="saving" @click="handleSave">
          {{ saving ? '保存中...' : '保存用户' }}
        </el-button>
      </div>
    </el-drawer>
  </div>
</template>

<script setup>
import { computed, nextTick, onMounted, reactive, ref } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Delete, EditPen, MoreFilled, Plus, Refresh, Search } from '@element-plus/icons-vue'
import {
  createUser,
  deleteUser,
  getUserById,
  getUserList,
  updateUser,
  updateUserStatus
} from '@/api'
import {
  extractList,
  extractRecord,
  normalizeNumber
} from '@/utils/admin'

const loading = ref(false)
const saving = ref(false)
const drawerVisible = ref(false)
const isEditing = ref(false)
const searchKeyword = ref('')
const selectedRole = ref('')
const selectedStatus = ref('')
const formRef = ref(null)
const users = ref([])
const formSnapshot = ref(null)

const roleOptions = [
  { label: '管理员', value: 'admin' },
  { label: '普通用户', value: 'user' }
]

const statusOptions = [
  { label: '启用', value: 'active' },
  { label: '停用', value: 'inactive' },
  { label: '锁定', value: 'locked' }
]

const phonePattern = /^[0-9\-+()\s]{6,20}$/
const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

const createUserForm = () => ({
  id: null,
  username: '',
  password: '',
  name: '',
  email: '',
  phone: '',
  role: 'user'
})

const formModel = reactive(createUserForm())

const validateUsername = (_, value, callback) => {
  const username = String(value || '').trim()

  if (!username) {
    callback(new Error('请输入用户名'))
    return
  }

  if (username.length < 3 || username.length > 50) {
    callback(new Error('用户名长度需在 3 到 50 个字符之间'))
    return
  }

  callback()
}

const validatePassword = (_, value, callback) => {
  const password = String(value || '').trim()

  if (!isEditing.value && !password) {
    callback(new Error('请输入登录密码'))
    return
  }

  if (password && password.length < 6) {
    callback(new Error('密码长度至少为 6 位'))
    return
  }

  callback()
}

const validateEmail = (_, value, callback) => {
  const email = String(value || '').trim()

  if (!email) {
    callback(new Error('请输入邮箱'))
    return
  }

  if (!emailPattern.test(email)) {
    callback(new Error('请输入正确的邮箱格式'))
    return
  }

  callback()
}

const validatePhone = (_, value, callback) => {
  const phone = String(value || '').trim()

  if (!phone) {
    callback(new Error('请输入手机号'))
    return
  }

  if (!phonePattern.test(phone)) {
    callback(new Error('请输入正确的手机号格式'))
    return
  }

  callback()
}

const formRules = {
  username: [{ validator: validateUsername, trigger: 'blur' }],
  password: [{ validator: validatePassword, trigger: 'blur' }],
  name: [{ required: true, message: '请输入真实姓名', trigger: 'blur' }],
  email: [{ validator: validateEmail, trigger: 'blur' }],
  phone: [{ validator: validatePhone, trigger: 'blur' }],
  role: [{ required: true, message: '请选择角色', trigger: 'change' }]
}

const normalizeRole = (value) => {
  const normalized = String(value || '').trim().toLowerCase()
  return normalized === 'admin' ? 'admin' : 'user'
}

const normalizeStatus = (value) => {
  const normalized = String(value || '').trim().toLowerCase()

  if (['locked', 'lock', 'freeze', 'frozen', '禁用锁定'].includes(normalized)) {
    return 'locked'
  }

  if (['inactive', 'disabled', 'disable', 'inactive_user', '停用'].includes(normalized)) {
    return 'inactive'
  }

  return 'active'
}

const normalizeUser = (item) => ({
  id: String(item?.id ?? ''),
  username: item?.username ?? '',
  name: item?.name ?? '',
  email: item?.email ?? '',
  phone: item?.phone ?? '',
  status: normalizeStatus(item?.status),
  role: normalizeRole(item?.role),
  lastLoginTime: item?.lastLoginTime ?? null,
  loginCount: normalizeNumber(item?.loginCount, 0),
  createdAt: item?.createdAt ?? null,
  updatedAt: item?.updatedAt ?? null
})

const serializeUserPayload = (item) => {
  const payload = {
    username: item.username?.trim(),
    name: item.name?.trim(),
    email: item.email?.trim(),
    phone: item.phone?.trim(),
    role: normalizeRole(item.role)
  }

  const password = item.password?.trim()
  if (password) {
    payload.password = password
  }

  return payload
}

const visibleUsers = computed(() => {
  const keyword = searchKeyword.value.trim().toLowerCase()

  return users.value.filter((item) => {
    const matchesKeyword =
      !keyword ||
      [item.id, item.username, item.name, item.email, item.phone, item.role, item.status]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(keyword))

    const matchesRole = !selectedRole.value || item.role === selectedRole.value
    const matchesStatus = !selectedStatus.value || item.status === selectedStatus.value

    return matchesKeyword && matchesRole && matchesStatus
  })
})

const stats = computed(() => ({
  total: users.value.length,
  activeCount: users.value.filter((item) => item.status === 'active').length,
  lockedCount: users.value.filter((item) => item.status === 'locked').length,
  adminCount: users.value.filter((item) => item.role === 'admin').length
}))

const formatDateTime = (value) => {
  if (!value) {
    return '--'
  }

  const date = new Date(value)
  if (!Number.isFinite(date.getTime())) {
    return '--'
  }

  return new Intl.DateTimeFormat('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false
  }).format(date)
}

const getRoleText = (role) => (normalizeRole(role) === 'admin' ? '管理员' : '普通用户')

const getRoleClass = (role) => (normalizeRole(role) === 'admin' ? 'admin-pill--accent' : 'admin-pill--good')

const getStatusText = (status) => {
  const normalized = normalizeStatus(status)

  if (normalized === 'inactive') {
    return '停用'
  }

  if (normalized === 'locked') {
    return '锁定'
  }

  return '启用'
}

const getStatusClass = (status) => {
  const normalized = normalizeStatus(status)

  if (normalized === 'inactive') {
    return 'admin-pill--warn'
  }

  if (normalized === 'locked') {
    return 'admin-pill--danger'
  }

  return 'admin-pill--good'
}

const loadUsers = async () => {
  loading.value = true

  try {
    const payload = await getUserList()
    const remoteList = extractList(payload).map((item) => normalizeUser(item))
    users.value = remoteList
  } catch (error) {
    users.value = []
    ElMessage.error(error.message || '加载用户列表失败，请稍后重试')
    console.error('加载用户列表失败:', error)
  } finally {
    loading.value = false
  }
}

const applyFormModel = (payload) => {
  Object.assign(formModel, createUserForm(), payload, { password: '' })
}

const openCreate = async () => {
  isEditing.value = false
  formSnapshot.value = createUserForm()
  applyFormModel(formSnapshot.value)
  drawerVisible.value = true
  await nextTick()
  formRef.value?.clearValidate()
}

const openEdit = async (row) => {
  isEditing.value = true

  try {
    const payload = await getUserById(row.id)
    const detail = normalizeUser(extractRecord(payload) || {})

    formSnapshot.value = { ...detail }
    applyFormModel(detail)
    drawerVisible.value = true
    await nextTick()
    formRef.value?.clearValidate()
  } catch (error) {
    console.error('获取用户详情失败:', error)
    ElMessage.error(error.message || '获取用户详情失败，请稍后重试')
  }
}

const handleReset = () => {
  applyFormModel(formSnapshot.value || createUserForm())
}

const handleSave = async () => {
  await formRef.value?.validate()
  saving.value = true

  const payload = serializeUserPayload(formModel)

  try {
    if (isEditing.value) {
      await updateUser(formModel.id, payload)
    } else {
      await createUser(payload)
    }

    ElMessage.success(isEditing.value ? '用户信息已更新' : '用户已新增')
    drawerVisible.value = false
    await loadUsers()
  } catch (error) {
    console.error('保存用户失败:', error)
    ElMessage.error(error.message || '保存用户失败，请稍后重试')
  } finally {
    saving.value = false
  }
}

const handleDelete = async (row) => {
  try {
    await ElMessageBox.confirm(`确认删除用户「${row.name || row.username}」吗？`, '删除确认', {
      confirmButtonText: '确认删除',
      cancelButtonText: '取消',
      type: 'warning'
    })
  } catch {
    return
  }

  try {
    await deleteUser(row.id)
    ElMessage.success('用户已删除')
    await loadUsers()
  } catch (error) {
    console.error('删除用户失败:', error)
    ElMessage.error(error.message || '删除用户失败，请稍后重试')
  }
}

const handleStatusCommand = async (row, status) => {
  if (!status || status === row.status) {
    return
  }

  const statusText = getStatusText(status)

  try {
    await ElMessageBox.confirm(
      `确认将用户「${row.name || row.username}」的状态调整为${statusText}吗？`,
      '状态调整确认',
      {
        confirmButtonText: '确认调整',
        cancelButtonText: '取消',
        type: 'warning'
      }
    )
  } catch {
    return
  }

  try {
    await updateUserStatus(row.id, status)
    ElMessage.success(`用户状态已调整为${statusText}`)
    await loadUsers()
  } catch (error) {
    console.error('更新用户状态失败:', error)
    ElMessage.error(error.message || '更新用户状态失败，请稍后重试')
  }
}

const handleSearch = () => {}

const clearFilters = () => {
  searchKeyword.value = ''
  selectedRole.value = ''
  selectedStatus.value = ''
}

onMounted(() => {
  loadUsers()
})
</script>

<style scoped>
.admin-toolbar--users {
  align-items: flex-start;
}

.admin-toolbar--users .el-input {
  width: 280px;
}

.admin-toolbar--users .el-select {
  width: 140px;
}

@media (max-width: 768px) {
  .admin-toolbar--users .el-input,
  .admin-toolbar--users .el-select {
    width: 100%;
  }
}
</style>
