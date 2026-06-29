import * as Cesium from 'cesium'

/** 每段原始航腿插值点数；航点少时仅轻微圆角拐点 */
const DEFAULT_SAMPLES_PER_LEG = 4

/**
 * 用 Catmull-Rom 样条对折线航路插值，使拐点圆滑。
 * @param {Cesium.Cartesian3[]} positions 原始折线顶点（含起降爬升/下降点）
 * @param {number} [samplesPerLeg]
 * @returns {{ positions: Cesium.Cartesian3[], legIndices: number[] }}
 */
export function smoothRoutePositions(positions, samplesPerLeg = DEFAULT_SAMPLES_PER_LEG) {
  if (!Array.isArray(positions) || positions.length < 2) {
    return { positions: positions?.slice() ?? [], legIndices: [] }
  }

  if (positions.length < 3 || samplesPerLeg < 2) {
    const legIndices = []
    for (let i = 0; i < positions.length - 1; i++) legIndices.push(i)
    return { positions: positions.slice(), legIndices }
  }

  const knotTimes = [0]
  let totalLen = 0
  for (let i = 1; i < positions.length; i++) {
    totalLen += Cesium.Cartesian3.distance(positions[i - 1], positions[i])
    knotTimes.push(totalLen)
  }

  if (totalLen <= 0) {
    const legIndices = []
    for (let i = 0; i < positions.length - 1; i++) legIndices.push(i)
    return { positions: positions.slice(), legIndices }
  }

  const times = knotTimes.map((t) => (t / totalLen) * (positions.length - 1))
  const spline = new Cesium.CatmullRomSpline({ times, points: positions })

  const legCount = positions.length - 1
  const sampleCount = legCount * samplesPerLeg + 1
  const smoothed = []
  const legIndices = []
  const scratch = new Cesium.Cartesian3()

  for (let s = 0; s < sampleCount; s++) {
    const t = (s / (sampleCount - 1)) * (positions.length - 1)
    spline.evaluate(t, scratch)
    smoothed.push(Cesium.Cartesian3.clone(scratch))
    legIndices.push(Math.min(Math.max(0, Math.floor(t)), legCount - 1))
  }

  return { positions: smoothed, legIndices }
}
