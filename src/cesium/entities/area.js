import * as Cesium from 'cesium'
import { flyToRegion } from '@/cesium/core/camera'
import eventManager from '@/cesium/core/eventManager'
import { AreaService } from '@/services/areaService'
import { InitializationService } from '@/services/initialization'
import { WallDiffuseMaterialProperty } from '@/cesium/WallDiffuseMaterialProperty'

class AreaManager {
  static instance = null

  constructor(viewer, areaStore) {
    if (AreaManager.instance) {
      return AreaManager.instance
    }

    this.viewer = viewer
    this.areaStore = areaStore
    this.areaEntities = new Map()
    this.originalBillboardStyle = new Map()
    this.hoveredEntity = null
    this.selectedEntity = null
    this.selectedAreaPolygon = null
    this.hoveredAreaPolygon = null
    this.MOUSE_MOVE_THROTTLE_MS = 50
    this.lastMouseMoveTime = 0
    this.areaService = new AreaService()
    this.initializeService = new InitializationService()
    this._bindEvents()
    AreaManager.instance = this
  }

  static getInstance(viewer, areaStore) {
    if (!AreaManager.instance) {
      new AreaManager(viewer, areaStore)
    }
    return AreaManager.instance
  }

  /**
   * 渲染重点关注区域
   * @param {Array} areas - 重点关注区域数据数组
   */
  render(areas) {
    if (!areas || !this.viewer) return

    // 清除现有实体
    this._clearExistingEntities()

    // 移除旧聚合数据源
    const oldDataSource = this.viewer.dataSources.getByName('areaClustering')[0]
    if (oldDataSource) {
      this.viewer.dataSources.remove(oldDataSource)
    }

    // 创建新的聚合数据源
    const dataSource = new Cesium.CustomDataSource('areaClustering')
    this.viewer.dataSources.add(dataSource)

    // 配置聚合参数
    this._configureClustering(dataSource)

    // 创建并添加重点关注区域实体    
    areas.forEach(area => {
      const entity = this._createAreaEntity(dataSource, area)
        dataSource.entities.add(entity)
    })

    this.viewer.zoomTo(dataSource)
  }

  /**
   * 设置选中的重点关注区域
   * @param {String} entityId - 重点关注区域实体ID（格式: area_${id}）
   */
  setSelected(entityId) {
    if (!entityId || !this.viewer) return

    const entity = this.areaEntities.get(entityId)

    this.selectedEntity = this._setEntityAsSelected(entity)

    const areaData = entity.properties.areaData
    const area = areaData && areaData.getValue ? areaData.getValue() : areaData
    if (area?.bbox) {
      
      flyToRegion(this.viewer, { bbox: area.bbox, duration: 1.5 })
      this._showSelectedAreaPolygon(area.bbox)
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
      AreaManager.instance = null
    }

    console.log('重点关注区域已完全卸载，资源清理完成')
  }


  _bindEvents() {
    if (!this.viewer) return

    this.viewer.scene.camera.moveEnd.addEventListener(() => {
      if (this.selectedEntity?.billboard) {
        this.selectedEntity.billboard.image = '/image/ic_select_point.png'
        this.selectedEntity.billboard.scale = 1.5
      }
    })

    eventManager.registerClickHandler((viewer, movement) => this._clusterClickHandler(movement), 3)

    this._mouseMoveUnregister = eventManager.on('mouse-move', (movement) => {
      this._handleMouseMove(movement)
    })
  }

  // 私有方法：聚合点点击处理
  _clusterClickHandler(movement) {
    const pickedObject = this.viewer.scene.pick(movement.position)

    if (pickedObject && pickedObject.id && Array.isArray(pickedObject.id)) {
      this._handleClusterClick(pickedObject.id)
      return true
    }

    if (pickedObject && pickedObject.id && this._isAreaEntity(pickedObject.id)) {
      this.selectedEntity = this._setEntityAsSelected(pickedObject.id)
      const areaData = pickedObject.id.properties.areaData
      const area = areaData && areaData.getValue ? areaData.getValue() : areaData
      if (area?.bbox) {
        flyToRegion(this.viewer, { bbox: area.bbox, duration: 1.5 })
        this._showSelectedAreaPolygon(area.bbox)
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

    const dataSource = this.viewer.dataSources.getByName('areaClustering')[0]
    if (dataSource) {
      dataSource.clustering.enabled = false
      setTimeout(() => {
        dataSource.clustering.enabled = true
      }, 2000)
    }
  }

  _handleMouseMove(movement) {
    if (!this.viewer) {
      return
    }

    const now = Date.now()
    if (now - this.lastMouseMoveTime < this.MOUSE_MOVE_THROTTLE_MS) return
    this.lastMouseMoveTime = now

    try {
      const pickedObject = this.viewer.scene.pick(movement.endPosition)

      if (this.hoveredEntity && this.hoveredEntity.id !== this.selectedEntity?.id) {
        const stillHovered = Cesium.defined(pickedObject) && pickedObject.id === this.hoveredEntity
        if (!stillHovered) {
          this._restoreOriginalBillboardStyle(this.hoveredEntity)
          this.hoveredEntity = null
          this.viewer.canvas.style.cursor = 'default'
          this._clearHoveredAreaPolygon()
        }
      }

      if (Cesium.defined(pickedObject) && pickedObject.id) {
        const entity = pickedObject.id

        if (Array.isArray(entity)) {
          return
        }

        if (this._isAreaEntity(entity)) {
          this.viewer.canvas.style.cursor = 'pointer'

          if (entity === this.selectedEntity) {
            if (this.selectedEntity?.billboard) {
              this.selectedEntity.billboard.image = '/image/ic_select_point.png'
              this.selectedEntity.billboard.scale = 1.5
            }
          } else if (entity !== this.hoveredEntity) {
            try {
              this._saveOriginalBillboardStyle(entity)
              if (entity.billboard) entity.billboard.scale = 1.6
              this.hoveredEntity = entity

              // // 安全获取 areaData，确保数据可序列化 鼠标放上有方框的选中效果
              // const areaData = entity.properties?.areaData
              // if (areaData) {
              //   const area = areaData && areaData.getValue ? areaData.getValue() : areaData
              //   // 验证 area 和 bbox 的结构
              //   if (area && typeof area === 'object' && area.bbox) {
              //     // 验证 bbox 是有效的二维数组
              //     if (Array.isArray(area.bbox) && area.bbox.length === 2 &&
              //       Array.isArray(area.bbox[0]) && Array.isArray(area.bbox[1])) {
              //       this._showHoveredAreaPolygon(area.bbox)
              //     }
              //   }
              // }
            } catch (e) {
              console.warn('Error processing hover data:', e)
              // 即使出错也继续执行，不影响其他功能
            }
          }
        }
      } else if (!this.hoveredEntity) {
        this.viewer.canvas.style.cursor = 'default'
      }
    } catch (e) {
      console.error('Hover error:', e)
    }
  }

  // 私有方法：创建重点关注区域实体
  _createAreaEntity(dataSource, area) {
    const entityId = `area_${area.id}`
    // 移除旧实体
    if (this.areaEntities.has(entityId)) {
      const old = this.areaEntities.get(entityId)
      try { dataSource.entities.remove(old) } catch (e) { }
      this.originalBillboardStyle.delete(entityId)
    }

    // 创建新实体，只保留可序列化的area属性
    const serializableArea = {
      id: area.id,
      name: area.name,
      longitude: area.longitude,
      latitude: area.latitude,
      bbox: area.bbox,
      type: area.type,
      status: area.status,
      location: area.location
    };

    const entity = new Cesium.Entity({
      id: entityId,
      position: Cesium.Cartesian3.fromDegrees(area.longitude, area.latitude, 50),
      billboard: new Cesium.BillboardGraphics({
        image: '/image/ic_point.png',
        width: 60,
        height: 60,
        verticalOrigin: Cesium.VerticalOrigin.BOTTOM,
        disableDepthTestDistance: Number.POSITIVE_INFINITY
      }),
      label: new Cesium.LabelGraphics({
        text: area.name,
        font: '14px sans-serif',
        fillColor: Cesium.Color.WHITE,
        outlineColor: Cesium.Color.BLACK,
        outlineWidth: 4,
        style: Cesium.LabelStyle.FILL_AND_OUTLINE,
        pixelOffset: new Cesium.Cartesian2(0, 0),
        verticalOrigin: Cesium.VerticalOrigin.BOTTOM,
        disableDepthTestDistance: Number.POSITIVE_INFINITY
      }),


      properties: { areaData: serializableArea }
    })

    this._saveOriginalBillboardStyle(entity)
    this.areaEntities.set(entityId, entity)
    return entity
  }

  // 私有方法：配置聚合参数
  _configureClustering(dataSource) {
    dataSource.clustering.enabled = true
    dataSource.clustering.pixelRange = 80
    dataSource.clustering.minimumClusterSize = 3
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
    this.areaEntities.forEach(entity => {
      try { this.viewer.entities.remove(entity) } catch (e) { }
      this.originalBillboardStyle.delete(entity.id)
    })
    this.areaEntities.clear()
  }

  _setEntityAsSelected(entity) {
    this._restoreAllBillboardStyles()

    if (this.selectedAreaPolygon) {
      this.viewer.entities.remove(this.selectedAreaPolygon)
      this.selectedAreaPolygon = null
    }

    if (this.hoveredAreaPolygon) {
      this.viewer.entities.remove(this.hoveredAreaPolygon)
      this.hoveredAreaPolygon = null
    }

    if (entity?.billboard) {
      if (!this.originalBillboardStyle.has(entity.id)) {
        this._saveOriginalBillboardStyle(entity)
      }

      entity.billboard.image = '/image/ic_select_point.png'
      entity.billboard.scale = 1.5
      this.viewer.canvas.style.cursor = 'pointer'

      try {
        const area = entity.properties?.areaData?.getValue
          ? entity.properties.areaData.getValue()
          : entity.properties?.areaData
        this.areaService.updateSelectedArea(area)
        this.initializeService.initializeAreaWeatherData();
        this.initializeService.initializeMapWeatherLayer();
        this.initializeService.initializeModuleData();
      } catch (e) {
        this.areaStore.setSelectedArea(null)
      }
    } else {
      // this.areaStore.setSelectedArea(null)
      // this.viewer.canvas.style.cursor = 'default'
    }
    return entity
  }

  // 私有方法：判断是否为重点关注区域实体
  _isAreaEntity(entity) {
    if (!entity || !entity.id) return false
    const id = typeof entity.id === 'string' ? entity.id : String(entity.id)
    return id.startsWith('area_')
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
    this.areaEntities.forEach(entity => {
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
  _unbindEvents() {
    if (!this.viewer) return

    if (this._cameraMoveEndListener) {
      this.viewer.scene.camera.moveEnd.removeEventListener(this._cameraMoveEndListener)
      this._cameraMoveEndListener = null
    }

    if (this._clickHandler) {
      eventManager.unregisterClickHandler(this._clickHandler, 3)
      this._clickHandler = null
    }

    if (this._mouseMoveUnregister) {
      this._mouseMoveUnregister()
      this._mouseMoveUnregister = null
    }

    if (this.viewer.canvas) {
      this.viewer.canvas.style.cursor = 'default'
    }
  }

  _clearCesiumResources() {
    this.areaEntities.forEach(entity => {
      try {
        const dataSource = this.viewer.dataSources.getByName('areaClustering')[0]
        if (dataSource) {
          dataSource.entities.remove(entity)
        }
        this.viewer.entities.remove(entity)
      } catch (e) {
        console.warn('移除监测点实体失败：', entity.id, e)
      }
    })

    if (this.selectedAreaPolygon) {
      this.viewer.entities.remove(this.selectedAreaPolygon)
      this.selectedAreaPolygon = null
    }

    if (this.hoveredAreaPolygon) {
      this.viewer.entities.remove(this.hoveredAreaPolygon)
      this.hoveredAreaPolygon = null
    }

    const dataSource = this.viewer.dataSources.getByName('areaClustering')[0]
    if (dataSource) {
      this.viewer.dataSources.remove(dataSource, true)
    }
  }

  // 私有方法：重置内部状态
  _resetState() {
    this.areaEntities.clear()
    this.originalBillboardStyle.clear()
    this.hoveredEntity = null
    this.selectedEntity = null
    this.lastMouseMoveTime = 0
    if (this.areaStore) {
      this.areaStore.setSelectedArea(null)
    }
    if (this.selectedAreaPolygon) {
      this.viewer.entities.remove(this.selectedAreaPolygon)
      this.selectedAreaPolygon = null
    }
    if (this.hoveredAreaPolygon) {
      this.viewer.entities.remove(this.hoveredAreaPolygon)
      this.hoveredAreaPolygon = null
    }
  }

  _showSelectedAreaPolygon(bbox) {
    if (this.selectedAreaPolygon) {
      this.viewer.entities.remove(this.selectedAreaPolygon)
    }

    const [[west, south], [east, north]] = bbox
    const positions = Cesium.Cartesian3.fromDegreesArray([
      west, south,
      east, south,
      east, north,
      west, north,
      west, south
    ])

    this.selectedAreaPolygon = this.viewer.entities.add({
      name: 'selectedAreaPolygon',
      wall: {
        positions: positions,
        maximumHeights: new Array(positions.length).fill(200),
        minimumHeights: new Array(positions.length).fill(0),
        material: new WallDiffuseMaterialProperty({
          color: new Cesium.Color(0.392, 0.584, 0.929, 1.0)
        }),
      }
    })
  }

  _showHoveredAreaPolygon(bbox) {
    if (this.hoveredAreaPolygon) {
      this.viewer.entities.remove(this.hoveredAreaPolygon)
    }

    const [[west, south], [east, north]] = bbox
    const positions = Cesium.Cartesian3.fromDegreesArrayHeights([
      west, south, 50,
      east, south, 50,
      east, north, 50,
      west, north, 50,
      west, south, 50
    ])

    this.hoveredAreaPolygon = this.viewer.entities.add({
      name: 'hoveredAreaPolygon',
      polygon: {
        hierarchy: new Cesium.PolygonHierarchy(positions),
        material: new Cesium.ColorMaterialProperty(Cesium.Color.fromCssColorString('#00ffcc').withAlpha(0.1)),
        outline: true,
        outlineColor: Cesium.Color.fromCssColorString('#00ffcc'),
        outlineWidth: 2,
        perPositionHeight: true,
        extrudedHeight: 100,
        closeTop: true,
        closeBottom: true
      }
    })
  }

  _clearHoveredAreaPolygon() {
    if (this.hoveredAreaPolygon) {
      this.viewer.entities.remove(this.hoveredAreaPolygon)
      this.hoveredAreaPolygon = null
    }
  }
  setAreasVisibility(visible) {
    this.areaEntities.forEach((entity) => {
      if (entity) {
        entity.show = visible;
      }
    });
  }
}

export { AreaManager }
