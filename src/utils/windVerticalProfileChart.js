/**
 * 时间 × 高度 风廓线图：彩色风羽（无热力底图）
 * 高度 100–3000m，50m 间隔；横轴与 1H 适飞分析一致（15min × 6 格）
 */

import {
  FLYABILITY_BUCKET_MINUTES,
  FLYABILITY_DRILL_SLOTS,
} from './flyabilityChart';

const DIRECTION_LABELS = ['北', '东北', '东', '东南', '南', '西南', '西', '西北'];

const BARB_STAFF_LEN = 28;
const BARB_LINE_WIDTH = 2.4;
const BARB_FEATHER_SCALE = 1.55;

/** 风速 → 风羽颜色（与样例蓝→黄→红一致） */
const SPEED_COLOR_STOPS = [
  { speed: 0, color: '#1d4ed8' },
  { speed: 3, color: '#2563eb' },
  { speed: 6, color: '#38bdf8' },
  { speed: 9, color: '#22d3ee' },
  { speed: 12, color: '#eab308' },
  { speed: 15, color: '#f97316' },
  { speed: 18, color: '#ef4444' },
];

export function directionLabel(deg) {
  const n = Number(deg);
  if (!Number.isFinite(n)) return '—';
  return DIRECTION_LABELS[Math.round(n / 45) % 8];
}

export function speedToColor(speed) {
  const v = Math.max(0, Number(speed) || 0);
  for (let i = SPEED_COLOR_STOPS.length - 1; i >= 0; i -= 1) {
    if (v >= SPEED_COLOR_STOPS[i].speed) return SPEED_COLOR_STOPS[i].color;
  }
  return SPEED_COLOR_STOPS[0].color;
}

function pad2(n) {
  return String(n).padStart(2, '0');
}

export function formatProfileTime(date) {
  const d = date instanceof Date ? date : new Date(date);
  if (Number.isNaN(d.getTime())) return '—';
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())} ${pad2(d.getHours())}:${pad2(d.getMinutes())}:${pad2(d.getSeconds())}`;
}

function formatAxisTime(date) {
  const d = date instanceof Date ? date : new Date(date);
  return `${pad2(d.getHours())}:${pad2(d.getMinutes())}`;
}

export const PROFILE_HEIGHT_STEP_M = 50;

/** 100–3000m，50m 一层 */
export function buildProfileHeights(minM = 100, maxM = 3000, stepM = PROFILE_HEIGHT_STEP_M) {
  const heights = [];
  for (let h = minM; h <= maxM; h += stepM) {
    heights.push(h);
  }
  return heights;
}

function alignToBucket(date) {
  const d = new Date(date);
  const step = FLYABILITY_BUCKET_MINUTES;
  d.setMinutes(d.getMinutes() - (d.getMinutes() % step), 0, 0);
  d.setSeconds(0, 0);
  return d;
}

/** 与 1H 适飞分析相同：slotCount 个桶 + slotCount+1 个边界时刻标签 */
export function buildProfileTimeAxis(startTime, slotCount = FLYABILITY_DRILL_SLOTS) {
  const base = alignToBucket(startTime instanceof Date ? startTime : new Date(startTime));
  const stepMs = FLYABILITY_BUCKET_MINUTES * 60 * 1000;
  const times = [];
  const timeLabels = [];

  for (let i = 0; i < slotCount; i += 1) {
    times.push(new Date(base.getTime() + i * stepMs));
  }
  for (let i = 0; i <= slotCount; i += 1) {
    timeLabels.push(formatAxisTime(new Date(base.getTime() + i * stepMs)));
  }

  return { times, timeLabels, slotCount, bucketStart: base };
}

function pushCell({ barbData, cells, tIdx, time, height, speed, direction, verticalSpeed }) {
  barbData.push([
    tIdx,
    height,
    Number(speed.toFixed(2)),
    Number(direction.toFixed(1)),
    Number(verticalSpeed.toFixed(2)),
  ]);
  cells[`${tIdx}_${height}`] = {
    time,
    height,
    speed,
    direction,
    verticalSpeed,
    color: speedToColor(speed),
  };
}

/**
 * 生成 mock 格点（7 时刻 × 97 高度层）
 */
export function buildMockWindProfileGrid(options = {}) {
  const {
    startTime = new Date(),
    slotCount = FLYABILITY_DRILL_SLOTS,
    heights = buildProfileHeights(),
  } = options;

  const { times, timeLabels } = buildProfileTimeAxis(startTime, slotCount);
  const barbData = [];
  const cells = {};

  heights.forEach((height, hIdx) => {
    times.forEach((time, tIdx) => {
      const phase = tIdx * 0.55 + hIdx * 0.38;
      const speed = Math.max(
        0.8,
        1.8 + (height / 3000) * 9 + Math.sin(phase) * 2.2 + Math.cos(phase * 0.85) * 1.1,
      );
      const direction = (158 + hIdx * 5.5 + tIdx * 3.2 + Math.sin(phase * 1.15) * 22 + 360) % 360;
      const verticalSpeed = Math.sin(phase * 0.95) * 0.65 + Math.cos(phase * 0.4) * 0.2;

      pushCell({ barbData, cells, tIdx, time, height, speed, direction, verticalSpeed });
    });
  });

  return {
    timeLabels,
    slotCount,
    heights,
    heightMin: heights[0],
    heightMax: heights[heights.length - 1],
    times,
    barbData,
    cells,
  };
}

export function adaptVerticalProfileResponse(res, timelineTime) {
  if (res?.grid?.times?.length && res?.grid?.heights?.length) {
    return normalizeProfileGrid(res.grid);
  }

  const layers = Array.isArray(res?.heightLayers) ? res.heightLayers : [];
  if (!layers.length) {
    return buildMockWindProfileGrid({
      startTime: timelineTime ? new Date(timelineTime) : new Date(),
    });
  }

  const sorted = [...layers].sort((a, b) => Number(a.height) - Number(b.height));
  const heights = buildProfileHeights();
  const { times, timeLabels, slotCount } = buildProfileTimeAxis(
    timelineTime ? new Date(timelineTime) : new Date(),
  );
  const barbData = [];
  const cells = {};

  heights.forEach((height, hIdx) => {
    const layer = sorted.reduce((best, item) => {
      const diff = Math.abs(Number(item.height) - height);
      const bestDiff = Math.abs(Number(best?.height) - height);
      return diff < bestDiff ? item : best;
    }, sorted[0]);
    const baseSpeed = Number(layer?.windSpeed) || 3;
    const baseDir = Number(layer?.windDirection ?? layer?.windDir ?? 180) || 180;

    times.forEach((time, tIdx) => {
      const speed = Math.max(0.8, baseSpeed + Math.sin(tIdx * 0.5 + hIdx) * 1.2);
      const direction = (baseDir + tIdx * 3 + hIdx * 2 + 360) % 360;
      const verticalSpeed = Math.sin(tIdx + hIdx) * 0.4;

      pushCell({ barbData, cells, tIdx, time, height, speed, direction, verticalSpeed });
    });
  });

  return {
    timeLabels,
    slotCount,
    heights,
    heightMin: heights[0],
    heightMax: heights[heights.length - 1],
    times,
    barbData,
    cells,
  };
}

export function normalizeProfileGrid(grid) {
  const times = (grid.times || []).map((t) => new Date(t));
  const slotCount = times.length;
  const timeLabels = [];
  if (times.length) {
    const stepMs = FLYABILITY_BUCKET_MINUTES * 60 * 1000;
    for (let i = 0; i <= slotCount; i += 1) {
      const t = i < slotCount
        ? times[i]
        : new Date(times[slotCount - 1].getTime() + stepMs);
      timeLabels.push(formatAxisTime(t));
    }
  }
  const heights = grid.heights || [];
  const barbData = [];
  const cells = {};

  heights.forEach((height, hIdx) => {
    times.forEach((time, tIdx) => {
      const speed = grid.windSpeed?.[hIdx]?.[tIdx] ?? 0;
      const direction = grid.windDirection?.[hIdx]?.[tIdx] ?? 0;
      const verticalSpeed = grid.verticalSpeed?.[hIdx]?.[tIdx] ?? 0;

      pushCell({ barbData, cells, tIdx, time, height, speed, direction, verticalSpeed });
    });
  });

  return {
    timeLabels,
    slotCount,
    heights,
    heightMin: heights[0],
    heightMax: heights[heights.length - 1],
    times,
    barbData,
    cells,
  };
}

function s(value) {
  return value * BARB_FEATHER_SCALE;
}

function makeHalfBarb(x, color, lineWidth) {
  return {
    type: 'line',
    shape: { x1: x, y1: 0, x2: x - s(5), y2: s(4.5) },
    style: { stroke: color, lineWidth, lineCap: 'round' },
  };
}

function makeFullBarb(x, color, lineWidth) {
  return {
    type: 'line',
    shape: { x1: x, y1: 0, x2: x - s(6.5), y2: s(6.5) },
    style: { stroke: color, lineWidth, lineCap: 'round' },
  };
}

function makePennant(x, color) {
  return {
    type: 'polygon',
    shape: {
      points: [
        [x, 0],
        [x - s(5), 0],
        [x, s(6.5)],
      ],
    },
    style: { fill: color, stroke: color, lineWidth: 0.8 },
  };
}

/** 气象风羽：杆指向风来向，羽/旗在杆一侧表示风速 */
export function buildWindBarbGraphic(speedMps, options = {}) {
  const color = options.color ?? '#ffffff';
  const lineWidth = options.lineWidth ?? BARB_LINE_WIDTH;
  const staffLen = options.staffLen ?? BARB_STAFF_LEN;
  const children = [];

  children.push({
    type: 'line',
    shape: { x1: -staffLen / 2, y1: 0, x2: staffLen / 2, y2: 0 },
    style: {
      stroke: color,
      lineWidth,
      lineCap: 'round',
      shadowBlur: options.shadowBlur ?? 0,
      shadowColor: options.shadowColor ?? 'transparent',
    },
  });

  let pos = staffLen / 2;
  let remaining = Math.max(0, Number(speedMps) || 0);

  while (remaining >= 25) {
    children.push(makePennant(pos, color));
    pos -= s(4);
    remaining -= 25;
  }
  while (remaining >= 5) {
    children.push(makeFullBarb(pos, color, lineWidth));
    pos -= s(3.5);
    remaining -= 5;
  }
  while (remaining >= 2.5) {
    children.push(makeHalfBarb(pos, color, lineWidth));
    pos -= s(3.5);
    remaining -= 2.5;
  }

  return children;
}

export function createWindBarbRenderItem() {
  return function renderWindBarb(params, api) {
    const speed = api.value(2);
    const direction = api.value(3);
    const point = api.coord([api.value(0), api.value(1)]);
    if (!point) return;

    const color = api.visual('color') || speedToColor(speed);
    const barbOpts = { color, staffLen: BARB_STAFF_LEN, lineWidth: BARB_LINE_WIDTH };

    return {
      type: 'group',
      position: point,
      rotation: (Number(direction) * Math.PI) / 180 - Math.PI / 2,
      children: [
        ...buildWindBarbGraphic(speed, {
          ...barbOpts,
          color: 'rgba(0, 0, 0, 0.55)',
          lineWidth: BARB_LINE_WIDTH + 1.2,
          shadowBlur: 4,
          shadowColor: 'rgba(0, 0, 0, 0.8)',
        }),
        ...buildWindBarbGraphic(speed, barbOpts),
      ],
    };
  };
}

function profileTooltipFormatter(cells) {
  return (params) => {
    const tIdx = params.value?.[0];
    const height = params.value?.[1];
    const cell = cells?.[`${tIdx}_${height}`];
    if (!cell) return '';

    return [
      `<div>时间：${formatProfileTime(cell.time)}</div>`,
      `<div>海拔：${cell.height}m</div>`,
      `<div>风向：${Number(cell.direction).toFixed(2)}°（${directionLabel(cell.direction)}风）</div>`,
      `<div>速度：${Number(cell.speed).toFixed(2)}m/s</div>`,
      `<div>垂直速度：${Number(cell.verticalSpeed).toFixed(2)}m/s</div>`,
    ].join('');
  };
}

/** Y 轴刻度：每 500m 显示一个标签 */
function formatHeightAxisLabel(value, minH, maxH) {
  const v = Number(value);
  if (!Number.isFinite(v)) return '';
  if (v === minH || v === maxH || (v - minH) % 500 === 0) return `${v}m`;
  return '';
}

export function buildWindProfileChartOption(grid) {
  const { timeLabels, barbData, cells } = grid;
  const slotCount = grid.slotCount ?? grid.times?.length ?? FLYABILITY_DRILL_SLOTS;
  const slotCategories = Array.from({ length: slotCount }, (_, i) => `${i}`);
  const minH = grid.heightMin ?? 100;
  const maxH = grid.heightMax ?? 3000;

  return {
    animation: false,
    backgroundColor: 'transparent',
    tooltip: {
      appendToBody: true,
      trigger: 'item',
      backgroundColor: 'rgba(15, 23, 42, 0.92)',
      borderColor: '#3b82f6',
      borderWidth: 1,
      padding: [8, 12],
      textStyle: { color: '#e2e8f0', fontSize: 12, lineHeight: 20 },
      formatter: profileTooltipFormatter(cells),
    },
    grid: { left: 48, right: 16, top: 10, bottom: 18, containLabel: false },
    xAxis: [
      {
        type: 'category',
        data: slotCategories,
        boundaryGap: true,
        axisLine: { show: false },
        axisTick: { show: false },
        axisLabel: { show: false },
        splitLine: {
          show: true,
          lineStyle: { color: 'rgba(255,255,255,0.06)' },
        },
      },
      {
        type: 'value',
        min: 0,
        max: slotCount,
        interval: 1,
        position: 'bottom',
        axisLine: { lineStyle: { color: '#7d8b96' } },
        axisTick: { show: true, lineStyle: { color: '#7d8b96' } },
        splitLine: { show: false },
        axisLabel: {
          color: '#c7d0d8',
          fontSize: 10,
          interval: 0,
          formatter: (value) => {
            const idx = Math.round(value);
            return timeLabels[idx] || '';
          },
        },
      },
    ],
    yAxis: {
      type: 'value',
      min: minH,
      max: maxH,
      inverse: false,
      axisLine: { lineStyle: { color: 'rgba(255,255,255,0.15)' } },
      axisLabel: {
        color: 'rgba(255,255,255,0.7)',
        fontSize: 10,
        formatter: (v) => formatHeightAxisLabel(v, minH, maxH),
      },
      splitLine: {
        show: true,
        lineStyle: { color: 'rgba(255,255,255,0.04)' },
      },
    },
    visualMap: {
      show: false,
      min: 0,
      max: 18,
      dimension: 2,
      calculable: false,
      inRange: {
        color: SPEED_COLOR_STOPS.map((s) => s.color),
      },
      seriesIndex: 0,
    },
    series: [
      {
        name: '风羽',
        type: 'custom',
        data: barbData,
        xAxisIndex: 0,
        yAxisIndex: 0,
        encode: { x: 0, y: 1 },
        progressive: 800,
        renderItem: createWindBarbRenderItem(),
      },
    ],
  };
}
