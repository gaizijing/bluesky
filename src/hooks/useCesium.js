import { ref, watch, toRefs } from 'vue'
import * as Cesium from 'cesium'
import { useWindStore } from '@/store/modules/wind'
import { useLayerSettingsStore } from '@/store/modules/layerSettings'
import { useAreaStore } from '@/store/modules/area'
import { useRegionStore } from '@/store/modules/region'
import { createViewer, destroyViewer } from '@/cesium/core/viewer'
import { handleCameraMove, getCurrentCameraParams, flyToRegion, flyToRectangle, limitCameraRange, switchToOverviewMode, switchToFocusMode, flyToRegionOverview, setupCameraPrintKeydown, watchCameraHeight } from '@/cesium/core/camera'
import { addTiandituLayer, addTiandituWithGaodeOverlay } from '@/cesium/layers/tianditu'
import { loadTerrain } from '@/cesium/layers/terrain'
import { addWhiteModel } from '@/cesium/layers/model3d'
import { AreaManager } from '@/cesium/entities/area.js'
import { initWind } from '@/cesium/visualization/wind'
//3d
import { initHeatVolume, createReactiveHeatmapBridge } from '@/cesium/visualization/heatmap-grid'
//2d
// import { initHeatVolume, createReactiveHeatmapBridge } from '@/cesium/visualization/heatmap'

import { routeManager } from '@/cesium/entities/routes' 
import { useRouteStore } from '@/store/modules/routeStore'
import eventManager from '@/cesium/core/eventManager' 
import { SkyBoxManager } from '@/cesium/volumeCloud/SkyBoxManager' 
import { CAMERA_HEIGHT_THRESHOLD } from '../config/windLayerDefaults'
import Cloud from '@/cesium/visualization/cloud'
import { useHeatmapStore } from '@/store/modules/heatmap'
import { getCitywideHeatmap, getWeatherHeatmapGeo } from '@/api'
export function useCesium(containerId) {
  // 说明
  const windStore = useWindStore()
  const heatmapStore = useHeatmapStore()
  const areaStore = useAreaStore()
  const layerSettingsStore = useLayerSettingsStore()
  const routeStore = useRouteStore()
  const regionStore = useRegionStore()

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
    cloud: null
  })

  // 说明
  const { areaList } = toRefs(areaStore)

  // 说明
  watch(
    () => areaStore.selectedArea,
    (newArea, oldArea) => {

      
      // 记录区域切换，但不立即更新热力图
      // 热力图更新会在Cesium初始化后通过其他机制触发
      console.log('区域已切换，热力图将在适当时机更新')
      
      // 如果当前有热力图实例且viewer已初始化，可以尝试更新
      // 但通常热力图更新会由时间轴或其他机制触发
      if (resources.value.heatMapInstance && viewer.value && newArea) {
        console.log('尝试立即更新热力图...')
        const currentTime = viewer.value.clock.currentTime
        if (currentTime) {
          const jsDate = Cesium.JulianDate.toDate(currentTime)
          console.log('使用Viewer时间更新热力图:', jsDate)
          updateHeatmapTime(jsDate)
        } else {
          console.log('使用当前时间更新热力图')
          updateHeatmapTime(new Date())
        }
      } else {
        console.log('热力图暂不更新，等待初始化完成')
      }
    },
    { deep: true }
  )


  /**
   * 功能说明
   */
  const initViewer = () => {
    try {
      viewer.value = createViewer(containerId)
      viewer.value.cesiumWidget.creditContainer.style.display = 'none'
     // viewer.value.scene.globe.depthTestAgainstTerrain = false
      // 说明
      window.viewer = viewer.value
        resources.value.skyBoxManager = new SkyBoxManager(viewer.value, {
          cameraHeightThreshold: 240000
        })
      viewer.value.shadows = true;
      viewer.value.terrainShadows = Cesium.ShadowMode.ENABLED;
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

  /**
   * 功能说明
   */
  const setupCameraHeightWatcher = () => {
    if (!viewer.value) return;

    const cameraPosition = viewer.value.camera.positionCartographic;
    const initialHeight = cameraPosition ? cameraPosition.height : Infinity;
    const initialIsBelowThreshold = initialHeight <= CAMERA_HEIGHT_THRESHOLD;

    const updateVisibility = (isBelowThreshold) => {
      if (isBelowThreshold) {
        const isWindEnabled = layerSettingsStore.layers.wind.visible;
        if (resources.value.windLayer && resources.value.windLayer.length > 0 && isWindEnabled) {
          if (Array.isArray(resources.value.windLayer)) {
            resources.value.windLayer.forEach(layer => {
              layer.show = true;
            });
          } else {
            resources.value.windLayer.show = true;
          }
        }
        if (resources.value.areaManager) {
          resources.value.areaManager.setAreasVisibility(false);
        }
        if (resources.value.cloud) {
          const isCloudEnabled = layerSettingsStore.layers.cloud.visible;
          if (isCloudEnabled) {
            resources.value.cloud.show();
            resources.value.cloud.setVisible(true);
            console.log('云层已显示');
          }
        }
      } else {
        if (resources.value.windLayer && resources.value.windLayer.length > 0) {
          if (Array.isArray(resources.value.windLayer)) {
            resources.value.windLayer.forEach(layer => {
              layer.show = false;
            });
          } else {
            resources.value.windLayer.show = false;
          }
        }
        if (resources.value.cloud) {
          resources.value.cloud.destroy();
        }
        if (resources.value.areaManager) {
          resources.value.areaManager.setAreasVisibility(true);
        }
      }
    };

    updateVisibility(initialIsBelowThreshold);

    resources.value.cameraHeightWatcher = watchCameraHeight(
      viewer.value,
      CAMERA_HEIGHT_THRESHOLD,
      (height, isBelowThreshold) => {
        updateVisibility(isBelowThreshold);
      }
    );
  };

  /**
   * 功能说明
   */
  const loadBaseLayers = () => {
    try {
      console.log('[Cesium] 3.1 加载地形...')
      loadTerrain(viewer.value)
      console.log('[Cesium] 地形加载完成')
    } catch (error) {
      console.warn('[Cesium] 地形加载失败:', error)
    }
    
    try {
      console.log('[Cesium] 3.2 加载天地图图层...')
      resources.value.tiandituLayer = addTiandituLayer(viewer.value)
      console.log('[Cesium] 底图图层加载完成')
    } catch (error) {
      console.warn('[Cesium] 底图图层加载失败:', error)
    }

  }

  /**
   * 功能说明
   */
  const load3DModel = async () => {
    try {
      console.log('[Cesium] 4.1 加载白膜模型...')
      resources.value.modelTileset = await addWhiteModel(viewer.value,{url:regionStore.getModelUrl})
      console.log('[Cesium] 白膜模型加载完成')
    } catch (error) {
      console.warn('[Cesium] 白膜模型加载失败:', error)
      // 说明
    }
  }

  /**
   * 功能说明
   */
  const initEntitiesAndVisualizations = async () => {
    try {
      console.log('[Cesium] 5.1 初始化监测点管理器...')
      resources.value.areaManager = AreaManager.getInstance(viewer.value, areaStore)
      console.log('[Cesium] 5.2 渲染监测点数量:', areaList.value?.length || 0)
      resources.value.areaManager.render(areaList.value)
    } catch (error) {
      console.warn('[Cesium] 监测点管理器初始化失败:', error)
    }


    try {
      console.log('[Cesium] 5.4 初始化热力图...')
      resources.value.heatMapManager = await initHeatVolume(viewer.value)
      resources.value.heatMapBridge = createReactiveHeatmapBridge({
        heatmapManager: resources.value.heatMapManager,
        heatmapStore,
        layerSettingsStore,
        areaStore,
        getCurrentTime: () => {
          if (!viewer.value?.clock?.currentTime) return new Date()
          return Cesium.JulianDate.toDate(viewer.value.clock.currentTime)
        }
      })
      heatmapStore.setHeatmapLayer(resources.value.heatMapManager)
      console.log('[Cesium] 热力图初始化完成')

      // 由 heatMapBridge 内部 watch(immediate) 触发首刷，避免初始化阶段重复请求
      if (areaStore.selectedArea) {
        console.log('当前选中区域:', areaStore.selectedArea.id)
      }
    } catch (error) {
      console.warn('[Cesium] 热力图初始化失败:', error)
    }

    try {
      console.log('[Cesium] 5.5 初始化航线管理器...')
      routeManager.init(viewer.value)
      console.log('[Cesium] 航线管理器初始化完成')
    } catch (error) {
      console.warn('[Cesium] 航线管理器初始化失败:', error)
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
     console.log('[Cesium] 开始初始化云层...')
      try {
        resources.value.cloud = new Cloud(viewer.value)
        resources.value.cloud.show()
        console.log('[Cesium] 云层初始化完成')
      } catch (cloudError) {
        console.warn('[Cesium] 云层初始化失败:', cloudError)
      }

      
    try {
      console.log('[Cesium] 5.3 初始化风场...')
      resources.value.windLayer = await initWind(viewer.value, layerSettingsStore)
      console.log('[Cesium] 风场初始化完成')
    } catch (error) {
      console.warn('[Cesium] 风场初始化失败:', error)
    }

    // 说明
    if (!windStore.windData) {
      const unwatch = watch(
        () => windStore.windData,
        (newData) => {
          if (newData) {
            unwatch();
            setupCameraHeightWatcher();
          }
        }
      );
    } else {
      setupCameraHeightWatcher();
    }

    // 说明
    try {
      setupCameraHeightWatcher()
      console.log('[Cesium] 相机高度监听设置完成')
    } catch (error) {
      console.warn('[Cesium] 相机高度监听设置失败:', error)
    }
  }


  /**
   * 功能说明
   */
  const setupReactiveWatchers = () => {
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

        const pointId = newArea.id || newArea.pointId || null
        if (pointId) {
          heatmapStore.setCurrentPointId(pointId)
        }

        if (!resources.value.heatMapManager) {
          return
        }

        const currentTime = viewer.value.clock.currentTime
        const jsDate = currentTime ? Cesium.JulianDate.toDate(currentTime) : new Date()

        // 桥接模式下由 createReactiveHeatmapBridge 统一负责 area/mode 的刷新，
        // 这里只同步 pointId，避免同一次区域切换触发两次接口调用。
        if (resources.value.heatMapBridge) return

        await updateHeatmapTime(jsDate)
      },
      { deep: true }
    )

    // 说明
    watch(
      () => heatmapStore.heatmapMode,
      async (newMode, oldMode) => {
        // 桥接内部已监听 heatmapMode 并刷新，避免重复请求
        if (newMode !== oldMode && resources.value.heatMapManager && !resources.value.heatMapBridge) {
          const currentTime = new Date()
          console.log('热力图模式切换:', newMode, currentTime)
          await updateHeatmapTime(currentTime)
        }
      }
    )

    // 说明
    watch(
      () => routeStore.currentRoute,
      (newRoute) => {
        if (newRoute && viewer.value) {
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
          // 说明
          setTimelineVisible(false)
        }
      }
    )

    // 说明
    watch(
      () => areaStore.areaList,
      (newAreas) => {
        if (newAreas && viewer.value && resources.value.areaManager) {
          resources.value.areaManager.render(newAreas)
        }
      },
      { deep: true }
    )

    // 说明
    resources.value.cameraPrintKeydownHandler = setupCameraPrintKeydown(viewer.value)
  }

  /**
   * 功能说明
   */
  const initCesium = async () => {
    try {
      isLoading.value = true
      console.log('[Cesium] 开始初始化 Cesium...')

      // 说明
      console.log('[Cesium] 1. 初始化 Viewer...')
      initViewer()
      
      console.log('[Cesium] 2. 配置相机...')
      configCamera()
      
      console.log('[Cesium] 3. 加载基础图层...')
      loadBaseLayers()
      
      console.log('[Cesium] 4. 加载 3D 模型...')
      await load3DModel()
      
      console.log('[Cesium] 5. 初始化实体与可视化...')
      await initEntitiesAndVisualizations()
      
      console.log('[Cesium] 6. 设置响应式监听...')
      setupReactiveWatchers()
      
      // 说明
      setTimelineVisible(false)
      
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

    if (viewer.value) {
      // 说明
      if (resources.value.skyBoxManager) {
        resources.value.skyBoxManager.destroy()
        resources.value.skyBoxManager = null
      }

      // 说明
      if (resources.value.cloud) {
        resources.value.cloud.destroy()
        resources.value.cloud = null
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
    if (resources.value.modelTileset) {
      resources.value.modelTileset.show = visible
    }
  };

  /**
   * 功能说明
   */
  const setWindVisibility = (visible) => {
    if (resources.value.windLayer) {
      // 说明
      layerSettingsStore.setLayerVisibility('wind', visible);

      // 说明
      updateWindVisibilityBasedOnConditions();
    }
  };


  /**
   * 功能说明
   */
  const updateWindVisibilityBasedOnConditions = () => {
    if (!resources.value.windLayer) return;

    // 说明
    const cameraPosition = viewer.value.camera.positionCartographic;
    const cameraHeight = cameraPosition.height;

    // 说明
    const isWindEnabled = layerSettingsStore.layers.wind.visible;

    // 说明

    // 说明
    const shouldBeVisible = isWindEnabled && cameraHeight <= CAMERA_HEIGHT_THRESHOLD;

    // 说明
    if (Array.isArray(resources.value.windLayer)) {
      resources.value.windLayer.forEach(layer => {
        layer.show = shouldBeVisible;
      });
    } else {
      resources.value.windLayer.show = shouldBeVisible;
    }
  };


  /**
   * 功能说明
   */
  const setAreasVisibility = (visible) => {
    if (resources.value.areaManager) {
      resources.value.areaManager.setAreasVisibility(visible)
    }
  };

  /**
   * 功能说明
   */
  const setTemperatureVisibility = (visible) => {
    console.log('设置温度图层可见性:', visible);
    if (resources.value.heatMapBridge) {
      resources.value.heatMapBridge.setVisible(visible)
      return
    }
    if (resources.value.heatMapManager) {
      resources.value.heatMapManager.setVisible(visible)
    }
  };

  /**
   * 功能说明
   */
  const setCloudVisibility = (visible) => {
    if (resources.value.cloud) {
      layerSettingsStore.setLayerVisibility('cloud', visible);
      console.log('设置云层可见性:', visible);
      resources.value.cloud.setVisible(visible);
    }
  };

  /**
   * 功能说明
   */
  const updateCloudVisibilityBasedOnConditions = () => {
    if (!resources.value.cloud) return;

    // 说明
    const cameraPosition = viewer.value.camera.positionCartographic;
    const cameraHeight = cameraPosition.height;

    // 说明
    const isCloudEnabled = layerSettingsStore.layers.cloud.visible;

    // 说明
    const shouldBeVisible = isCloudEnabled && cameraHeight <= CAMERA_HEIGHT_THRESHOLD;

    // 说明
    resources.value.cloud.setVisible(shouldBeVisible);
  };

  const updateHeatmapTime = async (time) => {

    if (!resources.value.heatMapManager) {
      console.error('[Heatmap] 热力图管理器尚未初始化')
      return
    }

    if (resources.value.heatMapBridge) {
      try {
        await resources.value.heatMapBridge.refresh(time)
      } catch (error) {
        console.error('[HeatmapBridge] 刷新失败', error)
      }
      return
    }

    try {
      let heatmapData = null

      if (heatmapStore.heatmapMode === 'citywide') {
        heatmapData = await getCitywideHeatmap()
      } else {
        const currentArea = areaStore.selectedArea
        console.log(currentArea);
        
        const pointId = heatmapStore.currentPointId || currentArea?.id || currentArea?.pointId
        if (!pointId) {
          return
        }

        heatmapData = await getWeatherHeatmapGeo({
          time,
          pointId
        })

        heatmapStore.setCurrentPointId(pointId)
      }
      heatmapStore.setHeatmapData(heatmapData)
      const visible = layerSettingsStore.layers.temperature?.visible !== false
      resources.value.heatMapManager.setData(heatmapData)
      resources.value.heatMapManager.setVisible(visible)
    } catch (error) {
      console.error('更新热力图失败:', error)
    }
  };
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
    // 说明
    flyToRegion: (region) => flyToRegion(viewer.value, region),
    flyToRectangle: (region) => flyToRectangle(viewer.value, region),
    getCurrentCameraParams: () => getCurrentCameraParams(viewer.value),
    // 说明
    switchToOverviewMode: () => switchToOverviewMode(viewer.value),
    switchToFocusMode: (region) => switchToFocusMode(viewer.value, region),
    // 说明
    setModelVisibility,
    setWindVisibility,
    setAreasVisibility,
    setTemperatureVisibility,
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




