/** Phase 0 DEMO-1: synthetic R_met field (no backend) */

export const DEFAULT_VOLUME = {
  west: 120.28,
  south: 36.05,
  east: 120.42,
  north: 36.18,
  minHeight: 200,
  maxHeight: 2800,
  nx: 64,
  ny: 64,
  nz: 10,
  timeSteps: 12
}

const BLOBS = [
  { lon: 120.32, lat: 36.10, h: 900, amp: 0.85, sigmaLon: 0.012, sigmaLat: 0.010, sigmaH: 600, dLon: 0.0018, dLat: 0.0012, dH: 40 },
  { lon: 120.37, lat: 36.13, h: 1400, amp: 0.72, sigmaLon: 0.010, sigmaLat: 0.011, sigmaH: 500, dLon: -0.0014, dLat: 0.0009, dH: -30 },
  { lon: 120.34, lat: 36.08, h: 600, amp: 0.55, sigmaLon: 0.014, sigmaLat: 0.013, sigmaH: 450, dLon: 0.0008, dLat: -0.0015, dH: 25 }
]

/**
 * @param {number} timeIndex 0..timeSteps-1
 * @returns {(lon: number, lat: number, height: number) => number}
 */
export function createRMetSampler(timeIndex = 0) {
  const t = timeIndex
  return (lon, lat, height) => {
    let risk = 0
    for (const b of BLOBS) {
      const blon = b.lon + b.dLon * t
      const blat = b.lat + b.dLat * t
      const bh = b.h + b.dH * t
      const dl = (lon - blon) / b.sigmaLon
      const da = (lat - blat) / b.sigmaLat
      const dh = (height - bh) / b.sigmaH
      risk += b.amp * Math.exp(-0.5 * (dl * dl + da * da + dh * dh))
    }
    // weak background gradient
    risk += 0.08 * Math.max(0, (height - 400) / 2400)
    return Math.min(1, Math.max(0, risk))
  }
}

export function getTimeLabels(timeSteps = DEFAULT_VOLUME.timeSteps) {
  const base = new Date()
  base.setMinutes(0, 0, 0)
  return Array.from({ length: timeSteps }, (_, i) => {
    const d = new Date(base.getTime() + i * 3600000)
    return {
      index: i,
      label: `${String(d.getHours()).padStart(2, '0')}:00`,
      date: d
    }
  })
}
