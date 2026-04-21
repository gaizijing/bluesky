import { analyzeRouteRisk } from "@/api";

const normalizeAnalysisTime = (value) => {
  if (value instanceof Date) {
    return value.toISOString();
  }

  if (typeof value === "string" && value.trim()) {
    return value;
  }

  return new Date().toISOString();
};

export const buildRouteRiskAnalysisParams = (params = {}) => {
  return {
    ...params,
    currentTime: normalizeAnalysisTime(params.currentTime)
  };
};

export const fetchRouteRiskAnalysis = async (routeId, params = {}) => {
  if (!routeId) {
    throw new Error("缺少航线 ID，无法发起风险分析请求。");
  }

  return analyzeRouteRisk(routeId, buildRouteRiskAnalysisParams(params));
};
