import * as Cesium from 'cesium'

export function createDemoViewer(container) {
  Cesium.Ion.defaultAccessToken = import.meta.env.VITE_CESIUM_TOKEN || ''

  const terrain = import.meta.env.VITE_CESIUM_TOKEN
    ? Cesium.Terrain.fromWorldTerrain()
    : undefined

  const viewer = new Cesium.Viewer(container, {
    baseLayerPicker: false,
    geocoder: false,
    homeButton: false,
    sceneModePicker: false,
    navigationHelpButton: false,
    infoBox: false,
    selectionIndicator: false,
    fullscreenButton: false,
    animation: true,
    timeline: true,
    terrain,
    contextOptions: {
      webgl: { powerPreference: 'high-performance' }
    }
  })

  viewer.cesiumWidget.creditContainer.style.display = 'none'
  viewer.scene.globe.depthTestAgainstTerrain = true
  viewer.scene.fog.enabled = false

  return viewer
}

export function flyToVolume(viewer, volume) {
  const { west, south, east, north, minHeight, maxHeight } = volume
  const rect = Cesium.Rectangle.fromDegrees(west, south, east, north)
  viewer.camera.flyTo({
    destination: rect,
    orientation: {
      heading: 0,
      pitch: Cesium.Math.toRadians(-35),
      roll: 0
    },
    duration: 1.2
  })
  // offset altitude after fly
  setTimeout(() => {
    const c = Cesium.Rectangle.center(rect)
    viewer.camera.flyTo({
      destination: Cesium.Cartesian3.fromRadians(
        c.longitude,
        c.latitude,
        Math.max(maxHeight * 2.5, 8000)
      ),
      orientation: {
        heading: 0,
        pitch: Cesium.Math.toRadians(-40),
        roll: 0
      },
      duration: 0.8
    })
  }, 1300)
}

export function setupDiscreteTimeline(viewer, timeLabels, onStepChange) {
  const start = Cesium.JulianDate.fromDate(timeLabels[0].date)
  const stop = Cesium.JulianDate.fromDate(timeLabels[timeLabels.length - 1].date)
  viewer.clock.startTime = start.clone()
  viewer.clock.stopTime = stop.clone()
  viewer.clock.currentTime = start.clone()
  viewer.clock.clockRange = Cesium.ClockRange.CLAMPED
  viewer.clock.multiplier = 0
  viewer.clock.shouldAnimate = false
  viewer.timeline.zoomTo(start, stop)

  let lastIndex = -1
  const tick = () => {
    const current = Cesium.JulianDate.toDate(viewer.clock.currentTime).getTime()
    let best = 0
    let bestDist = Infinity
    for (const t of timeLabels) {
      const dist = Math.abs(t.date.getTime() - current)
      if (dist < bestDist) {
        bestDist = dist
        best = t.index
      }
    }
    if (best !== lastIndex) {
      lastIndex = best
      onStepChange(best)
    }
  }

  viewer.clock.onTick.addEventListener(tick)
  viewer.timeline.addEventListener('settime', tick)

  return () => {
    viewer.clock.onTick.removeEventListener(tick)
  }
}

export function setTimelineStep(viewer, timeLabels, index) {
  const t = timeLabels[index]?.date
  if (!t) return
  viewer.clock.currentTime = Cesium.JulianDate.fromDate(t)
}

export class FpsMonitor {
  constructor(viewer) {
    this.viewer = viewer
    this.fps = 0
    this._frames = 0
    this._last = performance.now()
    this._remove = viewer.scene.postRender.addEventListener(() => {
      this._frames++
      const now = performance.now()
      if (now - this._last >= 1000) {
        this.fps = Math.round((this._frames * 1000) / (now - this._last))
        this._frames = 0
        this._last = now
      }
    })
  }

  destroy() {
    if (this._remove) {
      this._remove()
      this._remove = null
    }
  }
}

export function readMemoryMb() {
  const mem = performance.memory
  if (!mem) return null
  return {
    used: (mem.usedJSHeapSize / 1048576).toFixed(1),
    total: (mem.totalJSHeapSize / 1048576).toFixed(1)
  }
}
