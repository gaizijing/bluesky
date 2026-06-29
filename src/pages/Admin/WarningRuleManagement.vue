<template>
  <RuleSetCrudPanel
    :embedded="embedded"
    title="预警规则集"
    description="配置 l1Rules：气象因子满足条件时触发对应等级预警"
    publish-hint="发布后将在下一时间桶生效，新预警按最新规则评估。"
    :default-rules="DEFAULT_RULES"
    :field-docs="FIELD_DOCS"
    :format-rules="formatWarningRules"
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
} from '@/api/v2/warningRuleSet';

defineProps({
  embedded: { type: Boolean, default: false },
});

const DEFAULT_RULES = {
  l1Rules: [
    { factor: 'windSpeedMs', operator: 'gte', threshold: 10, level: 'medium' },
    { factor: 'visibilityKm', operator: 'lte', threshold: 2, level: 'medium' },
    { factor: 'windSpeedMs', operator: 'gte', threshold: 12, level: 'high' },
  ],
};

const FIELD_DOCS = [
  {
    key: 'l1Rules[].factor',
    desc: 'windSpeedMs 风速、visibilityKm 能见度、precipMmH 降水、windShearMs 风切变',
  },
  { key: 'l1Rules[].operator', desc: 'gte（≥）或 lte（≤）' },
  { key: 'l1Rules[].threshold', desc: '触发阈值' },
  { key: 'l1Rules[].level', desc: 'low / medium / high' },
];

const LEGACY_TYPE_FACTOR = {
  WIND: 'windSpeedMs',
  VISIBILITY: 'visibilityKm',
  PRECIP: 'precipMmH',
  RAIN: 'precipMmH',
  WIND_SHEAR: 'windShearMs',
  WINDSHEAR: 'windShearMs',
};

function normalizeLevel(raw) {
  const level = String(raw || 'medium').trim().toLowerCase();
  if (level === 'red' || level === 'high') return 'high';
  if (level === 'yellow' || level === 'medium') return 'medium';
  if (level === 'green' || level === 'low') return 'low';
  return level;
}

function coerceRuleRow(rule) {
  return {
    factor: String(rule.factor || '').trim(),
    operator: rule.operator ? String(rule.operator).trim() : 'gte',
    threshold: rule.threshold,
    level: normalizeLevel(rule.level),
  };
}

/** 查看/编辑时统一展示 l1Rules 新格式（兼容旧 rules / l2Rules） */
function formatWarningRules(raw) {
  if (!raw || typeof raw !== 'object') {
    return { l1Rules: [] };
  }
  if (Array.isArray(raw.l1Rules) && raw.l1Rules.length) {
    return { l1Rules: raw.l1Rules.map(coerceRuleRow) };
  }

  const l1Rules = [];

  if (Array.isArray(raw.rules)) {
    for (const rule of raw.rules) {
      const type = String(rule.type || '').trim().toUpperCase();
      l1Rules.push({
        factor: LEGACY_TYPE_FACTOR[type] || 'windSpeedMs',
        operator: 'gte',
        threshold: rule.threshold,
        level: 'high',
      });
    }
  }

  if (Array.isArray(raw.l2Rules)) {
    for (const rule of raw.l2Rules) {
      l1Rules.push({ ...coerceRuleRow(rule), level: 'high' });
    }
  }

  return l1Rules.length ? { l1Rules } : DEFAULT_RULES;
}

const api = {
  list: fetchWarningRuleSets,
  create: createWarningRuleSet,
  update: updateWarningRuleSet,
  publish: publishWarningRuleSet,
  delete: deleteWarningRuleSet,
};
</script>
