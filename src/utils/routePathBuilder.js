import { postWeatherByCoordsBatch } from '@/api'

/**
 * Build a resampled 3D path (lon/lat/alt) from control vertices with optional no-fly avoidance.
 * Uses Catmull–Rom on lon/lat (small-area approximation) and linear interpolation on altitude.
 */

const DEG2RAD = Math.PI / 180

function metersPerDegreeLat() {
  return 111_320
}

function metersPerDegreeLon(latDeg) {
  return 111_320 * Math.cos(latDeg * DEG2RAD)
}

function lerp(a, b, t) {
  return a + (b - a) * t
}

function catmullRom(p0, p1, p2, p3, t) {
  const t2 = t * t
  const t3 = t2 * t
  return 0.5 * ((2 * p1) + (-p0 + p2) * t + (2 * p0 - 5 * p1 + 4 * p2 - p3) * t2 + (-p0 + 3 * p1 - 3 * p2 + p3) * t3)
}

/**
 * 对路径做轻度水平面平滑（固定高度），缓和 Catmull 在途经点处的尖锐拐点。
 * @param {Array<{lon:number,lat:number,alt:number}>} path
 * @param {number} passes
 * @param {number} lambda 越大越圆，建议 0.08–0.22
 */
function smoothLonLatOpen3D(path, passes = 2, lambda = 0.16) {
  if (!path || path.length < 3) return path
  let cur = path.map((p) => ({ lon: p.lon, lat: p.lat, alt: p.alt }))
  for (let pass = 0; pass < passes; pass++) {
    cur = cur.map((p, i) => {
      if (i === 0 || i === cur.length - 1) return { ...p }
      const prev = cur[i - 1]
      const nxt = cur[i + 1]
      return {
        lon: (1 - lambda) * p.lon + lambda * 0.5 * (prev.lon + nxt.lon),
        lat: (1 - lambda) * p.lat + lambda * 0.5 * (prev.lat + nxt.lat),
        alt: p.alt
      }
    })
  }
  return cur
}

/**
 * @param {Array<{lon:number,lat:number,alt:number}>} control
 * @param {number} samples
 */
export function buildCatmullPath3D(control, samples = 160) {
  if (!control || control.length < 2) return []
  const c = control.slice()
  // duplicate endpoints for open curve
  const p = [c[0], ...c, c[c.length - 1]]
  const segments = p.length - 3
  const out = []
  const totalSteps = Math.max(2, samples)
  for (let s = 0; s < totalSteps; s++) {
    const u = s / (totalSteps - 1)
    const segFloat = u * segments
    const seg = Math.min(segments - 1, Math.floor(segFloat))
    const t = segFloat - seg
    const i = seg + 1
    const lon = catmullRom(p[i - 1].lon, p[i].lon, p[i + 1].lon, p[i + 2].lon, t)
    const lat = catmullRom(p[i - 1].lat, p[i].lat, p[i + 1].lat, p[i + 2].lat, t)
    const alt = catmullRom(p[i - 1].alt, p[i].alt, p[i + 1].alt, p[i + 2].alt, t)
    out.push({ lon, lat, alt })
  }
  return out
}

function horizDistM(a, b) {
  const mx = metersPerDegreeLon(a.lat) * (b.lon - a.lon)
  const my = metersPerDegreeLat() * (b.lat - a.lat)
  return Math.hypot(mx, my)
}

function smoothstep01(edge0, edge1, x) {
  if (edge1 <= edge0) return x >= edge1 ? 1 : 0
  const t = Math.min(1, Math.max(0, (x - edge0) / (edge1 - edge0)))
  return t * t * (3 - 2 * t)
}

/**
 * 禁飞圆柱水平避让：软带内渐变外推，避免「临界阈值」处硬折线拐角。
 * @param {{lon:number,lat:number,alt:number}} pt
 * @param {Array<{centerLng:number,centerLat:number,radiusM:number,heightM:number,zoneType:string}>} zones
 */
export function avoidNoFlyHorizontal(pt, zones) {
  if (!zones?.length) return { ...pt }
  let lon = pt.lon
  let lat = pt.lat
  const alt = pt.alt
  for (const z of zones) {
    if ((z.zoneType || '').toUpperCase() !== 'NO_FLY') continue
    const center = { lon: z.centerLng, lat: z.centerLat }
    const hMax = Number(z.heightM) || 0
    if (alt > hMax + 1) continue
    const r = Number(z.radiusM) || 1

    const mx0 = metersPerDegreeLon(lat) * (lon - center.lon)
    const my0 = metersPerDegreeLat() * (lat - center.lat)
    const d = Math.hypot(mx0, my0) || 1e-6

    const targetD = r + 90
    const blendOuter = targetD + Math.min(420, Math.max(200, r * 1.1))

    if (d >= blendOuter) continue

    const ux = mx0 / d
    const uy = my0 / d
    const snLon = center.lon + (ux / metersPerDegreeLon(lat)) * targetD
    const snLat = center.lat + (uy / metersPerDegreeLat()) * targetD

    const w = d <= targetD ? 1 : 1 - smoothstep01(targetD, blendOuter, d)
    lon = lerp(lon, snLon, w)
    lat = lerp(lat, snLat, w)
  }
  return { lon, lat, alt }
}

export function applyAvoidanceToPath(path, zones) {
  return path.map((p) => avoidNoFlyHorizontal(p, zones))
}

/**
 * 软避让后再轻度平滑 + 一次硬约束，防止平滑后穿回禁飞区。
 */
function applyAvoidanceSmoothingPipeline(path, zones) {
  if (!path?.length || !zones?.length) return path
  let out = applyAvoidanceToPath(path, zones)
  out = smoothLonLatOpen3D(out, 1, 0.08)
  out = out.map((p) => hardClampNoFly(p, zones))
  return out
}

/** 仍过近时径向收到 targetD（硬兜底） */
function hardClampNoFly(pt, zones) {
  let lon = pt.lon
  let lat = pt.lat
  const alt = pt.alt
  for (const z of zones) {
    if ((z.zoneType || '').toUpperCase() !== 'NO_FLY') continue
    const center = { lon: z.centerLng, lat: z.centerLat }
    const hMax = Number(z.heightM) || 0
    if (alt > hMax + 1) continue
    const r = Number(z.radiusM) || 1
    const targetD = r + 90
    const d = horizDistM(center, { lon, lat })
    if (d >= targetD - 0.5) continue
    const mx = metersPerDegreeLon(lat) * (lon - center.lon)
    const my = metersPerDegreeLat() * (lat - center.lat)
    const len = Math.hypot(mx, my) || 1e-6
    const ux = mx / len
    const uy = my / len
    lon = center.lon + (ux / metersPerDegreeLon(lat)) * targetD
    lat = center.lat + (uy / metersPerDegreeLat()) * targetD
  }
  return { lon, lat, alt }
}

/**
 * 旧版：将地面/巡航控制点连成折线再整体做 Catmull，起降段会被样条拉斜。
 * 会话规划请使用 {@link buildEvotlPath3D}（垂直爬升 + 水平巡航 + 垂直下降）。
 * @param {Array<{lon:number,lat:number}>} horizontalPoints ordered start -> optional waypoints -> end
 * @param {number} cruiseH
 */
export function buildControlPolyline3D(horizontalPoints, cruiseH) {
  if (!horizontalPoints?.length || horizontalPoints.length < 2) return []
  const pts = horizontalPoints.map((p) => ({ lon: p.lon, lat: p.lat }))
  const s = pts[0]
  const e = pts[pts.length - 1]
  const mids = pts.slice(1, -1)
  const ctrl = []
  ctrl.push({ lon: s.lon, lat: s.lat, alt: 0 })
  ctrl.push({ lon: s.lon, lat: s.lat, alt: cruiseH })
  for (const m of mids) {
    ctrl.push({ lon: m.lon, lat: m.lat, alt: cruiseH })
  }
  ctrl.push({ lon: e.lon, lat: e.lat, alt: cruiseH })
  ctrl.push({ lon: e.lon, lat: e.lat, alt: 0 })
  return ctrl
}

function segmentLengthM3D(a, b) {
  const dh = horizDistM(a, b)
  const dv = Math.abs((a.alt ?? 0) - (b.alt ?? 0))
  return Math.hypot(dh, dv)
}

export function cumulativeDistanceKm(path) {
  const km = [0]
  for (let i = 1; i < path.length; i++) {
    const d = segmentLengthM3D(path[i - 1], path[i]) / 1000
    km.push(km[i - 1] + d)
  }
  return km
}

/**
 * 在固定经纬度上从 alt0 线性插值到 alt1（eVTOL 垂直起降段）。
 * @param {number} lon
 * @param {number} lat
 * @param {number} alt0
 * @param {number} alt1
 * @param {number} steps 段数，至少为 1
 */
export function linearVerticalLeg(lon, lat, alt0, alt1, steps = 18) {
  const n = Math.max(1, Math.floor(steps))
  const out = []
  for (let i = 0; i <= n; i++) {
    const t = i / n
    out.push({ lon, lat, alt: alt0 + (alt1 - alt0) * t })
  }
  return out
}

/**
 * 电动垂直起降 (eVTOL)：起点原地垂直到巡航高度 → 水平样条巡航（可禁飞绕行）→ 末点原地垂直降落。
 * @param {Array<{lon:number,lat:number}>} horizontalPoints 起点 → 途经 → 终点（水平坐标）
 * @param {number} cruiseH 巡航高度 (m)
 * @param {Array} zones 禁飞区等，传入 {@link applyAvoidanceToPath}
 * @param {{ cruiseSamples?: number, verticalSteps?: number, cruiseSmoothPasses?: number, cruiseSmoothLambda?: number, groundAltM?: number }} [options]
 * @returns {{ path: Array<{lon:number,lat:number,alt:number}>, pathTubeSlices: Array<[number, number]> | null }}
 *          pathTubeSlices 为 [start, end) 下标，用于分段 polylineVolume 立体廊道（避免整段一体在垂转处网格错乱）。
 */
export function buildEvotlPath3D(horizontalPoints, cruiseH, zones = [], options = {}) {
  if (!horizontalPoints?.length || horizontalPoints.length < 2) {
    return { path: [], pathTubeSlices: null }
  }
  const cruiseSamples = options.cruiseSamples ?? 280
  const verticalSteps = options.verticalSteps ?? 20
  const cruiseSmoothPasses = options.cruiseSmoothPasses ?? 2
  const cruiseSmoothLambda = options.cruiseSmoothLambda ?? 0.15

  /** 椭球面以上最小高度 (m)，避免起降段在 0m 时陷入地形下方导致相机/合成异常 */
  const rawGround = options.groundAltM
  const groundAltM = Math.max(
    0,
    Number.isFinite(Number(rawGround)) ? Number(rawGround) : 22
  )

  const pts = horizontalPoints.map((p) => ({ lon: p.lon, lat: p.lat }))
  const s = pts[0]
  const e = pts[pts.length - 1]
  const mids = pts.slice(1, -1)

  const cruiseCtrl = [
    { lon: s.lon, lat: s.lat, alt: cruiseH },
    ...mids.map((m) => ({ lon: m.lon, lat: m.lat, alt: cruiseH })),
    { lon: e.lon, lat: e.lat, alt: cruiseH }
  ]

  let cruisePath = buildCatmullPath3D(cruiseCtrl, cruiseSamples)
  cruisePath = smoothLonLatOpen3D(cruisePath, cruiseSmoothPasses, cruiseSmoothLambda)
  cruisePath = applyAvoidanceSmoothingPipeline(cruisePath, zones)

  const climb = linearVerticalLeg(s.lon, s.lat, groundAltM, cruiseH, verticalSteps)
  const last = cruisePath[cruisePath.length - 1]
  if (!last) {
    const path = climb
    return {
      path,
      pathTubeSlices: path.length >= 2 ? [[0, path.length]] : null
    }
  }
  const descent = linearVerticalLeg(last.lon, last.lat, cruiseH, groundAltM, verticalSteps)

  const path = [...climb.slice(0, -1), ...cruisePath, ...descent.slice(1)]
  const seg0End = verticalSteps + 1
  const seg1End = verticalSteps + cruisePath.length
  const pathTubeSlices = [
    [0, seg0End],
    [verticalSteps, seg1End],
    [verticalSteps + cruisePath.length - 1, path.length]
  ]

  return { path, pathTubeSlices }
}


/** 单次批量请求最大采样点数（远小于航迹总点数，服务端再按 4 位小数去重） */
const WIND_ALONG_MAX_BATCH_POINTS = 80

/**
 * 沿航迹均匀选取采样下标（含首尾），用于批量天气请求。
 * @param {number} pathLength
 * @param {number} maxPoints
 * @returns {number[]}
 */
export function pickPathSampleIndices(pathLength, maxPoints) {
  if (!Number.isFinite(pathLength) || pathLength <= 0) return []
  const cap = Math.max(2, Math.floor(maxPoints))
  if (pathLength <= cap) {
    return Array.from({ length: pathLength }, (_, i) => i)
  }
  const out = new Set()
  out.add(0)
  out.add(pathLength - 1)
  const innerBudget = cap - 2
  for (let k = 1; k <= innerBudget; k++) {
    out.add(Math.round((k / (innerBudget + 1)) * (pathLength - 1)))
  }
  return Array.from(out).sort((a, b) => a - b)
}

function lerpAngleDeg(a, b, t) {
  let aN = Number(a)
  let bN = Number(b)
  if (!Number.isFinite(aN)) aN = 0
  if (!Number.isFinite(bN)) bN = 0
  let diff = bN - aN
  while (diff > 180) diff -= 360
  while (diff < -180) diff += 360
  let r = aN + diff * t
  while (r < 0) r += 360
  while (r >= 360) r -= 360
  return r
}

function parseBatchSeriesItem(item) {
  if (!item || item.error) {
    return { windSpeed: 0, windDir: 0, bumpiness: 0 }
  }
  const w = item.data || {}
  const bump = w.turbulenceIndex != null ? Number(w.turbulenceIndex) : 0
  return {
    windSpeed: Number(w.windSpeed) || 0,
    windDir: Number(w.wind360) || 0,
    bumpiness: Number.isFinite(bump) ? bump : 0
  }
}

/**
 * 将批量采样点的风况按航迹下标线性插值到全路径长度（与 pathSamples 一一对应）。
 */
function expandWindAlongByIndex(samples, indices, totalLen) {
  const out = []
  if (!indices.length || !samples.length) {
    for (let i = 0; i < totalLen; i++) {
      out.push({ windSpeed: 0, windDir: 0, bumpiness: 0 })
    }
    return out
  }
  for (let i = 0; i < totalLen; i++) {
    if (i <= indices[0]) {
      out.push({ ...samples[0] })
      continue
    }
    const lastIdx = indices[indices.length - 1]
    if (i >= lastIdx) {
      out.push({ ...samples[samples.length - 1] })
      continue
    }
    let j = 0
    while (j < indices.length - 1 && indices[j + 1] < i) j++
    const i0 = indices[j]
    const i1 = indices[j + 1]
    const w0 = samples[j]
    const w1 = samples[j + 1]
    const t = i1 === i0 ? 0 : (i - i0) / (i1 - i0)
    out.push({
      windSpeed: lerp(w0.windSpeed, w1.windSpeed, t),
      windDir: lerpAngleDeg(w0.windDir, w1.windDir, t),
      bumpiness: lerp(w0.bumpiness, w1.bumpiness, t)
    })
  }
  return out
}

/**
 * 沿航迹获取风况序列（供垂直剖面色标等）。
 * 使用 POST /weather/by-coords/batch 一次提交最多 {@link WIND_ALONG_MAX_BATCH_POINTS} 个采样点，
 * 服务端对 4 位小数经纬度去重后再调和风；前端将结果插值回与 path 等长的数组。
 *
 * @param {Array<{lon:number,lat:number,alt?:number}>} path
 * @returns {Promise<Array<{ windSpeed:number, windDir:number, bumpiness:number }>>}
 */
export async function fetchWindAlongPath(path) {
  const n = path?.length || 0
  if (n === 0) return []

  const indices = pickPathSampleIndices(n, WIND_ALONG_MAX_BATCH_POINTS)
  const coordinates = indices.map((i) => ({
    lng: path[i].lon,
    lat: path[i].lat
  }))

  try {
    const payload = await postWeatherByCoordsBatch({ coordinates })
    const series = payload?.series
    if (!Array.isArray(series) || series.length !== indices.length) {
      console.warn('[fetchWindAlongPath] 批量接口返回异常，使用零风况占位', {
        expect: indices.length,
        got: series?.length
      })
      return expandWindAlongByIndex(
        indices.map(() => ({ windSpeed: 0, windDir: 0, bumpiness: 0 })),
        indices,
        n
      )
    }
    const atSamples = series.map((cell) => parseBatchSeriesItem(cell))
    return expandWindAlongByIndex(atSamples, indices, n)
  } catch (e) {
    console.warn('[fetchWindAlongPath] 批量请求失败:', e)
    return expandWindAlongByIndex(
      indices.map(() => ({ windSpeed: 0, windDir: 0, bumpiness: 0 })),
      indices,
      n
    )
  }
}
