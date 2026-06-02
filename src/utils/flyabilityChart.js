/**
 * 将 P1 /flyability/landing-matrix 转为适飞热力图组件所需结构（仅 UI 层，非 API 兼容）
 */
const CHART_FACTORS = ['综合', '风', '风切变', '颠簸指数', '湍流', '降水', '能见度'];

const FACTOR_KEY_MAP = {
  风: 'windSpeedMs',
  降水: 'precipMmH',
  能见度: 'visibilityKm',
};

function formatBucketTime(iso) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '--:--';
  const h = String(d.getHours()).padStart(2, '0');
  const m = String(d.getMinutes()).padStart(2, '0');
  return `${h}:${m}`;
}

function levelToStatus(level) {
  return level === 'GREEN' ? 1 : 0;
}

function levelToScore(level) {
  if (level === 'GREEN') return 100;
  if (level === 'YELLOW') return 60;
  return 30;
}

export function matrixToChartData(response, landingPointId) {
  if (!response?.matrix?.length) return null;

  let cells = response.matrix;
  if (landingPointId) {
    cells = cells.filter((c) => c.landingPointId === landingPointId);
  }
  if (!cells.length) return null;

  cells = [...cells].sort(
    (a, b) => new Date(a.bucketTime).getTime() - new Date(b.bucketTime).getTime()
  );

  const slotCount = cells.length;
  const timeLabels = cells.map((c) => formatBucketTime(c.bucketTime));
  if (timeLabels.length) {
    const last = new Date(cells[cells.length - 1].bucketTime);
    timeLabels.push(formatBucketTime(new Date(last.getTime() + 15 * 60 * 1000)));
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
        statusRow.push(levelToStatus(cell.level));
        valueRow.push(levelToScore(cell.level));
        unitRow.push('');
        continue;
      }

      const key = FACTOR_KEY_MAP[name];
      if (!key) {
        statusRow.push(1);
        valueRow.push(0);
        unitRow.push('');
        continue;
      }

      const factor = factorResults.find((f) => f.factor === key);
      if (!factor) {
        statusRow.push(1);
        valueRow.push(0);
        unitRow.push('');
        continue;
      }

      statusRow.push(levelToStatus(factor.level));
      valueRow.push(Number(factor.value) || 0);
      unitRow.push(name === '风' ? 'm/s' : name === '能见度' ? 'km' : name === '降水' ? 'mm/h' : '');
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
    timeInterval: 15,
    totalHours: Math.ceil(slotCount / 4),
    ruleVersion: response.ruleVersion,
    isStale: response.isStale,
    metadata: {
      bucketTime: response.bucketTime,
      computedAt: response.computedAt,
    },
  };
}
