import request from '@/utils/request';

export const fetchWarningRuleSets = async () => {
  const data = await request.get('/warning-rule-sets');
  return Array.isArray(data) ? data : [];
};

export const fetchWarningRuleSet = (id) => request.get(`/warning-rule-sets/${id}`);

export const createWarningRuleSet = (body) => request.post('/warning-rule-sets', body);

export const updateWarningRuleSet = (id, body) => request.put(`/warning-rule-sets/${id}`, body);

export const publishWarningRuleSet = (id) => request.post(`/warning-rule-sets/${id}/publish`);

export const enableWarningRuleLlm = (id, enabled) =>
  request.post(`/warning-rule-sets/${id}/enable-llm`, null, { params: { enabled } });

export const deleteWarningRuleSet = (id) => request.delete(`/warning-rule-sets/${id}`);
