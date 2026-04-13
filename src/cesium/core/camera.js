import * as Cesium from 'cesium'
import { useRegionStore } from '@/store/modules/region'

// 获取地区配置
export const getRegionConfig = () => {
  const regionStore = useRegionStore();
  const bounds = regionStore.getRegionBounds;
  return {
    name: regionStore.getRegionName,
    center: regionStore.getRegionCenter,
    rectangle: Cesium.Rectangle.fromDegrees(
      bounds.west,
      bounds.south,
      bounds.east,
      bounds.north
    ),
    defaultHeight: 18000
  };
};



// 相机高度限制
export const CAMERA_HEIGHT_LIMITS = {
  min: 1,       // 最小高度（米）
  max: 1000000     // 最大高度（米）
};



export const getCurrentCameraParams = (viewer) => {
  if (!viewer) return null;

  const camera = viewer.camera;
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

export const printCameraParams = (viewer) => {
  const params = getCurrentCameraParams(viewer);
  if (params) {
    console.log('========== 当前相机参数 ==========');
    console.log('位置信息:');
    console.log(`  经度: ${params.position.longitude.toFixed(6)}°`);
    console.log(`  纬度: ${params.position.latitude.toFixed(6)}°`);
    console.log(`  高度: ${params.position.height.toFixed(2)}米`);
    console.log(`  笛卡尔坐标: x=${params.position.x.toFixed(2)}, y=${params.position.y.toFixed(2)}, z=${params.position.z.toFixed(2)}`);
    console.log('方向信息:');
    console.log(`  航向角(Heading): ${params.orientation.heading.toFixed(2)}°`);
    console.log(`  俯仰角(Pitch): ${params.orientation.pitch.toFixed(2)}°`);
    console.log(`  翻滚角(Roll): ${params.orientation.roll.toFixed(2)}°`);
    console.log('====================================');
  } else {
    console.error('无法获取相机参数，viewer未初始化');
  }
};

export const setupCameraPrintKeydown = (viewer) => {
  const keydownHandler = (event) => {
    if (event.key === 'p' || event.key === 'P') {
      printCameraParams(viewer);
    }
  };
  document.addEventListener('keydown', keydownHandler);
  return keydownHandler;
};

export const getFlyToOptions = (options) => ({
  duration: options.duration || (options.isRegion ? 1.5 : 2),
  orientation: {
    heading: Cesium.Math.toRadians(options.heading || 0),
    pitch: Cesium.Math.toRadians(options.pitch || (options.isRegion ? -30 : -45)),
    roll: Cesium.Math.toRadians(options.roll || 0)
  },
  easingFunction: options.easingFunction || Cesium.EasingFunction.CUBIC_IN_OUT,
  convert: options.convert || true
})

/**
 * 地区概览飞行
 * @param {Cesium.Viewer} viewer - Cesium viewer实例
 */
export const flyToRegionOverview = (viewer) => {
  if (!viewer) return;
  
  const regionConfig = getRegionConfig();
  
  viewer.camera.flyTo({
    destination: regionConfig.rectangle,
    orientation: {
      heading: 0,
     // pitch: Cesium.Math.toRadians(-45),
      roll: 0
    },
    duration: 2,
    easingFunction: Cesium.EasingFunction.CUBIC_IN_OUT
  });
};

/**
 * 飞行到指定区域，改进的视角效果
 * @param {Cesium.Viewer} viewer - Cesium viewer实例
 * @param {Object} region - 区域信息
 */
export const flyToRegion = (viewer, region) => {
  if (!viewer || !region) return;

  try {
    if (region.bbox?.length >= 2) {
      const [[west, south], [east, north]] = region.bbox;
      const center = Cesium.Cartesian3.fromDegrees((west + east) / 2, (south + north) / 2, 0);
      const boundingSphere = new Cesium.BoundingSphere(center, region.radius || 1000);
      
      const range = Math.max(
        boundingSphere.radius * 2.2,
        1200
      );
      
      const offset = new Cesium.HeadingPitchRange(
        Cesium.Math.toRadians(region.heading || 0),
        Cesium.Math.toRadians(region.pitch || -12),
        range
      );
      
      viewer.camera.flyToBoundingSphere(boundingSphere, {
        offset: offset,
        duration: region.duration || 1.5,
        easingFunction: region.easingFunction || Cesium.EasingFunction.CUBIC_IN_OUT
      });
    } else {
      console.warn('无效的区域坐标数据:', region);
    }
  } catch (error) {
    console.error('视角切换失败:', error);
  }
};

export const flyToRectangle = (viewer, region) => {
  if (!viewer || !region) return

  try {
    const rectangle = Cesium.Rectangle.fromDegrees(
      region.west, region.south, region.east, region.north
    )
    viewer.camera.flyTo({
      destination: rectangle,
      ...getFlyToOptions({ ...region, isRegion: false })
    })
  } catch (error) {
    console.error('视角切换失败:', error)
  }
}
/**
 * 限制相机范围和高度
 * @param {Cesium.Viewer} viewer - Cesium viewer实例
 * @returns {Function} 清理函数
 */
export const limitCameraRange = (viewer) => {
  if (!viewer) return () => {};

  const camera = viewer.camera;
  
  // 相机变化事件处理函数
  const handleCameraChanged = () => {
    const carto = camera.positionCartographic;
    if (!Cesium.defined(carto)) return;

    // 高度限制
    const clampedHeight = Cesium.Math.clamp(
      carto.height,
      CAMERA_HEIGHT_LIMITS.min,
      CAMERA_HEIGHT_LIMITS.max
    );

    // 获取最新的地区配置
    const regionConfig = getRegionConfig();
    
    // 范围限制
    const clampedLongitude = Cesium.Math.clamp(
      carto.longitude,
      regionConfig.rectangle.west,
      regionConfig.rectangle.east
    );

    const clampedLatitude = Cesium.Math.clamp(
      carto.latitude,
      regionConfig.rectangle.south,
      regionConfig.rectangle.north
    );

    // 只有当相机位置超出限制时才更新
    if (carto.height !== clampedHeight || 
        carto.longitude !== clampedLongitude || 
        carto.latitude !== clampedLatitude) {
      
      camera.setView({
        destination: Cesium.Cartesian3.fromRadians(
          clampedLongitude,
          clampedLatitude,
          clampedHeight
        )
      });
    }
  };

  // 添加事件监听器
  camera.changed.addEventListener(handleCameraChanged);
  
  // 返回清理函数
  return () => {
    camera.changed.removeEventListener(handleCameraChanged);
  };
};

/**
 * 切换到概览模式（所有监测点都能显示）
 * @param {Cesium.Viewer} viewer - Cesium viewer实例
 */
export const switchToOverviewMode = (viewer) => {
  if (!viewer) return;
  
  // 使用新的概览飞行函数
  flyToRegionOverview(viewer);
};

/**
 * 切换到重点关注模式（视角拉近）
 * @param {Cesium.Viewer} viewer - Cesium viewer实例
 * @param {Object} region - 重点关注区域信息（可选，默认使用地区中心点）
 */
export const switchToFocusMode = (viewer, region = null) => {
  if (!viewer) return;

  // 获取最新的地区配置
  const regionConfig = getRegionConfig();
  
  // 默认使用地区视觉中心点
  const center = region?.coordinates || regionConfig.center;
  
  // 创建边界球，用于重点关注模式
  const boundingSphere = new Cesium.BoundingSphere(
    Cesium.Cartesian3.fromDegrees(center[0], center[1], 0),
    1000 // 默认半径
  );
  
  // 计算合适的相机距离
  const range = Math.max(
    boundingSphere.radius * 2.2,
    1200
  );
  
  viewer.camera.flyToBoundingSphere(boundingSphere, {
    offset: new Cesium.HeadingPitchRange(
      0,
      Cesium.Math.toRadians(-60),
      range
    ),
    duration: 2.0,
    easingFunction: Cesium.EasingFunction.CUBIC_IN_OUT
  });
};

export const handleCameraMove = (viewer) => { 
  // 将事件处理函数保存为变量，以便后续可以移除它
  const handleKeydown = (e) => {
    var height = viewer.camera.positionCartographic.height;
    var moveRate = height / 100;
    switch(e.key){
      case 'w':
        viewer.camera.moveForward(moveRate);
        break;
      case "s":
        viewer.camera.moveBackward(moveRate);
        break;
      case "a":
        viewer.camera.moveLeft(moveRate);
        break;
      case "d":
        viewer.camera.moveRight(moveRate);
        break;
      case "q":
        viewer.camera.lookLeft(Cesium.Math.toRadians(0.1));
        break;
      case "e":
        viewer.camera.lookRight(Cesium.Math.toRadians(0.1));
        break;
      case "r":
        viewer.camera.lookUp(Cesium.Math.toRadians(0.1));
        break;
      case "f":
        viewer.camera.lookDown(Cesium.Math.toRadians(0.1));
        break;
    }
  };

  // 添加事件监听器
  document.addEventListener('keydown', handleKeydown);

  // 返回处理函数，以便可以在需要时移除它
  return handleKeydown;
};

/**
 * 监听相机高度变化，当高度达到指定阈值时触发回调
 * @param {Cesium.Viewer} viewer - Cesium viewer实例
 * @param {number} threshold - 相机高度阈值
 * @param {function} callback - 回调函数，参数为相机高度和是否低于阈值
 * @returns {function} 清理函数，用于移除事件监听器
 */
export const watchCameraHeight = (viewer, threshold, callback) => {
  if (!viewer || !callback) return () => {};
  
  // 初始检查
  const checkCameraHeight = () => {
    const carto = viewer.camera.positionCartographic;
    if (!Cesium.defined(carto)) return;
    
    const height = carto.height;
    const isBelowThreshold = height <= threshold;
    callback(height, isBelowThreshold);
  };
  
  // 添加相机移动结束事件监听器
  const cameraMoveEndHandler = viewer.camera.moveEnd.addEventListener(checkCameraHeight);
  
  // 初始调用一次，设置初始状态
  checkCameraHeight();
  
  // 返回清理函数
  return () => {
    viewer.camera.moveEnd.removeEventListener(cameraMoveEndHandler);
  };
};
