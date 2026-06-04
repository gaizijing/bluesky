export const FLYABILITY_COLORS = {
  GREEN: '#31d158',
  YELLOW: '#f97316',
  RED: '#e25151',
  GRAY: '#64748b',
};

export function flyabilityColor(level) {
  return FLYABILITY_COLORS[String(level || '').toUpperCase()] || FLYABILITY_COLORS.GRAY;
}

export function flyabilityLabel(level) {
  const map = { GREEN: '适飞', YELLOW: '注意', RED: '禁飞', GRAY: '无数据' };
  return map[String(level || '').toUpperCase()] || '未知';
}

/** 起降场总览图例文案 */
export function landingOverviewLabel(level) {
  const map = { GREEN: '适航', YELLOW: '临界', RED: '不适航', GRAY: '无数据' };
  return map[String(level || '').toUpperCase()] || '无数据';
}

/** 航路矩阵图例文案 */
export function routeOverviewLabel(level) {
  const map = { GREEN: '正常', YELLOW: '警告', RED: '严重', GRAY: '无数据' };
  return map[String(level || '').toUpperCase()] || '无数据';
}

export function flyabilityClass(level) {
  return String(level || 'GREEN').toLowerCase();
}

/** 从 landing-matrix 响应取当前桶（第一条 bucket）各起降点单元格 */
export function currentBucketLandingCells(matrixResponse, landingCount) {
  const matrix = matrixResponse?.matrix;
  if (!Array.isArray(matrix) || !matrix.length) return [];
  const n = landingCount || new Set(matrix.map((c) => c.landingPointId)).size;
  return matrix.slice(0, Math.max(1, n));
}

/** route-matrix 当前桶单元格 */
export function currentBucketRouteCell(matrixResponse) {
  const matrix = matrixResponse?.matrix;
  if (!Array.isArray(matrix) || !matrix.length) return null;
  return matrix[0];
}
