import request from '@/utils/request';

export const fetchRiskRuleSets = async () => {
  const data = await request.get('/risk-rule-sets');
  return Array.isArray(data) ? data : [];
};

export const fetchRiskRuleSet = (id) => request.get(`/risk-rule-sets/${id}`);

export const createRiskRuleSet = (body) => request.post('/risk-rule-sets', body);

export const updateRiskRuleSet = (id, body) => request.put(`/risk-rule-sets/${id}`, body);

export const publishRiskRuleSet = (id) => request.post(`/risk-rule-sets/${id}/publish`);

export const deleteRiskRuleSet = (id) => request.delete(`/risk-rule-sets/${id}`);
