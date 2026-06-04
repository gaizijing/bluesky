<template>
  <header class="dash-header" :style="headerStyle">
    <div class="dash-header__left">
      <div class="dash-header__logo">
        <img src="@/assets/icons/logo.png" alt="logo" />
      </div>
    </div>
    <div class="dash-header__title">{{ appTitle }}</div>
    <div class="dash-header__right">
      <HeaderClock />
      <HeaderWarningBell />
      <HeaderUserMenu />
    </div>
  </header>
</template>

<script setup>
import { computed } from 'vue';
import dashboardConfig from '@/config/dashboard.config.json';
import HeaderClock from './HeaderClock.vue';
import HeaderWarningBell from './HeaderWarningBell.vue';
import HeaderUserMenu from './HeaderUserMenu.vue';

const height = dashboardConfig.header.height ?? 88;
const appTitle = import.meta.env.VITE_APP_TITLE || '低空气象服务';

const headerStyle = computed(() => ({
  height: `${height}px`,
  '--dash-header-height': `${height}px`,
}));
</script>

<style scoped lang="scss">
.dash-header {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  z-index: 20;
  display: flex;
  align-items: center;
  padding: 0 20px;
  color: #fff;
  background: url('@/assets/images/bg_header.png') center/cover no-repeat;
  box-sizing: border-box;
}

.dash-header__left,
.dash-header__right {
  display: flex;
  align-items: center;
  gap: 18px;
  flex: 1;
  min-width: 0;
}

.dash-header__right {
  justify-content: flex-end;
}

.dash-header__title {
  flex: 0 1 auto;
  font-size: 32px;
  line-height: 1;
  font-family: 'jingangFont', sans-serif;
  font-style: italic;
  text-shadow: 0 0 6px rgba(34, 101, 255, 0.3), 0 0 12px #182e3f;
  white-space: nowrap;
}

.dash-header__logo {
  display: flex;
  align-items: center;
  margin-bottom: 6px;
}

.dash-header__logo img {
  height: 46px;
  width: auto;
}
</style>
