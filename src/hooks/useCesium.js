// src/hooks/useCesium.js
import { onMounted, ref, onUnmounted } from 'vue'
import * as Cesium from 'cesium'
import { useCesiumStore } from '@/store/modules/cesium'
import { useWeatherStore } from '@/store/modules/weather'
import { CESIUM_CONFIG } from '@/config/cesium'
import { getWeatherData } from '@/api/weather'
import request from '@/utils/request'

// Cesium地图初始化&气象可视化Hook
export function useCesium(containerId) {
  // Store实例
  const cesiumStore = useCesiumStore()
  // 响应式状态
  const viewer = ref(null)
  const isLoading = ref(false)
  const errorMsg = ref('')

  // Cesium图层和实体引用
  let tiandituLayer = null
  let districtPrimitive = null
  let modelTileset = null

  // ==================== Viewer初始化相关 ====================

  /**
   * 配置Viewer基础选项
   */
  const getViewerOptions = () => ({
    baseLayerPicker: false,
    geocoder: false,
    homeButton: false,
    sceneModePicker: false,
    navigationHelpButton: false,
    infoBox: true,
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

  /**
   * 配置相机控制
   */
  const configureCamera = (viewerInstance) => {
    const controller = viewerInstance.scene.screenSpaceCameraController
    controller.minimumZoomDistance = 0
    controller.maximumZoomDistance = 30000
    viewerInstance.scene.camera.constrainedAxis = Cesium.Cartesian3.UNIT_Z

  }

  /**
   * 添加天地图图层
   */
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
      enablePickFeatures: false, // 禁用拾取功能以提高性能
      pixelRatio: window.devicePixelRatio || 2 // 自动适配设备DPI，默认为2
    })

    tiandituLayer = viewerInstance.imageryLayers.addImageryProvider(tianditu)

    // 优化图层样式设置
    if (tiandituLayer) {
      tiandituLayer.brightness = 1.0  // 降低亮度避免过曝
      tiandituLayer.contrast = 1.1
      tiandituLayer.saturation = 1.1  // 适度饱和度
      tiandituLayer.hue = 0
      tiandituLayer.alpha = 1.0
      tiandituLayer.minificationFilter = Cesium.TextureMinificationFilter.LINEAR  // 使用线性过滤
      tiandituLayer.magnificationFilter = Cesium.TextureMagnificationFilter.LINEAR
    }
  }

  /**
   * 加载地形数据
   */
  const loadTerrain = async (viewerInstance) => {
    try {
      const terrainProvider = await Cesium.createWorldTerrainAsync({
        requestWaterMask: false,
        requestVertexNormals: false
      })

      viewerInstance.terrainProvider = terrainProvider
      viewerInstance.scene.globe.enableLighting = true
      // viewerInstance.scene.globe.depthTestAgainstTerrain = true
    } catch (error) {
      console.warn('地形加载失败，使用默认地形:', error)
      viewerInstance.terrainProvider = new Cesium.EllipsoidTerrainProvider()
    }
  }

  /**
   * 添加行政区划信息
   */
  async function addDistrictInfo(viewerInstance) {
    try {
      const geoJSONData = await request.get('/cesium/json/bound.geojson')
      const countiesJSONData = await request.get('/cesium/json/counties.geojson')
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

  /**
   * 创建区域遮罩
   */
  function createDistrictMask(viewerInstance, geoJSONData) {
    try {
      const holeList = []

      geoJSONData.features.forEach((feature) => {
        const { type, coordinates } = feature.geometry

        if (type === "MultiPolygon") {
          coordinates.forEach((coord) => {
            const outer = coord[0]
            const holes = coord.slice(1)

            const hierarchy = new Cesium.PolygonHierarchy(
              Cesium.Cartesian3.fromDegreesArray(outer.flat()),
              holes.map(h => new Cesium.PolygonHierarchy(
                Cesium.Cartesian3.fromDegreesArray(h.flat())
              ))
            )

            holeList.push(hierarchy)
          })
        } else if (type === "Polygon") {
          const outer = coordinates[0]
          const holes = coordinates.slice(1)

          const hierarchy = new Cesium.PolygonHierarchy(
            Cesium.Cartesian3.fromDegreesArray(outer.flat()),
            holes.map(h => new Cesium.PolygonHierarchy(
              Cesium.Cartesian3.fromDegreesArray(h.flat())
            ))
          )

          holeList.push(hierarchy)
        }
      })

      const outerRectangle = Cesium.Cartesian3.fromDegreesArray([
        80, 15,
        80, 46,
        135, 46,
        135, 15,
        80, 15,
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
        appearance: new Cesium.PerInstanceColorAppearance({
          translucent: true
        })
      })

      viewerInstance.scene.primitives.add(districtPrimitive)
    } catch (error) {
      console.error('创建区域遮罩失败:', error)
    }
  }

  // 为3D模型添加加载进度和优化
  async function addWhiteModel(viewerInstance) {
    try {
      // 添加加载进度监听
      modelTileset = await Cesium.Cesium3DTileset.fromUrl("/cesium/model/tileset.json", {
        maximumScreenSpaceError: 16, // 降低初始加载精度，提升速度

        // 2. 层级加载限制：避免一次性加载过多瓦片
        maximumNumberOfLoadedTiles: 100, // 最大同时加载瓦片数（根据设备性能调整）

        // 3. 预加载策略：提前加载视口边缘可能需要的瓦片
        preloadFlightDestinations: true,
        loadSiblings: false, // 关闭同层级瓦片预加载（减少冗余）

        // 4. 内存管理：自动卸载不可见瓦片
        purgeOptions: {
          retainCurrentLevelOfDetail: true, // 保留当前精度瓦片，卸载更低精度的
          unusedTiles: 100 // 超过100个未使用瓦片时触发清理
        }
      })
      // 监听加载进度
      modelTileset.loadProgress.addEventListener(progress => {
        console.log(`模型加载进度: ${Math.round(progress * 100)}%`)
        // 可以在这里更新UI进度条
      })
      viewerInstance.scene.primitives.add(modelTileset)
    } catch (error) {
      console.error('加载3D模型失败:', error)
    }
  }

  // ==================== 视角管理 ====================
  /**
   * 获取当前相机参数
   */
  const getCurrentCameraParams = () => {
    if (!viewer.value) return null;

    const camera = viewer.value.camera;
    const position = camera.position;

    // 将笛卡尔坐标转换为经纬度
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
  /**
 * 飞行到指定区域
 */
  const flyToRegion = (region) => {
    console.log("flyToRegion");

    if (!viewer.value || !region) return

    try {
      // 根据新数据结构处理 coordinates 数组 [lng, lat]
      if (region.coordinates && Array.isArray(region.coordinates) && region.coordinates.length >= 2) {
        const longitude = region.coordinates[0]
        const latitude = region.coordinates[1]

        viewer.value.camera.flyTo({
          destination: Cesium.Cartesian3.fromDegrees(
            longitude,
            latitude,
            260.803844069075
          ),
          orientation: {
            heading: Cesium.Math.toRadians(3.003064151986261),
            pitch: Cesium.Math.toRadians(-19.956092932734972),
            roll: Cesium.Math.toRadians(0.000034138867324716554)
          },
          duration: region.duration || 2 // 默认飞行时间2秒
        })
      } else {
        console.warn('无效的区域坐标数据:', region)
      }
    } catch (error) {
      console.error('视角切换失败:', error)
    }
  }
  /**
    * 飞行到指定矩形区域
    */
  const flyToRectangle = (region) => {
    if (!viewer.value || !region) return

    try {
      // 假设 region 包含 { west, south, east, north } 边界
      const rectangle = Cesium.Rectangle.fromDegrees(
        region.west,
        region.south,
        region.east,
        region.north
      )

      viewer.value.camera.flyTo({
        destination: rectangle,
        duration: region.duration || 2,
        orientation: {
          heading: Cesium.Math.toRadians(region.heading || 0),
          pitch: Cesium.Math.toRadians(region.pitch || -45),
          roll: Cesium.Math.toRadians(region.roll || 0)
        }
      })
    } catch (error) {
      console.error('视角切换失败:', error)
    }
  }

  // ==================== 初始化 ====================

  /**
   * 初始化Viewer
   */
  const initViewer = async () => {
    if (!containerId) {
      errorMsg.value = 'Cesium容器ID不存在'
      return
    }

    isLoading.value = true
    try {
      Cesium.Ion.defaultAccessToken = import.meta.env.VITE_CESIUM_TOKEN || ''

      viewer.value = new Cesium.Viewer(containerId, getViewerOptions())

      configureCamera(viewer.value)


      //addTiandituLayer(viewer.value)

      viewer.value.camera.setView(CESIUM_CONFIG.initialView)
      viewer.value.cesiumWidget.creditContainer.style.display = 'none'
      await loadTerrain(viewer.value)
      await addDistrictInfo(viewer.value)
      await addWhiteModel(viewer.value)

      cesiumStore.setViewer(viewer.value)
    } catch (err) {
      errorMsg.value = `Cesium初始化失败：${err.message}`
      console.error('Cesium init error:', err)
    } finally {
      isLoading.value = false
    }
  }

  // ==================== 生命周期 ====================

  onMounted(() => {
    initViewer()
  })

  onUnmounted(() => {
    cesiumStore.destroyViewer()
    viewer.value = null
  })

  // ==================== 暴露接口 ====================

  return {
    viewer,
    isLoading,
    errorMsg,
    flyToRegion,
    flyToRectangle,
    getCurrentCameraParams
  }
}