import { onMounted, ref, onUnmounted } from 'vue'
import * as Cesium from 'cesium'

export function useCesium(containerId) {
  const viewer = ref(null)
  const isLoading = ref(false)
  const errorMsg = ref('')
  let glbModelEntity = null

  const initViewer = async () => {
    try {
      isLoading.value = true
      
      const options = {
        homeButton: false,
        sceneModePicker: false,
        baseLayerPicker: false,
        navigationHelpButton: false,
        geocoder: false,
        timeline: false,
        animation: false,
        fullscreenButton: false,
        infoBox: false,
        selectionIndicator: false,
        // 禁用可能导致着色器问题的高级功能
        contextOptions: {
          webgl: {
            alpha: true,
            antialias: true,
            preserveDrawingBuffer: true,
            failIfMajorPerformanceCaveat: false
          }
        }
      }
      
      viewer.value = new Cesium.Viewer(containerId, options)
      viewer.value.cesiumWidget.creditContainer.style.display = 'none'
      
      // 添加红色标记点
      const position = Cesium.Cartesian3.fromDegrees(120.37, 36.0, 300)
      viewer.value.entities.add({
        position: position,
        point: {
          pixelSize: 15,
          color: Cesium.Color.RED
        },
        label: {
          text: '模型位置',
          font: '14pt monospace',
          fillColor: Cesium.Color.YELLOW,
          outlineColor: Cesium.Color.BLACK,
          outlineWidth: 2,
          verticalOrigin: Cesium.VerticalOrigin.BOTTOM
        }
      })
      
      // 飞行到标记点
      viewer.value.camera.flyTo({
        destination: Cesium.Cartesian3.add(
          position,
          new Cesium.Cartesian3(0, 0, 500),
          new Cesium.Cartesian3()
        ),
        duration: 2
      })
      
      // 延迟加载模型，简化配置避免着色器问题
      setTimeout(() => {
        console.log('开始加载模型...')
        loadGLBModel('/cesium/data/LAOSHAN.glb', {
          scale: 0.1, // 减小模型大小
          position: [120.37, 36.0, 0],
          debugShowBoundingVolume: false // 禁用调试边界框
        }).then(entity => {
          if (entity) {
            console.log('模型加载流程完成')
          } else {
            console.warn('模型加载流程未能完成')
          }
        })
      }, 3000)
      
    } catch (err) {
      console.error('Cesium初始化失败:', err)
    } finally {
      isLoading.value = false
    }
  }

  const loadGLBModel = async (modelUrl, options = {}) => {
    try {
      if (!viewer.value) {
        console.error('Cesium viewer 尚未初始化')
        return null
      }
      
      // 为避免着色器编译错误，添加WebGL上下文监测
      if (!Cesium.defined(viewer.value.scene.context)) {
        console.error('WebGL上下文未就绪')
        return null
      }
      
      const defaultOptions = {
        position: [120.37, 36.0, 0], // 降低高度到地面
        scale: 0.1,
        color: Cesium.Color.WHITE
      }
      
      const config = { ...defaultOptions, ...options }
      const position = Cesium.Cartesian3.fromDegrees(
        config.position[0],
        config.position[1],
        config.position[2]
      )
      const orientation = Cesium.Transforms.headingPitchRollQuaternion(
        position,
        new Cesium.HeadingPitchRoll(0, 0, 0)
      )
      
      // 移除旧模型
      if (glbModelEntity) {
        viewer.value.entities.remove(glbModelEntity)
      }
      
      // 简化模型配置，避免着色器问题
      glbModelEntity = viewer.value.entities.add({
        position,
        orientation,
        model: {
          uri: modelUrl,
          scale: config.scale,
          debugShowBoundingVolume: false,
          // 关键配置：使用最简单的材质模式
          colorBlendMode: Cesium.ColorBlendMode.REPLACE,
          color: Cesium.Color.WHITE,
          // 禁用可能导致问题的高级渲染特性
          runAnimations: false,
          show: true,
          // 添加错误处理的超时保护
          maximumScreenSpaceError: 16, // 降低细节以提高性能
          cullWithChildrenBounds: true
        }
      })
      
      // 添加更强健的错误处理
      try {
        if (glbModelEntity.model && glbModelEntity.model.readyPromise) {
          // 添加超时处理
          const timeoutPromise = new Promise((_, reject) => {
            setTimeout(() => reject(new Error('模型加载超时')), 10000)
          })
          
          await Promise.race([glbModelEntity.model.readyPromise, timeoutPromise])
          console.log('模型加载成功！')
        }
      } catch (modelError) {
        console.error('模型加载过程出错:', modelError)
        // 如果模型加载失败，尝试移除它以避免残留问题
        if (glbModelEntity && viewer.value) {
          viewer.value.entities.remove(glbModelEntity)
          glbModelEntity = null
        }
        return null
      }
      
      return glbModelEntity
    } catch (error) {
      console.error('加载模型异常:', error)
      // 记录详细的错误信息
      if (error.name === 'RuntimeError' && error.message.includes('shader')) {
        console.error('检测到着色器编译错误，这通常是由于模型材质或Cesium配置问题导致')
        // 可以在这里添加用户友好的错误提示
      }
      return null
    }
  }

  onMounted(() => {
    initViewer()
  })

  onUnmounted(() => {
    if (viewer.value) {
      viewer.value.destroy()
      viewer.value = null
    }
  })

  return {
    viewer,
    isLoading,
    errorMsg,
    loadGLBModel
  }
}