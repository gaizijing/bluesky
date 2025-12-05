import * as Cesium from 'cesium'
import { flyToRegion } from '@/cesium/core/camera'
import eventManager from '@/cesium/core/eventManager'

class MonitorPointManager {
   // 静态属性存储唯一实例
  static instance = null

  /**
   * 私有构造函数，防止外部直接实例化
   * @param {Cesium.Viewer} viewer - Cesium viewer实例
   * @param {Object} monitorStore - 监测点状态管理对象
   */
  constructor(viewer, monitorStore) {
    // 防止通过new关键字重复创建
    if (MonitorPointManager.instance) {
      return MonitorPointManager.instance
    }

    this.viewer = viewer
    this.monitorStore = monitorStore
    this.monitorEntities = new Map() // 存储监测点实体
    this.originalBillboardStyle = new Map() // 存储原始样式
    this.hoveredEntity = null
    this.selectedEntity = null
    this.MOUSE_MOVE_THROTTLE_MS = 50
    this.lastMouseMoveTime = 0

    // 初始化时绑定事件（仅首次实例化时执行）
    this._bindEvents()

    // 存储实例
    MonitorPointManager.instance = this
  }

  /**
   * 静态方法：获取单例实例（推荐使用此方法获取实例）
   * @param {Cesium.Viewer} viewer - Cesium viewer实例（首次调用时必传）
   * @param {Object} monitorStore - 监测点状态管理对象（首次调用时必传）
   * @returns {MonitorPointManager} 单例实例
   */
  static getInstance(viewer, monitorStore) {
    if (!MonitorPointManager.instance) {
      // 首次调用时创建实例
      new MonitorPointManager(viewer, monitorStore)
    }
    return MonitorPointManager.instance
  }

  /**
   * 渲染监测点
   * @param {Array} monitorPoints - 监测点数据数组
   */
  render(monitorPoints) {
    if (!monitorPoints || !this.viewer) return

    // 清除现有实体
    this._clearExistingEntities()

    // 移除旧聚合数据源
    const oldDataSource = this.viewer.dataSources.getByName('monitorClustering')[0]
    if (oldDataSource) {
      this.viewer.dataSources.remove(oldDataSource)
    }

    // 创建新的聚合数据源
    const dataSource = new Cesium.CustomDataSource('monitorClustering')
    this.viewer.dataSources.add(dataSource)

    // 配置聚合参数
    this._configureClustering(dataSource)

    // 创建并添加监测点实体
    monitorPoints.forEach(point => {
      const entity = this._createMonitorPoint(dataSource, point)
      dataSource.entities.add(entity)
    })

    this.viewer.zoomTo(dataSource)
  }

  /**
   * 设置选中的监测点
   * @param {String} entityId - 监测点实体ID（格式: monitor_${id}）
   */
  setSelected(entityId) {
    if (!entityId || !this.viewer) return

    const entity = this.monitorEntities.get(entityId)
    if (!entity || !this._isMonitorEntity(entity)) return

    this.selectedEntity = this._setEntityAsSelected(entity)
    
    // 飞行到选中点
    const pointData = entity.properties.pointData
    const point = pointData && pointData.getValue ? pointData.getValue() : pointData
    if (point?.coordinates) {
      flyToRegion(this.viewer, { coordinates: point.coordinates, duration: 1.5 })
    }
  }
  /**
   * 卸载监测点（核心：清理所有资源/事件/状态）
   * @param {Boolean} resetInstance - 是否重置单例实例（默认true，如需复用可传false）
   */
  destroy(resetInstance = true) {
    if (!this.viewer) return

    // 1. 解绑事件
    this._unbindEvents()

    // 2. 清理Cesium资源
    this._clearCesiumResources()

    // 3. 重置内部状态
    this._resetState()

    // 4. 可选：重置单例实例（方便后续重新初始化）
    if (resetInstance) {
      MonitorPointManager.instance = null
    }

    console.log('监测点已完全卸载，资源清理完成')
  }


  // 私有方法：绑定事件
  _bindEvents() {
    if (!this.viewer) return

    // 相机移动结束保持选中样式
    this.viewer.scene.camera.moveEnd.addEventListener(() => {
      if (this.selectedEntity?.billboard) {
        this.selectedEntity.billboard.image = '/image/ic_select_point.png'
        this.selectedEntity.billboard.scale = 1.5
      }
    })

    // 注册点击事件处理器
    eventManager.registerClickHandler((viewer, movement) => this._clusterClickHandler(movement), 3)

    // 鼠标移动事件
    this.viewer.screenSpaceEventHandler.setInputAction((movement) => {
      this._handleMouseMove(movement)
    }, Cesium.ScreenSpaceEventType.MOUSE_MOVE)
  }

  // 私有方法：聚合点点击处理
  _clusterClickHandler(movement) {
    const pickedObject = this.viewer.scene.pick(movement.position)

    // 处理聚合集群点击
    if (pickedObject && pickedObject.id && Array.isArray(pickedObject.id)) {
      this._handleClusterClick(pickedObject.id)
      return true
    }

    // 处理单个监测点点击
    if (pickedObject && pickedObject.id && this._isMonitorEntity(pickedObject.id)) {
      this.selectedEntity = this._setEntityAsSelected(pickedObject.id)
      const pointData = pickedObject.id.properties.pointData
      const point = pointData && pointData.getValue ? pointData.getValue() : pointData
      if (point?.coordinates) {
        flyToRegion(this.viewer, { coordinates: point.coordinates, duration: 1.5 })
      }
      return true
    }

    return false
  }

  // 私有方法：处理聚合点点击
  _handleClusterClick(clusteredEntities) {
    const positions = clusteredEntities.map(entity => {
      if (entity.position) {
        return entity.position.getValue(Cesium.JulianDate.now())
      }
      return null
    }).filter(pos => pos !== null)

    if (positions.length === 0) return

    const boundingSphere = Cesium.BoundingSphere.fromPoints(positions)
    this.viewer.camera.flyToBoundingSphere(boundingSphere, {
      duration: 1.5,
      offset: new Cesium.HeadingPitchRange(
        this.viewer.camera.heading,
        this.viewer.camera.pitch,
        boundingSphere.radius * 3.0
      )
    })

    const dataSource = this.viewer.dataSources.getByName('monitorClustering')[0]
    if (dataSource) {
      dataSource.clustering.enabled = false
      setTimeout(() => {
        dataSource.clustering.enabled = true
      }, 2000)
    }
  }

  // 私有方法：处理鼠标移动
  _handleMouseMove(movement) {
    const now = Date.now()
    if (now - this.lastMouseMoveTime < this.MOUSE_MOVE_THROTTLE_MS) return
    this.lastMouseMoveTime = now

    try {
      const pickedObject = this.viewer.scene.pick(movement.endPosition)

      // 恢复非选中状态的悬停样式
      if (this.hoveredEntity && this.hoveredEntity.id !== this.selectedEntity?.id) {
        const stillHovered = Cesium.defined(pickedObject) && pickedObject.id === this.hoveredEntity
        if (!stillHovered) {
          this._restoreOriginalBillboardStyle(this.hoveredEntity)
          this.hoveredEntity = null
          this.viewer.canvas.style.cursor = 'default'
        }
      }

      // 处理监测点悬停
      if (Cesium.defined(pickedObject) && this._isMonitorEntity(pickedObject.id)) {
        this.viewer.canvas.style.cursor = 'pointer'

        if (pickedObject.id === this.selectedEntity) {
          if (this.selectedEntity?.billboard) {
            this.selectedEntity.billboard.image = '/image/ic_select_point.png'
            this.selectedEntity.billboard.scale = 1.5
          }
        } else if (pickedObject.id !== this.hoveredEntity) {
          this._saveOriginalBillboardStyle(pickedObject.id)
          if (pickedObject.id.billboard) pickedObject.id.billboard.scale = 1.6
          this.hoveredEntity = pickedObject.id
        }
      } else if (!this.hoveredEntity) {
        this.viewer.canvas.style.cursor = 'default'
      }
    } catch (e) {
      // 忽略pick错误
    }
  }

  // 私有方法：创建监测点实体
  _createMonitorPoint(dataSource, point) {
    if (!dataSource || !point?.coordinates) return
    console.log(point);
    
    const entityId = `monitor_${point.id}`
    // 移除旧实体
    if (this.monitorEntities.has(entityId)) {
      const old = this.monitorEntities.get(entityId)
      try { dataSource.entities.remove(old) } catch (e) { }
      this.originalBillboardStyle.delete(entityId)
    }

    // 创建新实体
    const entity = new Cesium.Entity({
      id: entityId,
      position: Cesium.Cartesian3.fromDegrees(point.coordinates[0], point.coordinates[1], 50),
      billboard: new Cesium.BillboardGraphics({
        image: '/image/ic_point.png',
        width: 60,
        height: 60,
        verticalOrigin: Cesium.VerticalOrigin.BOTTOM,
        disableDepthTestDistance: Number.POSITIVE_INFINITY
      }),
      label: new Cesium.LabelGraphics({
        text: point.name,
        font: '14px sans-serif',
        fillColor: Cesium.Color.WHITE,
        outlineColor: Cesium.Color.BLACK,
        outlineWidth: 4,
        style: Cesium.LabelStyle.FILL_AND_OUTLINE,
        pixelOffset: new Cesium.Cartesian2(0, 0),
        verticalOrigin: Cesium.VerticalOrigin.BOTTOM,
        disableDepthTestDistance: Number.POSITIVE_INFINITY
      }),
      
      
      properties: { pointData: point }
    })

    this._saveOriginalBillboardStyle(entity)
    this.monitorEntities.set(entityId, entity)
    return entity
  }

  // 私有方法：配置聚合参数
  _configureClustering(dataSource) {
    dataSource.clustering.enabled = true
    dataSource.clustering.pixelRange = 80
    dataSource.clustering.minimumClusterSize = 2
    dataSource.clustering.clusterEvent.addEventListener((clusteredEntities, cluster) => {
      cluster.label.show = false
      cluster.billboard.show = true
      cluster.billboard.id = cluster.label.id
      cluster.billboard.verticalOrigin = Cesium.VerticalOrigin.BOTTOM
      const pinBuilder = new Cesium.PinBuilder()
      cluster.billboard.image = pinBuilder
        .fromText(`${clusteredEntities.length}`, Cesium.Color.DARKBLUE, 48)
        .toDataURL()
    })
  }

  // 私有方法：清除现有实体
  _clearExistingEntities() {
    this.monitorEntities.forEach(entity => {
      try { this.viewer.entities.remove(entity) } catch (e) { }
      this.originalBillboardStyle.delete(entity.id)
    })
    this.monitorEntities.clear()
  }

  // 私有方法：设置实体为选中状态
  _setEntityAsSelected(entity) {
    this._restoreAllBillboardStyles()

    if (entity?.billboard) {
      if (!this.originalBillboardStyle.has(entity.id)) {
        this._saveOriginalBillboardStyle(entity)
      }

      entity.billboard.image = '/image/ic_select_point.png'
      entity.billboard.scale = 1.5
      this.viewer.canvas.style.cursor = 'pointer'

      try {
        const point = entity.properties?.pointData?.getValue
          ? entity.properties.pointData.getValue()
          : entity.properties?.pointData
        this.monitorStore.setSelectedPoint(point)
      } catch (e) {
        this.monitorStore.setSelectedPoint(null)
      }
    } else {
      this.monitorStore.setSelectedPoint(null)
      this.viewer.canvas.style.cursor = 'default'
    }
    return entity
  }

  // 私有方法：判断是否为监测点实体
  _isMonitorEntity(entity) {
    return entity?.id?.startsWith && entity.id.startsWith('monitor_')
  }

  // 私有方法：恢复实体原始样式
  _restoreOriginalBillboardStyle(entity) {
    if (!entity?.billboard) return
    if (!this.originalBillboardStyle.has(entity.id)) return

    const original = this.originalBillboardStyle.get(entity.id)
    try {
      entity.billboard.image = original.image
      entity.billboard.width = original.width
      entity.billboard.height = original.height
      entity.billboard.scale = original.scale
    } catch (e) {
      if (Cesium.defined(entity.billboard)) {
        entity.billboard.image = Cesium.ConstantProperty ? new Cesium.ConstantProperty(original.image) : original.image
        entity.billboard.width = Cesium.ConstantProperty ? new Cesium.ConstantProperty(original.width) : original.width
        entity.billboard.height = Cesium.ConstantProperty ? new Cesium.ConstantProperty(original.height) : original.height
        entity.billboard.scale = Cesium.ConstantProperty ? new Cesium.ConstantProperty(original.scale) : original.scale
      }
    }
  }

  // 私有方法：恢复所有实体原始样式
  _restoreAllBillboardStyles() {
    this.monitorEntities.forEach(entity => {
      try {
        this._restoreOriginalBillboardStyle(entity)
      } catch (e) {
        console.warn('恢复样式失败：', entity.id, e)
      }
    })
  }

  // 私有方法：保存实体原始样式
  _saveOriginalBillboardStyle(entity) {
    if (!entity?.billboard) return
    if (this.originalBillboardStyle.has(entity.id)) return

    try {
      const image = entity.billboard.image && entity.billboard.image.getValue
        ? entity.billboard.image.getValue()
        : entity.billboard.image

      const width = entity.billboard.width && entity.billboard.width.getValue
        ? entity.billboard.width.getValue()
        : entity.billboard.width

      const height = entity.billboard.height && entity.billboard.height.getValue
        ? entity.billboard.height.getValue()
        : entity.billboard.height

      const scale = entity.billboard.scale && entity.billboard.scale.getValue
        ? entity.billboard.scale.getValue()
        : (entity.billboard.scale ?? 1)

      this.originalBillboardStyle.set(entity.id, { image, width, height, scale })
    } catch (e) {
      this.originalBillboardStyle.set(entity.id, {
        image: entity.billboard.image,
        width: entity.billboard.width,
        height: entity.billboard.height,
        scale: entity.billboard.scale
      })
    }
  }
   // 私有方法：解绑所有事件
  _unbindEvents() {
    if (!this.viewer) return

    // 1. 解绑相机移动事件
    if (this._cameraMoveEndListener) {
      this.viewer.scene.camera.moveEnd.removeEventListener(this._cameraMoveEndListener)
      this._cameraMoveEndListener = null
    }

    // 2. 注销eventManager的点击处理器
    if (this._clickHandler) {
      eventManager.unregisterClickHandler(this._clickHandler, 3) // 需确保eventManager支持按handler+优先级注销
      this._clickHandler = null
    }

    // 3. 移除鼠标移动事件
    this.viewer.screenSpaceEventHandler.removeInputAction(Cesium.ScreenSpaceEventType.MOUSE_MOVE)

    // 4. 恢复鼠标样式
    if (this.viewer.canvas) {
      this.viewer.canvas.style.cursor = 'default'
    }
  }

  // 私有方法：清理Cesium资源（实体/数据源）
  _clearCesiumResources() {
    // 1. 移除所有监测点实体
    this.monitorEntities.forEach(entity => {
      try {
        // 先从数据源移除，再从viewer移除（双重保障）
        const dataSource = this.viewer.dataSources.getByName('monitorClustering')[0]
        if (dataSource) {
          dataSource.entities.remove(entity)
        }
        this.viewer.entities.remove(entity)
      } catch (e) {
        console.warn('移除监测点实体失败：', entity.id, e)
      }
    })

    // 2. 移除并销毁聚合数据源
    const dataSource = this.viewer.dataSources.getByName('monitorClustering')[0]
    if (dataSource) {
      this.viewer.dataSources.remove(dataSource, true) // true：销毁数据源，释放内存
    }
  }

  // 私有方法：重置内部状态
  _resetState() {
    // 清空实体缓存
    this.monitorEntities.clear()
    // 清空样式缓存
    this.originalBillboardStyle.clear()
    // 重置交互状态
    this.hoveredEntity = null
    this.selectedEntity = null
    this.lastMouseMoveTime = 0
    // 清空store选中状态
    if (this.monitorStore) {
      this.monitorStore.setSelectedPoint(null)
    }
  }
   setMonitoringPointsVisibility(visible) {
    console.log('gzj', this.monitorEntities);

    this.monitorEntities.forEach((entity) => {
      console.log(entity);

      if (entity) {
        entity.show = visible;
      }
    });
  };
}

export { MonitorPointManager }