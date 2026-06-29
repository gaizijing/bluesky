<template>
  <div class="admin-page rule-set-management">
    <section class="admin-panel rule-set-management__tabs">
      <el-tabs :model-value="activeTab" @tab-change="onTabChange">
        <el-tab-pane label="适飞规则集" name="flyability" lazy>
          <FlyabilityRuleManagement embedded />
        </el-tab-pane>
        <el-tab-pane label="预警规则集" name="warning" lazy>
          <WarningRuleManagement embedded />
        </el-tab-pane>
      </el-tabs>
    </section>
  </div>
</template>

<script setup>
import { computed } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import FlyabilityRuleManagement from './FlyabilityRuleManagement.vue';
import WarningRuleManagement from './WarningRuleManagement.vue';

const TAB_NAMES = ['flyability', 'warning'];

const route = useRoute();
const router = useRouter();

const activeTab = computed(() => {
  const tab = route.query.tab;
  if (tab === 'risk') return 'flyability';
  return TAB_NAMES.includes(tab) ? tab : 'flyability';
});

function onTabChange(name) {
  if (name === activeTab.value) return;
  router.replace({ path: route.path, query: { tab: name } });
}
</script>

<style scoped lang="scss">
.rule-set-management__tabs {
  padding: 8px 20px 20px;
}

.rule-set-management__tabs :deep(.el-tabs__header) {
  margin-bottom: 16px;
}

.rule-set-management__tabs :deep(.el-tabs__nav-wrap::after) {
  background-color: rgba(135, 211, 255, 0.14);
}

.rule-set-management__tabs :deep(.el-tabs__item) {
  color: rgba(194, 225, 242, 0.65);
  font-size: 14px;
}

.rule-set-management__tabs :deep(.el-tabs__item.is-active) {
  color: #dff8ff;
}

.rule-set-management__tabs :deep(.el-tabs__active-bar) {
  background-color: #56d8ff;
}

.rule-set-management__tabs :deep(.admin-panel) {
  background: transparent;
  border: none;
  box-shadow: none;
  padding: 0;
}
</style>
