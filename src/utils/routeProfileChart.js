/**
 * 航路剖面：航程 × 高度
 * 等风速面背景 + 白色风羽 + 飞行高度轨迹
 */

import {
  buildWindBarbGraphic,
  speedToColor,
} from './windVerticalProfileChart';

const PROFILE_HEIGHT_STEP_M = 250;

/** 风羽：航程每 1km、高度 50–1000m 每 50m 一层 */
export const BARB_DIST_STEP_M = 1000;
export const BARB_HEIGHT_MIN_M = 50;
export const BARB_HEIGHT_MAX_M = 1000;
export const BARB_HEIGHT_STEP_M = 50;
export const BARB_MAX_DIST_SAMPLES = 300;

export function buildProfileHeights(maxM = 1000, stepM = PROFILE_HEIGHT_STEP_M) {
  const heights = [];
  for (let h = 0; h <= maxM; h += stepM) {
    heights.push(h);
  }
  return heights;
}

export function buildBarbHeights(
  minM = BARB_HEIGHT_MIN_M,
  maxM = BARB_HEIGHT_MAX_M,
  stepM = BARB_HEIGHT_STEP_M,
) {
  const heights = [];
  for (let h = minM; h <= maxM; h += stepM) {
    heights.push(h);
  }
  return heights;
}

/** 风羽航程步长 (m)：优先 1km，超长航路自动放大步长 */
export function resolveBarbDistStepM(totalDistM) {
  if (totalDistM <= 0) return BARB_DIST_STEP_M;
  const countAtStep = Math.floor(totalDistM / BARB_DIST_STEP_M) + 1;
  if (countAtStep <= BARB_MAX_DIST_SAMPLES) return BARB_DIST_STEP_M;
  return Math.ceil(totalDistM / (BARB_MAX_DIST_SAMPLES - 1) / BARB_DIST_STEP_M) * BARB_DIST_STEP_M;
}

function haversineKm(lon1, lat1, lon2, lat2) {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export function buildRouteDistances(waypoints = [], defaultHeight = 300) {
  if (!waypoints.length) {
    return { distKm: [], samples: [], totalKm: 0, labels: [] };
  }

  const samples = waypoints.map((wp, i) => ({
    index: i,
    name: wp.name || `航点 ${i + 1}`,
    lon: Number(wp.longitude),
    lat: Number(wp.latitude),
    height: Number(wp.height ?? wp.altitude ?? defaultHeight),
  }));

  const distKm = [0];
  for (let i = 1; i < samples.length; i += 1) {
    const prev = samples[i - 1];
    const cur = samples[i];
    const seg = haversineKm(prev.lon, prev.lat, cur.lon, cur.lat);
    distKm.push(distKm[i - 1] + seg);
  }

  return {
    distKm,
    samples,
    totalKm: distKm[distKm.length - 1] || 0,
    labels: samples.map((s, i) => (i === 0 ? '0' : `${distKm[i].toFixed(1)}`)),
  };
}

function interpolatePath(distKm, samples, count = 24) {
  if (!samples.length) return [];
  const total = distKm[distKm.length - 1] || 1;
  const points = [];
  for (let i = 0; i < count; i += 1) {
    const target = (total * i) / Math.max(1, count - 1);
    let seg = 0;
    while (seg < distKm.length - 1 && distKm[seg + 1] < target) seg += 1;
    const d0 = distKm[seg];
    const d1 = distKm[seg + 1] ?? d0;
    const t = d1 === d0 ? 0 : (target - d0) / (d1 - d0);
    const h0 = samples[seg].height;
    const h1 = samples[Math.min(seg + 1, samples.length - 1)].height;
    points.push({ dist: target, height: h0 + (h1 - h0) * t });
  }
  return points;
}

function pushBarbCell({ barbData, cells, dist, height, speed, direction }) {
  barbData.push([
    dist,
    height,
    Number(speed.toFixed(2)),
    Number(direction.toFixed(1)),
  ]);
  cells[`${dist.toFixed(2)}_${height}`] = { dist, height, speed, direction };
}

/** 剖面图专用：白色风羽 */
export function createRouteProfileBarbRenderItem() {
  const STAFF = 16;
  const LW = 1.6;
  return function renderRouteBarb(params, api) {
    const speed = api.value(2);
    const direction = api.value(3);
    const point = api.coord([api.value(0), api.value(1)]);
    if (!point) return;

    const white = '#f8fafc';
    const barbOpts = { color: white, staffLen: STAFF, lineWidth: LW };

    return {
      type: 'group',
      position: point,
      rotation: (Number(direction) * Math.PI) / 180 - Math.PI / 2,
      children: [
        ...buildWindBarbGraphic(speed, {
          ...barbOpts,
          color: 'rgba(0,0,0,0.45)',
          lineWidth: LW + 1,
          shadowBlur: 3,
          shadowColor: 'rgba(0,0,0,0.6)',
        }),
        ...buildWindBarbGraphic(speed, barbOpts),
      ],
    };
  };
}

/** mock 风场随时间轴相位偏移（约 3h 一周期，便于联调 MET_TIME_CHANGED） */
function resolveMockWindTimePhase(time) {
  if (!time) return 0;
  const ms = new Date(time).getTime();
  if (Number.isNaN(ms)) return 0;
  return (ms / (3 * 3600 * 1000)) * Math.PI * 2;
}

export function buildMockRouteProfileGrid(options = {}) {
  const {
    waypoints = [],
    profileMaxM = BARB_HEIGHT_MAX_M,
    totalKm: totalKmOverride,
    barbHeights = buildBarbHeights(),
    time,
  } = options;

  const timePhase = resolveMockWindTimePhase(time);

  const routeDist = buildRouteDistances(waypoints);
  const totalKm = totalKmOverride ?? routeDist.totalKm;
  const { distKm, samples, labels } = routeDist;
  const totalM = totalKm * 1000;
  const barbStepM = resolveBarbDistStepM(totalM);
  const barbDistPoints = [];
  for (let distM = 0; distM < totalM; distM += barbStepM) {
    barbDistPoints.push(Number((distM / 1000).toFixed(4)));
  }
  barbDistPoints.push(Number(totalKm.toFixed(4)));

  const barbData = [];
  const cells = {};

  barbHeights.forEach((height) => {
    barbDistPoints.forEach((dist, dIdx) => {
      const phase = dIdx * 0.42 + height * 0.003 + timePhase;
      const speed = Math.max(
        1.2,
        2 + (height / profileMaxM) * 5 + Math.sin(phase) * 1.5 + Math.cos(timePhase * 0.85) * 1.2,
      );
      const direction =
        (140 + dIdx * 5 + height * 0.08 + Math.sin(phase) * 20 + Math.sin(timePhase * 0.7) * 35 + 360) % 360;
      pushBarbCell({ barbData, cells, dist, height, speed, direction });
    });
  });

  const pathLine = interpolatePath(distKm, samples, 48).map((p) => [p.dist, p.height]);

  return {
    distPoints: barbDistPoints,
    totalKm,
    heightMax: profileMaxM,
    barbData,
    cells,
    pathLine,
    waypointLabels: labels,
    routeTitle: samples.length
      ? `${samples[0].name} → ${samples[samples.length - 1].name}`
      : '',
  };
}

/** 由风羽格点提取等风速面数据 [航程km, 高度m, 风速m/s] */
export function buildIsotachSurfaceFromBarbs(barbData) {
  return barbData.map(([dist, height, speed]) => [dist, height, speed]);
}

function resolveSurfaceHalfSteps(distPoints) {
  let distHalfKm = BARB_DIST_STEP_M / 2000;
  if (distPoints?.length > 1) {
    distHalfKm = Math.max(0.05, (distPoints[1] - distPoints[0]) / 2);
  }
  return {
    distHalfKm,
    heightHalfM: BARB_HEIGHT_STEP_M / 2,
  };
}

/** 等风速面：按格点风速填色矩形 */
export function createIsotachSurfaceRenderItem(distPoints) {
  const { distHalfKm, heightHalfM } = resolveSurfaceHalfSteps(distPoints);
  return function renderIsotachCell(params, api) {
    const dist = api.value(0);
    const height = api.value(1);
    const speed = api.value(2);
    const tl = api.coord([dist - distHalfKm, height + heightHalfM]);
    const br = api.coord([dist + distHalfKm, height - heightHalfM]);
    if (!tl || !br) return;

    return {
      type: 'rect',
      shape: {
        x: Math.min(tl[0], br[0]),
        y: Math.min(tl[1], br[1]),
        width: Math.abs(br[0] - tl[0]),
        height: Math.abs(br[1] - tl[1]),
      },
      style: {
        fill: api.visual('color') || speedToColor(speed),
        opacity: 0.68,
      },
    };
  };
}

const ISOTACH_SURFACE_COLORS = [
  '#1d4ed8',
  '#2563eb',
  '#38bdf8',
  '#22d3ee',
  '#eab308',
  '#f97316',
  '#ef4444',
];

function isotachSurfaceTooltip(params) {
  const dist = params.value?.[0];
  const height = params.value?.[1];
  const speed = params.value?.[2];
  return [
    `<div>航程：${Number(dist).toFixed(2)} km</div>`,
    `<div>高度：${height} m</div>`,
    `<div>风速：${Number(speed).toFixed(1)} m/s</div>`,
  ].join('');
}

function barbTooltipFormatter(cells) {
  return (params) => {
    const dist = params.value?.[0];
    const height = params.value?.[1];
    const cell = cells?.[`${Number(dist).toFixed(2)}_${height}`];
    if (!cell) {
      return [
        `<div>航程：${Number(dist).toFixed(2)} km</div>`,
        `<div>高度：${height} m</div>`,
        `<div>风速：${Number(params.value?.[2]).toFixed(1)} m/s</div>`,
      ].join('');
    }
    return [
      `<div>航程：${Number(cell.dist).toFixed(2)} km</div>`,
      `<div>高度：${cell.height} m</div>`,
      `<div>风速：${Number(cell.speed).toFixed(1)} m/s</div>`,
      `<div>风向：${Number(cell.direction).toFixed(0)}°</div>`,
    ].join('');
  };
}

function formatHeightLabel(v, maxH) {
  const n = Number(v);
  if (!Number.isFinite(n)) return '';
  if (n === 0 || Math.abs(n - maxH) < 1 || n % 500 === 0) return `${Math.round(n)}m`;
  return '';
}

function padDistLabel(xMax, distHalfKm) {
  return Math.max(0.05, distHalfKm * 0.5);
}

export function buildRouteProfileChartOption(grid, layers = {}) {
  const {
    showWind = true,
    showIsotach = true,
  } = layers;

  const {
    totalKm,
    heightMax,
    barbData = [],
    cells = {},
    pathLine = [],
    distPoints = [],
  } = grid;

  const xMax = totalKm || 1;
  const pathEndKm = pathLine.length ? pathLine[pathLine.length - 1][0] : xMax;
  const axisMaxKm = Math.max(xMax, pathEndKm);
  const { distHalfKm, heightHalfM } = resolveSurfaceHalfSteps(distPoints);
  const xMin = -distHalfKm;
  const xMaxPadded = axisMaxKm + distHalfKm;
  const yMaxPadded = heightMax + heightHalfM;

  const series = [];

  if (showIsotach && barbData.length) {
    const surfaceData = buildIsotachSurfaceFromBarbs(barbData);
    series.push({
      name: '等风速面',
      type: 'custom',
      data: surfaceData,
      encode: { x: 0, y: 1 },
      renderItem: createIsotachSurfaceRenderItem(distPoints),
      progressive: 0,
      z: 1,
    });
  }

  if (showWind && barbData.length) {
    series.push({
      name: '风场',
      type: 'custom',
      data: barbData,
      encode: { x: 0, y: 1 },
      renderItem: createRouteProfileBarbRenderItem(),
      progressive: 0,
      z: 3,
    });
  }

  if (pathLine.length) {
    series.push({
      name: '飞行高度轨迹',
      type: 'line',
      data: pathLine,
      smooth: 0.15,
      symbol: 'none',
      lineStyle: { color: '#22c55e', width: 3 },
      z: 5,
    });
  }

  return {
    animation: false,
    backgroundColor: 'rgba(6, 14, 28, 0.92)',
    visualMap: showIsotach
      ? {
          show: false,
          type: 'continuous',
          orient: 'vertical',
          right: 4,
          top: 'center',
          min: 0,
          max: 18,
          dimension: 2,
          calculable: false,
          itemWidth: 8,
          itemHeight: 72,
          text: ['18', '0 m/s'],
          textStyle: { color: 'rgba(255,255,255,0.5)', fontSize: 9 },
          inRange: { color: ISOTACH_SURFACE_COLORS },
        }
      : undefined,
    tooltip: {
      appendToBody: true,
      trigger: 'item',
      backgroundColor: 'rgba(15, 23, 42, 0.94)',
      borderColor: '#334155',
      borderWidth: 1,
      padding: [8, 12],
      textStyle: { color: '#e2e8f0', fontSize: 12, lineHeight: 20 },
      formatter: (params) => {
        if (params.seriesName === '风场') return barbTooltipFormatter(cells)(params);
        if (params.seriesName === '等风速面') return isotachSurfaceTooltip(params);
        if (params.seriesName === '飞行高度轨迹') {
          const d = params.value?.[0];
          const h = params.value?.[1];
          return [
            `<div>航程：${Number(d).toFixed(2)} / ${Number(axisMaxKm).toFixed(2)} km</div>`,
            `<div>高度：${h} m</div>`,
          ].join('');
        }
        return '';
      },
    },
    // grid 只控制绘图区边距；数据是否落在轴内由 xAxis/yAxis min/max 决定
    grid: { left: 0, right: 18, top: 8, bottom: 0, containLabel: true },
    xAxis: {
      type: 'value',
      min: xMin,
      max: xMaxPadded,
      axisLine: { lineStyle: { color: 'rgba(255,255,255,0.18)' } },
      axisTick: { show: false },
      splitLine: { show: false },
      axisLabel: {
        color: 'rgba(255,255,255,0.55)',
        fontSize: 10,
        formatter: (v) => {
          if (Math.abs(v) < 0.05) return '0';
          if (Math.abs(v - axisMaxKm) < padDistLabel(axisMaxKm, distHalfKm)) {
            return `${Number(axisMaxKm).toFixed(1)}km`;
          }
          if (v < 0) return '';
          return `${Number(v).toFixed(0)}`;
        },
      },
    },
    yAxis: {
      type: 'value',
      min: 0,
      max: yMaxPadded,
      axisLine: { lineStyle: { color: 'rgba(255,255,255,0.18)' } },
      axisTick: { show: false },
      splitLine: {
        show: true,
        lineStyle: { color: 'rgba(255,255,255,0.06)' },
      },
      axisLabel: {
        color: 'rgba(255,255,255,0.55)',
        fontSize: 10,
        formatter: (v) => formatHeightLabel(v, heightMax),
      },
    },
    series,
  };
}

export { buildWindBarbGraphic, speedToColor };
