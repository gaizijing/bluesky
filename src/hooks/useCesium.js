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
import { initHeatVolume } from '@/cesium/visualization/heatmap'
import { routeManager } from '@/cesium/entities/routes' // 引入航线管理器
import { useRouteStore } from '@/store/modules/routeStore'
import { addDistrictInfo, addBoundGeo } from '@/cesium/layers/district'
import eventManager from '@/cesium/core/eventManager' // 引入事件管理器
import { SkyBoxManager } from '@/cesium/volumeCloud/SkyBoxManager' // 引入天空盒管理器
import { CAMERA_HEIGHT_THRESHOLD } from '../config/windLayerDefaults'
import Cloud from '@/cesium/visualization/cloud'
import Atmosphere from '@/cesium/visualization/atmosphere'
import { useHeatmapStore } from '@/store/modules/heatmap'
export function useCesium(containerId) {
  // Store实例
  const windStore = useWindStore()
  const heatmapStore = useHeatmapStore()
  const areaStore = useAreaStore()
  const layerSettingsStore = useLayerSettingsStore()
  const routeStore = useRouteStore()
  const regionStore = useRegionStore()

  // 响应式状态
  const viewer = ref(null)
  const isLoading = ref(false)
  const errorMsg = ref('')

  // Cesium资源管理（统一使用ref或对象管理）
  const resources = ref({
    windLayer: null,
    tiandituLayer: null,
    districtPrimitive: null,
    modelTileset: null,
    heatMapInstance: null,
    areaManager: null,
    cameraMoveHandler: null,
    cameraHeightWatcher: null,
    skyBoxManager: null,
    cameraPrintKeydownHandler: null,
    cloud: null
  })

  // 监测点相关响应式数据
  const { areaList } = toRefs(areaStore)

  // 监听区域变化
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

  // ==================== 初始化步骤 ====================

  /**
   * 初始化Cesium Viewer
   */
  const initViewer = () => {
    try {
      console.log('[Cesium] 创建Viewer...')
      viewer.value = createViewer(containerId)
      viewer.value.cesiumWidget.creditContainer.style.display = 'none'
      
      // 设置为全局变量，供其他模块访问（如ISIM动画）
      window.viewer = viewer.value
      console.log('[Cesium] Viewer创建成功并设置为全局变量')
      
      console.log('[Cesium] 初始化天空盒...')
      try {
        resources.value.skyBoxManager = new SkyBoxManager(viewer.value, {
          cameraHeightThreshold: 240000
        })
        console.log('[Cesium] 天空盒初始化成功')
      } catch (skyError) {
        console.warn('[Cesium] 天空盒初始化失败:', skyError)
      }
      
      console.log('[Cesium] 初始化云层...')
      try {
        resources.value.cloud = new Cloud(viewer.value)
        resources.value.cloud.show()
        console.log('[Cesium] 云层初始化成功')
      } catch (cloudError) {
        console.warn('[Cesium] 云层初始化失败:', cloudError)
      }
      
      viewer.value.shadows = true;
      viewer.value.terrainShadows = Cesium.ShadowMode.ENABLED;
      console.log('[Cesium] Viewer配置完成')
    } catch (error) {
      console.error('[Cesium] initViewer失败:', error)
      throw error
    }
  }
  
  /**
   * 设置时钟参数
   * @param {Date|string} startTime - 起始时间
   * @param {Date|string} endTime - 终止时间
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
   * 控制时间线和动画面板显示/隐藏
   * @param {boolean} visible - 是否显示时间线和动画面板
   */
  const setTimelineVisible = (visible) => {
    if (viewer.value) {
      // 检查timeline是否存在，避免访问undefined属性
      if (viewer.value.timeline) {
        viewer.value.timeline.container.style.display = visible ? 'block' : 'none';
        
        // 当时间轴从隐藏变为显示时，重新设置时间范围并触发更新
        if (visible) {
          setTimeout(() => {
            try {
              // 获取当前时钟的时间范围
              const startTime = viewer.value.clock.startTime;
              const stopTime = viewer.value.clock.stopTime;
              
              // 验证时间参数有效性
              if (startTime && stopTime && 
                  Cesium.JulianDate.isValid(startTime) && 
                  Cesium.JulianDate.isValid(stopTime)) {
                // 重新设置时间轴的时间范围
                viewer.value.timeline.zoomTo(startTime, stopTime);
                console.log('时间轴zoomTo成功');
              } else {
                console.warn('无效的时间参数，跳过zoomTo');
                // 使用默认时间范围
                const now = new Date();
                const nowJulian = Cesium.JulianDate.fromDate(now);
                const oneHourLater = new Date(now.getTime() + 3600000);
                const oneHourLaterJulian = Cesium.JulianDate.fromDate(oneHourLater);
                
                viewer.value.clock.startTime = nowJulian;
                viewer.value.clock.stopTime = oneHourLaterJulian;
                viewer.value.clock.currentTime = nowJulian;
                viewer.value.timeline.zoomTo(nowJulian, oneHourLaterJulian);
              }
              
              // 触发场景重新渲染
              viewer.value.scene.requestRender();
            } catch (error) {
              console.error('设置时间轴范围失败:', error);
              // 使用默认时间范围作为 fallback
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
                console.error('fallback也失败:', fallbackError);
              }
            }
          }, 100);
        }
      }
      
      // 同时控制animation面板的显示和隐藏
      if (viewer.value.animation) {
        viewer.value.animation.container.style.display = visible ? 'block' : 'none';
      }
    }
  };

  /**
   * 配置按键盘移动相机控制
   */
  const configCamera = () => {
    resources.value.cameraMoveHandler = handleCameraMove(viewer.value)
  };

  /**
   * 设置相机高度监听，控制风场、云朵和监测点的显示/隐藏
   * 近地的时候显示风场和云朵，远地的时候显示area
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
          resources.value.cloud.show();
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
   * 加载基础图层
   */
  const loadBaseLayers = () => {
    try {
      console.log('[Cesium] 3.1 加载地形...')
      loadTerrain(viewer.value)
      console.log('[Cesium] 地形加载成功')
    } catch (error) {
      console.warn('[Cesium] 地形加载失败:', error)
    }
    
    try {
      console.log('[Cesium] 3.2 加载天地图...')
      resources.value.tiandituLayer = addTiandituLayer(viewer.value)
      console.log('[Cesium] 天地图加载成功')
    } catch (error) {
      console.warn('[Cesium] 天地图加载失败:', error)
    }

  }

  /**
   * 加载3D模型
   */
  const load3DModel = async () => {
    try {
      console.log('[Cesium] 4.1 加载白膜模型...')
      resources.value.modelTileset = await addWhiteModel(viewer.value)
      console.log('[Cesium] 白膜模型加载成功')
    } catch (error) {
      console.warn('[Cesium] 白膜模型加载失败:', error)
      // 模型加载失败不影响其他功能
    }
  }

  /**
   * 初始化实体和可视化
   */
  const initEntitiesAndVisualizations = async () => {
    try {
      console.log('[Cesium] 5.1 初始化监测点管理器...')
      resources.value.areaManager = AreaManager.getInstance(viewer.value, areaStore)
      console.log('[Cesium] 5.2 渲染监测点:', areaList.value?.length || 0, '个')
      resources.value.areaManager.render(areaList.value)
    } catch (error) {
      console.warn('[Cesium] 监测点管理器初始化失败:', error)
    }

    try {
      console.log('[Cesium] 5.3 初始化风场...')
      resources.value.windLayer = await initWind(viewer.value, layerSettingsStore)
      console.log('[Cesium] 风场初始化成功')
    } catch (error) {
      console.warn('[Cesium] 风场初始化失败:', error)
    }

    // 等待风场数据加载完成后再执行可见性检查
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

    // 设置相机高度监听，控制风场、云朵和监测点的显示/隐藏
    try {
      setupCameraHeightWatcher()
      console.log('[Cesium] 相机高度监听设置成功')
    } catch (error) {
      console.warn('[Cesium] 相机高度监听设置失败:', error)
    }

    try {
      console.log('[Cesium] 5.4 初始化热力图...')
      resources.value.heatMapInstance = await initHeatVolume(viewer.value)
      heatmapStore.setHeatmapLayer(resources.value.heatMapInstance)
      console.log('[Cesium] 热力图初始化成功')
      
      // 初始化后立即更新一次热力图数据
      if (resources.value.heatMapInstance) {
        const currentTime = new Date()
        console.log('初始化后更新热力图数据:', currentTime)
        await updateHeatmapTime(currentTime)
        
        // 检查是否有选中的区域，如果有，记录信息
        if (areaStore.selectedArea) {
          console.log('热力图初始化时已有选中区域:', areaStore.selectedArea.id)
        }
      }
    } catch (error) {
      console.warn('[Cesium] 热力图初始化失败:', error)
    }

    try {
      console.log('[Cesium] 5.5 初始化航线管理器...')
      routeManager.init(viewer.value)
      console.log('[Cesium] 航线管理器初始化成功')
    } catch (error) {
      console.warn('[Cesium] 航线管理器初始化失败:', error)
    }
    
    // 配置时间轴显示中国时间
    if (viewer.value.timeline) {
      // 调整时间轴容器宽度，确保文字能完全显示
      const timelineContainer = viewer.value.timeline.container;
      if (timelineContainer) {
        // timelineContainer.style.width = '100%';
        // timelineContainer.style.minWidth = '600px';
      }
      
      // 自定义时间轴标签格式器，显示中国标准时间（使用更紧凑的格式）
      viewer.value.timeline.makeLabel = function(date) {
        // 创建一个新的Date对象，避免修改原日期
        const chinaDate = new Date(date);
        
        // 添加8小时时区偏移，转换为中国标准时间
        // chinaDate.setHours(chinaDate.getHours() + 8);
        
        // 使用更紧凑的时间格式，避免文字被截断
        const month = String(chinaDate.getMonth() + 1).padStart(2, '0');
        const day = String(chinaDate.getDate()).padStart(2, '0');
        const hours = String(chinaDate.getHours()).padStart(2, '0');
        const minutes = String(chinaDate.getMinutes()).padStart(2, '0');
        
        return `${month}-${day} ${hours}:${minutes}`;
      };
    }
    
    // 添加时钟变化事件监听
    viewer.value.clock.onTick.addEventListener(() => {
      if (!viewer.value.clock.currentTime) return;
      const currentTime = Cesium.JulianDate.toDate(viewer.value.clock.currentTime);
      
      if (!currentTime) return;
      
      // 更新热力图数据
      if (resources.value.heatMapInstance && resources.value.heatMapInstance.heatmapState) {
        if (typeof resources.value.heatMapInstance.heatmapState.heatmapPrimitive.updateHeatmapTime === 'function') {
          resources.value.heatMapInstance.heatmapState.heatmapPrimitive.updateHeatmapTime(currentTime);
        }
      }
      
      // 更新航线分析数据（根据时间偏移量）
      if (routeStore.currentRoute) {
        const timeOffset = Math.floor((currentTime - new Date()) / 1000);
        eventManager.emit('timeChange', { time: currentTime, timeOffset });
      }
    });
    
    // 添加时间轴拖动事件监听（用于手动拖动时间轴时）
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
  }


  /**
   * 设置响应式监听
   */
  const setupReactiveWatchers = () => {
    // 监听选中监测点变化
    watch(
      () => areaStore.selectedArea,
      async (newArea) => {
        if (newArea && viewer.value) {
          resources.value.areaManager.setSelected(`area_${newArea.id}`)
          flyToRegion(viewer.value, { bbox: newArea.bbox, duration: 1.0 })
          
          // 区域切换时重新加载热力图数据
          if (resources.value.heatMapInstance) {
            const currentTime = new Date()
            console.log('区域切换，重新加载热力图数据:', newArea.name, currentTime)
            await updateHeatmapTime(currentTime)
          }
        }
      },
      { deep: true }
    )

    // 监听当前航线变化
    watch(
      () => routeStore.currentRoute,
      (newRoute) => {
        if (newRoute && viewer.value) {
          // 检查新航线是否包含起始时间和终止时间
          if (newRoute.startTime && newRoute.endTime) {
            // 先设置时钟参数            
            setClockParams(newRoute.startTime, newRoute.endTime)
            // 再渲染航线
            routeManager.render(newRoute)
            // 显示时间线
            setTimelineVisible(true)
          } else {
            // 没有时间信息时也渲染航线
            routeManager.render(newRoute)
            // 隐藏时间线
            setTimelineVisible(false)
          }
        } else {
          // 没有航线时，隐藏时间线
          setTimelineVisible(false)
        }
      }
    )

    // 监听监测点列表变化
    watch(
      () => areaStore.areaList,
      (newAreas) => {
        if (newAreas && viewer.value && resources.value.areaManager) {
          resources.value.areaManager.render(newAreas)
        }
      },
      { deep: true }
    )

    // 键盘事件监听 - 按P键打印相机参数
    resources.value.cameraPrintKeydownHandler = setupCameraPrintKeydown(viewer.value)
  }

  /**
   * 初始化Cesium主流程
   */
  const initCesium = async () => {
    try {
      isLoading.value = true
      console.log('[Cesium] 开始初始化...')

      // 执行初始化步骤
      console.log('[Cesium] 1. 初始化Viewer...')
      initViewer()
      
      console.log('[Cesium] 2. 配置相机...')
      configCamera()
      
      console.log('[Cesium] 3. 加载基础图层...')
      loadBaseLayers()
      
      console.log('[Cesium] 4. 加载3D模型...')
      await load3DModel()
      
      console.log('[Cesium] 5. 初始化实体和可视化...')
      await initEntitiesAndVisualizations()
      
      console.log('[Cesium] 6. 设置响应式监听...')
      setupReactiveWatchers()
      
      // 系统初始化时默认隐藏时间轴
      setTimelineVisible(false)
      
      console.log('[Cesium] 初始化完成！')

    } catch (error) {
      console.error('[Cesium] 初始化失败:', error)
      console.error('[Cesium] 错误堆栈:', error.stack)
      throw error
    } finally {
      isLoading.value = false
    }
  }

  /**
   * 清理Cesium资源
   */
  const cleanup = () => {
    console.log('开始清理Cesium资源...')

    // 移除键盘事件监听
    if (resources.value.cameraPrintKeydownHandler) {
      document.removeEventListener('keydown', resources.value.cameraPrintKeydownHandler)
      resources.value.cameraPrintKeydownHandler = null
    }

    // 移除相机移动事件监听
    if (resources.value.cameraMoveHandler) {
      document.removeEventListener('keydown', resources.value.cameraMoveHandler)
      resources.value.cameraMoveHandler = null
    }

    // 移除相机高度监听（用于风场可见性控制）
    if (resources.value.cameraHeightWatcher) {
      resources.value.cameraHeightWatcher()
      resources.value.cameraHeightWatcher = null
    }

    if (viewer.value) {
      // 清理天空盒管理器
      if (resources.value.skyBoxManager) {
        resources.value.skyBoxManager.destroy()
        resources.value.skyBoxManager = null
      }

      // 清理云层
      if (resources.value.cloud) {
        resources.value.cloud.destroy()
        resources.value.cloud = null
      }

      // 清理航线
      routeManager.destroy()

      // 清理监测点
      if (resources.value.areaManager) {
        resources.value.areaManager.destroy()
        resources.value.areaManager = null
      }

      // 清理热力图
      if (resources.value.heatMapInstance) {
        resources.value.heatMapInstance.destroy()
        resources.value.heatMapInstance = null
      }

      // 清理风场
      if (resources.value.windLayer) {
        // Support both single wind layer and array of wind layers
        if (Array.isArray(resources.value.windLayer)) {
          // Check if the array has a destroy method (custom implementation)
          if (typeof resources.value.windLayer.destroy === 'function') {
            resources.value.windLayer.destroy();
          } else {
            // Fallback to individual layer cleanup
            resources.value.windLayer.forEach(layer => {
              layer.destroy();
            });
          }
        } else {
          resources.value.windLayer.destroy();
        }
        resources.value.windLayer = null;
      }

      // 销毁Viewer
      destroyViewer(viewer.value)
      
      // 移除全局viewer引用
      if (window.viewer === viewer.value) {
        delete window.viewer
      }
      
      viewer.value = null
    }
  }


  // ==================== 图层控制 ====================
  /**
   * 设置模型图层可见性
   */
  const setModelVisibility = (visible) => {
    if (resources.value.modelTileset) {
      resources.value.modelTileset.show = visible
    }
  };

  /**
   * 设置风场图层可见性
   */
  const setWindVisibility = (visible) => {
    if (resources.value.windLayer) {
      // Store the wind layer visibility state in layerSettingsStore
      layerSettingsStore.setLayerVisibility('wind', visible);

      // Update wind layer visibility considering both camera height and visibility setting
      updateWindVisibilityBasedOnConditions();
    }
  };


  /**
   * Update wind visibility based on both camera height and visibility setting
   */
  const updateWindVisibilityBasedOnConditions = () => {
    if (!resources.value.windLayer) return;

    // Get current camera height
    const cameraPosition = viewer.value.camera.positionCartographic;
    const cameraHeight = cameraPosition.height;

    // Get visibility setting from store
    const isWindEnabled = layerSettingsStore.layers.wind.visible;

    // Define camera height threshold for wind field visibility

    // Determine final visibility based on both conditions
    const shouldBeVisible = isWindEnabled && cameraHeight <= CAMERA_HEIGHT_THRESHOLD;

    // Update visibility for all wind layers
    if (Array.isArray(resources.value.windLayer)) {
      resources.value.windLayer.forEach(layer => {
        layer.show = shouldBeVisible;
      });
    } else {
      resources.value.windLayer.show = shouldBeVisible;
    }
  };


  /**
   * 设置监测点图层可见性
   */
  const setAreasVisibility = (visible) => {
    if (resources.value.areaManager) {
      resources.value.areaManager.setAreasVisibility(visible)
    }
  };

  /**
   * 设置温度图层可见性
   */
  const setTemperatureVisibility = (visible) => {
    console.log('设置温度图层可见性:', visible);
    console.log('热力图实例:', resources.value.heatMapInstance);

    if (resources.value.heatMapInstance) {
      if (resources.value.heatMapInstance.heatmapState && resources.value.heatMapInstance.heatmapState.heatmapPrimitive) {
        resources.value.heatMapInstance.heatmapState.heatmapPrimitive.show = visible
      } else {
        console.warn('热力图实例存在但heatmapState或heatmapPrimitive不存在');
      }
    } else {
      console.warn('热力图实例未初始化');
    }
  };

  /**
   * 更新热力图时间
   * @param {Date} time - JavaScript Date对象
   */
  /**
   * 转换后端热力图数据为Cesium需要的格式
   * @param {Object} backendData - 后端返回的热力图数据
   * @param {Object} currentArea - 当前选中的区域
   * @returns {Array} Cesium热力图数据点数组
   */
  const convertHeatmapDataForCesium = (backendData, currentArea) => {
    const dataPoints = []
    
    // 检查数据类型
    const dataType = backendData.dataType || 'point_heatmap'
    
    console.log('转换热力图数据，数据类型:', dataType)
    
    if (dataType === 'geo_heatmap' || backendData.points) {
      // 地理空间热力图数据（Cesium地图用）
      return convertGeoHeatmapData(backendData, currentArea)
    } else if (dataType === 'area_heatmap' || backendData.gridData) {
      // 区域范围热力图数据
      return convertAreaHeatmapData(backendData, currentArea)
    } else {
      // 单点热力图数据（保持原有逻辑）
      return convertPointHeatmapData(backendData, currentArea)
    }
  }

  /**
   * 转换地理空间热力图数据（Cesium地图用）
   */
  const convertGeoHeatmapData = (backendData, currentArea) => {
    const dataPoints = []
    
    const points = backendData.points || []
    
    console.log('转换地理空间热力图数据，点数量:', points.length)
    
    for (const point of points) {
      const lng = point.lon || point.lng
      const lat = point.lat
      const value = point.value
      const riskLevel = point.riskLevel
      
      if (lng !== undefined && lat !== undefined && value !== undefined) {
        // 转换为Cesium需要的格式
        dataPoints.push({
          x: lng,
          y: lat,
          value: value,
          // 添加元数据
          metadata: {
            riskLevel: riskLevel || getRiskLevel(value),
            gridX: point.x,
            gridY: point.y,
            dataType: 'geo_heatmap'
          }
        })
      } else {
        console.warn('无效的点数据:', point)
      }
    }
    
    console.log('转换完成，Cesium数据点数量:', dataPoints.length)
    if (dataPoints.length > 0) {
      console.log('数据范围:', {
        minLng: Math.min(...dataPoints.map(p => p.x)),
        maxLng: Math.max(...dataPoints.map(p => p.x)),
        minLat: Math.min(...dataPoints.map(p => p.y)),
        maxLat: Math.max(...dataPoints.map(p => p.y)),
        minValue: Math.min(...dataPoints.map(p => p.value)),
        maxValue: Math.max(...dataPoints.map(p => p.value))
      })
    }
    
    return dataPoints
  }

  /**
   * 转换区域范围热力图数据
   */
  const convertAreaHeatmapData = (backendData, currentArea) => {
    const dataPoints = []
    
    const gridData = backendData.gridData || []
    const times = backendData.times || []
    
    // 获取当前时间索引（默认使用第一个时间点）
    const currentTimeIndex = 0
    
    for (const gridPoint of gridData) {
      const lng = gridPoint.lng
      const lat = gridPoint.lat
      const riskData = gridPoint.riskData || {}
      const timeSeries = riskData.timeSeries || []
      
      // 获取当前时间的风险值
      let riskValue = 50 // 默认值
      if (timeSeries.length > currentTimeIndex) {
        riskValue = timeSeries[currentTimeIndex]
      } else if (timeSeries.length > 0) {
        riskValue = timeSeries[0]
      }
      
      // 转换为Cesium需要的格式
      dataPoints.push({
        x: lng,
        y: lat,
        value: riskValue,
        // 添加元数据
        metadata: {
          gridX: gridPoint.x,
          gridY: gridPoint.y,
          time: times[currentTimeIndex] || '当前',
          riskLevel: getRiskLevel(riskValue),
          dataType: 'area_heatmap'
        }
      })
    }
    
    console.log(`转换区域热力图数据: ${gridData.length}个网格点`)
    return dataPoints
  }

  /**
   * 转换单点热力图数据
   */
  const convertPointHeatmapData = (backendData, currentArea) => {
    const dataPoints = []
    
    // 从后端数据中提取热力图矩阵
    const times = backendData.times || []
    const heights = backendData.heights || []
    const riskMatrix = backendData.data || []
    
    // 获取区域边界
    let bbox = null
    
    // 首先尝试从bbox获取边界
    if (currentArea.bbox) {
      let bboxValue = currentArea.bbox
      
      // 处理字符串格式的bbox
      if (typeof bboxValue === 'string') {
        // 尝试解析字符串格式的坐标
        const coordinates = bboxValue.split(',').map(coord => parseFloat(coord.trim())).filter(coord => !isNaN(coord))
        if (coordinates.length >= 2) {
          bboxValue = coordinates
        }
      }
      
      if (Array.isArray(bboxValue)) {
        if (bboxValue.length >= 4) {
          // bbox是边界框格式 [minLng, minLat, maxLng, maxLat]
          bbox = bboxValue
        } else if (bboxValue.length >= 2) {
          // bbox是点坐标格式 [lng, lat]
          const [lng, lat] = bboxValue
          if (!isNaN(lng) && !isNaN(lat)) {
            bbox = [
              lng - 0.01, lat - 0.01,
              lng + 0.01, lat + 0.01
            ]
          }
        }
      }
    }
    
    // 使用默认边界
    if (!bbox) {
      bbox = [
        currentArea.longitude - 0.01, currentArea.latitude - 0.01,
        currentArea.longitude + 0.01, currentArea.latitude + 0.01
      ]
    }
    
    // 解析边界框
    const [minLng, minLat, maxLng, maxLat] = bbox
    
    // 生成网格点
    const gridSize = 10 // 10x10网格
    for (let i = 0; i < gridSize; i++) {
      for (let j = 0; j < gridSize; j++) {
        // 计算网格点坐标
        const lng = minLng + (maxLng - minLng) * (i / (gridSize - 1))
        const lat = minLat + (maxLat - minLat) * (j / (gridSize - 1))
        
        // 根据位置计算风险值（模拟空间分布）
        const xRatio = i / (gridSize - 1)
        const yRatio = j / (gridSize - 1)
        
        // 从风险矩阵中获取对应的风险值
        let riskValue = 50 // 默认值
        
        if (riskMatrix.length > 0) {
          // 使用高度层和时间点的平均值
          const heightIndex = Math.floor(yRatio * (heights.length - 1))
          const timeIndex = Math.floor(xRatio * (times.length - 1))
          
          if (heightIndex >= 0 && heightIndex < riskMatrix.length &&
              timeIndex >= 0 && timeIndex < riskMatrix[0].length) {
            riskValue = riskMatrix[heightIndex][timeIndex]
          }
        }
        
        // 转换为Cesium需要的格式
        dataPoints.push({
          x: lng,
          y: lat,
          value: riskValue,
          // 添加元数据
          metadata: {
            height: heights[Math.floor(yRatio * (heights.length - 1))] || 0,
            time: times[Math.floor(xRatio * (times.length - 1))] || '当前',
            riskLevel: getRiskLevel(riskValue),
            dataType: 'point_heatmap'
          }
        })
      }
    }
    
    return dataPoints
  }

  /**
   * 根据风险值获取风险等级
   * @param {number} riskValue - 风险值 (0-100)
   * @returns {string} 风险等级
   */
  const getRiskLevel = (riskValue) => {
    if (riskValue >= 80) return 'high'
    if (riskValue >= 60) return 'medium'
    if (riskValue >= 40) return 'low'
    return 'very_low'
  }

   const updateHeatmapTime = async (time) => {
    console.log('更新热力图时间:', time)

    if (!resources.value.heatMapInstance) {
      console.error('热力图实例未初始化')
      return
    }

    try {
      // 获取当前选中的区域
      const currentArea = areaStore.selectedArea
      if (!currentArea) {
        console.warn('未选中任何区域，无法获取热力图数据')
        return
      }

      
      // 检查是否有边界信息
      let boundsToUse = null
      
      // 首先尝试从bbox获取边界
      if (currentArea.bbox) {
        let bboxValue = currentArea.bbox
        
        // 处理字符串格式的bbox
        if (typeof bboxValue === 'string') {
          // 尝试解析字符串格式的坐标
          const coordinates = bboxValue.split(',').map(coord => parseFloat(coord.trim())).filter(coord => !isNaN(coord))
          if (coordinates.length >= 2) {
            bboxValue = coordinates
            console.log('解析字符串bbox为坐标数组:', bboxValue)
          }
        }
        
        if (Array.isArray(bboxValue)) {
          if (bboxValue.length >= 4) {
            // bbox是边界框格式 [minLng, minLat, maxLng, maxLat]
            boundsToUse = bboxValue
            console.log('使用bbox属性作为边界框:', boundsToUse)
          } else if (bboxValue.length >= 2) {
            // bbox是点坐标格式 [lng, lat]
            const [lng, lat] = bboxValue
            if (!isNaN(lng) && !isNaN(lat)) {
              boundsToUse = [
                lng - 0.01, lat - 0.01,
                lng + 0.01, lat + 0.01
              ]
              console.log('使用bbox点坐标生成边界:', boundsToUse)
            }
          }
        }
      }
      // 然后尝试从bounds获取
      else if (currentArea.bounds) {
        let boundsValue = currentArea.bounds
        
        // 处理字符串格式的bounds
        if (typeof boundsValue === 'string') {
          // 尝试解析字符串格式的坐标
          const coordinates = boundsValue.split(',').map(coord => parseFloat(coord.trim())).filter(coord => !isNaN(coord))
          if (coordinates.length >= 2) {
            boundsValue = coordinates
            console.log('解析字符串bounds为坐标数组:', boundsValue)
          }
        }
        
        if (Array.isArray(boundsValue)) {
          if (boundsValue.length >= 4) {
            // bounds是边界框格式 [minLng, minLat, maxLng, maxLat]
            boundsToUse = boundsValue
            console.log('使用bounds属性作为边界框:', boundsToUse)
          } else if (boundsValue.length >= 2) {
            // bounds是点坐标格式 [lng, lat]
            const [lng, lat] = boundsValue
            if (!isNaN(lng) && !isNaN(lat)) {
              boundsToUse = [
                lng - 0.01, lat - 0.01,
                lng + 0.01, lat + 0.01
              ]
              console.log('使用bounds点坐标生成边界:', boundsToUse)
            }
          }
        }
      }
      // 然后尝试从coordinates获取（可能是边界框或点坐标）
      else if (currentArea.coordinates) {
        let coordinatesValue = currentArea.coordinates
        
        // 处理字符串格式的coordinates
        if (typeof coordinatesValue === 'string') {
          // 尝试解析字符串格式的坐标
          const coordinates = coordinatesValue.split(',').map(coord => parseFloat(coord.trim())).filter(coord => !isNaN(coord))
          if (coordinates.length >= 2) {
            coordinatesValue = coordinates
            console.log('解析字符串coordinates为坐标数组:', coordinatesValue)
          }
        }
        
        if (Array.isArray(coordinatesValue)) {
          if (coordinatesValue.length >= 4) {
            // coordinates是边界框格式 [minLng, minLat, maxLng, maxLat]
            boundsToUse = coordinatesValue
            console.log('使用coordinates属性作为边界框:', boundsToUse)
          } else if (coordinatesValue.length >= 2) {
            // coordinates是点坐标格式 [lng, lat]
            const [lng, lat] = coordinatesValue
            if (!isNaN(lng) && !isNaN(lat)) {
              boundsToUse = [
                lng - 0.01, lat - 0.01,
                lng + 0.01, lat + 0.01
              ]
              console.log('使用coordinates点坐标生成边界:', boundsToUse)
            }
          }
        }
      }
      
      // 如果还没有边界，尝试从其他属性提取
      if (!boundsToUse) {
        console.warn('区域没有直接的边界信息，尝试从其他属性提取')
        
        // 尝试提取经纬度
        let lng, lat
        
        // 1. 从longitude/latitude字段
        if (currentArea.longitude !== undefined && currentArea.latitude !== undefined) {
          lng = currentArea.longitude
          lat = currentArea.latitude
          console.log('使用longitude/latitude字段:', lng, lat)
        }
        // 2. 从coordinates点坐标
        else if (currentArea.coordinates && Array.isArray(currentArea.coordinates) && currentArea.coordinates.length >= 2) {
          [lng, lat] = currentArea.coordinates
          console.log('从coordinates提取经纬度:', lng, lat)
        }
        // 3. 从bbox中心点计算
        else if (currentArea.bbox && Array.isArray(currentArea.bbox) && currentArea.bbox.length >= 4) {
          lng = (currentArea.bbox[0] + currentArea.bbox[2]) / 2
          lat = (currentArea.bbox[1] + currentArea.bbox[3]) / 2
          console.log('从bbox计算中心点:', lng, lat)
        }
        
        if (lng !== undefined && lat !== undefined) {
          boundsToUse = [
            lng - 0.01, lat - 0.01,
            lng + 0.01, lat + 0.01
          ]
          console.log('使用计算得到的边界:', boundsToUse)
        } else {
          console.error('无法从区域数据中提取边界信息，使用默认边界')
          // 使用青岛的默认边界
          boundsToUse = [120.3, 36.0, 120.5, 36.2]
          console.log('使用默认边界:', boundsToUse)
        }
      }

      // 调用后端API获取地理空间热力图数据（用于Cesium地图）
      const { getWeatherHeatmapGeo } = await import('@/api')
      
      const apiParams = {
        time: time,
        resolution: 'medium',
        pointId: currentArea.id || currentArea.pointId
      }
      
      const heatmapData = await getWeatherHeatmapGeo(apiParams)
      
      // 处理数据格式：可能points在heatmapData.data中，也可能在顶层
      let heatmapDataToConvert = heatmapData
      if (heatmapData.data && (heatmapData.data.points || heatmapData.data.dataType)) {
        heatmapDataToConvert = heatmapData.data
      }
      
      if (!heatmapDataToConvert || !heatmapDataToConvert.points) {
        console.error('获取热力图数据失败，缺少points属性')
        return
      }

      // 转换后端数据为Cesium热力图需要的格式
      const convertedData = convertHeatmapDataForCesium(heatmapDataToConvert, currentArea)
      
      // 转换为heatmap.js期望的格式：{lnglat: [lon, lat], value: number}
      const dataPoints = convertedData.map(point => ({
        lnglat: [point.x, point.y],
        value: point.value
      }))
      
      console.log('数据点范围:', {
        minLng: Math.min(...dataPoints.map(p => p.lnglat[0])),
        maxLng: Math.max(...dataPoints.map(p => p.lnglat[0])),
        minLat: Math.min(...dataPoints.map(p => p.lnglat[1])),
        maxLat: Math.max(...dataPoints.map(p => p.lnglat[1]))
      })
      
      // 更新热力图数据
      const result = resources.value.heatMapInstance.updateData(dataPoints)
      
      // 如果updateData返回了新的实例，更新引用
      if (result) {
        resources.value.heatMapInstance = result
      }

      console.log('热力图数据更新成功，基于区域:', currentArea.name)
      console.log('区域边界:', boundsToUse)
      
    } catch (error) {
      console.error('更新热力图时间失败:', error)
      // 降级：使用模拟数据
      try {
        const timestamp = time.getTime()
        const { default: generateHeatmapData } = await import('@/mock/heatmapData')
        const dataPoints = generateHeatmapData(timestamp)
        const result = resources.value.heatMapInstance.updateData(dataPoints)
        if (result) {
          resources.value.heatMapInstance = result
        }
        console.warn('使用模拟数据作为降级方案')
      } catch (fallbackError) {
        console.error('降级方案也失败:', fallbackError)
      }
    }
  };
  /**
   * 设置当前时间
   * @param {Date} time - JavaScript Date对象
   */
  const setCurrentTime = (time) => {
    if (viewer.value) {
      const julianDate = Cesium.JulianDate.fromDate(time)
      viewer.value.clock.currentTime = julianDate
    }
  };

  // 矩形绘制功能
  const startRectangleDrawing = (callback) => {
    eventManager.startRectangleDrawing(callback);
  };

  const stopRectangleDrawing = () => {
    eventManager.stopRectangleDrawing();
  };

  const cancelRectangleDrawing = () => {
    eventManager.cancelRectangleDrawing();
  };

  // 暴露公共方法
  return {
    viewer,
    isLoading,
    errorMsg,
    initCesium,
    cleanup,
    // 相机控制
    flyToRegion: (region) => flyToRegion(viewer.value, region),
    flyToRectangle: (region) => flyToRectangle(viewer.value, region),
    getCurrentCameraParams: () => getCurrentCameraParams(viewer.value),
    // 模式切换
    switchToOverviewMode: () => switchToOverviewMode(viewer.value),
    switchToFocusMode: (region) => switchToFocusMode(viewer.value, region),
    // 图层控制
    setModelVisibility,
    setWindVisibility,
    setAreasVisibility,
    setTemperatureVisibility,
    // 可视化更新
    updateHeatmapTime,
    // 时间控制
    setCurrentTime,
    setClockParams,
    setTimelineVisible,
    // 矩形绘制
    startRectangleDrawing,
    stopRectangleDrawing,
    cancelRectangleDrawing,
    // 天空盒控制
    getSkyBoxManager: () => resources.value.skyBoxManager
  }
}