import * as Cesium from 'cesium'

export const configureCamera = (viewerInstance) => {
  const controller = viewerInstance.scene.screenSpaceCameraController
  controller.minimumZoomDistance = 0
  controller.maximumZoomDistance = 30000
  viewerInstance.scene.camera.constrainedAxis = Cesium.Cartesian3.UNIT_Z
}

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

export const flyToRegion = (viewer, region) => {

  if (!viewer || !region) return

  try {
    if (region.coordinates?.length >= 2) {
      const [longitude, latitude] = region.coordinates
      // 创建中心点的笛卡尔坐标
      const center = Cesium.Cartesian3.fromDegrees(longitude, latitude, 0)
      // 创建边界球，半径根据需要调整，这里使用默认值1000米
      const boundingSphere = new Cesium.BoundingSphere(center, region.radius || 1000)
      
      // 设置相机偏移参数
      const offset = new Cesium.HeadingPitchRange(
        Cesium.Math.toRadians(region.heading || 0),
        Cesium.Math.toRadians(region.pitch || -30),
        boundingSphere.radius * 2 // 距离球体中心的距离为半径的2倍
      )
      
      viewer.camera.flyToBoundingSphere(boundingSphere, {
        offset: offset,
        duration: region.duration || 1.5,
        easingFunction: region.easingFunction || Cesium.EasingFunction.CUBIC_IN_OUT
      })
    } else {
      console.warn('无效的区域坐标数据:', region)
    }
  } catch (error) {
    console.error('视角切换失败:', error)
  }
}

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