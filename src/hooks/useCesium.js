// src/hooks/useCesium.js
import { onMounted, ref, onUnmounted, watch, toRefs } from 'vue'
import * as Cesium from 'cesium'
import { useCesiumStore } from '@/store/modules/cesium'
import { useLayerSettingsStore } from '@/store/modules/layerSettings'
import { CESIUM_CONFIG } from '@/config/cesium'
import request from '@/utils/request'
import { useMonitoringPointStore } from '@/store/modules/monitoringPoints'
import { createProgressManager } from '../utils/progressUtils'
import { WindLayer } from 'cesium-wind-layer';
import { vi } from 'element-plus/es/locales.mjs'
import { set } from 'lodash'


// Cesium地图初始化&气象可视化Hook
export function useCesium(containerId) {
  // Store实例
  const cesiumStore = useCesiumStore()
  const monitorStore = useMonitoringPointStore()
  const layerSettingsStore = useLayerSettingsStore()

  // 响应式状态
  const viewer = ref(null)
  const isLoading = ref(false)
  const errorMsg = ref('')
  const windLayer = ref(null)
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
      // 启用更详细的地形加载，包括水面遮罩和法线（用于更好的光照效果）
      const terrainProvider = await Cesium.createWorldTerrainAsync({
        requestWaterMask: true,      // 启用水面遮罩
        requestVertexNormals: true   // 启用顶点法线（增强地形光照效果）
      })
      viewerInstance.terrainProvider = terrainProvider
      viewerInstance.scene.globe.enableLighting = true

      // 添加地形夸张设置，增强地形特征显示（在气象应用中很有用）
      viewerInstance.scene.globe.terrainExaggeration = 1.5  // 地形高度夸张1.5倍

      // 确保相机考虑地形高度
      viewerInstance.scene.globe.depthTestAgainstTerrain = true

      console.log('地形加载成功，已启用增强地形效果和高度夸张')
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
      try { viewer.value.entities.remove(old) } catch (e) { }
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
      try { viewer.value.entities.remove(entity) } catch (e) { }
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
        if (hoveredEntity && hoveredEntity.id !== selectedEntity.id) {
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
              if (pickedObject.id.billboard) pickedObject.id.billboard.scale = 1.6
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
        try { viewer.value.entities.remove(entity) } catch (e) { }
        originalBillboardStyle.delete(entity.id)
      })
      monitorEntities.clear()
    }
    hoveredEntity = null
    selectedEntity = null
    originalBillboardStyle.clear()
    delete window.flyToMonitor
  }
  //=================风场======================
  const initWind = async () => {
    // 从store获取风场配置
    const windOptions = layerSettingsStore.windOptions;
    // 使用配置文件中的文件路径
    const dataConfigs = {
      file: import.meta.env.VITE_WIND_DATA_URL,
      options: windOptions
    };

    // 先获取数据
    const res = await fetch(dataConfigs.file);
    const data = await res.json();
    console.log('gaj',data);
    
    const windData = {
      ...data,
      bounds: {
        west: 120.0,
        south: 35.5,
        east: 121.0,
        north: 37.0
      }
    };

    const rectangle = Cesium.Rectangle.fromDegrees(
      windData.bounds.west,
      windData.bounds.south,
      windData.bounds.east,
      windData.bounds.north
    );
    viewer.value.camera.flyTo({
      destination: rectangle,
      duration: 0,
    });

    windLayer.value = new WindLayer(viewer.value, windData, dataConfigs.options);

    // Add event listeners
    windLayer.value.addEventListener('dataChange', (data) => {
      console.log('Wind data updated:', data);
      // Handle data change
    });

    windLayer.value.addEventListener('optionsChange', (options) => {
      console.log('Options updated:', options);
      // Handle options change
    });

    // 监听store中风场配置变化，实时更新风场图层
    watch(function () {
      return layerSettingsStore.windOptions;
    }, function (newOptions) {
      if (windLayer.value) {
        console.log('Updating wind layer options from store:', newOptions);
        windLayer.value.updateOptions(newOptions);
      }
    }, { deep: true });
  }
//==========================热力图======================

/**
 * 👉 根据 bounds 生成一个 polygon 用来贴切片
 */
function polygonFromBounds(b) {
  return Cesium.Cartesian3.fromDegreesArray([
    b.west, b.south,
    b.east, b.south,
    b.east, b.north,
    b.west, b.north
  ]);
}

/**
 * 👉 创建插值网格以生成连续的热力图
 */
function createInterpolatedGrid(points, bounds, gridSize = 100) {
  const grid = [];
  const lonStep = (bounds.east - bounds.west) / (gridSize - 1);
  const latStep = (bounds.north - bounds.south) / (gridSize - 1);
  
  // 创建网格点
  for (let i = 0; i < gridSize; i++) {
    const row = [];
    for (let j = 0; j < gridSize; j++) {
      const lon = bounds.west + j * lonStep;
      const lat = bounds.south + i * latStep;
      row.push({ lon, lat, value: null });
    }
    grid.push(row);
  }
  
  // 对每个网格点进行插值
  for (let i = 0; i < gridSize; i++) {
    for (let j = 0; j < gridSize; j++) {
      const gridPoint = grid[i][j];
      gridPoint.value = interpolateValue(gridPoint.lon, gridPoint.lat, points);
    }
  }
  
  return grid;
}

/**
 * 👉 使用反距离加权插值(IDW)算法
 */
function interpolateValue(lon, lat, points) {
  const power = 2; // 距离权重的幂次
  let weightedSum = 0;
  let weightSum = 0;
  
  // 如果网格点正好在数据点上，直接使用该点的值
  for (const point of points) {
    if (Math.abs(point.lon - lon) < 0.0001 && Math.abs(point.lat - lat) < 0.0001) {
      return point.value;
    }
  }
  
  // 计算到所有数据点的距离并进行插值
  for (const point of points) {
    const distance = Math.sqrt(
      Math.pow(point.lon - lon, 2) + Math.pow(point.lat - lat, 2)
    );
    
    // 避免除零错误
    if (distance < 0.0001) {
      return point.value;
    }
    
    const weight = 1 / Math.pow(distance, power);
    weightedSum += point.value * weight;
    weightSum += weight;
  }
  
  return weightSum > 0 ? weightedSum / weightSum : 0;
}

/**
 * 👉 根据插值网格生成热力图纹理
 */
function heatTextureFromGrid(grid, colorRamp) {
  const size = 512;
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = size;
  const ctx = canvas.getContext("2d");
  
  // 底色透明
  ctx.clearRect(0, 0, size, size);
  
  // 计算整个网格的最小值和最大值
  let minValue = Infinity;
  let maxValue = -Infinity;
  
  for (let i = 0; i < grid.length; i++) {
    for (let j = 0; j < grid[i].length; j++) {
      if (grid[i][j].value !== null) {
        minValue = Math.min(minValue, grid[i][j].value);
        maxValue = Math.max(maxValue, grid[i][j].value);
      }
    }
  }
  
  // 绘制热力图，使用渐变色块而非单色填充
  const cellWidth = size / grid[0].length;
  const cellHeight = size / grid.length;
  
  for (let i = 0; i < grid.length; i++) {
    for (let j = 0; j < grid[i].length; j++) {
      const value = grid[i][j].value;
      if (value !== null) {
        const color = colorRamp(value, minValue, maxValue);
        let cssColor;
        
        if (color instanceof Cesium.Color) {
          cssColor = color.toCssColorString();
        } else if (typeof color === 'string') {
          cssColor = color;
        } else if (Array.isArray(color) && color.length >= 3) {
          const alpha = color.length > 3 ? color[3] / 255 : 0.7; // 提高透明度
          cssColor = `rgba(${color[0]}, ${color[1]}, ${color[2]}, ${alpha})`;
        } else {
          cssColor = 'rgba(255, 0, 0, 0.7)'; // 提高透明度
        }
        
        // 绘制带透明度的色块
        ctx.fillStyle = cssColor;
        ctx.fillRect(j * cellWidth, i * cellHeight, cellWidth, cellHeight);
      }
    }
  }
  
  return new Cesium.ImageMaterialProperty({
    image: canvas,
    transparent: true
  });
}

/**
 * 👉 颜色映射函数
 */
function createColorRamp() {
  return function(value, min, max) {
    const t = (value - min) / (max - min);
    
    // 颜色渐变定义
    const stops = [
      { t: 0.0, color: [0, 0, 130, 180] },     // 深蓝 (增加alpha值)
      { t: 0.2, color: [0, 100, 255, 160] },   // 蓝色
      { t: 0.4, color: [0, 200, 255, 140] },   // 青色
      { t: 0.6, color: [0, 255, 0, 120] },     // 绿色
      { t: 0.8, color: [255, 255, 0, 100] },   // 黄色
      { t: 1.0, color: [255, 0, 0, 80] }       // 红色 (较低alpha值)
    ];
    
    // 找到所在区间
    for (let i = 1; i < stops.length; i++) {
      if (t <= stops[i].t) {
        const p = (t - stops[i - 1].t) / (stops[i].t - stops[i - 1].t);
        const c1 = stops[i - 1].color;
        const c2 = stops[i].color;
        const r = Math.round(c1[0] + (c2[0] - c1[0]) * p);
        const g = Math.round(c1[1] + (c2[1] - c1[1]) * p);
        const b = Math.round(c1[2] + (c2[2] - c1[2]) * p);
        const a = Math.round(c1[3] + (c2[3] - c1[3]) * p); // 插值alpha值
        
        return Cesium.Color.fromBytes(r, g, b, a);
      }
    }
    
    // 默认返回红色
    return Cesium.Color.RED.withAlpha(0.7);
  };
}

// 存储热力图实体
let heatMapEntities = [];

/**
 * 👉 生成连续的热力图，紧贴地面
 */
async function addHeatVolume() {
  try {
    const data = await fetch(import.meta.env.VITE_TEM_DATA_URL);
    const parsedData = await data.json();
    
    // 青岛范围
    const bounds = {
      west: 120.0,
      south: 35.5,
      east: 121.0,
      north: 37.0
    };
    
    // 创建插值网格
    const grid = createInterpolatedGrid(parsedData.points, bounds, 80);
    
    // 创建颜色映射函数
    const colorRamp = createColorRamp();
    
    // 清空之前的热力图实体
    heatMapEntities.forEach(entity => {
      if (viewer.value) {
        try {
          viewer.value.entities.remove(entity);
        } catch (e) {
          console.warn('移除热力图实体失败:', e);
        }
      }
    });
    heatMapEntities = [];
    
    // 创建紧贴地面的热力图（只创建一个层面，不使用3D切片）
    const entity = viewer.value.entities.add({
      name: 'heat-map',
      show: true,
      polygon: {
        hierarchy: polygonFromBounds(bounds),
        height: 0, // 紧贴地面
        material: heatTextureFromGrid(grid, colorRamp),
        outline: true,
        outlineColor: Cesium.Color.WHITE.withAlpha(0.5),
        outlineWidth: 1,
        perPositionHeight: false,
        // 启用地形跟随
        classificationType: Cesium.ClassificationType.TERRAIN
      }
    });
    
    heatMapEntities.push(entity);
    
    // 添加热力图轮廓线（可选）
    addHeatOutline(bounds);
    
  } catch (error) {
    console.error('热力图加载失败:', error);
  }
}

/**
 * 👉 添加热力图轮廓线
 */
function addHeatOutline(bounds) {
  const outlineEntity = viewer.value.entities.add({
    name: 'heat-outline',
    show: true,
    polyline: {
      positions: Cesium.Cartesian3.fromDegreesArray([
        bounds.west, bounds.south,
        bounds.east, bounds.south,
        bounds.east, bounds.north,
        bounds.west, bounds.north,
        bounds.west, bounds.south
      ]),
      width: 2,
      material: new Cesium.PolylineGlowMaterialProperty({
        color: Cesium.Color.WHITE.withAlpha(0.6),
        glowPower: 0.3,
        taperPower: 1.0
      }),
      clampToGround: true // 紧贴地面
    }
  });
  
  heatMapEntities.push(outlineEntity);
}

/**
 * 👉 清理热力图
 */
const clearHeatMap = () => {
  heatMapEntities.forEach(entity => {
    if (viewer.value) {
      try {
        viewer.value.entities.remove(entity);
      } catch (e) {
        console.warn('移除热力图实体失败:', e);
      }
    }
  });
  heatMapEntities = [];
};
  // ==================== 初始化 ====================
  const initViewer = async () => {
    console.log('initViewer', containerId);

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
      initWind();
      //addHeatVolume();
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

  // 立即执行初始化，不依赖onMounted
  // 注意：这是临时修改，用于调试和修复地图不显示的问题
  const initPromise = initViewer();
  console.log('初始化Promise:', initPromise);

  // 保留生命周期钩子，但不在这里执行主要初始化
  onMounted(async () => {
    console.log('useCesium onMounted 执行，viewer当前状态:', viewer.value);
    // 如果viewer还未初始化，再次尝试
    if (!viewer.value) {
      console.log('onMounted中再次尝试初始化...');
      await initViewer();
    }
  })

  onUnmounted(() => {
    if (viewer.value) {
      try { viewer.value.destroy() } catch (e) { }
      viewer.value = null
      clearMonitorPoints()
      clearHeatMap(); // 添加这行

      windLayer.value.destroy();

    }
  })

  // ==================== 图层控制 ====================
  /**
   * 设置模型图层可见性
   */
  const setModelVisibility = (visible) => {
    if (modelTileset) {
      modelTileset.show = visible;
    }
  };

  /**
   * 设置风场图层可见性
   */
  const setWindVisibility = (visible) => {
    if (windLayer.value) {
      windLayer.value.show = visible
    }
  };

  /**
   * 设置监测点图层可见性
   */
  const setMonitoringPointsVisibility = (visible) => {
    monitorEntities.forEach((entity) => {
      if (entity) {
        entity.show = visible;
      }
    });
  };

  /**
   * 设置温度图层可见性
   */
  const setTemperatureVisibility = (visible) => {
    // 控制所有热力图实体的显示/隐藏
    heatMapEntities.forEach(entity => {
      if (entity) {
        entity.show = visible;
      }
    });
  };
  /**
   * 更新风场配置选项
   */
  const updateWindOptions = (options) => {
    if (windLayer.value && options) {
      windLayer.value.updateOptions({
        particleHeight: options.height,
        particleSize: options.particleSize,
        lineWidth: { min: options.lineWidth, max: options.lineWidth + 1 },
        speedFactor: options.speedFactor,
        colors: options.colorScale === 'rainbow' ? ['#FF0000', '#FFFF00', '#00FF00', '#00FFFF', '#0000FF'] :
          options.colorScale === 'jet' ? ['#000080', '#0000FF', '#00FFFF', '#FFFF00', '#FF0000', '#800000'] :
            ['#440154', '#3B528B', '#21908C', '#5DC863', '#FDE725'], // viridis
        opacity: options.opacity,
        maxParticles: options.maxParticles
      });
    }
  };

  // 暴露公共方法
  return {
    viewer,
    isLoading,
    errorMsg,
    windLayer,
    flyToRegion,
    flyToRectangle,
    getCurrentCameraParams,
    clearMonitorPoints,
    setModelVisibility,
    setWindVisibility,
    setMonitoringPointsVisibility,
    setTemperatureVisibility,
    updateWindOptions
  }
}
