import * as Cesium from 'cesium'
import { useWeatherStore } from '@/store/modules/weather'

export const loadTerrain = async (viewerInstance) => {
  try {
    // 启用更详细的地形加载，包括水面遮罩和法线（用于更好的光照效果）
    const terrainProvider = await Cesium.CesiumTerrainProvider.fromUrl("https://data.mars3d.cn/terrain", {
      requestWaterMask: true,
      requestVertexNormals: true,
    })
    viewerInstance.terrainProvider = terrainProvider
    viewerInstance.scene.globe.enableLighting = true
    viewerInstance.scene.skyAtmosphere.show = true

    // 添加地形夸张设置，增强地形特征显示（在气象应用中很有用）
    viewerInstance.scene.globe.terrainExaggeration = 1.5  // 地形高度夸张1.5倍

    // 确保相机考虑地形高度
     viewerInstance.scene.globe.depthTestAgainstTerrain = false
     const weatherStore = useWeatherStore()

    // ==================== 添加高度雾效果 ====================
    // 关闭Cesium内置雾
    viewerInstance.scene.fog.enabled = true

  //   // 高度雾片段着色器 - 优化版本
  //   const fs = `
  //     #version 300 es
  //       precision highp float;
        
  //       uniform sampler2D colorTexture;
  //       uniform sampler2D depthTexture;
  //       in vec2 v_textureCoordinates;
        
  //       // 自定义uniform参数
  //       uniform float u_earthRadiusOnCamera;  // 相机位置的地球半径
  //       uniform float u_cameraHeight;         // 相机高度
  //       uniform float u_fogHeight;            // 雾的最大高度
  //       uniform float u_globalDensity;        // 全局雾密度
  //       uniform vec3 u_fogColor;              // 雾的颜色
        
  //       out vec4 fragColor;  // 使用单一的输出变量
        
  //       // 获取世界坐标
  //       vec4 getWorldCoordinate(sampler2D depthTexture, vec2 texCoords) {
  //           float depthOrLogDepth = czm_unpackDepth(texture(depthTexture, texCoords));
  //           vec4 eyeCoordinate = czm_windowToEyeCoordinates(gl_FragCoord.xy, depthOrLogDepth);
  //           eyeCoordinate = eyeCoordinate / eyeCoordinate.w;
  //           vec4 worldCoordinate = czm_inverseView * eyeCoordinate;
  //           worldCoordinate = worldCoordinate / worldCoordinate.w;
  //           return worldCoordinate;
  //       }
        
  //       // 计算粗略高度
  //       float getRoughHeight(vec4 worldCoordinate) {
  //           float disToCenter = length(vec3(worldCoordinate));
  //           return disToCenter - u_earthRadiusOnCamera;
  //       }
        
  //       // 计算向量投影
  //       vec3 projectVector(vec3 v1, vec3 v2) {
  //           return dot(v1, v2) * v2 / dot(v2, v2);
  //       }
        
  //       // 线性高度雾计算
  //       float linearHeightFog(vec3 positionToCamera, float cameraHeight, float pixelHeight, float fogMaxHeight) {
  //           float globalDensity = u_globalDensity / 10.0;
            
  //           vec3 up = -1.0 * normalize(czm_viewerPositionWC);
  //           vec3 vh = projectVector(normalize(positionToCamera), up);
            
  //           // 让相机沿着视线方向移动 雾气产生距离 的距离
  //           float s = step(100.0, length(positionToCamera));
  //           vec3 sub = mix(positionToCamera, normalize(positionToCamera) * 100.0, s);
  //           positionToCamera -= sub;
            
  //           cameraHeight = mix(pixelHeight, cameraHeight - 100.0 * vh.y, s);
            
  //           float b = mix(cameraHeight, fogMaxHeight, step(fogMaxHeight, cameraHeight));
  //           float a = mix(pixelHeight, fogMaxHeight, step(fogMaxHeight, pixelHeight));
            
  //           float fog = (b - a) - 0.5 * (pow(b, 2.0) - pow(a, 2.0)) / fogMaxHeight;
  //           fog = globalDensity * fog / (abs(vh.y) + 0.001); // 避免除零
            
  //           if(abs(vh.y) <= 0.01 && cameraHeight < fogMaxHeight) {
  //               float disToCamera = length(positionToCamera);
  //               fog = globalDensity * (1.0 - cameraHeight / fogMaxHeight) * disToCamera;
  //           }
            
  //           fog = mix(0.0, 1.0, fog / (fog + 1.0));
  //           return fog;
  //       }
        
  //       void main(void) {
  //           vec4 color = texture(colorTexture, v_textureCoordinates);
  //           vec4 positionWC = getWorldCoordinate(depthTexture, v_textureCoordinates);
  //           float pixelHeight = getRoughHeight(positionWC);
            
  //           vec3 positionToCamera = vec3(vec3(positionWC) - czm_viewerPositionWC);
  //           float fog = linearHeightFog(positionToCamera, u_cameraHeight, pixelHeight, u_fogHeight);
            
  //           fragColor = mix(color, vec4(u_fogColor, 1.0), fog);
  //       }
  //   `;

  //   // 根据能见度计算雾效参数
  //   const calculateFogParams = () => {
  //     // 从天气数据获取能见度（单位：km）
  //     let visibility = 30 // 默认能见度10km
      
  //     try {
  //       // 从天气store获取能见度数据
  //       const visibilityStr = weatherStore.headerWeatherInfo.visibility
  //       // 提取数字部分
  //       const visibilityNum = parseFloat(visibilityStr)
  //       if (!isNaN(visibilityNum)) {
  //         visibility = visibilityNum
  //       }
  //     } catch (error) {
  //       console.warn('获取能见度数据失败，使用默认值:', error)
  //     }
      
  //     // 根据能见度计算雾效参数
  //     let fogHeight, fogDensity
      
  //     if (visibility > 10) {
  //       // 能见度 > 10km：雾非常淡
  //       fogHeight = 5000.0
  //       fogDensity = 0.1
  //     } else if (visibility > 5) {
  //       // 能见度 5-10km：雾淡
  //       fogHeight = 4000.0
  //       fogDensity = 0.2
  //     } else if (visibility > 2) {
  //       // 能见度 2-5km：雾适中
  //       fogHeight = 3000.0
  //       fogDensity = 0.4
  //     } else if (visibility > 1) {
  //       // 能见度 1-2km：雾较浓
  //       fogHeight = 2000.0
  //       fogDensity = 0.6
  //     } else {
  //       // 能见度 < 1km：雾非常浓
  //       fogHeight = 1000.0
  //       fogDensity = 0.8
  //     }
      
  //     return { fogHeight, fogDensity }
  //   }

  //   // 创建高度雾后处理阶段
  //   const heightFogStage = new Cesium.PostProcessStage({
  //     fragmentShader: fs,
  //     uniforms: {
  //        u_earthRadiusOnCamera: 6378137.0,  // 地球平均半径（米）
  //       u_cameraHeight: () => viewerInstance.camera.positionCartographic.height,
  //       u_fogColor: () => new Cesium.Color(0.8, 0.82, 0.84),
  //       u_fogHeight: () => calculateFogParams().fogHeight,
  //       u_globalDensity: () => calculateFogParams().fogDensity
  //     }
  //   });

  //   // 添加到场景
  //   viewerInstance.scene.postProcessStages.add(heightFogStage);
  //   // =====================================================

  } catch (error) {
    console.warn('地形加载失败，使用默认地形:', error)
    viewerInstance.terrainProvider = new Cesium.EllipsoidTerrainProvider()
  }
}