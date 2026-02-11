import * as Cesium from 'cesium'
import { useWindStore } from '@/store/modules/wind'

class AircraftController {
  /**
   * 构造函数
   * @param {Object} options - 配置选项
   * @param {string} [options.planeModelUrl='/cesium/model/plane/plane.glb'] - 飞机模型路径
   * @param {number} [options.defaultFlightHeight=300] - 默认飞行高度
   * @param {number} [options.takeoffSteps=20] - 起飞阶段步数
   * @param {number} [options.cruiseSteps=30] - 巡航阶段步数
   * @param {number} [options.landingSteps=20] - 降落阶段步数
   * @param {number} [options.takeoffDurationRatio=0.2] - 起飞阶段时间比例
   * @param {number} [options.cruiseDurationRatio=0.6] - 巡航阶段时间比例
   * @param {number} [options.landingDurationRatio=0.2] - 降落阶段时间比例
   */
  constructor(options = {}) {
    this.options = {
      planeModelUrl: '/cesium/model/plane/plane.glb',
      defaultFlightHeight: 300,
      takeoffSteps: 20,
      cruiseSteps: 30,
      landingSteps: 20,
      takeoffDurationRatio: 0.2,
      cruiseDurationRatio: 0.6,
      landingDurationRatio: 0.2,
      ...options
    }
    this.#planeAttitudes = new Map() // routeId -> { heading, pitch, roll }
    this.#keyboardEventListener = null
    this.#timelineEventListener = null
    this.#activeRouteId = null
    this.#viewer = null
  }

  /**
   * 初始化飞机控制器
   * @param {Cesium.Viewer} viewer - Cesium viewer实例
   * @throws {Error} 如果viewer参数无效
   */
  init(viewer) {
    if (!viewer || typeof viewer !== 'object') {
      throw new Error('Invalid viewer instance provided to AircraftController.init()')
    }
    this.#viewer = viewer
  }

  /**
   * 设置当前激活的航线ID
   * @param {string} routeId - 航线ID
   */
  setActiveRouteId(routeId) {
    if (routeId && typeof routeId !== 'string') {
      console.warn('Invalid routeId provided to setActiveRouteId(), expected string')
      return
    }
    this.#activeRouteId = routeId
  }

  /**
   * 创建飞机模型
   * @param {string} routeId - 航线ID
   * @param {Array} positions - 航点位置数组
   * @param {number} duration - 飞行持续时间（秒）
   * @param {Date} routeStartTime - 航线开始时间
   * @param {Date} routeEndTime - 航线结束时间
   * @returns {Cesium.Entity|null} 飞机实体或null
   * @throws {Error} 如果必要参数无效
   */
  createRoutePlane(routeId, positions, duration = 60, routeStartTime, routeEndTime) {
    try {
      if (!this.#viewer) {
        console.error('AircraftController not initialized, please call init() first')
        return null
      }

      if (!routeId || typeof routeId !== 'string') {
        console.error('Invalid routeId provided to createRoutePlane()')
        return null
      }

      if (!positions || !Array.isArray(positions) || positions.length < 2) {
        console.error('Invalid positions provided to createRoutePlane(), expected array with at least 2 positions')
        return null
      }

      // 模型路径
      const modelUrl = '/cesium/model/plane/plane.glb'

      // 配置航线动画属性 - 使用线性插值确保严格按路径飞行
      const positionProperty = this.#createPositionProperty(positions, duration, routeStartTime, routeEndTime)

      // 初始化当前航线的飞机姿态
      this.#planeAttitudes.set(routeId, {
        heading: 0,
        pitch: 0,
        roll: 0
      })

      // 使用VelocityOrientationProperty根据速度自动计算朝向
      const velocityOrientation = new Cesium.VelocityOrientationProperty(positionProperty)

      // 使用动态方向属性，结合自动朝向和键盘调整的姿态
      const orientationProperty = this.#createOrientationProperty(routeId, velocityOrientation)

      // 配置动画时钟 - 使用路由对象中的时间范围
      this.#configureClock(routeStartTime, routeEndTime, duration)

      // 创建飞机 Entity
      return this.#createPlaneEntity(routeId, positionProperty, orientationProperty)
    } catch (error) {
      console.error('Error creating route plane:', error)
      return null
    }
  }

  /**
   * 创建位置属性
   * @private
   */
  #createPositionProperty(positions, duration, routeStartTime, routeEndTime) {
    const positionProperty = new Cesium.SampledPositionProperty()
    positionProperty.setInterpolationOptions({
      interpolationDegree: 1,
      interpolationAlgorithm: Cesium.LinearApproximation
    })

    // 计算时间参数
    const { startTime, endTime, totalDuration } = this.#calculateTimeParameters(routeStartTime, routeEndTime, duration)

    // 严格按4个关键点设计动画：A -> A' -> B' -> B
    const keyPoints = [
      positions[0], // A: 地面点
      positions[1], // A': A点正上方，高度300
      positions[positions.length - 2], // B': B点正上方，高度300
      positions[positions.length - 1] // B: 地面点
    ]

    // 计算各阶段的时间分配
    const takeoffDuration = totalDuration * 0.2 // 起飞阶段占20%
    const cruiseDuration = totalDuration * 0.6 // 水平飞行占60%
    const landingDuration = totalDuration * 0.2 // 降落阶段占20%

    // 分阶段添加采样点
    let currentTime = Cesium.JulianDate.clone(startTime)

    // 1. 垂直起飞阶段
    currentTime = this.#addTakeoffPositions(positionProperty, keyPoints, takeoffDuration, currentTime)

    // 2. 水平飞行阶段
    currentTime = this.#addCruisePositions(positionProperty, keyPoints, cruiseDuration, currentTime)

    // 3. 垂直降落阶段
    this.#addLandingPositions(positionProperty, keyPoints, landingDuration, currentTime)

    return positionProperty
  }

  /**
   * 计算时间参数
   * @private
   */
  #calculateTimeParameters(routeStartTime, routeEndTime, duration) {
    let startTime
    let endTime
    let totalDuration

    if (routeStartTime) {
      startTime = Cesium.JulianDate.fromDate(routeStartTime)
    } else {
      startTime = this.#viewer.clock.startTime
    }

    if (routeEndTime) {
      endTime = Cesium.JulianDate.fromDate(routeEndTime)
      // 计算实际的总飞行时间（秒）
      const startDate = new Date(routeStartTime)
      const endDate = new Date(routeEndTime)
      totalDuration = Math.floor((endDate - startDate) / 1000) // 转换为秒
    } else {
      endTime = Cesium.JulianDate.addSeconds(startTime, duration || 180, new Cesium.JulianDate())
      totalDuration = duration || 180
    }

    return { startTime, endTime, totalDuration }
  }

  /**
   * 添加起飞阶段位置点
   * @private
   */
  #addTakeoffPositions(positionProperty, keyPoints, takeoffDuration, currentTime) {
    const takeoffSteps = 20
    const takeoffStepTime = takeoffDuration / takeoffSteps
    const tempJulianDate = new Cesium.JulianDate()
    const tempCartesian3 = new Cesium.Cartesian3()
    const heightDifference = keyPoints[1].z - keyPoints[0].z
    
    for (let i = 0; i <= takeoffSteps; i++) {
      // 垂直起飞：只改变高度，经纬度保持不变
      Cesium.Cartesian3.clone(keyPoints[0], tempCartesian3)
      tempCartesian3.z = keyPoints[0].z + heightDifference * (i / takeoffSteps)
      positionProperty.addSample(currentTime, tempCartesian3)
      currentTime = Cesium.JulianDate.addSeconds(currentTime, takeoffStepTime, tempJulianDate)
    }

    return currentTime
  }

  /**
   * 添加巡航阶段位置点
   * @private
   */
  #addCruisePositions(positionProperty, keyPoints, cruiseDuration, currentTime) {
    const cruiseSteps = 30
    const cruiseStepTime = cruiseDuration / cruiseSteps
    const tempJulianDate = new Cesium.JulianDate()
    const tempCartesian3 = new Cesium.Cartesian3()
    
    for (let i = 0; i <= cruiseSteps; i++) {
      const ratio = i / cruiseSteps
      Cesium.Cartesian3.lerp(keyPoints[1], keyPoints[2], ratio, tempCartesian3)
      positionProperty.addSample(currentTime, tempCartesian3)
      currentTime = Cesium.JulianDate.addSeconds(currentTime, cruiseStepTime, tempJulianDate)
    }

    return currentTime
  }

  /**
   * 添加降落阶段位置点
   * @private
   */
  #addLandingPositions(positionProperty, keyPoints, landingDuration, currentTime) {
    const landingSteps = 20
    const landingStepTime = landingDuration / landingSteps
    const tempJulianDate = new Cesium.JulianDate()
    const tempCartesian3 = new Cesium.Cartesian3()
    const heightDifference = keyPoints[3].z - keyPoints[2].z
    
    for (let i = 0; i <= landingSteps; i++) {
      // 垂直降落：只改变高度，经纬度保持不变
      Cesium.Cartesian3.clone(keyPoints[3], tempCartesian3)
      tempCartesian3.z = keyPoints[2].z + heightDifference * (i / landingSteps)
      positionProperty.addSample(currentTime, tempCartesian3)
      currentTime = Cesium.JulianDate.addSeconds(currentTime, landingStepTime, tempJulianDate)
    }

    return currentTime
  }

  /**
   * 创建朝向属性
   * @private
   */
  #createOrientationProperty(routeId, velocityOrientation) {
    return new Cesium.CallbackProperty((time, result) => {
      // 获取基于速度的朝向
      const velocityQuaternion = velocityOrientation.getValue(time)
      
      // 获取当前航线的飞机姿态调整参数（键盘调整）
      const attitude = this.#planeAttitudes.get(routeId)
      
      // 只有当有姿态调整时才应用自定义姿态
      if (attitude && (attitude.heading !== 0 || attitude.pitch !== 0 || attitude.roll !== 0)) {
        // 创建自定义姿态的四元数
        const customAttitudeQuaternion = Cesium.Transforms.headingPitchRollQuaternion(
          Cesium.Cartesian3.ZERO,
          new Cesium.HeadingPitchRoll(
            Cesium.Math.toRadians(attitude.heading),
            Cesium.Math.toRadians(attitude.pitch),
            Cesium.Math.toRadians(attitude.roll)
          )
        )
        
        // 结合速度朝向和自定义姿态
        return Cesium.Quaternion.multiply(
          velocityQuaternion,
          customAttitudeQuaternion,
          result
        )
      }
      
      // 没有姿态调整时，直接使用速度朝向
      return velocityQuaternion
    }, false)
  }

  /**
   * 配置时钟
   * @private
   */
  #configureClock(routeStartTime, routeEndTime, duration) {
    const existingClock = this.#viewer.clock
    let startTime
    let endTime

    if (routeStartTime) {
      startTime = Cesium.JulianDate.fromDate(routeStartTime)
    } else {
      startTime = existingClock.startTime
    }

    if (routeEndTime) {
      endTime = Cesium.JulianDate.fromDate(routeEndTime)
    } else {
      endTime = Cesium.JulianDate.addSeconds(startTime, duration || 180, new Cesium.JulianDate())
    }

    existingClock.startTime = startTime.clone()
    existingClock.stopTime = endTime.clone()
    existingClock.currentTime = startTime.clone()
    existingClock.clockRange = Cesium.ClockRange.LOOP_STOP
    existingClock.multiplier = 1
    existingClock.shouldAnimate = true

    // 确保时间轴显示正确的时间范围
    if (this.#viewer.timeline) {
      this.#viewer.timeline.zoomTo(startTime, endTime)
      
      // 添加时间轴交互事件监听器，当用户调整时间轴后自动重新启动动画
      this.#setupTimelineEventListener()
    }
  }

  /**
   * 设置时间轴事件监听器
   * @private
   */
  #setupTimelineEventListener() {
    // 移除现有的监听器，避免重复添加
    if (this.#timelineEventListener) {
      this.#viewer.timeline.removeEventListener('settime', this.#timelineEventListener)
    }
    
    // 当用户调整时间轴时，重新启动动画
    this.#timelineEventListener = () => {
      if (this.#viewer && !this.#viewer.clock.shouldAnimate) {
        // 延迟一小段时间，确保时间轴操作完成
        setTimeout(() => {
          this.#viewer.clock.shouldAnimate = true
        }, 100)
      }
    }
    
    // 添加监听器
    this.#viewer.timeline.addEventListener('settime', this.#timelineEventListener)
  }

  /**
   * 创建飞机实体
   * @private
   * @param {string} routeId - 航线ID
   * @param {Cesium.SampledPositionProperty} positionProperty - 位置属性
   * @param {Cesium.CallbackProperty} orientationProperty - 朝向属性
   * @returns {Cesium.Entity} 飞机实体
   */
  #createPlaneEntity(routeId, positionProperty, orientationProperty) {
    return this.#viewer.entities.add({
      id: `route_${routeId}_plane`,
      position: positionProperty,
      orientation: orientationProperty,
      model: this.#createPlaneModel(),
      path: this.#createPlanePath(),
      label: this.#createPlaneLabel(positionProperty)
    })
  }

  /**
   * 创建飞机模型配置
   * @private
   * @returns {Object} 飞机模型配置
   */
  #createPlaneModel() {
    return {
      uri: this.options.planeModelUrl,
      scale: 4.0,
      show: true,
      minimumPixelSize: 64,
      maximumScale: 20000
    }
  }

  /**
   * 创建飞机飞行路径
   * @private
   * @returns {Object} 路径配置
   */
  #createPlanePath() {
    return {
      resolution: 1,
      width: 15,
      material: new Cesium.PolylineGlowMaterialProperty({
        glowPower: 0.1,
        color: Cesium.Color.ORANGE
      })
    }
  }

  /**
   * 创建飞机标签
   * @private
   * @param {Cesium.SampledPositionProperty} positionProperty - 位置属性
   * @returns {Object} 标签配置
   */
  #createPlaneLabel(positionProperty) {
    return {
      // 使用CallbackProperty动态更新标签内容
      text: new Cesium.CallbackProperty((time) => {
        return this.#generatePlaneLabelText(positionProperty, time)
      }, false),
      // 标签样式
      font: '12px sans-serif',
      fillColor: Cesium.Color.WHITE,
      outlineColor: Cesium.Color.BLACK,
      outlineWidth: 2,
      showBackground: true,
      backgroundColor: Cesium.Color.fromCssColorString('rgba(0, 0, 0, 0.7)'),
      backgroundPadding: new Cesium.Cartesian2(10, 5),
      horizontalOrigin: Cesium.HorizontalOrigin.CENTER,
      verticalOrigin: Cesium.VerticalOrigin.TOP,
      pixelOffset: new Cesium.Cartesian2(0, -60), // 显示在飞机上方
      disableDepthTestDistance: Number.POSITIVE_INFINITY // 确保标签始终可见
    }
  }

  /**
   * 生成飞机标签文本
   * @private
   */
  #generatePlaneLabelText(positionProperty, time) {
    const position = positionProperty.getValue(time)
    if (position) {
      const cartographic = Cesium.Cartographic.fromCartesian(position)
      const longitude = Cesium.Math.toDegrees(cartographic.longitude).toFixed(4)
      const latitude = Cesium.Math.toDegrees(cartographic.latitude).toFixed(4)
      const height = cartographic.height.toFixed(0)
      
      // 获取实时风速
      let windSpeed = 0

      try {
        // 尝试获取风场数据，但确保在风场数据未准备好时不会影响飞机显示
        const windStore = useWindStore()
        const windLayers = windStore.windLayer

        if (windLayers && Array.isArray(windLayers) && windLayers.length > 0) {
          // 获取当前位置的经纬度（转换为数字类型）
          const lonNum = parseFloat(longitude)
          const latNum = parseFloat(latitude)

          // 遍历所有风场图层，获取最接近当前高度的风场数据
          let closestWindData = null
          let minHeightDiff = Infinity

          for (const windLayer of windLayers) {
            if (windLayer && typeof windLayer.getDataAtLonLat === 'function') {
              try {
                const windData = windLayer.getDataAtLonLat(lonNum, latNum)
                if (windData && typeof windData.interpolated.speed === 'number') {
                  // 获取当前图层的高度
                  const layerIndex = windLayers.indexOf(windLayer)
                  const layerHeight = windStore.windData?.layers?.[layerIndex]?.height || 0
                  const heightDiff = Math.abs(parseFloat(height) - layerHeight)

                  // 找到最接近当前高度的风场数据
                  if (heightDiff < minHeightDiff) {
                    minHeightDiff = heightDiff
                    closestWindData = windData
                  }
                }
              } catch (error) {
                // 忽略风场数据获取错误，确保飞机正常显示
              }
            }
          }

          // 使用最接近的风场数据
          if (closestWindData) {
            windSpeed = closestWindData.interpolated.speed.toFixed(1)
          }
        }
      } catch (error) {
        // 忽略所有错误，确保飞机正常显示
      }

      return `经：${longitude}° 纬：${latitude}° 
 高：${height}m 风速：${windSpeed}m/s`
    }
    return ''
  }

  /**
   * 动态调整飞机姿态
   * @param {String} routeId 航线ID
   * @param {Object} attitude 姿态调整参数
   * @param {Number} attitude.heading 偏航角（度）
   * @param {Number} attitude.pitch 俯仰角（度）
   * @param {Number} attitude.roll 滚转角（度）
   */
  setPlaneAttitude(routeId, attitude) {
    if (!routeId || !attitude) return
    
    // 获取当前姿态
    const currentAttitude = this.#planeAttitudes.get(routeId) || { heading: 0, pitch: 0, roll: 0 }
    
    // 更新姿态参数
    const newAttitude = {
      heading: attitude.heading !== undefined ? attitude.heading : currentAttitude.heading,
      pitch: attitude.pitch !== undefined ? attitude.pitch : currentAttitude.pitch,
      roll: attitude.roll !== undefined ? attitude.roll : currentAttitude.roll
    }
    
    // 存储更新后的姿态
    this.#planeAttitudes.set(routeId, newAttitude)
    
    console.log(`[${new Date().toLocaleTimeString()}] 调整飞机姿态 - 航线: ${routeId}, 姿态:`, newAttitude)
    
    // 触发场景重绘
    if (this.#viewer) {
      this.#viewer.scene.requestRender()
    }
  }

  /**
   * 暂停飞机飞行
   */
  pauseFlight() {
    if (this.#viewer) {
      this.#viewer.clock.shouldAnimate = false
      console.log('飞机飞行已暂停')
    }
  }

  /**
   * 继续飞机飞行
   */
  resumeFlight() {
    if (this.#viewer) {
      this.#viewer.clock.shouldAnimate = true
      console.log('飞机飞行已继续')
    }
  }

  /**
   * 切换飞机飞行状态（暂停/继续）
   * @returns {boolean} 当前飞行状态，true表示正在飞行，false表示已暂停
   */
  toggleFlight() {
    if (!this.#viewer) return false
    
    this.#viewer.clock.shouldAnimate = !this.#viewer.clock.shouldAnimate
    const isFlying = this.#viewer.clock.shouldAnimate
    
    console.log(isFlying ? '飞机飞行已继续' : '飞机飞行已暂停')
    return isFlying
  }

  /**
   * 初始化键盘事件监听
   */
  initKeyboardControls() {
    // 如果已经存在事件监听器，先移除
    if (this.#keyboardEventListener) {
      document.removeEventListener('keydown', this.#keyboardEventListener)
    }
    
    // 键盘事件处理函数
    this.#keyboardEventListener = (event) => {
      if (!this.#activeRouteId) return
      
      // 获取当前姿态
      const currentAttitude = this.#planeAttitudes.get(this.#activeRouteId) || { heading: 0, pitch: 0, roll: 0 }
      // 姿态调整步长
      const step = 2
      
      // 根据按键调整姿态
      switch (event.key) {
        case 'ArrowUp':
          // 上箭头：抬头（增加俯仰角）
          this.setPlaneAttitude(this.#activeRouteId, {
            pitch: currentAttitude.pitch + step,
            roll: currentAttitude.roll,
            heading: currentAttitude.heading
          })
          break
        case 'ArrowDown':
          // 下箭头：低头（减少俯仰角）
          this.setPlaneAttitude(this.#activeRouteId, {
            pitch: currentAttitude.pitch - step,
            roll: currentAttitude.roll,
            heading: currentAttitude.heading
          })
          break
        case 'ArrowLeft':
          // 左箭头：向左滚转（减少滚转角）
          this.setPlaneAttitude(this.#activeRouteId, {
            roll: currentAttitude.roll - step,
            pitch: currentAttitude.pitch,
            heading: currentAttitude.heading
          })
          break
        case 'ArrowRight':
          // 右箭头：向右滚转（增加滚转角）
          this.setPlaneAttitude(this.#activeRouteId, {
            roll: currentAttitude.roll + step,
            pitch: currentAttitude.pitch,
            heading: currentAttitude.heading
          })
          break
        case 'c':
          // A键：向左偏航（减少偏航角）
          this.setPlaneAttitude(this.#activeRouteId, {
            heading: currentAttitude.heading - step,
            pitch: currentAttitude.pitch,
            roll: currentAttitude.roll
          })
          break
        case 'v':
          // D键：向右偏航（增加偏航角）
          this.setPlaneAttitude(this.#activeRouteId, {
            heading: currentAttitude.heading + step,
            pitch: currentAttitude.pitch,
            roll: currentAttitude.roll
          })
          break
      }
    }
    
    // 添加键盘事件监听器
    document.addEventListener('keydown', this.#keyboardEventListener)
    console.log('键盘控制已初始化，使用上下左右键调整飞机姿态，AD键调整偏航角')
  }

  /**
   * 清理飞机姿态数据
   * @param {string} routeId - 航线ID
   */
  clearPlaneAttitude(routeId) {
    this.#planeAttitudes.delete(routeId)
  }

  /**
   * 清理所有资源
   */
  destroy() {
    // 移除键盘事件监听器
    if (this.#keyboardEventListener) {
      document.removeEventListener('keydown', this.#keyboardEventListener)
      this.#keyboardEventListener = null
    }
    
    // 移除时间轴事件监听器
    if (this.#timelineEventListener && this.#viewer && this.#viewer.timeline) {
      this.#viewer.timeline.removeEventListener('settime', this.#timelineEventListener)
      this.#timelineEventListener = null
    }
    
    this.#planeAttitudes.clear()
    this.#activeRouteId = null
    this.#viewer = null
  }

  // 私有属性
  #planeAttitudes
  #keyboardEventListener
  #timelineEventListener
  #activeRouteId
  #viewer
}

// 导出实例
export const aircraftController = new AircraftController()
export default aircraftController
