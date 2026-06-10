import { ref, watch, toRefs } from 'vue'
import * as Cesium from 'cesium'
import { useWindStore } from '@/store/modules/wind'
import { useLayerSettingsStore } from '@/store/modules/layerSettings'
import { useAreaStore } from '@/store/modules/area'
import { useRegionStore } from '@/store/modules/region'
import { createViewer, destroyViewer } from '@/cesium/core/viewer'
import { handleCameraMove, getCurrentCameraParams, flyToRegion, flyToRectangle, limitCameraRange, switchToOverviewMode, switchToFocusMode, flyToRegionOverview, setupCameraPrintKeydown, watchCameraHeight } from '@/cesium/core/camera'
import { switchBaseLayer } from '@/cesium/layers/basemap'
import { loadTerrain } from '@/cesium/layers/terrain'
import { getMapTilesConfig } from '@/config/mapTiles'
import { addWhiteModel, removeWhiteModel } from '@/cesium/layers/model3d'
import { loadRegionBoundary, clearRegionBoundary } from '@/cesium/layers/regionBoundary'
import { AreaManager } from '@/cesium/entities/area.js'
import { initWind } from '@/cesium/visualization/wind'
//3d

import { routeManager } from '@/cesium/entities/routes' 
import { useRouteStore } from '@/store/modules/routeStore'
import eventManager from '@/cesium/core/eventManager' 
import { SkyBoxManager } from '@/cesium/volumeCloud/SkyBoxManager' 
import { CAMERA_HEIGHT_THRESHOLD, CAMERA_HEIGHT_WIND_OFF_HYSTERESIS_M } from '../config/windLayerDefaults'
import { fetchNoFlyZones } from '@/api/v2/noFlyZone'
import { useAppDashboardStore } from '@/store/modules/appDashboard'
import { useMetVizStore } from '@/store/modules/metViz'
import { dashboardEventBus, DASHBOARD_EVENTS } from '@/utils/eventBus'
import { isMetVizEnabledOnDashboard } from '@/config/metVizRuntime'

function logPerf(tag, label, startMs) {
  console.log(`[${tag}][Perf] ${label} — ${(performance.now() - startMs).toFixed(1)}ms`)
}

export function useCesium(containerId, options = {}) {
  // 说明
  const windStore = useWindStore()
  const metVizStore = useMetVizStore()
  const areaStore = useAreaStore()
  const layerSettingsStore = useLayerSettingsStore()
  const routeStore = useRouteStore()
  const regionStore = useRegionStore()
  const appStore = useAppDashboardStore()
  const metVizOnDashboard = isMetVizEnabledOnDashboard()
  const enableMetVizWind = Boolean(options.enableMetVizWind)
  const metVizWindActive = metVizOnDashboard || enableMetVizWind
  const deferRegionLayersToMeteo = Boolean(options.deferRegionLayersToMeteo)

  // 说明
  const viewer = ref(null)
  const isLoading = ref(false)
  const errorMsg = ref('')

  // 说明
  const resources = ref({
    windLayer: null,
    tiandituLayer: null,
    districtPrimitive: null,
    modelTileset: null,
    heatMapManager: null,
    heatMapBridge: null,
    areaManager: null,
    cameraMoveHandler: null,
    cameraHeightWatcher: null,
    skyBoxManager: null,
    cameraPrintKeydownHandler: null,
    /** 根据当前相机高度与会话航线状态刷新风场/云层等 */
    refreshCameraHeightLayerVisibility: null,
    /** @type {(() => void) | null} */
    regionChangedUnsub: null,
    cameraWindPauseCleanup: null,
  })

  let windPausedForCamera = false

  // 说明
  const { areaList } = toRefs(areaStore)

  // 说明
  watch(
    () => areaStore.selectedArea,
    () => {},
    { deep: true }
  )


  /**
   * 功能说明
   */
  const initViewer = () => {
    try {
      viewer.value = createViewer(containerId)
      viewer.value.cesiumWidget.creditContainer.style.display = 'none'
      window.viewer = viewer.value

      const scene = viewer.value.scene
      scene.requestRenderMode = true
      scene.fxaa = false

      if (deferRegionLayersToMeteo) {
        // 与 region-meteo-demo 一致，减轻 Dashboard 首屏渲染压力
        scene.globe.depthTestAgainstTerrain = false
        scene.fog.enabled = false
        scene.maximumRenderTimeChange = Infinity
      } else {
        scene.globe.depthTestAgainstTerrain = true
        scene.fog.enabled = true
        scene.maximumRenderTimeChange = 0.5
      }

      viewer.value.shadows = false
      viewer.value.terrainShadows = Cesium.ShadowMode.DISABLED
      viewer.value.resolutionScale = Math.min(window.devicePixelRatio || 1, 1.25)

      if (!deferRegionLayersToMeteo) {
        resources.value.skyBoxManager = new SkyBoxManager(viewer.value, {
          cameraHeightThreshold: 240000,
        })
      } else {
        console.log('[Cesium] SkyBoxManager 跳过（RegionMeteo Dashboard 模式）')
      }
      console.log('[Cesium] Viewer 基础配置完成')
    } catch (error) {
      console.error('[Cesium] 初始化 Viewer 失败:', error)
      throw error
    }
  }
  
  /**
   * 功能说明
   */
  const setClockParams = (startTime, endTime) => {
    if (!viewer.value) return;
      const now = new Date();
      const nowJulian = Cesium.JulianDate.fromDate(now);
      const oneHourLater = new Date(now.getTime() + 3600000);
      const oneHourLaterJulian = Cesium.JulianDate.fromDate(oneHourLater);
      
      viewer.value.clock.startTime = nowJulian;
      viewer.value.clock.stopTime = oneHourLaterJulian;
      viewer.value.clock.currentTime = nowJulian;
      viewer.value.clock.multiplier = 30;
      viewer.value.clock.clockStep = Cesium.ClockStep.SYSTEM_CLOCK_MULTIPLIER;
      viewer.value.clock.clockRange = Cesium.ClockRange.LOOP_STOP;
      viewer.value.clock.shouldAnimate = true;
    
  };
  
  /**
   * 功能说明
   */
  const setTimelineVisible = (visible) => {
    if (viewer.value) {
      // 说明
      if (viewer.value.timeline) {
        viewer.value.timeline.container.style.display = visible ? 'block' : 'none';
        
        // 说明
        if (visible) {
          setTimeout(() => {
            try {
              // 说明
              const startTime = viewer.value.clock.startTime;
              const stopTime = viewer.value.clock.stopTime;
              
              // 说明
              if (startTime && stopTime && 
                  startTime.isValid && 
                  stopTime.isValid) {
                // 说明
                viewer.value.timeline.zoomTo(startTime, stopTime);
                console.log('时间轴缩放范围设置成功');
              } else {
                console.warn('时间参数无效，跳过时间轴缩放');
                // 说明
                const now = new Date();
                const nowJulian = Cesium.JulianDate.fromDate(now);
                const oneHourLater = new Date(now.getTime() + 3600000);
                const oneHourLaterJulian = Cesium.JulianDate.fromDate(oneHourLater);
                
                viewer.value.clock.startTime = nowJulian;
                viewer.value.clock.stopTime = oneHourLaterJulian;
                viewer.value.clock.currentTime = nowJulian;
                viewer.value.timeline.zoomTo(nowJulian, oneHourLaterJulian);
              }
              
              // 说明
              viewer.value.scene.requestRender();
            } catch (error) {
              console.error('设置时间轴范围失败:', error);
              // 说明
              try {
                const now = new Date();
                const nowJulian = Cesium.JulianDate.fromDate(now);
                const oneHourLater = new Date(now.getTime() + 3600000);
                const oneHourLaterJulian = Cesium.JulianDate.fromDate(oneHourLater);
                
                viewer.value.clock.startTime = nowJulian;
                viewer.value.clock.stopTime = oneHourLaterJulian;
                viewer.value.clock.currentTime = nowJulian;
                viewer.value.timeline.zoomTo(nowJulian, oneHourLaterJulian);
                viewer.value.scene.requestRender();
              } catch (fallbackError) {
                console.error('回退逻辑执行失败:', fallbackError);
              }
            }
          }, 100);
        }
      }
      
      // 说明
      if (viewer.value.animation) {
        viewer.value.animation.container.style.display = visible ? 'block' : 'none';
      }
    }
  };

  /**
   * 功能说明
   */
  const configCamera = () => {
    resources.value.cameraMoveHandler = handleCameraMove(viewer.value)
  };

  const applyAreaPointsVisibility = () => {
    const visible = layerSettingsStore.layers.areaPoints?.visible !== false
    resources.value.areaManager?.setAreasVisibility(visible)
  }

  const ensureLandingPointsRendered = async () => {
    if (!resources.value.areaManager || !viewer.value) return
    let points = areaList.value || []
    const rid = appStore.regionId || regionStore.regionId
    if (!points.length && rid) {
      try {
        await areaStore.loadLandingPoints(rid)
        points = areaStore.areaList || []
      } catch (err) {
        console.warn('[Cesium] 起降点加载失败', err)
      }
    }
    resources.value.areaManager.render(points, {
      visible: layerSettingsStore.layers.areaPoints?.visible !== false,
    })
  }

  /** MetViz 开启风场时不受 10km 相机高度限制（区域概览 ~120km 也能看） */
  const shouldShowWindLayers = () => {
    if (layerSettingsStore.layers.wind?.visible === false) return false
    if (metVizWindActive && metVizStore.enabled?.wind) return true
    if (!viewer.value) return false
    const c = viewer.value.camera.positionCartographic
    if (!Cesium.defined(c)) return false
    return c.height <= CAMERA_HEIGHT_THRESHOLD
  }

  const getWindLayerInstances = () => {
    const list = windStore.windLayer || resources.value.windLayer
    if (!list) return []
    return Array.isArray(list) ? list.filter(Boolean) : [list]
  }

  const syncSceneRenderMode = () => {
    if (!viewer.value?.scene) return
    const windRunning =
      metVizWindActive &&
      metVizStore.enabled?.wind &&
      layerSettingsStore.layers.wind?.visible !== false &&
      getWindLayerInstances().length > 0 &&
      !windPausedForCamera
    viewer.value.scene.requestRenderMode = !windRunning
    viewer.value.scene.maximumRenderTimeChange = windRunning ? 0 : Infinity
    if (!windRunning) {
      viewer.value.scene.requestRender()
    }
  }

  const pauseWindForCameraInteraction = () => {
    if (!metVizWindActive || windPausedForCamera) return
    if (!metVizStore.enabled?.wind) return
    windPausedForCamera = true
    getWindLayerInstances().forEach((layer) => {
      if (layer) layer.show = false
    })
    syncSceneRenderMode()
  }

  const resumeWindAfterCameraInteraction = () => {
    if (!windPausedForCamera) return
    windPausedForCamera = false
    applyWindLayerVisibility()
  }

  const setupCameraInteractionWindPause = () => {
    if (!viewer.value || !metVizWindActive) return

    resources.value.cameraWindPauseCleanup?.()
    let interactTimer = null

    const onMoveStart = () => {
      if (interactTimer) {
        clearTimeout(interactTimer)
        interactTimer = null
      }
      pauseWindForCameraInteraction()
    }

    const onMoveEnd = () => {
      if (interactTimer) clearTimeout(interactTimer)
      interactTimer = setTimeout(() => {
        interactTimer = null
        resumeWindAfterCameraInteraction()
      }, 250)
    }

    const moveStartRemover = viewer.value.camera.moveStart.addEventListener(onMoveStart)
    const moveEndRemover = viewer.value.camera.moveEnd.addEventListener(onMoveEnd)

    resources.value.cameraWindPauseCleanup = () => {
      if (interactTimer) {
        clearTimeout(interactTimer)
        interactTimer = null
      }
      moveStartRemover?.()
      moveEndRemover?.()
      windPausedForCamera = false
    }
  }

  const applyWindLayerVisibility = () => {
    const showWind = shouldShowWindLayers() && !windPausedForCamera
    const layers = getWindLayerInstances()
    layers.forEach((layer) => {
      if (layer?.show !== undefined) layer.show = showWind
    })
    syncSceneRenderMode()
  }

  /**
   * 功能说明
   */
  const setupCameraHeightWatcher = () => {
    if (!viewer.value) return

    if (resources.value.cameraHeightWatcher) {
      resources.value.cameraHeightWatcher()
      resources.value.cameraHeightWatcher = null
    }

    const cameraPosition = viewer.value.camera.positionCartographic
    const initialHeight = cameraPosition ? cameraPosition.height : Infinity
    /** 滞回：避免相机高度在 10km 附近抖动时风场反复 show/hide（粒子会重置，疏密突变） */
    let lowAltitudeBand =
      Number.isFinite(initialHeight) && initialHeight <= CAMERA_HEIGHT_THRESHOLD

    const applyLowAltitudeLayers = (isBelowThreshold) => {
      applyWindLayerVisibility()
      applyAreaPointsVisibility()
    }

    const syncFromCameraHeight = (heightM) => {
      if (!Number.isFinite(heightM)) return
      if (lowAltitudeBand) {
        if (heightM > CAMERA_HEIGHT_THRESHOLD + CAMERA_HEIGHT_WIND_OFF_HYSTERESIS_M) {
          lowAltitudeBand = false
        }
      } else if (heightM <= CAMERA_HEIGHT_THRESHOLD) {
        lowAltitudeBand = true
      }
      applyLowAltitudeLayers(lowAltitudeBand)
    }

    syncFromCameraHeight(initialHeight)

    resources.value.refreshCameraHeightLayerVisibility = () => {
      if (!viewer.value) return
      const c = viewer.value.camera.positionCartographic
      if (!Cesium.defined(c)) return
      syncFromCameraHeight(c.height)
    }

    resources.value.cameraHeightWatcher = watchCameraHeight(
      viewer.value,
      CAMERA_HEIGHT_THRESHOLD,
      (height) => {
        syncFromCameraHeight(height)
      }
    )
  }

  /**
   * 功能说明
   */
  const loadBaseLayers = async () => {
    const mapCfg = getMapTilesConfig()
    try {
      let stepStart = performance.now()
      console.log('[Cesium] 3.1 加载地形...')
      await loadTerrain(viewer.value, mapCfg)
      logPerf('Cesium', '3.1 loadTerrain', stepStart)
    } catch (error) {
      console.warn('[Cesium] 地形加载失败:', error)
    }

    try {
      let stepStart = performance.now()
      console.log('[Cesium] 3.2 加载底图图层...', mapCfg.cesium?.base_layer)
      viewer.value.imageryLayers.removeAll(true)
      switchBaseLayer(viewer.value, mapCfg)
      logPerf('Cesium', '3.2 switchBaseLayer', stepStart)
    } catch (error) {
      console.warn('[Cesium] 底图图层加载失败:', error)
    }
  }

  /**
   * 功能说明
   */
  const load3DModel = async () => {
    try {
      const modelUrl = regionStore.getModelUrl
      const rid = regionStore.regionId
      if (!modelUrl) {
        console.warn('[Cesium] 未配置 modelUrl，跳过 3D 模型', { regionId: rid })
        return
      }
      if (viewer.value && resources.value.modelTileset) {
        removeWhiteModel(viewer.value)
        resources.value.modelTileset = null
      }
      console.log('[Cesium] 4.1 加载白膜模型...', { regionId: rid, modelUrl })
      resources.value.modelTileset = await addWhiteModel(viewer.value, { url: modelUrl })
      applyModelVisibility()
      console.log('[Cesium] 白膜模型加载完成')
    } catch (error) {
      console.warn('[Cesium] 白膜模型加载失败:', error)
    }
  }

  const applyModelVisibility = () => {
    const visible = layerSettingsStore.layers.model?.visible !== false
    setModelVisibility(visible)
  }

  /**
   * 功能说明
   */
  const loadRegionBoundaryLayer = async () => {
    const v = viewer.value
    if (!v) return
    const boundaryUrl = regionStore.getBoundaryUrl
    clearRegionBoundary(v)
    if (!boundaryUrl) return
    try {
      await loadRegionBoundary(v, boundaryUrl)
    } catch (err) {
      console.warn('[Cesium] 区域边界 GeoJSON 加载失败', boundaryUrl, err)
    }
  }

  const initEntitiesAndVisualizations = async () => {
    if (!deferRegionLayersToMeteo) {
      try {
        let stepStart = performance.now()
        console.log('[Cesium] 5.0 加载区域边界 GeoJSON...')
        await loadRegionBoundaryLayer()
        logPerf('Cesium', '5.0 regionBoundary', stepStart)
      } catch (error) {
        console.warn('[Cesium] 区域边界加载失败:', error)
      }

      try {
        let stepStart = performance.now()
        console.log('[Cesium] 5.1 初始化监测点管理器...')
        resources.value.areaManager = AreaManager.getInstance(viewer.value, areaStore)
        await ensureLandingPointsRendered()
        logPerf('Cesium', '5.1 areaManager + landingPoints', stepStart)
      } catch (error) {
        console.warn('[Cesium] 监测点管理器初始化失败:', error)
      }
    } else {
      console.log('[Cesium] 5.0~5.1 跳过边界/起降点（由 RegionMeteo 负责）')
    }

    if (!deferRegionLayersToMeteo) {
      try {
        let stepStart = performance.now()
        console.log('[Cesium] 5.5 初始化航线管理器...')
        routeManager.init(viewer.value)
        console.log('[Cesium] 航线管理器初始化完成')
        try {
          const rawZones = await fetchNoFlyZones()
          routeManager.setRiskZones(rawZones)
        } catch (rzErr) {
          console.warn('[Cesium] 风险区加载失败', rzErr)
        }
        logPerf('Cesium', '5.5 routeManager + riskZones', stepStart)
      } catch (error) {
        console.warn('[Cesium] 航线管理器初始化失败:', error)
      }
    } else {
      console.log('[Cesium] 5.5 航线管理器延后（进入 drill/simFlight 时再 init）')
    }

    if (!window.__routeVerticalFlytoBound) {
      window.__routeVerticalFlytoBound = true
      window.addEventListener('route-vertical-flyto', (e) => {
        const v = viewer.value
        if (!v) return
        const { lon, lat, height } = e.detail || {}
        if (lon == null || lat == null) return
        const dest = Cesium.Cartesian3.fromDegrees(lon, lat, (height || 300) + 220)
        v.camera.flyTo({
          destination: dest,
          orientation: {
            heading: Cesium.Math.toRadians(0),
            pitch: Cesium.Math.toRadians(-28),
            roll: 0
          },
          duration: 1.6
        })
      })
    }
    
    // 说明
    if (viewer.value.timeline) {
      // 说明
      const timelineContainer = viewer.value.timeline.container;
      if (timelineContainer) {
        // 说明
        // 说明
      }
      
      // 说明
      viewer.value.timeline.makeLabel = function(date) {
        // 说明
        const chinaDate = new Date(date);
        
        // 说明
        // 说明
        
        // 说明
        const month = String(chinaDate.getMonth() + 1).padStart(2, '0');
        const day = String(chinaDate.getDate()).padStart(2, '0');
        const hours = String(chinaDate.getHours()).padStart(2, '0');
        const minutes = String(chinaDate.getMinutes()).padStart(2, '0');
        
        return `${month}-${day} ${hours}:${minutes}`;
      };
    }
    
    // 说明
    viewer.value.clock.onTick.addEventListener(() => {
      if (!viewer.value.clock.currentTime) return;
      const currentTime = Cesium.JulianDate.toDate(viewer.value.clock.currentTime);
      
      if (!currentTime) return;
      
      // 说明
      if (routeStore.currentRoute) {
        const timeOffset = Math.floor((currentTime - new Date()) / 1000);
        eventManager.emit('timeChange', { time: currentTime, timeOffset });
      }
    });
    
    // 说明
    if (viewer.value.timeline) {
      viewer.value.timeline.addEventListener('settime', (event) => {
        if (!event || !event.time) return;
        const currentTime = Cesium.JulianDate.toDate(event.time);
        
        if (!currentTime) return;
        
        viewer.value.clock.shouldAnimate = true;
        
        if (routeStore.currentRoute) {
          const timeOffset = Math.floor((currentTime - new Date()) / 1000);
          eventManager.emit('timeChange', { time: currentTime, timeOffset, manual: true });
        }
      });
    }
    if (metVizOnDashboard) {
      const windStart = performance.now()
      try {
        console.log('[Cesium] 5.3 初始化风场...')
        resources.value.windLayer = await initWind(viewer.value, layerSettingsStore)
        syncSceneRenderMode()
        dashboardEventBus.emit(DASHBOARD_EVENTS.MET_VIZ_CONFIG_CHANGED, {
          product: metVizStore.product,
          heightM: metVizStore.heightM,
          enabled: { ...metVizStore.enabled },
        })
        logPerf('Cesium', '5.3 initWind', windStart)
        setupCameraInteractionWindPause()
      } catch (error) {
        console.warn('[Cesium] 风场初始化失败:', error)
      }
    } else if (enableMetVizWind) {
      console.log('[Cesium] 气象页风场默认关闭，开启后懒加载 initWind')
    } else {
      console.log('[Cesium] MetViz 风场未启用，跳过 initWind')
    }

    if (!deferRegionLayersToMeteo) {
      // 说明：风场数据可能晚于 Viewer 就绪，但高度分层逻辑（风/云/监测点）必须在首帧就注册一次
      const cameraWatcherStart = performance.now()
      if (!windStore.windData) {
        const unwatch = watch(
          () => windStore.windData,
          (newData) => {
            if (newData) {
              unwatch();
              setupCameraHeightWatcher()
            }
          }
        )
      }
      setupCameraHeightWatcher()

      logPerf('Cesium', '5.7 setupCameraHeightWatcher', cameraWatcherStart)
      console.log('[Cesium] 相机高度监听设置完成')
    } else {
      console.log('[Cesium] 5.7 跳过相机高度监听（RegionMeteo Dashboard 模式）')
    }
  }


  let windInitPromise = null

  const ensureWindLayer = async () => {
    if (!viewer.value || !metVizWindActive) return null
    if (resources.value.windLayer) return resources.value.windLayer
    if (!windInitPromise) {
      windInitPromise = (async () => {
        try {
          console.log('[Cesium] 懒加载风场 initWind...')
          resources.value.windLayer = await initWind(viewer.value, layerSettingsStore)
          syncSceneRenderMode()
          setupCameraInteractionWindPause()
          return resources.value.windLayer
        } catch (error) {
          windInitPromise = null
          console.warn('[Cesium] 风场懒加载失败:', error)
          throw error
        }
      })()
    }
    return windInitPromise
  }

  /**
   * 功能说明
   */
  const setupReactiveWatchers = () => {
    dashboardEventBus.on(DASHBOARD_EVENTS.WIND_VISIBILITY_SYNC, () => {
      updateWindVisibilityBasedOnConditions()
    })

    watch(
      () => metVizStore.enabled.wind,
      () => {
        updateWindVisibilityBasedOnConditions()
        syncSceneRenderMode()
      }
    )

    watch(
      () => windStore.windLayer,
      () => {
        if (windStore.windLayer) updateWindVisibilityBasedOnConditions()
      }
    )

    // 说明
    watch(
      () => areaStore.selectedArea,
      async (newArea) => {
        if (!newArea || !viewer.value) {
          return
        }

        resources.value.areaManager?.setSelected(`area_${newArea.id}`)
        if (newArea.bbox) {
          flyToRegion(viewer.value, { bbox: newArea.bbox, duration: 1.0 })
        }

      },
      { deep: true }
    )

    // 说明
    watch(
      () => routeStore.currentRoute,
      (newRoute) => {
        if (newRoute && viewer.value) {
          if (deferRegionLayersToMeteo) routeManager.init(viewer.value)
          // 说明
          if (newRoute.startTime && newRoute.endTime) {
            // 说明
            setClockParams(newRoute.startTime, newRoute.endTime)
            // 说明
            routeManager.render(newRoute)
            // 说明
            setTimelineVisible(true)
          } else {
            // 说明
            routeManager.render(newRoute)
            // 说明
            setTimelineVisible(false)
          }
        } else {
          setTimelineVisible(false)
          routeManager.clearAllRoutes()
        }
        resources.value.refreshCameraHeightLayerVisibility?.()
      },
      { deep: true, immediate: true }
    )

    watch(
      () => routeStore.sessionPathOnMap,
      () => {
        resources.value.refreshCameraHeightLayerVisibility?.()
      }
    )

    let regionOverviewApplied = false

    if (!deferRegionLayersToMeteo) {
      // 说明
      watch(
        () => areaStore.areaList,
        (newAreas) => {
          if (!viewer.value || !resources.value.areaManager) return
          resources.value.areaManager.render(newAreas || [], {
            visible: layerSettingsStore.layers.areaPoints?.visible !== false,
          })
        },
        { deep: true }
      )

      // 起降点加载后自动飞到能包含全部点的概览视角
      watch(
        () => [areaStore.areaList, viewer.value],
        ([points, v]) => {
          if (regionOverviewApplied || !v || !points?.length) return
          regionOverviewApplied = true
          console.log('[Dashboard/Camera] 自动应用起降点概览视角', {
            regionId: regionStore.regionId,
            pointCount: points.length,
          })
          flyToRegionOverview(v, { points })
        },
        { immediate: true, deep: true }
      )

      watch(
        () => [appStore.view, appStore.focus.type, appStore.focus.id, viewer.value, areaStore.areaList],
        ([view, focusType, focusId, v, points], oldValues) => {
          if (!v || !points?.length) return
          const prevView = oldValues?.[0]

          if (view === 'drillLanding' && focusType === 'landingPoint' && focusId) {
            const point = points.find(
              (p) => String(p.id || p.landingPointId) === String(focusId)
            )
            if (!point) return
            areaStore.setSelectedLandingPoint(point)
            const entityId = `area_${point.id || point.landingPointId}`
            if (resources.value.areaManager?.areaEntities?.has(entityId)) {
              resources.value.areaManager.setSelected(entityId)
            } else {
              switchToFocusMode(v, point)
            }
            return
          }

          // 仅从其他视图切回 home 时再飞概览，避免与首次自动概览重复
          if (view === 'home' && prevView && prevView !== 'home') {
            areaStore.setSelectedLandingPoint(null)
            switchToOverviewMode(v, points)
          }
        }
      )
    } else {
      // RegionMeteo：首屏/切 Region 在 reloadRegion 全部加载完再 flyToRegion；此处只处理回到 home
      watch(
        () => [appStore.view, viewer.value, areaStore.areaList, regionStore.boundaryEnvelope],
        ([view, v, points], oldValues) => {
          if (!v || view !== 'home') return
          const prevView = oldValues?.[0]
          if (prevView && prevView !== 'home') {
            areaStore.setSelectedLandingPoint(null)
            flyToRegionOverview(v, { points: points || [] })
          }
        },
      )
    }

    const reloadRegionMapLayers = async ({ regionId } = {}) => {
      const rid = regionId || regionStore.regionId
      if (!rid || !viewer.value) return
      console.log('[Cesium] REGION_CHANGED 重载地图数据', {
        regionId: rid,
        modelUrl: regionStore.getModelUrl,
      })
      try {
        regionOverviewApplied = false
        await loadRegionBoundaryLayer()
        await load3DModel()
        routeManager.clearAllRoutes()
        routeStore.clearCurrentRoute()
        areaStore.clearLandingPoints()
        await areaStore.loadLandingPoints(rid)
        await ensureLandingPointsRendered()
        const rawZones = await fetchNoFlyZones(rid)
        routeManager.setRiskZones(rawZones)
        flyToRegionOverview(viewer.value, { points: areaStore.areaList || [] })
        regionOverviewApplied = true
      } catch (err) {
        console.warn('[Cesium] REGION_CHANGED 重载失败', err)
      }
    }

    resources.value.regionChangedUnsub = deferRegionLayersToMeteo
      ? null
      : dashboardEventBus.on(
        DASHBOARD_EVENTS.REGION_CHANGED,
        reloadRegionMapLayers
      )

    // 说明
    resources.value.cameraPrintKeydownHandler = setupCameraPrintKeydown(viewer.value)
  }

  /**
   * 功能说明
   */
  const initCesium = async () => {
    const totalStart = performance.now()
    try {
      isLoading.value = true
      console.log('[Cesium] 开始初始化 Cesium...')

      let stepStart = performance.now()
      console.log('[Cesium] 1. 初始化 Viewer...')
      initViewer()
      logPerf('Cesium', '1. initViewer', stepStart)

      stepStart = performance.now()
      console.log('[Cesium] 2. 配置相机...')
      configCamera()
      logPerf('Cesium', '2. configCamera', stepStart)

      stepStart = performance.now()
      console.log('[Cesium] 3. 加载基础图层...')
      await loadBaseLayers()
      logPerf('Cesium', '3. loadBaseLayers', stepStart)

      stepStart = performance.now()
      console.log('[Cesium] 4. 加载 3D 模型...')
      if (!deferRegionLayersToMeteo) {
        await load3DModel()
      } else {
        console.log('[Cesium] 4. 跳过白膜（由 RegionMeteo 负责）')
      }
      logPerf('Cesium', '4. load3DModel', stepStart)

      stepStart = performance.now()
      console.log('[Cesium] 5. 初始化实体与可视化...')
      await initEntitiesAndVisualizations()
      logPerf('Cesium', '5. initEntitiesAndVisualizations', stepStart)

      stepStart = performance.now()
      console.log('[Cesium] 6. 设置响应式监听...')
      setupReactiveWatchers()
      logPerf('Cesium', '6. setupReactiveWatchers', stepStart)

      // 说明
      setTimelineVisible(false)

      logPerf('Cesium', 'initCesium 总计', totalStart)
      console.log('[Cesium] 初始化完成')

    } catch (error) {
      console.error('[Cesium] 初始化失败:', error)
      console.error('[Cesium] 错误堆栈:', error.stack)
      throw error
    } finally {
      isLoading.value = false
    }
  }

  /**
   * 功能说明
   */
  const cleanup = () => {
    console.log('开始清理 Cesium 资源...')

    // 说明
    if (resources.value.cameraPrintKeydownHandler) {
      document.removeEventListener('keydown', resources.value.cameraPrintKeydownHandler)
      resources.value.cameraPrintKeydownHandler = null
    }

    // 说明
    if (resources.value.cameraMoveHandler) {
      document.removeEventListener('keydown', resources.value.cameraMoveHandler)
      resources.value.cameraMoveHandler = null
    }

    // 说明
    if (resources.value.cameraHeightWatcher) {
      resources.value.cameraHeightWatcher()
      resources.value.cameraHeightWatcher = null
    }
    resources.value.refreshCameraHeightLayerVisibility = null
    resources.value.cameraWindPauseCleanup?.()
    resources.value.cameraWindPauseCleanup = null
    resources.value.regionChangedUnsub?.()
    resources.value.regionChangedUnsub = null

    if (viewer.value) {
      clearRegionBoundary(viewer.value)

      // 说明
      if (resources.value.skyBoxManager) {
        resources.value.skyBoxManager.destroy()
        resources.value.skyBoxManager = null
      }

      // 说明
      routeManager.destroy()

      // 说明
      if (resources.value.areaManager) {
        resources.value.areaManager.destroy()
        resources.value.areaManager = null
      }

      // 说明
      if (resources.value.heatMapBridge) {
        resources.value.heatMapBridge.destroy()
        resources.value.heatMapBridge = null
      }

      if (resources.value.heatMapManager) {
        resources.value.heatMapManager.destroy()
        resources.value.heatMapManager = null
      }

      // 说明
      if (resources.value.windLayer) {
        // 说明
        if (Array.isArray(resources.value.windLayer)) {
          // 说明
          if (typeof resources.value.windLayer.destroy === 'function') {
            resources.value.windLayer.destroy();
          } else {
            // 说明
            resources.value.windLayer.forEach(layer => {
              layer.destroy();
            });
          }
        } else {
          resources.value.windLayer.destroy();
        }
        resources.value.windLayer = null;
      }

      // 说明
      destroyViewer(viewer.value)
      
      // 说明
      if (window.viewer === viewer.value) {
        delete window.viewer
      }
      
      viewer.value = null
    }
  }


  // 说明
  /**
   * 功能说明
   */
  const setModelVisibility = (visible) => {
    const models = resources.value.modelTileset
    if (!models) return
    if (Array.isArray(models)) {
      models.forEach((m) => {
        if (m) m.show = visible
      })
      return
    }
    if (models.show !== undefined) {
      models.show = visible
    }
  };

  /**
   * 功能说明
   */
  const setWindVisibility = (visible) => {
    layerSettingsStore.setLayerVisibility('wind', visible);
    if (visible) {
      windPausedForCamera = false
    }
    if (metVizWindActive) {
      metVizStore.setLayerEnabled('wind', visible);
      dashboardEventBus.emit(DASHBOARD_EVENTS.MET_VIZ_CONFIG_CHANGED, {
        product: metVizStore.product,
        heightM: metVizStore.heightM,
        enabled: { ...metVizStore.enabled },
      });
    }
    updateWindVisibilityBasedOnConditions();
  };


  /**
   * 功能说明
   */
  const updateWindVisibilityBasedOnConditions = () => {
    if (!getWindLayerInstances().length && !windStore.windData) return
    if (resources.value.refreshCameraHeightLayerVisibility) {
      resources.value.refreshCameraHeightLayerVisibility()
      return
    }
    applyWindLayerVisibility()
  }


  /**
   * 功能说明
   */
  const setAreasVisibility = (visible) => {
    layerSettingsStore.setLayerVisibility('areaPoints', visible)
    if (resources.value.areaManager) {
      resources.value.areaManager.setAreasVisibility(visible)
    }
  };

  /**
   * 功能说明
   */
  const setTemperatureVisibility = (visible) => {
    layerSettingsStore.setLayerVisibility('temperature', visible);
    if (!metVizOnDashboard) return;
    metVizStore.setLayerEnabled('metProduct', visible);
    dashboardEventBus.emit(DASHBOARD_EVENTS.MET_VIZ_CONFIG_CHANGED, {
      product: metVizStore.product,
      heightM: metVizStore.heightM,
      enabled: { ...metVizStore.enabled },
    });
  };

  /**
   * 功能说明
   */
  const setCloudVisibility = (visible) => {
    layerSettingsStore.setLayerVisibility('cloud', visible);
  };

  const updateCloudVisibilityBasedOnConditions = () => {};

  /** @deprecated 气象填色由 MetVizEngine 经 MET_TIME_CHANGED 刷新 */
  const updateHeatmapTime = async () => {};
  /**
   * 功能说明
   */
  const setCurrentTime = (time) => {
    if (viewer.value) {
      const julianDate = Cesium.JulianDate.fromDate(time)
      viewer.value.clock.currentTime = julianDate
    }
  };

  // 说明
  const startRectangleDrawing = (callback) => {
    eventManager.startRectangleDrawing(callback);
  };

  const stopRectangleDrawing = () => {
    eventManager.stopRectangleDrawing();
  };

  const cancelRectangleDrawing = () => {
    eventManager.cancelRectangleDrawing();
  };

  // 说明
  return {
    viewer,
    isLoading,
    errorMsg,
    initCesium,
    cleanup,
    ensureWindLayer,
    // 说明
    flyToRegion: (region) => flyToRegion(viewer.value, region),
    flyToRectangle: (region) => flyToRectangle(viewer.value, region),
    getCurrentCameraParams: () => getCurrentCameraParams(viewer.value),
    // 说明
    switchToOverviewMode: () => switchToOverviewMode(viewer.value, areaStore.areaList || []),
    switchToFocusMode: (region) => switchToFocusMode(viewer.value, region),
    // 说明
    setModelVisibility,
    setWindVisibility,
    setAreasVisibility,
    setTemperatureVisibility,
    setHeatmapLayerType: async () => {},
    setCloudVisibility,
    // 说明
    updateHeatmapTime,
    // 说明
    setCurrentTime,
    setClockParams,
    setTimelineVisible,
    // 说明
    startRectangleDrawing,
    stopRectangleDrawing,
    cancelRectangleDrawing,
    // 说明
    getSkyBoxManager: () => resources.value.skyBoxManager
  }
}




