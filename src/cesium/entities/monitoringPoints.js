import * as Cesium from 'cesium'
import { configureCamera, getCurrentCameraParams, flyToRegion, flyToRectangle } from '@/cesium/core/camera'

export const isMonitorEntity = (entity) => {
  return entity?.id?.startsWith && entity.id.startsWith('monitor_')
}

export const bindMonitorPointEvents = (viewer, monitorEntities, monitorStore, originalBillboardStyle) => {
  if (!viewer) return

  let hoveredEntity = null
  let selectedEntity = null
  const MOUSE_MOVE_THROTTLE_MS = 50
  let lastMouseMoveTime = 0

  viewer.scene.camera.moveEnd.addEventListener(() => {
    if (selectedEntity?.billboard) {
      selectedEntity.billboard.image = '/image/ic_select_point.png'
      selectedEntity.billboard.scale = 1.5
    }
  })

  viewer.screenSpaceEventHandler.setInputAction((movement) => {
    try {
    
      
      const pickedObject = viewer.scene.pick(movement.position)
      if (Cesium.defined(pickedObject) && isMonitorEntity(pickedObject.id)) {
        const pointData = pickedObject.id.properties.pointData
        selectedEntity = setEntityAsSelected(
          viewer, 
          pickedObject.id, 
          monitorStore, 
          originalBillboardStyle, 
          monitorEntities
        )
        const point = pointData && pointData.getValue ? pointData.getValue() : pointData
        flyToRegion(viewer,{ coordinates: point.coordinates, duration: 2 })
      } else {
        restoreAllBillboardStyles(monitorEntities, originalBillboardStyle)
        monitorStore.setSelectedPoint(null)
        selectedEntity = null
      }
    } catch (e) {
      console.warn('点击处理失败：', e)
    }
  }, Cesium.ScreenSpaceEventType.LEFT_CLICK)

  viewer.screenSpaceEventHandler.setInputAction((movement) => {
    const now = Date.now()
    if (now - lastMouseMoveTime < MOUSE_MOVE_THROTTLE_MS) return
    lastMouseMoveTime = now

    try {
      const pickedObject = viewer.scene.pick(movement.endPosition)

      if (hoveredEntity && hoveredEntity.id !== selectedEntity?.id) {
        const stillHovered = Cesium.defined(pickedObject) && pickedObject.id === hoveredEntity
        if (!stillHovered) {
          restoreOriginalBillboardStyle(hoveredEntity, originalBillboardStyle)
          hoveredEntity = null
          if (viewer?.canvas) viewer.canvas.style.cursor = 'default'
        }
      }

      if (Cesium.defined(pickedObject) && isMonitorEntity(pickedObject.id)) {
        if (viewer?.canvas) viewer.canvas.style.cursor = 'pointer'

        if (pickedObject.id === selectedEntity) {
          if (selectedEntity?.billboard) {
            selectedEntity.billboard.image = '/image/ic_select_point.png'
            selectedEntity.billboard.scale = 1.5
          }
        } else {
          if (pickedObject.id !== hoveredEntity) {
            saveOriginalBillboardStyle(pickedObject.id, originalBillboardStyle)
            if (pickedObject.id.billboard) pickedObject.id.billboard.scale = 1.6
            hoveredEntity = pickedObject.id
          }
        }
      } else {
        if (!hoveredEntity) {
          if (viewer?.canvas) viewer.canvas.style.cursor = 'default'
        }
      }
    } catch (e) {
      // 忽略pick错误
    }
  }, Cesium.ScreenSpaceEventType.MOUSE_MOVE)

  // 暴露内部状态修改函数（供外部调用）
  return {
    setHoveredEntity: (entity) => { hoveredEntity = entity },
    setSelectedEntity: (entity) => { selectedEntity = entity }
  }
}

export const restoreOriginalBillboardStyle = (entity, originalBillboardStyle) => {
  if (!entity?.billboard) return
  if (!originalBillboardStyle.has(entity.id)) return

  const original = originalBillboardStyle.get(entity.id)
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

export const restoreAllBillboardStyles = (monitorEntities, originalBillboardStyle) => {
  monitorEntities.forEach((entity) => {
    try {
      restoreOriginalBillboardStyle(entity, originalBillboardStyle)
    } catch (e) {
      console.warn('恢复样式失败：', entity.id, e)
    }
  })
}

export const setEntityAsSelected = (viewer, entity, monitorStore, originalBillboardStyle, monitorEntities) => {
  if (!viewer || !entity) return

  restoreAllBillboardStyles(monitorEntities, originalBillboardStyle)

  const selectedEntity = entity
  if (entity?.billboard) {
    if (!originalBillboardStyle.has(entity.id)) {
      saveOriginalBillboardStyle(entity, originalBillboardStyle)
    }

    entity.billboard.image = '/image/ic_select_point.png'
    entity.billboard.scale = 1.5

    if (viewer?.canvas) viewer.canvas.style.cursor = 'pointer'

    try {
      const point = entity.properties && entity.properties.pointData && entity.properties.pointData.getValue
        ? entity.properties.pointData.getValue()
        : (entity.properties && entity.properties.pointData)
      monitorStore.setSelectedPoint(point)
    } catch (e) {
      monitorStore.setSelectedPoint(null)
    }
  } else {
    monitorStore.setSelectedPoint(null)
    if (viewer?.canvas) viewer.canvas.style.cursor = 'default'
  }
  return selectedEntity
}

export const createMonitorPoint = (viewer, point, monitorEntities, originalBillboardStyle) => {
  if (!viewer || !point?.coordinates) return

  if (monitorEntities.has(`monitor_${point.id}`)) {
    const old = monitorEntities.get(`monitor_${point.id}`)
    try { viewer.entities.remove(old) } catch (e) { }
    originalBillboardStyle.delete(`monitor_${point.id}`)
  }

  const entity = viewer.entities.add({
    id: `monitor_${point.id}`,
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
      outlineWidth: 2,
      style: Cesium.LabelStyle.FILL_AND_OUTLINE,
      pixelOffset: new Cesium.Cartesian2(0, 0),
      verticalOrigin: Cesium.VerticalOrigin.BOTTOM,
      disableDepthTestDistance: Number.POSITIVE_INFINITY
    }),
    properties: { pointData: point }
  })

  saveOriginalBillboardStyle(entity, originalBillboardStyle)
  monitorEntities.set(`monitor_${point.id}`, entity)
  return entity
}

export const renderMonitorPoints = (viewer, monitorPoints, monitorEntities, originalBillboardStyle) => {
  if (!monitorPoints || !viewer) return

  monitorEntities.forEach(entity => {
    try { viewer.entities.remove(entity) } catch (e) { }
    originalBillboardStyle.delete(entity.id)
  })
  monitorEntities.clear()

  monitorPoints.forEach(point => {
    createMonitorPoint(viewer, point, monitorEntities, originalBillboardStyle)
  })
}

export const clearMonitorPoints = (viewer, monitorEntities, originalBillboardStyle) => {
  if (viewer) {
    monitorEntities.forEach(entity => {
      try { viewer.entities.remove(entity) } catch (e) { }
      originalBillboardStyle.delete(entity.id)
    })
    monitorEntities.clear()
  }
  originalBillboardStyle.clear()
  delete window.flyToMonitor
}

// 从style.js迁移的依赖函数
export const saveOriginalBillboardStyle = (entity, originalBillboardStyle) => {
  if (!entity?.billboard) return
  if (originalBillboardStyle.has(entity.id)) return

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

    originalBillboardStyle.set(entity.id, {
      image,
      width,
      height,
      scale
    })
  } catch (e) {
    originalBillboardStyle.set(entity.id, {
      image: entity.billboard.image,
      width: entity.billboard.width,
      height: entity.billboard.height,
      scale: entity.billboard.scale
    })
  }
}