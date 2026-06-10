function hexToRgb(hex) {
  const h = hex.replace('#', '')
  return [
    parseInt(h.slice(0, 2), 16),
    parseInt(h.slice(2, 4), 16),
    parseInt(h.slice(4, 6), 16),
  ]
}

function rgbToHex(r, g, b) {
  const toHex = (n) => Math.round(n).toString(16).padStart(2, '0')
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`
}

/**
 * 在若干锚点色之间线性插值，生成温度色带
 */
export function buildTemperatureRamp(stops = ['#313695', '#74add1', '#ffffbf', '#f46d43', '#a50026'], steps = 64) {
  if (steps < 2) return [stops[0]]
  const anchors = stops.map(hexToRgb)
  const colors = []
  for (let i = 0; i < steps; i++) {
    const t = i / (steps - 1)
    const seg = t * (anchors.length - 1)
    const idx = Math.min(Math.floor(seg), anchors.length - 2)
    const local = seg - idx
    const a = anchors[idx]
    const b = anchors[idx + 1]
    colors.push(
      rgbToHex(
        a[0] + (b[0] - a[0]) * local,
        a[1] + (b[1] - a[1]) * local,
        a[2] + (b[2] - a[2]) * local
      )
    )
  }
  return colors
}
