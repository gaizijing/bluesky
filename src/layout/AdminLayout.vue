<template>
  <div class="admin-layout">
    <aside class="admin-sidebar">
      <div class="admin-brand">
       
        <div>
          <h1 class="admin-brand__title">控制台</h1>
        </div>
      </div>

      <nav class="admin-nav">
        <router-link
          v-for="item in menuItems"
          :key="item.path"
          :to="item.path"
          class="admin-nav__item"
        >
          <div class="admin-nav__icon">
            <el-icon><component :is="item.icon" /></el-icon>
          </div>
          <div class="admin-nav__content">
            <span class="admin-nav__title">{{ item.title }}</span>
          </div>
        </router-link>
      </nav>

      <div class="admin-sidebar__footer">
        <div class="admin-sidebar__meta">
          <span class="admin-sidebar__meta-value">{{ currentUser }}</span>
        </div>
        <div class="admin-sidebar__meta">
          <span class="admin-sidebar__meta-value">{{ formattedClock }}</span>
        </div>
        <el-button class="admin-secondary-button admin-logout-button" @click="handleLogout">
          <el-icon><SwitchButton /></el-icon>
          退出
        </el-button>
      </div>
    </aside>

    <main class="admin-main">
      <header class="admin-topbar">
        <div class="admin-topbar__copy">
          <h2>{{ currentTitle }}</h2>
        </div>
        <div class="admin-topbar__actions">
          <!-- 操作按钮将通过路由组件的插槽传递 -->
        </div>
      </header>

      <section class="admin-stage">
        <router-view v-slot="{ Component }">
          <transition name="admin-fade" mode="out-in">
            <component :is="Component" />
          </transition>
        </router-view>
      </section>
    </main>
  </div>
</template>

<script setup>
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import {
  Cpu,
  DataAnalysis,
  Histogram,
  LocationInformation,
  SwitchButton
} from '@element-plus/icons-vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { userLogout } from '@/api/auth'
import { clearStore } from '@/store'
import { removeToken } from '@/utils/storageUtils'

const router = useRouter()
const route = useRoute()
const now = ref(new Date())

const menuItems = [
  {
    path: '/admin/threshold',
    title: '阈值管理',
    description: '适飞阈值、默认策略与机型配置',
    icon: DataAnalysis
  },
  {
    path: '/admin/aircraft',
    title: '飞行器管理',
    description: '机型档案、性能参数与状态维护',
    icon: Histogram
  },
  {
    path: '/admin/monitoring-point',
    title: '监测点管理',
    description: '站点坐标、类型状态与业务覆盖',
    icon: LocationInformation
  },
  {
    path: '/admin/device',
    title: '设备管理',
    description: '设备台账、在线状态与点位绑定维护',
    icon: Cpu
  },
  {
    path: '/admin/region-config',
    title: '地区配置管理',
    description: '区域配置、边界定义与数据同步',
    icon: LocationInformation
  }
]

const routeDescriptions = {
  '/admin/threshold': '维护飞行限制基线，让适飞分析和风险预警拥有一致的判断口径。',
  '/admin/aircraft': '统一整理飞行器型号与性能档案，为业务匹配提供可追踪资产台账。',
  '/admin/monitoring-point': '编排业务监测点网络，确保站点坐标、类型与运行状态始终可控。',
  '/admin/device': '管理设备台账、在线状态和监测点关联关系，保证感知链路稳定可追踪。'
}

let timer = null

onMounted(() => {
  timer = window.setInterval(() => {
    now.value = new Date()
  }, 60000)
})

onBeforeUnmount(() => {
  if (timer) {
    window.clearInterval(timer)
  }
})

const currentTitle = computed(() => route.meta.title || '后台管理')
const currentDescription = computed(
  () => routeDescriptions[route.path] || '集中管理后台关键配置、业务资源与安全策略。'
)
const currentUser = computed(() => localStorage.getItem('username') || '管理员')
const formattedClock = computed(() =>
  new Intl.DateTimeFormat('zh-CN', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false
  }).format(now.value)
)
const formattedDate = computed(() =>
  new Intl.DateTimeFormat('zh-CN', {
    month: 'long',
    day: 'numeric'
  }).format(now.value)
)
const weekDayText = computed(() =>
  new Intl.DateTimeFormat('zh-CN', { weekday: 'long' }).format(now.value)
)

const handleLogout = async () => {
  try {
    await ElMessageBox.confirm('退出后需要重新登录才能继续操作，确认现在退出吗？', '退出确认', {
      confirmButtonText: '确认退出',
      cancelButtonText: '暂不退出',
      type: 'warning'
    })
  } catch {
    return
  }

  try {
    await userLogout()
  } catch (error) {
    console.warn('退出接口调用失败，已执行本地退出。', error)
  } finally {
    removeToken()
    localStorage.removeItem('userRole')
    clearStore()
    ElMessage.success('已安全退出登录')
    router.replace('/login')
  }
}
</script>

<style lang="scss">
.admin-layout {
  --admin-bg: #071722;
  --admin-surface: rgba(9, 29, 45, 0.84);
  --admin-text: #ecf7ff;
  --admin-text-muted: rgba(222, 242, 255, 0.72);
  --admin-text-soft: rgba(194, 225, 242, 0.52);
  --admin-line: rgba(135, 211, 255, 0.14);
  --admin-line-strong: rgba(135, 211, 255, 0.22);
  --admin-accent: #56d8ff;
  --admin-accent-warm: #ffd36a;
  --admin-success: #45d7a6;
  --admin-warning: #ffb86b;
  --admin-danger: #ff7c88;
  --admin-shadow: 0 12px 35px rgba(2, 10, 18, 0.3);
  display: grid;
  grid-template-columns: 240px minmax(0, 1fr);
  min-height: 100vh;
  color: var(--admin-text);
  background:
    radial-gradient(circle at 15% 20%, rgba(86, 216, 255, 0.12), transparent 28%),
    radial-gradient(circle at 82% 8%, rgba(255, 211, 106, 0.1), transparent 22%),
    linear-gradient(145deg, #04111d 0%, #071722 38%, #0c2232 100%);
}

.admin-layout * {
  box-sizing: border-box;
}

.admin-layout .el-button,
.admin-layout .el-input,
.admin-layout .el-select,
.admin-layout .el-textarea,
.admin-layout .el-table,
.admin-layout .el-form-item__label {
  font-family:  'Microsoft YaHei', sans-serif;
}

.admin-layout .el-input__wrapper,
.admin-layout .el-textarea__inner,
.admin-layout .el-select__wrapper,
.admin-layout .el-input-number .el-input__wrapper {
  background: rgba(4, 20, 33, 0.86);
  box-shadow: inset 0 0 0 1px rgba(135, 211, 255, 0.14);
  border-radius: 16px;
  color: var(--admin-text);
}

.admin-layout .el-input__wrapper.is-focus,
.admin-layout .el-select__wrapper.is-focused,
.admin-layout .el-textarea__inner:focus,
.admin-layout .el-input-number .el-input__wrapper.is-focus {
  box-shadow:
    inset 0 0 0 1px rgba(86, 216, 255, 0.6),
    0 0 0 4px rgba(86, 216, 255, 0.08);
}

.admin-layout .el-input__inner,
.admin-layout .el-textarea__inner,
.admin-layout .el-select__placeholder,
.admin-layout .el-input-number input {
  color: var(--admin-text);
}

.admin-layout .el-input__inner::placeholder,
.admin-layout .el-textarea__inner::placeholder {
  color: var(--admin-text-soft);
}

.admin-layout .el-form-item__label,
.admin-layout .el-radio__label,
.admin-layout .el-checkbox__label,
.admin-layout .el-switch__label {
  color: var(--admin-text-muted);
}

.admin-layout .el-table {
  --el-table-border-color: transparent;
  --el-table-tr-bg-color: transparent;
  --el-table-header-bg-color: transparent;
  --el-table-bg-color: transparent;
  --el-table-row-hover-bg-color: rgba(86, 216, 255, 0.06);
  color: var(--admin-text);
}

.admin-layout .el-table::before,
.admin-layout .el-table__inner-wrapper::before {
  display: none;
}

.admin-layout .el-table th.el-table__cell {
  background: transparent;
  color: var(--admin-text-muted);
  font-size: 12px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  border-bottom: 1px solid var(--admin-line);
}

.admin-layout .el-table td.el-table__cell {
  background: transparent;
  border-bottom: 1px solid rgba(135, 211, 255, 0.08);
}

.admin-layout .el-table .cell {
  color: var(--admin-text);
}

.admin-layout .el-drawer {
  background: linear-gradient(180deg, rgba(9, 30, 44, 0.98), rgba(6, 22, 35, 0.98));
}

.admin-layout .el-drawer__header {
  margin-bottom: 0;
  padding: 0;
}

.admin-layout .el-drawer__body {
  padding: 0;
}

.admin-layout .el-form-item {
  margin-bottom: 18px;
}

.admin-sidebar {
  position: relative;
  display: flex;
  flex-direction: column;
  gap: 20px;
  padding: 20px;
  background:
    linear-gradient(180deg, rgba(8, 28, 44, 0.96) 0%, rgba(6, 21, 34, 0.96) 100%);
  border-right: 1px solid rgba(135, 211, 255, 0.14);
  box-shadow: 8px 0 25px rgba(2, 10, 18, 0.2);
  overflow: hidden;
}

.admin-sidebar::after {
  content: '';
  position: absolute;
  inset: 0;
  background:
    linear-gradient(180deg, rgba(86, 216, 255, 0.05), transparent 30%);
  pointer-events: none;
}

.admin-brand,
.admin-nav,
.admin-sidebar__footer {
  position: relative;
  z-index: 1;
}

.admin-brand {
  display: flex;
  align-items: center;
}



.admin-brand__eyebrow,
.admin-page__eyebrow,
.admin-kicker,
.admin-callout__eyebrow {
  margin: 0 0 8px;
  color: var(--admin-accent);
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.2em;
  text-transform: uppercase;
}

.admin-brand__title {
  margin: 0;
  font-size: 22px;
  font-family: 'jingangFont', 'Microsoft YaHei', sans-serif;
  letter-spacing: 0.04em;
}



.admin-nav {
  display: flex;
  flex-direction: column;
  gap: 8px;
  flex: 1;
}

.admin-nav__item {
  display: flex;
  gap: 12px;
  padding: 12px 14px;
  border-radius: 16px;
  text-decoration: none;
  border: 1px solid transparent;
  background: rgba(8, 25, 38, 0.48);
  color: var(--admin-text);
  transition: transform 0.2s ease, border-color 0.2s ease, background 0.2s ease;
}

.admin-nav__item:hover {
  transform: translateX(2px);
  border-color: var(--admin-line);
  background: rgba(10, 33, 50, 0.9);
}

.admin-nav__item.router-link-active {
  background:
    linear-gradient(135deg, rgba(86, 216, 255, 0.16), rgba(9, 32, 47, 0.92));
  border-color: rgba(86, 216, 255, 0.32);
  box-shadow: inset 0 0 0 1px rgba(86, 216, 255, 0.16);
}

.admin-nav__icon {
  display: grid;
  place-items: center;
  width: 40px;
  height: 40px;
  border-radius: 12px;
  background: rgba(86, 216, 255, 0.1);
  color: var(--admin-accent);
  font-size: 16px;
}

.admin-nav__content {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.admin-nav__title {
  font-size: 14px;
  font-weight: 700;
}

.admin-sidebar__footer {
  display: flex;
  flex-direction: column;
  gap: 10px;
  padding: 14px;
  border-radius: 18px;
  border: 1px solid var(--admin-line);
  background: rgba(7, 24, 36, 0.85);
}

.admin-sidebar__meta {
  display: flex;
  justify-content: space-between;
  gap: 10px;
  font-size: 12px;
}

.admin-sidebar__meta-value {
  font-weight: 700;
}

.admin-main {
  min-width: 0;
  display: flex;
  flex-direction: column;
}

.admin-topbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  padding: 20px 24px 0;
}

.admin-topbar__copy h2 {
  margin: 0;
  font-size: 24px;
  font-family: 'jingangFont', 'Microsoft YaHei', sans-serif;
}

.admin-topbar__actions {
  display: flex;
  gap: 12px;
  flex-wrap: wrap;
  justify-content: flex-end;
  align-items: flex-start;
}

.admin-glance-card {
  min-width: 220px;
  padding: 18px 20px;
  border-radius: 22px;
  background: rgba(9, 29, 45, 0.86);
  border: 1px solid var(--admin-line);
  box-shadow: var(--admin-shadow);
}

.admin-glance-card__label {
  display: block;
  margin-bottom: 10px;
  color: var(--admin-text-soft);
  font-size: 12px;
}

.admin-glance-card strong {
  display: block;
  margin-bottom: 6px;
  font-size: 18px;
}

.admin-glance-card span:last-child {
  color: var(--admin-text-muted);
  font-size: 13px;
}

.admin-stage {
  position: relative;
  flex: 1;
  overflow: auto;
  padding: 16px 24px 24px;
}

.admin-page {
  position: relative;
  z-index: 1;
  display: flex;
  flex-direction: column;
  gap: 12px;
  min-height: 100%;
}

.admin-page__hero {
  display: flex;
  justify-content: space-between;
  align-items: flex-end;
  gap: 20px;
  padding: 28px 30px;
  border-radius: 30px;
  background:
    linear-gradient(135deg, rgba(12, 37, 56, 0.92), rgba(8, 22, 34, 0.88));
  border: 1px solid var(--admin-line);
  box-shadow: var(--admin-shadow);
}

.admin-page__copy h1 {
  margin: 0 0 10px;
  font-size: 28px;
}

.admin-page__copy p:last-child {
  margin: 0;
  color: var(--admin-text-muted);
  line-height: 1.7;
  max-width: 720px;
}

.admin-page__actions {
  display: flex;
  gap: 12px;
  flex-wrap: wrap;
  justify-content: flex-end;
}

.admin-stats {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 12px;
}

.admin-stat-card {
  position: relative;
  overflow: hidden;
  padding: 16px 18px;
  border-radius: 16px;
  background: rgba(8, 24, 37, 0.85);
  border: 1px solid var(--admin-line);
  box-shadow: var(--admin-shadow);
}

.admin-stat-card::after {
  content: '';
  position: absolute;
  top: 0;
  right: -8px;
  width: 64px;
  height: 64px;
  border-radius: 999px;
  background: radial-gradient(circle, rgba(86, 216, 255, 0.12), transparent 70%);
}

.admin-stat-card__label {
  display: block;
  margin-bottom: 8px;
  font-size: 11px;
  color: var(--admin-text-soft);
  letter-spacing: 0.08em;
}

.admin-stat-card__value {
  display: block;
  margin-bottom: 4px;
  font-size: 24px;
  font-weight: 700;
}

.admin-stat-card__meta {
  color: var(--admin-text-muted);
  font-size: 12px;
  line-height: 1.4;
}

.admin-callout {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 14px;
  padding: 16px 20px;
  border-radius: 18px;
  border: 1px solid rgba(255, 211, 106, 0.18);
  background: linear-gradient(135deg, rgba(42, 34, 13, 0.72), rgba(16, 27, 34, 0.88));
  box-shadow: var(--admin-shadow);
}

.admin-callout__copy h3 {
  margin: 0 0 4px;
  font-size: 16px;
}

.admin-callout__copy p:last-child {
  margin: 0;
  color: var(--admin-text-muted);
  font-size: 12px;
}

.admin-callout__action {
  flex-shrink: 0;
}

.admin-chip-list {
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
}

.admin-chip {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 10px 14px;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.06);
  border: 1px solid rgba(255, 255, 255, 0.08);
  font-size: 13px;
  color: var(--admin-text-muted);
}

.admin-panel {
  border-radius: 20px;
  border: 1px solid var(--admin-line);
  background: rgba(8, 24, 37, 0.86);
  box-shadow: var(--admin-shadow);
  overflow: hidden;
}

.admin-panel__header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 16px;
  padding: 16px 20px 12px;
}

.admin-panel__title {
  margin: 0;
  font-size: 18px;
}

.admin-panel__desc {
  margin: 0;
  color: var(--admin-text-muted);
  line-height: 1.6;
  font-size: 12px;
}

.admin-toolbar {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
  align-items: center;
  justify-content: flex-end;
}

.admin-toolbar .el-input {
  width: 240px;
}

.admin-table-shell {
  padding: 0 12px 12px;
}

.admin-stack {
  display: flex;
  flex-direction: column;
  gap: 5px;
}

.admin-stack__title {
  font-size: 14px;
  font-weight: 700;
  color: var(--admin-text);
}

.admin-stack__meta {
  font-size: 12px;
  color: var(--admin-text-soft);
}

.admin-pill {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 7px 12px;
  border-radius: 999px;
  font-size: 12px;
  font-weight: 700;
}

.admin-pill--good {
  color: #d7fff1;
  background: rgba(69, 215, 166, 0.16);
  border: 1px solid rgba(69, 215, 166, 0.24);
}

.admin-pill--warn {
  color: #fff0d1;
  background: rgba(255, 184, 107, 0.18);
  border: 1px solid rgba(255, 184, 107, 0.24);
}

.admin-pill--danger {
  color: #ffe2e7;
  background: rgba(255, 124, 136, 0.18);
  border: 1px solid rgba(255, 124, 136, 0.24);
}

.admin-pill--accent {
  color: #dff8ff;
  background: rgba(86, 216, 255, 0.16);
  border: 1px solid rgba(86, 216, 255, 0.22);
}

.admin-row-actions {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}

.admin-primary-button,
.admin-secondary-button,
.admin-ghost-button {
  height: 42px;
  padding: 0 16px;
  border-radius: 14px;
  font-weight: 700;
}

.admin-primary-button {
  color: #04131f;
  border: 0;
  background: linear-gradient(135deg, #56d8ff, #8ef0ff);
  box-shadow: 0 18px 30px rgba(86, 216, 255, 0.18);
}

.admin-secondary-button {
  color: var(--admin-text);
  border: 1px solid var(--admin-line-strong);
  background: rgba(255, 255, 255, 0.04);
}

.admin-ghost-button {
  color: var(--admin-text-muted);
  border: 1px solid transparent;
  background: transparent;
}

.admin-logout-button {
  width: 100%;
}

.admin-editor-drawer {
  color: var(--admin-text);
}

.admin-drawer__header {
  padding: 26px 28px 22px;
  border-bottom: 1px solid var(--admin-line);
  background: rgba(8, 27, 40, 0.86);
}

.admin-drawer__header h3 {
  margin: 0 0 10px;
  font-size: 24px;
}

.admin-drawer__header p {
  margin: 0;
  color: var(--admin-text-muted);
  line-height: 1.6;
}

.admin-form-section {
  padding: 24px 28px 8px;
}

.admin-form-section + .admin-form-section {
  border-top: 1px solid rgba(135, 211, 255, 0.08);
}

.admin-section-title {
  margin: 0 0 16px;
  font-size: 17px;
}

.admin-form-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 0 18px;
}

.admin-form-grid--single {
  grid-template-columns: 1fr;
}

.admin-form-hint {
  margin-top: 6px;
  color: var(--admin-text-soft);
  font-size: 12px;
  line-height: 1.5;
}

.admin-drawer__footer {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
  padding: 18px 28px 26px;
  border-top: 1px solid var(--admin-line);
  background: rgba(8, 27, 40, 0.68);
}

.admin-empty {
  padding: 24px 28px 32px;
  color: var(--admin-text-soft);
}

.admin-fade-enter-active,
.admin-fade-leave-active {
  transition: opacity 0.22s ease, transform 0.22s ease;
}

.admin-fade-enter-from,
.admin-fade-leave-to {
  opacity: 0;
  transform: translateY(10px);
}

@media (max-width: 1320px) {
  .admin-layout {
    grid-template-columns: 280px minmax(0, 1fr);
  }

  .admin-stats {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

@media (max-width: 1080px) {
  .admin-layout {
    grid-template-columns: 1fr;
  }

  .admin-sidebar {
    gap: 20px;
    border-right: 0;
    border-bottom: 1px solid rgba(135, 211, 255, 0.14);
  }

  .admin-topbar,
  .admin-stage {
    padding-left: 20px;
    padding-right: 20px;
  }
}

@media (max-width: 768px) {
  .admin-topbar,
  .admin-page__hero,
  .admin-panel__header,
  .admin-callout {
    flex-direction: column;
    align-items: stretch;
  }



  .admin-glance-card {
    width: 100%;
  }

  .admin-stats {
    grid-template-columns: 1fr;
  }

  .admin-form-grid {
    grid-template-columns: 1fr;
  }

  .admin-toolbar {
    justify-content: stretch;
  }

  .admin-toolbar .el-input {
    width: 100%;
  }

  .admin-drawer__footer {
    flex-direction: column-reverse;
  }
}
</style>
