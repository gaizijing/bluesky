<template>
  <RuleSetCrudPanel
    title="R_met 规则集"
    description="管理 R_met 因子权重与阈值，发布后 Dashboard 风险热力图将引用最新已发布版本"
    publish-hint="发布后将在下一时间桶生效，MetViz R_met 图层与风险热力图将更新。"
    :default-rules="DEFAULT_RULES"
    :field-docs="FIELD_DOCS"
    :api="api"
  />
</template>

<script setup>
import RuleSetCrudPanel from '@/components/admin/RuleSetCrudPanel.vue';
import {
  fetchRiskRuleSets,
  createRiskRuleSet,
  updateRiskRuleSet,
  publishRiskRuleSet,
  deleteRiskRuleSet,
} from '@/api/v2/riskRuleSet';

const DEFAULT_RULES = {
  factors: [
    { name: 'wind', weight: 0.4, thresholds: { medium: 8, high: 12 } },
    { name: 'windShear', weight: 0.3, thresholds: { medium: 3, high: 5 } },
    { name: 'visibility', weight: 0.3, thresholds: { medium: 3, high: 1 } },
  ],
  outputCap: 100,
};

const FIELD_DOCS = [
  { key: 'factors[]', desc: '因子名、权重 weight、阈值 thresholds.medium/high' },
  { key: 'outputCap', desc: 'R_met 输出上限，通常 100' },
];

const api = {
  list: fetchRiskRuleSets,
  create: createRiskRuleSet,
  update: updateRiskRuleSet,
  publish: publishRiskRuleSet,
  delete: deleteRiskRuleSet,
};
</script>
