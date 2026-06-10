/**
 * 将 P1 /flyability/landing-matrix 转为适飞热力图组件所需结构（仅 UI 层，非 API 兼容）
 */
import { FLYABILITY_COLORS } from './flyabilityLevel';
import { normalizeLevel } from './flyabilityMatrix';

export const FLYABILITY_BUCKET_MINUTES = 15;
export const FLYABILITY_OVERVIEW_HOURS = 2;
/** 总览 / 下钻矩阵统一展示 6 个 15min 时间格（一行） */
export const FLYABILITY_MATRIX_SLOT_LIMIT = 6;
export const FLYABILITY_DRILL_SLOTS = FLYABILITY_MATRIX_SLOT_LIMIT;

const CHART_FACTORS = ['综合', '风', '风切变', '颠簸指数', '湍流', '降水', '能见度'];

const FACTOR_KEY_MAP = {
  风: 'windSpeedMs',
  风切变: 'windShearMs',
  颠簸指数: 'turbulenceIndex',
  湍流: 'turbulence',
  降水: 'precipMmH',
  能见度: 'visibilityKm',
};

/** 与总览色带一致：GREEN=2, YELLOW=1, RED=0, GRAY=-1 */
export function levelToChartStatus(level) {
  const lv = String(level || '').toUpperCase();
  if (lv === 'GREEN') return 2;
  if (lv === 'YELLOW') return 1;
  if (lv === 'RED') return 0;
  return -1;
}

export function chartStatusColor(status) {
  const map = {
    2: FLYABILITY_COLORS.GREEN,
    1: FLYABILITY_COLORS.YELLOW,
    0: FLYABILITY_COLORS.RED,
    [-1]: FLYABILITY_COLORS.GRAY,
  };
  return map[Number(status)] ?? FLYABILITY_COLORS.GRAY;
}

export function chartStatusLabel(status) {
  const map = { 2: '适航', 1: '临界', 0: '不适航', [-1]: '无数据' };
  return map[Number(status)] ?? '无数据';
}

function formatBucketTime(iso) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '--:--';
  const h = String(d.getHours()).padStart(2, '0');
  const m = String(d.getMinutes()).padStart(2, '0');
  return `${h}:${m}`;
}

function levelToScore(level) {
  const status = levelToChartStatus(level);
  if (status === 2) return 100;
  if (status === 1) return 60;
  if (status === 0) return 30;
  return 0;
}

export function matrixToChartData(response, landingPointId, options = {}) {
  if (!response?.matrix?.length) return null;

  let cells = response.matrix;
  if (landingPointId) {
    const pointId = String(landingPointId);
    cells = cells.filter((c) => String(c.landingPointId) === pointId);
  }
  if (!cells.length) return null;

  cells = [...cells].sort(
    (a, b) => new Date(a.bucketTime).getTime() - new Date(b.bucketTime).getTime()
  );

  const maxSlots = options.maxSlots;
  if (Number.isFinite(maxSlots) && maxSlots > 0 && cells.length > maxSlots) {
    cells = cells.slice(0, maxSlots);
  }

  const slotCount = cells.length;
  const timeLabels = cells.map((c) => formatBucketTime(c.bucketTime));
  if (timeLabels.length) {
    const last = new Date(cells[cells.length - 1].bucketTime);
    timeLabels.push(formatBucketTime(new Date(last.getTime() + FLYABILITY_BUCKET_MINUTES * 60 * 1000)));
  }

  const statusData = [];
  const valueData = [];
  const unitData = [];

  CHART_FACTORS.forEach((name) => {
    const statusRow = [];
    const valueRow = [];
    const unitRow = [];

    for (let i = 0; i < slotCount; i++) {
      const cell = cells[i];
      const factorResults = cell.factorResults || [];

      if (name === '综合') {
        statusRow.push(levelToChartStatus(normalizeLevel(cell.level)));
        valueRow.push(levelToScore(cell.level));
        unitRow.push('');
        continue;
      }

      const key = FACTOR_KEY_MAP[name];
      if (!key) {
        statusRow.push(-1);
        valueRow.push(0);
        unitRow.push('');
        continue;
      }

      const factor = factorResults.find((f) => f.factor === key);
      if (!factor) {
        statusRow.push(-1);
        valueRow.push(0);
        unitRow.push('');
        continue;
      }

      statusRow.push(levelToChartStatus(normalizeLevel(factor.level)));
      valueRow.push(Number(factor.value) || 0);
      unitRow.push(
        name === '风' || name === '风切变' ? 'm/s'
        : name === '能见度' ? 'km'
        : name === '降水' ? 'mm/h'
        : ''
      );
    }

    statusData.push(statusRow);
    valueData.push(valueRow);
    unitData.push(unitRow);
  });

  return {
    factors: CHART_FACTORS,
    statusData,
    valueData,
    unitData,
    timeLabels,
    timeInterval: FLYABILITY_BUCKET_MINUTES,
    bucketStartTime: cells[0]?.bucketTime,
    totalHours: Math.ceil(slotCount / (60 / FLYABILITY_BUCKET_MINUTES)),
    ruleVersion: response.ruleVersion,
    isStale: response.isStale,
    metadata: {
      bucketTime: response.bucketTime,
      computedAt: response.computedAt,
    },
  };
}
