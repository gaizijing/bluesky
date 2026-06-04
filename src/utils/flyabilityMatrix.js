import { flyabilityColor } from './flyabilityLevel';

export function formatBucketLabel(iso) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '--:--';
  const h = String(d.getHours()).padStart(2, '0');
  const m = String(d.getMinutes()).padStart(2, '0');
  return `${h}:${m}`;
}

export function formatBucketDate(iso) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  return `${d.getFullYear()}年${d.getMonth() + 1}月${d.getDate()}日 ${formatBucketLabel(iso)}`;
}

export function normalizeLevel(level) {
  const v = String(level || '').toUpperCase();
  if (v === 'GREEN' || v === 'YELLOW' || v === 'RED') return v;
  return 'GRAY';
}

/** landing-matrix → 各起降点时间序列 */
export function parseLandingMatrixOverview(matrixResponse, points = []) {
  const matrix = Array.isArray(matrixResponse?.matrix) ? matrixResponse.matrix : [];
  const byPoint = new Map();

  for (const cell of matrix) {
    const id = cell.landingPointId;
    if (!id) continue;
    if (!byPoint.has(id)) byPoint.set(id, []);
    byPoint.get(id).push({
      time: formatBucketLabel(cell.bucketTime),
      bucketTime: cell.bucketTime,
      level: normalizeLevel(cell.level),
    });
  }

  for (const cells of byPoint.values()) {
    cells.sort((a, b) => new Date(a.bucketTime) - new Date(b.bucketTime));
  }

  return points.map((p) => {
    const id = p.id || p.landingPointId;
    const slots = byPoint.get(id) || [];
    const currentLevel = slots[0]?.level || 'GRAY';
    return {
      id,
      name: p.name,
      type: p.type,
      typeLabel: p.type === 'operation' ? '作业点' : '起降点',
      slots,
      currentLevel,
    };
  });
}

/** 统计当前桶各等级数量 */
export function countLevels(items, levelKey = 'currentLevel') {
  const counts = { GREEN: 0, YELLOW: 0, RED: 0, GRAY: 0 };
  for (const item of items) {
    const lv = normalizeLevel(item[levelKey]);
    counts[lv] = (counts[lv] || 0) + 1;
  }
  return counts;
}

/** 多航路 route-matrix → 矩阵 { timeRows, routes, cells } */
export function parseRouteMatrixOverview(routeRecords, matrixList) {
  const routes = routeRecords.map((r, i) => ({
    id: r.routeId || r.id,
    name: r.name || `${r.startName || '起点'}-${r.endName || '终点'}`,
    matrix: matrixList[i],
  }));

  const timeSet = new Map();
  for (const route of routes) {
    const cells = route.matrix?.matrix || [];
    for (const cell of cells) {
      const key = String(cell.bucketTime);
      if (!timeSet.has(key)) {
        timeSet.set(key, {
          bucketTime: cell.bucketTime,
          label: formatBucketLabel(cell.bucketTime),
        });
      }
    }
  }

  const timeRows = [...timeSet.values()].sort(
    (a, b) => new Date(a.bucketTime) - new Date(b.bucketTime)
  );

  const grid = timeRows.map((row) => ({
    ...row,
    cells: routes.map((route) => {
      const match = (route.matrix?.matrix || []).find(
        (c) => String(c.bucketTime) === String(row.bucketTime)
      );
      return {
        routeId: route.id,
        level: normalizeLevel(match?.level),
        label: row.label,
      };
    }),
  }));

  const routeRows = routes.map((route) => {
    const cells = [...(route.matrix?.matrix || [])].sort(
      (a, b) => new Date(a.bucketTime) - new Date(b.bucketTime)
    );
    return {
      id: route.id,
      name: route.name,
      slots: cells.map((c) => ({
        bucketTime: c.bucketTime,
        label: formatBucketLabel(c.bucketTime),
        level: normalizeLevel(c.level),
      })),
    };
  });

  return {
    routes,
    routeRows,
    timeRows,
    grid,
    bucketTime: matrixList[0]?.bucketTime,
  };
}

export { flyabilityColor };
