/**
 * API 统一出口：实现已拆分至 domain 模块与 api/v2/*。
 * 旧 @/api 引用保持兼容，V1 路径（heatmap/geo、citywide 等）已移除。
 */
export { resolveRegionId, readRegionIdFromStorage, setCurrentRegionId as setRegionIdInStorage } from './regionContext';

export * from './weather';
export * from './flyability';
export * from './risk';
export * from './scheduler';
export * from './v2/region';
export * from './v2/landing';
export * from './v2/route';
export * from './v2/risk';
export * from './v2/warning';
export * from './v2/device';
export * from './v2/camera';
export * from './v2/aircraft';
export * from './v2/user';
export * from './v2/sim';
export * from './v2/ai';
export * from './v2/riskRuleSet';
export * from './v2/warningRuleSet';
export * from './v2/noFlyZone';

/** 兼容旧命名 */
export { fetchWeatherPoint as getWeatherByCoords } from './weather';
export { fetchForecastTrend as getWeatherForecastTrend } from './weather';
