// src/cesium/entities/routes/RouteInteraction.js
import * as Cesium from 'cesium'
import eventManager from '@/cesium/core/eventManager'

/**
 * 将颠簸指数映射为文字描述
 * @param {number} value - 颠簸指数（0-100）
 * @returns {string} - 文字描述
 */
function getTurbulenceLevel(value) {
  if (value < 10) return '平稳'
  if (value < 25) return '轻微颠簸'
  if (value < 40) return '中度颠簸'
  if (value < 60) return '较强颠簸'
  if (value < 80) return '强烈颠簸'
  return '极端颠簸'
}

/**
 * 将风速（km/h）映射为文字描述
 * @param {number} value - 风速（km/h）
 * @returns {string} - 文字描述
 */
function getWindLevel(value) {
  if (value < 12) return '微风'
  if (value < 20) return '轻风'
  if (value < 29) return '和风'
  if (value < 40) return '清风'
  if (value < 52) return '强风'
  if (value < 62) return '疾风'
  if (value < 74) return '大风'
  if (value < 88) return '烈风'
  if (value < 102) return '狂风'
  if (value < 118) return '暴风'
  return '飓风'
}

function cartesianToLonLatHeight(cartesian) {
  const c = Cesium.Cartographic.fromCartesian(cartesian)
  if (!c) return null
  return {
    lon: Cesium.Math.toDegrees(c.longitude),
    lat: Cesium.Math.toDegrees(c.latitude),
    alt: c.height
  }
}

function horizDistSq(a, b) {
  const dLon = (a.lon - b.lon) * 111320 * Math.cos((a.lat * Math.PI) / 180)
  const dLat = (a.lat - b.lat) * 111320
  return dLon * dLon + dLat * dLat
}

export class RouteInteraction {
  constructor(viewer, routeManager) {
    this.viewer = viewer
    this.routeManager = routeManager
    this.hoverEl = null
    this.unMouse = null
  }

  bindEvents() {
    if (!this.viewer) return
    this.#ensureHoverEl()
    if (this.unMouse) {
      this.unMouse()
      this.unMouse = null
    }
    this.unMouse = eventManager.on('mouse-move', (payload) => {
      const movement = payload?.movement ?? payload
      const viewer = payload?.viewer ?? this.viewer
      this.#onHover(viewer, movement)
    })
  }

  #ensureHoverEl() {
    if (this.hoverEl) return
    const el = document.createElement('div')
    el.id = 'routeSessionHoverTip'
    Object.assign(el.style, {
      position: 'fixed',
      zIndex: '2000',
      display: 'none',
      pointerEvents: 'none',
      padding: '8px 10px',
      background: 'rgba(15, 23, 42, 0.92)',
      color: '#e2e8f0',
      borderRadius: '8px',
      fontSize: '12px',
      lineHeight: '1.45',
      maxWidth: '260px',
      boxShadow: '0 8px 24px rgba(0,0,0,0.35)',
      border: '1px solid rgba(148,163,184,0.35)'
    })
    document.body.appendChild(el)
    this.hoverEl = el
  }

  #onHover(viewer, movement) {
    if (!this.hoverEl || !viewer) return
    const routeId = this.routeManager.activeRouteId
    const routeData = routeId ? this.routeManager.routeEntities.get(routeId) : null
    const samples = routeData?.pathSamples
    const windAlong = routeData?.windAlong
    if (!samples?.length || !movement?.endPosition) {
      this.hoverEl.style.display = 'none'
      return
    }

    const cart = viewer.scene.pickPosition(movement.endPosition)
    if (!cart) {
      this.hoverEl.style.display = 'none'
      return
    }
    const cur = cartesianToLonLatHeight(cart)
    if (!cur) {
      this.hoverEl.style.display = 'none'
      return
    }

    let bestI = 0
    let bestD = Infinity
    for (let i = 0; i < samples.length; i++) {
      const p = samples[i]
      const d = horizDistSq(cur, p) + Math.pow((cur.alt - p.alt) * 0.02, 2)
      if (d < bestD) {
        bestD = d
        bestI = i
      }
    }
    const thrM = 350 * 350
    if (bestD > thrM) {
      this.hoverEl.style.display = 'none'
      return
    }

    const w = windAlong?.[bestI] || {}
    
    // 颠簸指数映射为文字描述
    const bumpValue = w.bumpiness != null ? w.bumpiness * 100 : null
    const bumpText = bumpValue !== null ? getTurbulenceLevel(bumpValue) : '—'
    
    // 风速映射为文字描述
    const wsValue = w.windSpeed != null ? w.windSpeed : null
    const wsText = wsValue !== null ? getWindLevel(wsValue) : '—'
    
    const wd = w.windDir != null ? `${w.windDir.toFixed(0)}°` : '—'

    this.hoverEl.innerHTML = `
      <div style="font-weight:600;margin-bottom:4px;color:#93c5fd">航迹采样</div>
      <div>颠簸指数: <strong>${bumpText}</strong></div>
      <div>风速: <strong>${wsText}</strong></div>
      <div>风向: <strong>${wd}</strong></div>
    `
    this.hoverEl.style.left = `${movement.endPosition.x + 14}px`
    this.hoverEl.style.top = `${movement.endPosition.y + 14}px`
    this.hoverEl.style.display = 'block'
  }
}
