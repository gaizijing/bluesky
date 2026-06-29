<template>
  <RuleSetCrudPanel
    :embedded="embedded"
    title="适飞规则集"
    description="维护各气象因子 low/medium/high 阈值；R_met 热力图共用阈值，权重写在 rMet 段"
    publish-hint="发布后适飞矩阵与 R_met 热力图将在下一时间桶重算。"
    :default-rules="DEFAULT_RULES"
    :field-docs="FIELD_DOCS"
    :api="api"
  />
</template>

<script setup>
import RuleSetCrudPanel from '@/components/admin/RuleSetCrudPanel.vue';
import {
  fetchFlyabilityRuleSets,
  createFlyabilityRuleSet,
  updateFlyabilityRuleSet,
  publishFlyabilityRuleSet,
  deleteFlyabilityRuleSet,
} from '@/api/flyability';

defineProps({
  embedded: { type: Boolean, default: false },
});

const DEFAULT_RULES = {
  windSpeedMs: { medium: 8, high: 12 },
  windShearMs: { medium: 3, high: 5 },
  turbulenceIndex: { medium: 0.35, high: 0.6 },
  turbulence: { medium: 0.35, high: 0.6 },
  visibilityKm: { medium: 3, low: 1 },
  precipMmH: { medium: 2, high: 5 },
  cloudBaseM: { medium: 300, low: 150 },
  temperatureC: { low: -10, high: 40 },
  rMet: {
    factors: [
      { name: 'windSpeedMs', weight: 0.4 },
      { name: 'windShearMs', weight: 0.3 },
      { name: 'visibilityKm', weight: 0.3 },
    ],
  },
};

const FIELD_DOCS = [
  {
    key: 'rMet.factors[].name',
    desc: '参与 R_met 加权的因子键，须与顶层阈值字段一致：windSpeedMs 风速、windShearMs 风切变、visibilityKm 能见度、precipMmH 降水、cloudBaseM 云底高度、temperatureC 气温、turbulence / turbulenceIndex 湍流',
  },
];

const api = {
  list: fetchFlyabilityRuleSets,
  create: createFlyabilityRuleSet,
  update: updateFlyabilityRuleSet,
  publish: publishFlyabilityRuleSet,
  delete: deleteFlyabilityRuleSet,
};
</script>
