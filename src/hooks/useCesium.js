// src/hooks/useCesium.js
import { onMounted, ref, onUnmounted, watch, toRefs } from 'vue'
import * as Cesium from 'cesium'
import { useCesiumStore } from '@/store/modules/cesium'
import { useWeatherStore } from '@/store/modules/weather'
import { CESIUM_CONFIG } from '@/config/cesium'
import { getWeatherData } from '@/api/weather'
import request from '@/utils/request'
import { useMonitoringPointStore } from '@/store/modules/monitoringPoints'
import { createProgressManager } from '../utils/progressUtils'

// Cesium地图初始化&气象可视化Hook
export function useCesium(containerId) {
  // Store实例
  const cesiumStore = useCesiumStore()
  const monitorStore = useMonitoringPointStore()
  
  // 响应式状态
  const viewer = ref(null)
  const isLoading = ref(false)
  const errorMsg = ref('')

  // Cesium图层和实体引用
  let tiandituLayer = null
  let districtPrimitive = null
  let modelTileset = null

  // 监测点相关
  const { pointsList: monitorPoints } = toRefs(monitorStore)
  let monitorEntities = new Map() // 存储监测点实体（id -> entity）
  let hoveredEntity = null // 当前悬停实体（存实体引用）
  let selectedEntity = null // 当前选中实体（实体引用）
  let originalBillboardStyle = new Map() // 存储实体原始样式（值拷贝，避免引用）

  // 节流控制：避免频繁 pick 导致卡顿（ms）
  const MOUSE_MOVE_THROTTLE_MS = 50
  let lastMouseMoveTime = 0

  // ==================== 辅助函数 ====================
  /**
   * 判断是否为监测点实体
   */
  const isMonitorEntity = (entity) => {
    return entity?.id?.startsWith && entity.id.startsWith('monitor_')
  }

  /**
   * 处理飞行参数的公共函数
   */
  const getFlyToOptions = (options) => ({
    duration: options.duration || (options.isRegion ? 1.5 : 2),
    orientation: {
      heading: Cesium.Math.toRadians(options.heading || 0),
      pitch: Cesium.Math.toRadians(options.pitch || (options.isRegion ? -30 : -45)),
      roll: Cesium.Math.toRadians(options.roll || 0)
    },
    easingFunction: options.easingFunction || Cesium.EasingFunction.CUBIC_IN_OUT,
    convert: options.convert || true
  })

  // ==================== Viewer初始化相关 ====================
  const getViewerOptions = () => ({
    baseLayerPicker: false,
    geocoder: false,
    homeButton: false,
    sceneModePicker: false,
    navigationHelpButton: false,
    infoBox: true,
    infoBoxSandbox: 'allow-same-origin allow-scripts allow-popups allow-forms',
    fullscreenButton: false,
    animation: false,
    timeline: false,
    selectionIndicator: true,
    contextOptions: {
      requestWebgl1: false,
      allowTextureFilterAnisotropic: true,
      webgl: {
        alpha: false,
        depth: true,
        stencil: false,
        antialias: true,
        powerPreference: 'high-performance',
        premultipliedAlpha: true,
        preserveDrawingBuffer: false,
        failIfMajorPerformanceCaveat: false
      },
    },
  })

  const configureCamera = (viewerInstance) => {
    const controller = viewerInstance.scene.screenSpaceCameraController
    controller.minimumZoomDistance = 0
    controller.maximumZoomDistance = 30000
    viewerInstance.scene.camera.constrainedAxis = Cesium.Cartesian3.UNIT_Z
  }

  const addTiandituLayer = (viewerInstance) => {
    const tianditu = new Cesium.WebMapTileServiceImageryProvider({
      url: "http://{s}.tianditu.gov.cn/img_w/wmts?service=wmts&request=GetTile&version=1.0.0&LAYER=img&tileMatrixSet=w&TileMatrix={TileMatrix}&TileRow={TileRow}&TileCol={TileCol}&style=default&format=tiles&tk=6b1c07f3a655588c6b86fa35ebb1c177",
      layer: "img_w",
      style: "default",
      format: "tiles",
      tileMatrixSetID: "w",
      subdomains: ["t0", "t1", "t2", "t3", "t4", "t5", "t6", "t7"],
      maximumLevel: 18,
      credit: new Cesium.Credit("天地图"),
      enablePickFeatures: false,
      pixelRatio: window.devicePixelRatio || 2
    })

    tiandituLayer = viewerInstance.imageryLayers.addImageryProvider(tianditu)

    if (tiandituLayer) {
      tiandituLayer.brightness = 1.0
      tiandituLayer.contrast = 1.1
      tiandituLayer.saturation = 1.1
      tiandituLayer.hue = 0
      tiandituLayer.alpha = 1.0
      tiandituLayer.minificationFilter = Cesium.TextureMinificationFilter.LINEAR
      tiandituLayer.magnificationFilter = Cesium.TextureMagnificationFilter.LINEAR
    }
  }

  const loadTerrain = async (viewerInstance) => {
    try {
      const terrainProvider = await Cesium.createWorldTerrainAsync({
        requestWaterMask: false,
        requestVertexNormals: false
      })
      viewerInstance.terrainProvider = terrainProvider
      viewerInstance.scene.globe.enableLighting = true
    } catch (error) {
      console.warn('地形加载失败，使用默认地形:', error)
      viewerInstance.terrainProvider = new Cesium.EllipsoidTerrainProvider()
    }
  }
  // 添加行政区划信息需要有shp文件
  async function addDistrictInfo(viewerInstance) {
    try {
      const geoJSONData = await request.get('/cesium/shp/bound.geojson')
      const countiesJSONData = await request.get('/cesium/shp/counties.geojson')
      const dataSource = new Cesium.GeoJsonDataSource()
      dataSource.load(countiesJSONData, {
        stroke: Cesium.Color.WHITE,
        strokeWidth: 2,
        fill: Cesium.Color.TRANSPARENT
      })

      viewerInstance.dataSources.add(dataSource)
      createDistrictMask(viewerInstance, geoJSONData)
    } catch (error) {
      console.error('加载行政区划数据失败:', error)
    }
  }

  function createDistrictMask(viewerInstance, geoJSONData) {
    try {
      const holeList = []

      geoJSONData.features.forEach((feature) => {
        const { type, coordinates } = feature.geometry
        const processCoords = (coord) => {
          const outer = coord[0]
          const holes = coord.slice(1)
          return new Cesium.PolygonHierarchy(
            Cesium.Cartesian3.fromDegreesArray(outer.flat()),
            holes.map(h => new Cesium.PolygonHierarchy(
              Cesium.Cartesian3.fromDegreesArray(h.flat())
            ))
          )
        }

        if (type === "MultiPolygon") {
          coordinates.forEach(coord => holeList.push(processCoords(coord)))
        } else if (type === "Polygon") {
          holeList.push(processCoords(coordinates))
        }
      })

      const outerRectangle = Cesium.Cartesian3.fromDegreesArray([
        80, 15, 80, 46, 135, 46, 135, 15, 80, 15
      ])

      const instance = new Cesium.GeometryInstance({
        geometry: new Cesium.PolygonGeometry({
          polygonHierarchy: new Cesium.PolygonHierarchy(outerRectangle, holeList)
        }),
        attributes: {
          color: Cesium.ColorGeometryInstanceAttribute.fromColor(
            new Cesium.Color(10 / 255, 25 / 255, 47 / 255, 0.9)
          )
        }
      })

      districtPrimitive = new Cesium.GroundPrimitive({
        geometryInstances: instance,
        appearance: new Cesium.PerInstanceColorAppearance({ translucent: true })
      })

      viewerInstance.scene.primitives.add(districtPrimitive)
    } catch (error) {
      console.error('创建区域遮罩失败:', error)
    }
  }

  async function addWhiteModel(viewerInstance) {
    try {
      modelTileset = await Cesium.Cesium3DTileset.fromUrl("/cesium/model/qingdaoshi/tileset.json", {
        maximumScreenSpaceError: 16,
        skipLevelOfDetail: true,
        baseScreenSpaceError: 1024,
        skipScreenSpaceErrorFactor: 16,
        skipLevels: 1,
        immediatelyLoadDesiredLevelOfDetail: false,
        loadSiblings: false,
        cullWithChildrenBounds: true,
        cullRequestsWhileMoving: true,
        cullRequestsWhileMovingMultiplier: 6,
        progressiveResolutionHeightFraction: 0.5,
        preferLeaves: true,
        maximumMemoryUsage: 2048,
        maximumNumberOfLoadedTiles: 100,
        purgeOptions: {
          retainCurrentLevelOfDetail: true,
          unusedTiles: 100
        }
      })
      
      const progressManager = createProgressManager((displayProgress) => {
        cesiumStore.setModelLoadProgress(displayProgress);
      }, {
        totalExpectedUpdates: 20,
        maxPossibleValue: 35
      });
      
      modelTileset.loadProgress.addEventListener(progress => {
        progressManager.updateProgress(progress);
      });
      
      viewerInstance.scene.primitives.add(modelTileset);
      
      modelTileset.allTilesLoaded.addEventListener(() => {
        progressManager.markAsCompleted();
        setTimeout(() => {
          cesiumStore.setModelLoadProgress(0);
          progressManager.reset();
        }, 3000);
      });
      
    } catch (error) {
      console.error('加载3D模型失败:', error)
    }
  }

  // ==================== 视角管理 ====================
  const getCurrentCameraParams = () => {
    if (!viewer.value) return null;

    const camera = viewer.value.camera;
    const position = camera.position;
    const cartographic = Cesium.Cartographic.fromCartesian(position);

    return {
      position: {
        x: position.x,
        y: position.y,
        z: position.z,
        longitude: Cesium.Math.toDegrees(cartographic.longitude),
        latitude: Cesium.Math.toDegrees(cartographic.latitude),
        height: cartographic.height
      },
      orientation: {
        heading: Cesium.Math.toDegrees(camera.heading),
        pitch: Cesium.Math.toDegrees(camera.pitch),
        roll: Cesium.Math.toDegrees(camera.roll)
      }
    };
  };

  const flyToRegion = (region) => {
    if (!viewer.value || !region) return

    try {
      if (region.coordinates?.length >= 2) {
        const [longitude, latitude] = region.coordinates
        viewer.value.camera.flyTo({
          destination: Cesium.Cartesian3.fromDegrees(longitude, latitude, 500),
          ...getFlyToOptions({ ...region, isRegion: true })
        })
      } else {
        console.warn('无效的区域坐标数据:', region)
      }
    } catch (error) {
      console.error('视角切换失败:', error)
    }
  }

  const flyToRectangle = (region) => {
    if (!viewer.value || !region) return

    try {
      const rectangle = Cesium.Rectangle.fromDegrees(
        region.west, region.south, region.east, region.north
      )
      viewer.value.camera.flyTo({
        destination: rectangle,
        ...getFlyToOptions({ ...region, isRegion: false })
      })
    } catch (error) {
      console.error('视角切换失败:', error)
    }
  }

  // ==================== 监测点管理（修复与优化点） ====================

  /**
   * 保存实体的原始广告牌样式（值拷贝）
   * 注意：只在未保存时保存，避免被后续修改覆盖（保持原始快照）
   */
  const saveOriginalBillboardStyle = (entity) => {
    if (!entity?.billboard) return
    if (originalBillboardStyle.has(entity.id)) return // 只保存一次

    try {
      // billboard 字段可能是 Property，所以用 getValue() 取真实值（或 fallback）
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
      // 容错：若 getValue 出错，仍保存引用（最坏情形）
      originalBillboardStyle.set(entity.id, {
        image: entity.billboard.image,
        width: entity.billboard.width,
        height: entity.billboard.height,
        scale: entity.billboard.scale
      })
    }
  }

  /**
   * 恢复实体的原始广告牌样式（如果有）
   */
  const restoreOriginalBillboardStyle = (entity) => {
    if (!entity?.billboard) return
    if (!originalBillboardStyle.has(entity.id)) return

    const original = originalBillboardStyle.get(entity.id)
    // 直接覆盖为原始值（字符串/数字）
    try {
      entity.billboard.image = original.image
      entity.billboard.width = original.width
      entity.billboard.height = original.height
      entity.billboard.scale = original.scale
    } catch (e) {
      // 兜底：如果直接赋值失败，尝试创建 ConstantProperty
      if (Cesium.defined(entity.billboard)) {
        entity.billboard.image = Cesium.ConstantProperty ? new Cesium.ConstantProperty(original.image) : original.image
        entity.billboard.width = Cesium.ConstantProperty ? new Cesium.ConstantProperty(original.width) : original.width
        entity.billboard.height = Cesium.ConstantProperty ? new Cesium.ConstantProperty(original.height) : original.height
        entity.billboard.scale = Cesium.ConstantProperty ? new Cesium.ConstantProperty(original.scale) : original.scale
      }
    }
    // 恢复后不立即删除样式记录——仍可在后续需要时作为备份；不过为节省内存可以选择删除：
    // originalBillboardStyle.delete(entity.id)
  }

  /**
   * 恢复所有监测点的样式（用于选中前重置）
   */
  const restoreAllBillboardStyles = () => {
    monitorEntities.forEach((entity, id) => {
      try {
        restoreOriginalBillboardStyle(entity)
      } catch (e) {
        // 忽略单个恢复失败，继续恢复其他
        console.warn('恢复样式失败：', id, e)
      }
    })
    hoveredEntity = null
    selectedEntity = null
  }

  /**
   * 将实体设置为选中状态（视觉 + store）
   * 逻辑：先恢复所有点 -> 保存当前点原样式 -> 设置选中样式 -> 更新 store
   */
  const setEntityAsSelected = (entity) => {
    if (!viewer.value || !entity) return

    // 1) 先恢复所有点，保证只有一个选中样式
    restoreAllBillboardStyles()

    // 2) 标记、保存并设置样式
    selectedEntity = entity
    if (entity?.billboard) {
      // 保存（只在首次修改前保存原样）
      saveOriginalBillboardStyle(entity)

      // 设置选中样式（image + scale）
      entity.billboard.image = '/image/ic_select_point.png'
      entity.billboard.scale = 1.5

      // 鼠标指针
      if (viewer.value?.canvas) viewer.value.canvas.style.cursor = 'pointer'

      // 更新 store（取 pointData）
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
      if (viewer.value?.canvas) viewer.value.canvas.style.cursor = 'default'
    }
  }

  /**
   * 创建监测点标记
   */
  const createMonitorPoint = (point) => {
    if (!viewer.value || !point?.coordinates) return

    // 移除已存在的实体（保持唯一）
    if (monitorEntities.has(`monitor_${point.id}`)) {
      const old = monitorEntities.get(`monitor_${point.id}`)
      try { viewer.value.entities.remove(old) } catch(e) {}
      originalBillboardStyle.delete(`monitor_${point.id}`)
    }

    const entity = viewer.value.entities.add({
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

    // 直接保存原始样式快照（避免后续 hover/选中污染）
    saveOriginalBillboardStyle(entity)

    monitorEntities.set(`monitor_${point.id}`, entity)
    return entity
  }

  /**
   * 批量渲染监测点
   */
  const renderMonitorPoints = () => {
    if (!monitorPoints.value || !viewer.value) return

    // 清空现有实体（原来逻辑）——确保不会残留旧实体
    monitorEntities.forEach(entity => {
      try { viewer.value.entities.remove(entity) } catch(e) {}
      originalBillboardStyle.delete(entity.id)
    })
    monitorEntities.clear()

    // 渲染所有监测点（Cesium 会缓存相同 image url，减少重复解析）
    monitorPoints.value.forEach(point => createMonitorPoint(point))
  }

  /**
   * 绑定监测点事件（包含节流的鼠标移动）
   */
  const bindMonitorPointEvents = () => {
    if (!viewer.value) return
    
    // 相机移动结束后保持选中样式
    viewer.value.scene.camera.moveEnd.addEventListener(() => {
      if (selectedEntity?.billboard) {
        selectedEntity.billboard.image = '/image/ic_select_point.png'
        selectedEntity.billboard.scale = 1.5
      }
    })

    // 左键点击事件 -> 选中
    viewer.value.screenSpaceEventHandler.setInputAction((movement) => {
      try {
        const pickedObject = viewer.value.scene.pick(movement.position)
        if (Cesium.defined(pickedObject) && isMonitorEntity(pickedObject.id)) {
          const pointData = pickedObject.id.properties.pointData
          // setEntityAsSelected 内部会 restoreAll，从而保证只有一个选中点
          setEntityAsSelected(pickedObject.id)
          // 飞行到点
          const point = pointData && pointData.getValue ? pointData.getValue() : pointData
          flyToRegion({ coordinates: point.coordinates, duration: 1.5 })
        } else {
          // 点击空白处清除选中
          restoreAllBillboardStyles()
          monitorStore.setSelectedPoint(null)
        }
      } catch (e) {
        console.warn('点击处理失败：', e)
      }
    }, Cesium.ScreenSpaceEventType.LEFT_CLICK)

    // 鼠标移动事件（节流，悬停只改变 scale，不改变 image）
    viewer.value.screenSpaceEventHandler.setInputAction((movement) => {
      const now = Date.now()
      if (now - lastMouseMoveTime < MOUSE_MOVE_THROTTLE_MS) return
      lastMouseMoveTime = now

      try {
        const pickedObject = viewer.value.scene.pick(movement.endPosition)

        // 如果之前有 hovered，但现在不再被 hover 到并且不是 selected，则恢复它
        if (hoveredEntity && hoveredEntity !== selectedEntity) {
          const stillHovered = Cesium.defined(pickedObject) && pickedObject.id === hoveredEntity
          if (!stillHovered) {
            restoreOriginalBillboardStyle(hoveredEntity)
            hoveredEntity = null
            if (viewer.value?.canvas) viewer.value.canvas.style.cursor = 'default'
          }
        }

        if (Cesium.defined(pickedObject) && isMonitorEntity(pickedObject.id)) {
          // 鼠标样式
          if (viewer.value?.canvas) viewer.value.canvas.style.cursor = 'pointer'

          // 如果是选中实体，则确保选中样式（保持 image）
          if (pickedObject.id === selectedEntity) {
            // 保持选中样式（no-op if already set）
            if (selectedEntity?.billboard) {
              selectedEntity.billboard.image = '/image/ic_select_point.png'
              selectedEntity.billboard.scale = 1.5
            }
          } else {
            // 新悬停实体（且不是已选中的），先恢复上一个 hovered（已在上面处理），再设置当前 hovered
            if (pickedObject.id !== hoveredEntity) {
              // 保存当前实体原始样式（若未保存）
              saveOriginalBillboardStyle(pickedObject.id)
              // 设置轻量悬停视觉（只改 scale，避免改 image）
              if (pickedObject.id.billboard) pickedObject.id.billboard.scale = 1.2
              hoveredEntity = pickedObject.id
            }
          }
        } else {
          // 没有拾取到监测点
          if (!hoveredEntity) {
            if (viewer.value?.canvas) viewer.value.canvas.style.cursor = 'default'
          }
        }
      } catch (e) {
        // 忽略 pick 相关抛错，避免卡死
      }
    }, Cesium.ScreenSpaceEventType.MOUSE_MOVE)
  }

  /**
   * 清理监测点
   */
  const clearMonitorPoints = () => {
    if (viewer.value) {
      monitorEntities.forEach(entity => {
        try { viewer.value.entities.remove(entity) } catch(e) {}
        originalBillboardStyle.delete(entity.id)
      })
      monitorEntities.clear()
    }
    hoveredEntity = null
    selectedEntity = null
    originalBillboardStyle.clear()
    delete window.flyToMonitor
  }

  // ==================== 初始化 ====================
  const initViewer = async () => {
    if (!containerId) {
      errorMsg.value = 'Cesium容器ID不存在'
      return
    }

    isLoading.value = true
    try {
      Cesium.Ion.defaultAccessToken = import.meta.env.VITE_CESIUM_TOKEN || ''
      
      const viewerOptions = getViewerOptions();
      
      viewerOptions.contextOptions = {
        ...viewerOptions.contextOptions,
        webgl: {
          ...viewerOptions.contextOptions?.webgl,
          preserveDrawingBuffer: true,
          failIfMajorPerformanceCaveat: false, // 允许在性能受限的设备上运行
          alpha: true,
          antialias: true
        }
      };
      
      viewerOptions.scene3DOnly = true;
      viewerOptions.useBrowserRecommendedResolution = true;
      
      viewer.value = new Cesium.Viewer(containerId, viewerOptions)

      // 基础配置
      viewer.value.camera.setView(CESIUM_CONFIG.initialView)
      viewer.value.cesiumWidget.creditContainer.style.display = 'none'
      
      // 加载资源
      await loadTerrain(viewer.value)
      await addWhiteModel(viewer.value)

      // 状态管理与事件绑定
      cesiumStore.setViewer(viewer.value)
      renderMonitorPoints()
      bindMonitorPointEvents()

      // 数据监听
      watch(monitorPoints, renderMonitorPoints, { deep: true })
      watch(
        () => monitorStore.selectedPoint,
        (newPoint) => {
          if (newPoint && viewer.value) {
            const entity = monitorEntities.get(`monitor_${newPoint.id}`)
            if (entity) {
              setEntityAsSelected(entity)
              flyToRegion({ coordinates: newPoint.coordinates, duration: 1.0 })
            }
          } else if (!newPoint) {
            // clear selection
            restoreAllBillboardStyles()
          }
        },
        { deep: true, immediate: true }
      )
    } catch (err) {
      errorMsg.value = `Cesium初始化失败：${err.message}`
      console.error('Cesium init error:', err)
    } finally {
      isLoading.value = false
    }
  }

  // 生命周期
  onMounted(() => {
    initViewer()
  })

  onUnmounted(() => {
    if (viewer.value) {
      try { viewer.value.destroy() } catch(e) {}
      viewer.value = null
      clearMonitorPoints()
    }
  })

  // 暴露公共方法
  return {
    viewer,
    isLoading,
    errorMsg,
    flyToRegion,
    flyToRectangle,
    getCurrentCameraParams,
    clearMonitorPoints
  }
}
