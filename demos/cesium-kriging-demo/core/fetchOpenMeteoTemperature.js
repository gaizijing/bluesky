import { fetchWeatherApi } from 'openmeteo'

/** 青岛市大致范围 */
export const QINGDAO_BBOX = {
  west: 119.72,
  south: 35.58,
  east: 121.05,
  north: 37.1,
}

/**
 * 在 bbox 内生成规则采样网格，并从 Open-Meteo 拉取真实 2m 气温
 * @returns {Promise<{ features: Array, stats: Object, fetchedAt: string }>}
 */
export async function fetchTemperatureGrid({
  west = QINGDAO_BBOX.west,
  south = QINGDAO_BBOX.south,
  east = QINGDAO_BBOX.east,
  north = QINGDAO_BBOX.north,
  cols = 9,
  rows = 9,
} = {}) {
  const latitudes = []
  const longitudes = []
  const meta = []

  for (let r = 0; r < rows; r++) {
    const lat = south + ((north - south) * r) / Math.max(rows - 1, 1)
    for (let c = 0; c < cols; c++) {
      const lng = west + ((east - west) * c) / Math.max(cols - 1, 1)
      latitudes.push(Number(lat.toFixed(4)))
      longitudes.push(Number(lng.toFixed(4)))
      meta.push({ row: r, col: c })
    }
  }

  const url = 'https://api.open-meteo.com/v1/forecast'
  const responses = await fetchWeatherApi(url, {
    latitude: latitudes,
    longitude: longitudes,
    current: 'temperature_2m',
    timezone: 'Asia/Shanghai',
  })

  const features = []
  const temps = []
  let obsTime = null

  responses.forEach((response, index) => {
    const current = response.current()
    if (!current) return

    const utcOffsetSeconds = response.utcOffsetSeconds()
    const tempVar = current.variables(0)
    const temp = tempVar?.value()
    if (!Number.isFinite(temp)) return

    const time = new Date((Number(current.time()) + utcOffsetSeconds) * 1000)
    if (!obsTime || time > obsTime) obsTime = time

    const lng = longitudes[index]
    const lat = latitudes[index]
    temps.push(temp)

    features.push({
      type: 'Feature',
      geometry: { type: 'Point', coordinates: [lng, lat] },
      properties: {
        temperature: Math.round(temp * 10) / 10,
        temperature_2m: temp,
        obsTime: time.toISOString(),
        row: meta[index].row,
        col: meta[index].col,
      },
    })
  })

  if (features.length < 4) {
    throw new Error(`有效气温采样点不足（${features.length}），无法做 Kriging 插值`)
  }

  return {
    type: 'FeatureCollection',
    features,
    stats: {
      count: features.length,
      min: Math.min(...temps),
      max: Math.max(...temps),
      mean: temps.reduce((a, b) => a + b, 0) / temps.length,
    },
    fetchedAt: obsTime?.toISOString() ?? new Date().toISOString(),
    gridSize: { cols, rows },
  }
}
