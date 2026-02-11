import * as Cesium from 'cesium'
import eventManager from '@/cesium/core/eventManager'

class RouteRenderer {
  /**
   * 构造函数
   * @param {Object} options - 配置选项
   * @param {number} [options.defaultFlightHeight=300] - 默认飞行高度
   * @param {number} [options.routeWidth=5] - 航线宽度
   * @param {string} [options.popupClassName='route-popup'] - 弹窗CSS类名
   * @param {number} [options.popupMinWidth=280] - 弹窗最小宽度
   * @param {number} [options.popupMaxWidth=400] - 弹窗最大宽度
   */
  constructor(options = {}) {
    this.options = {
      defaultFlightHeight: 300,
      routeWidth: 5,
      popupClassName: 'route-popup',
      popupMinWidth: 280,
      popupMaxWidth: 400,
      ...options
    }
    this.#viewer = null
    this.#routeEntities = new Map() // routeId -> { segments, plane, positions, dangers, info, name }
  }

  /**
   * 初始化航线渲染器
   * @param {Cesium.Viewer} viewer - Cesium viewer实例
   * @throws {Error} 如果viewer参数无效
   */
  init(viewer) {
    if (!viewer || typeof viewer !== 'object') {
      throw new Error('Invalid viewer instance provided to RouteRenderer.init()')
    }
    this.#viewer = viewer
    this.#bindRouteEvents()
  }

  /**
   * 根据危险指数获取颜色（红黄绿三色）
   * @param {Number} danger 危险指数(0-10)
   * @returns {Cesium.Color} 对应的颜色
   */
  getColorByDangerLevel(danger) {
    try {
      const normalized = Cesium.Math.clamp(danger || 0, 0, 10)
      let material = new Cesium.PolylineGlowMaterialProperty()
      // 危险等级分三段：安全(绿)、警告(黄)、危险(红)
      if (normalized < 3) {
        material.color = Cesium.Color.GREEN.withAlpha(1) // 安全
      } else if (normalized < 7) {
        material.color = Cesium.Color.YELLOW.withAlpha(1) // 警告
      } else {
        material.color = Cesium.Color.RED.withAlpha(1) // 危险
      }
      return material
    } catch (error) {
      console.warn('Error in getColorByDangerLevel:', error)
      // 返回默认安全颜色
      const defaultMaterial = new Cesium.PolylineGlowMaterialProperty()
      defaultMaterial.color = Cesium.Color.GREEN.withAlpha(1)
      return defaultMaterial
    }
  }

  /**
   * 创建单段航线
   * @param {string} routeId - 航线ID
   * @param {number} segmentIndex - 段索引
   * @param {Array} positions - 位置数组
   * @param {number} danger - 危险等级
   * @returns {Cesium.Entity|null} 航线分段实体或null
   */
  createRouteSegment(routeId, segmentIndex, positions, danger) {
    try {
      if (!this.#viewer) {
        console.error('RouteRenderer not initialized, please call init() first')
        return null
      }

      if (!routeId || typeof routeId !== 'string') {
        console.error('Invalid routeId provided to createRouteSegment()')
        return null
      }

      if (!positions || !Array.isArray(positions) || positions.length < 2) {
        console.error('Invalid positions provided to createRouteSegment(), expected array with at least 2 positions')
        return null
      }

      if (typeof segmentIndex !== 'number') {
        console.error('Invalid segmentIndex provided to createRouteSegment(), expected number')
        return null
      }

      return this.#viewer.entities.add({
        id: `route_${routeId}_segment_${segmentIndex}`,
        polyline: {
          positions: positions,
          width: this.options.routeWidth,
          material: this.getColorByDangerLevel(danger),
          depthFailMaterial: this.getColorByDangerLevel(danger),
          clampToGround: false
        },
        properties: {
          routeId: routeId,
          segmentIndex: segmentIndex,
          dangerLevel: danger,
          isRouteSegment: true
        }
      })
    } catch (error) {
      console.error('Error creating route segment:', error)
      return null
    }
  }

  /**
   * 创建起点标签
   * @param {string} routeId - 航线ID
   * @param {Cesium.Cartesian3} position - 位置
   * @param {string} name - 起点名称
   * @returns {Cesium.Entity} 起点标签实体
   */
  createStartLabel(routeId, position, name) {
    if (!this.#viewer) return null
    
    return this.#viewer.entities.add({
      position: position,
      // 文字标签
      label: {
        text: `起点：${name || '出发地'}`,
        font: '16px sans-serif',
        fillColor: Cesium.Color.TOMATO,
        outlineColor: Cesium.Color.TRANSPARENT,
        outlineWidth: 0,
        style: Cesium.LabelStyle.FILL,
        pixelOffset: new Cesium.Cartesian2(0, -40),
        heightReference: Cesium.HeightReference.CLAMP_TO_GROUND,
        verticalOrigin: Cesium.VerticalOrigin.BOTTOM,
        // 添加背景颜色
        showBackground: true,
        backgroundColor: Cesium.Color.fromCssColorString(' rgba(66, 153, 225, 0.3)'),
        backgroundPadding: new Cesium.Cartesian2(10, 5)
      }
    })
  }

  /**
   * 创建终点标签
   * @param {string} routeId - 航线ID
   * @param {Cesium.Cartesian3} position - 位置
   * @param {string} name - 终点名称
   * @returns {Cesium.Entity} 终点标签实体
   */
  createEndLabel(routeId, position, name) {
    if (!this.#viewer) return null
    
    return this.#viewer.entities.add({
      position: position,
      // 文字标签
      label: {
        text: `终点：${name || '目的地'}`,
        font: '16px sans-serif',
        fillColor: Cesium.Color.TOMATO,
        outlineColor: Cesium.Color.TRANSPARENT,
        outlineWidth: 0,
        style: Cesium.LabelStyle.FILL,
        pixelOffset: new Cesium.Cartesian2(0, -40),
        heightReference: Cesium.HeightReference.CLAMP_TO_GROUND,
        verticalOrigin: Cesium.VerticalOrigin.BOTTOM,
        // 添加背景颜色
        showBackground: true,
        backgroundColor: Cesium.Color.fromCssColorString(' rgba(66, 153, 225, 0.3)'),
        backgroundPadding: new Cesium.Cartesian2(10, 5)
      }
    })
  }

  /**
   * 构建增强的航点数组
   * @param {Array} waypoints - 原始航点数组
   * @returns {Array} 增强后的航点数组
   */
  buildEnhancedWaypoints(waypoints) {
    if (!waypoints || waypoints.length < 2) return []
    
    const enhancedWaypoints = []
    const startPoint = waypoints[0]
    const endPoint = waypoints[waypoints.length - 1]

    // 起点上升航路：从地面飞升到指定高度
    const startHeight = startPoint.height || 300
    enhancedWaypoints.push(
      { ...startPoint, height: 0 }, // 起点地面
      { ...startPoint, height: startHeight } // 起点指定高度
    )

    // 原始航点（中间段）：如果没有高度则默认300m
    enhancedWaypoints.push(...waypoints.map(waypoint => ({
      ...waypoint,
      height: waypoint.height || 300
    })))

    // 终点下降航路：从指定高度降落到地面
    const endHeight = endPoint.height || 300
    enhancedWaypoints.push(
      { ...endPoint, height: endHeight }, // 终点指定高度
      { ...endPoint, height: 0 } // 终点地面
    )

    return enhancedWaypoints
  }

  /**
   * 将航点转换为Cesium坐标
   * @param {Array} waypoints - 航点数组
   * @returns {Array} Cesium.Cartesian3数组
   */
  convertWaypointsToPositions(waypoints) {
    return waypoints.map(waypoint =>
      Cesium.Cartesian3.fromDegrees(
        waypoint.longitude,
        waypoint.latitude,
        waypoint.height
      )
    )
  }

  /**
   * 创建航线分段
   * @param {string} routeId - 航线ID
   * @param {Array} positions - 位置数组
   * @param {Array} dangers - 危险等级数组
   * @returns {Array} 航线分段实体数组
   */
  createRouteSegments(routeId, positions, dangers) {
    const segmentEntities = []
    const dangersArray = dangers || []
    const positionsCount = positions.length
    
    for (let i = 0; i < positionsCount - 1; i++) {
      const segment = this.createRouteSegment(
        routeId,
        i,
        [positions[i], positions[i + 1]],
        dangersArray[i] || 0
      )
      segment && segmentEntities.push(segment)
    }
    
    return segmentEntities
  }

  /**
   * 存储航线信息
   * @param {string} routeId - 航线ID
   * @param {Object} routeData - 航线数据
   */
  storeRouteData(routeId, routeData) {
    this.#routeEntities.set(routeId, routeData)
  }

  /**
   * 获取航线数据
   * @param {string} routeId - 航线ID
   * @returns {Object|null} 航线数据
   */
  getRouteData(routeId) {
    return this.#routeEntities.get(routeId)
  }

  /**
   * 移除指定航线
   * @param {string} routeId - 航线ID
   */
  removeRoute(routeId) {
    if (!this.#viewer || !this.#routeEntities.has(routeId)) return

    const routeData = this.#routeEntities.get(routeId)

    // 移除航线分段和飞机
    routeData.segments.forEach(segment => this.#viewer.entities.remove(segment))
    if (routeData.plane) this.#viewer.entities.remove(routeData.plane)

    this.#routeEntities.delete(routeId)
  }

  /**
   * 清理所有航线
   */
  clearAllRoutes() {
    if (!this.#viewer) return
    this.#routeEntities.forEach((_, routeId) => this.removeRoute(routeId))
  }

  /**
   * 绑定航线事件
   * @private
   */
  #bindRouteEvents() {
    if (!this.#viewer) return

    // 航线点击处理器函数
    const routeClickHandler = (viewer, movement) => {
      const pickedObject = viewer.scene.pick(movement.position)

      if (Cesium.defined(pickedObject) && pickedObject.id?.properties?.isRouteSegment) {
        const routeId = pickedObject.id.properties.routeId
        const segmentIndex = pickedObject.id.properties.segmentIndex
        const routeData = this.#routeEntities.get(routeId.getValue())

        if (routeData) {
          this.#showRoutePopup(viewer, routeData, segmentIndex.getValue())
          return true
        }
      } else {
        // 隐藏弹窗
        this.#hideRoutePopup()
      }

      return false
    }

    // 注册航线点击处理器
    eventManager.registerClickHandler(routeClickHandler, 1)
  }

  /**
   * 显示航线弹窗
   * @private
   */
  #showRoutePopup(viewer, routeData, segmentIndex) {
    // 创建弹窗元素
    const popup = this.#getOrCreatePopup()
    const popupTitle = this.#getOrCreatePopupTitle(popup)
    const popupContent = this.#getOrCreatePopupContent(popup)

    // 设置弹窗内容
    popupTitle.textContent = `航线 ${routeData.name} - 第${segmentIndex + 1}段`

    // 根据危险等级设置样式类
    const dangerValue = routeData.dangers[segmentIndex] || 0
    popup.className = ''
    if (dangerValue < 30) {
      popup.classList.add('popup-risk-low')
    } else if (dangerValue < 70) {
      popup.classList.add('popup-risk-medium')
    } else {
      popup.classList.add('popup-risk-high')
    }

    popupContent.innerHTML = `
      <div style="margin-bottom: 8px;">
        <span style="display: inline-block; font-weight: 500; min-width: 80px;">危险等级：</span>
        <span style="color: ${dangerValue < 30 ? '#10b981' : dangerValue < 70 ? '#f59e0b' : '#ef4444'};">
          ${this.#getDangerText(dangerValue)}
        </span>
      </div>
      <div style="margin-bottom: 8px;">
        <span style="display: inline-block; font-weight: 500; min-width: 80px;">天气提醒：</span>
        <span>${this.#getWeatherTips(dangerValue)}</span>
      </div>
      <div style="margin-bottom: 8px;">
        <span style="display: inline-block; font-weight: 500; min-width: 80px;">建议速度：</span>
        <span>${this.#getSpeedSuggestion(dangerValue)}</span>
      </div>
      <div style="margin-top: 8px; padding-top: 8px; border-top: 1px solid #e5e7eb; font-size: 12px; color: #9ca3af;">
        点击其他区域可关闭弹窗
      </div>
    `

    // 计算航线分段中点的屏幕坐标
    const midPoint = Cesium.Cartesian3.midpoint(
      routeData.positions[segmentIndex],
      routeData.positions[segmentIndex + 1],
      new Cesium.Cartesian3()
    )
    const screenPos = viewer.scene.cartesianToCanvasCoordinates(midPoint)

    if (screenPos) {
      // 计算弹窗位置
      const popupX = screenPos.x
      const popupY = screenPos.y + 10

      // 边界检查
      const popupWidth = popup.offsetWidth || 300
      const popupHeight = popup.offsetHeight || 200
      const canvas = viewer.canvas

      const safeX = Math.max(10, Math.min(canvas.clientWidth - popupWidth - 10, popupX))
      const safeY = Math.max(10, Math.min(canvas.clientHeight - popupHeight - 10, popupY))

      // 设置弹窗位置
      popup.style.left = `${safeX}px`
      popup.style.top = `${safeY}px`
      popup.style.bottom = 'auto'
      popup.style.right = 'auto'
      popup.style.opacity = '0'
      popup.style.transform = 'translateY(10px)'
      popup.style.display = 'block'

      setTimeout(() => {
        popup.style.opacity = '1'
        popup.style.transform = 'translateY(0)'
      }, 10)
    }
  }

  /**
   * 隐藏航线弹窗
   * @private
   */
  #hideRoutePopup() {
    const popup = document.getElementById('routePopup')
    if (popup) {
      popup.style.display = 'none'
    }
  }

  /**
   * 获取或创建弹窗元素
   * @private
   */
  #getOrCreatePopup() {
    let popup = document.getElementById('routePopup')
    if (!popup) {
      popup = document.createElement('div')
      popup.id = 'routePopup'
      popup.style.position = 'absolute'
      popup.style.background = 'rgba(255, 255, 255, 0.95)'
      popup.style.padding = '5px'
      popup.style.borderRadius = '8px'
      popup.style.boxShadow = '0 4px 20px rgba(0, 0, 0, 0.15)'
      popup.style.zIndex = '1000'
      popup.style.display = 'none'
      popup.style.minWidth = '280px'
      popup.style.maxWidth = '400px'
      popup.style.border = '1px solid rgba(229, 231, 235, 1)'
      popup.style.animation = 'fadeIn 0.3s ease-out'
      popup.style.transition = 'all 0.2s ease'
      popup.style.fontFamily = '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
      document.body.appendChild(popup)

      // 添加动画样式
      this.#addPopupAnimationStyle()
    }
    return popup
  }

  /**
   * 获取或创建弹窗标题元素
   * @private
   */
  #getOrCreatePopupTitle(popup) {
    let title = document.getElementById('popupTitle')
    if (!title) {
      title = document.createElement('div')
      title.id = 'popupTitle'
      title.style.fontWeight = '600'
      title.style.fontSize = '16px'
      title.style.marginBottom = '12px'
      title.style.color = '#1f2937'
      popup.appendChild(title)
    }
    return title
  }

  /**
   * 获取或创建弹窗内容元素
   * @private
   */
  #getOrCreatePopupContent(popup) {
    let content = document.getElementById('popupContent')
    if (!content) {
      content = document.createElement('div')
      content.id = 'popupContent'
      content.style.color = '#4b5563'
      content.style.lineHeight = '1.5'
      content.style.fontSize = '14px'
      popup.appendChild(content)
    }
    return content
  }

  /**
   * 添加弹窗动画样式
   * @private
   */
  #addPopupAnimationStyle() {
    if (!document.getElementById('popupAnimationStyle')) {
      const style = document.createElement('style')
      style.id = 'popupAnimationStyle'
      style.textContent = `
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .popup-risk-low { border-left: 4px solid #10b981; }
        .popup-risk-medium { border-left: 4px solid #f59e0b; }
        .popup-risk-high { border-left: 4px solid #ef4444; }
      `
      document.head.appendChild(style)
    }
  }

  /**
   * 危险等级文本描述
   * @private
   */
  #getDangerText(danger) {
    if (danger < 3) return '安全（绿色）'
    if (danger < 7) return '警告（黄色）'
    return '危险（红色）'
  }

  /**
   * 天气提醒
   * @private
   */
  #getWeatherTips(danger) {
    const tips = [
      '天气晴朗，能见度佳，适合飞行',
      '局部有薄雾，注意保持航线',
      '风力较大，建议降低飞行高度',
      '有雷暴预警，建议暂停飞行'
    ]
    return danger < 3 ? tips[0] : danger < 7 ? tips[1] : tips[danger > 8 ? 3 : 2]
  }

  /**
   * 速度建议
   * @private
   */
  #getSpeedSuggestion(danger) {
    return danger < 3 ? '正常速度（800km/h）' : danger < 7 ? '减速至600km/h' : '紧急减速至400km/h'
  }

  /**
   * 清理资源
   */
  destroy() {
    this.clearAllRoutes()
    
    // 清理弹窗元素
    this.#cleanupPopupElements()
    
    this.#viewer = null
  }

  /**
   * 清理弹窗元素
   * @private
   */
  #cleanupPopupElements() {
    // 移除弹窗元素
    const popup = document.getElementById('routePopup')
    if (popup && popup.parentNode) {
      popup.parentNode.removeChild(popup)
    }
    
    // 移除弹窗标题元素
    const popupTitle = document.getElementById('popupTitle')
    if (popupTitle && popupTitle.parentNode) {
      popupTitle.parentNode.removeChild(popupTitle)
    }
    
    // 移除弹窗内容元素
    const popupContent = document.getElementById('popupContent')
    if (popupContent && popupContent.parentNode) {
      popupContent.parentNode.removeChild(popupContent)
    }
    
    // 移除弹窗动画样式
    const popupStyle = document.getElementById('popupAnimationStyle')
    if (popupStyle && popupStyle.parentNode) {
      popupStyle.parentNode.removeChild(popupStyle)
    }
  }

  /**
   * 获取所有航线的位置信息
   * @returns {Array} 所有航线的位置数组
   */
  getAllRoutePositions() {
    const allPositions = []
    this.#routeEntities.forEach(routeData => {
      allPositions.push(...routeData.positions)
    })
    return allPositions
  }

  // 私有属性
  #viewer
  #routeEntities
}

// 导出实例
export const routeRenderer = new RouteRenderer()
export default routeRenderer
