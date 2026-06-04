<template>
  <RuleSetCrudPanel
    title="预警规则集"
    description="配置 L1/L2 预警触发规则；L2 可启用 LLM 解读（需后端 LLM 配置）"
    publish-hint="发布后将在下一时间桶生效，新预警按最新规则评估。"
    :default-rules="DEFAULT_RULES"
    :field-docs="FIELD_DOCS"
    show-llm-column
    :api="api"
  />
</template>

<script setup>
import RuleSetCrudPanel from '@/components/admin/RuleSetCrudPanel.vue';
import {
  fetchWarningRuleSets,
  createWarningRuleSet,
  updateWarningRuleSet,
  publishWarningRuleSet,
  deleteWarningRuleSet,
  enableWarningRuleLlm,
} from '@/api/v2/warningRuleSet';

const DEFAULT_RULES = {
  l1Rules: [
    { factor: 'windSpeedMs', operator: 'gte', threshold: 10, level: 'YELLOW' },
    { factor: 'visibilityKm', operator: 'lte', threshold: 2, level: 'YELLOW' },
  ],
  l2Rules: [
    { factor: 'windSpeedMs', operator: 'gte', threshold: 12, level: 'RED', enableLlm: true },
  ],
};

const FIELD_DOCS = [
  { key: 'l1Rules', desc: '一般预警规则列表' },
  { key: 'l2Rules', desc: '严重预警规则，可设 enableLlm: true' },
  { key: 'factor', desc: 'windSpeedMs / visibilityKm / precipMmH 等' },
];

const api = {
  list: fetchWarningRuleSets,
  create: createWarningRuleSet,
  update: updateWarningRuleSet,
  publish: publishWarningRuleSet,
  delete: deleteWarningRuleSet,
  enableLlm: enableWarningRuleLlm,
};
</script>
